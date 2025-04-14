const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./db');
const { generatePDF } = require('./pdfGenerator');

const app = express();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.use('/public', express.static(path.join(__dirname, '../frontend')));

app.get('/index.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

app.get('/', (req, res, next) => {
    const indexPath = path.join(__dirname, '../frontend/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.redirect('/login');
        }
    });
});


app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/home.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Signup handler
app.post('/signup', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        return res.status(400).send('Passwords do not match.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO invoiceusers (username, email, password) VALUES (?, ?, ?)';
        db.query(sql, [username, email, hashedPassword], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).send('Email already registered.');
                }
                return res.status(500).send('Database error.');
            }
            res.send('Account created successfully!');
        });
    } catch (error) {
        res.status(500).send('Error creating account.');
    }
});

// Login handler
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM invoiceusers WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).send('Database error.');
        if (results.length === 0) return res.status(400).send('Invalid username or password.');

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(400).send('Invalid username or password.');
        }

        req.session.user = user.username;
        res.redirect('/home.html');
    });
});

// Sanitize text
function cleanText(text) {
    return text ? text.replace(/[^\x20-\x7E\n]/g, '') : '';
}

// PDF generation endpoint
app.post('/generate-pdf', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), (req, res) => {
    console.log("Received form data:", req.body);
    console.log("Received files:", req.files);

    if (!req.body.partCode || !Array.isArray(req.body.partCode)) {
        return res.status(400).json({ error: "No item data provided" });
    }

    const items = req.body.partCode.map((_, index) => ({
        partCode: req.body.partCode[index] || "-",
        description: req.body.unitDescription[index] || "-",
        hsnCode: req.body.hsnCode[index] || "-",
        unitPrice: parseFloat(req.body.unitPrice[index]) || 0,
        quantity: parseInt(req.body.unitQuantity[index]) || 0,
        total: parseFloat(req.body.total[index]) || 0
    }));

    const data = {
        companyName: cleanText(req.body.companyName),
        senderAddress: cleanText(req.body.senderAddress),
        senderEmail: cleanText(req.body.senderEmail),
        panNumber: cleanText(req.body.panNumber),
        gstin: cleanText(req.body.gstin),
        phoneNumber: cleanText(req.body.phoneNumber),
        invoiceNumber: cleanText(req.body.invoiceNumber),
        invoiceDate: cleanText(req.body.invoiceDate),
        consigneeName: cleanText(req.body.consigneeName),
        consigneeAddress: cleanText(req.body.consigneeAddress),
        consigneeGstin: cleanText(req.body.consigneeGstin),
        consigneePhone: cleanText(req.body.consigneePhone),
        buyerName: cleanText(req.body.buyerName),
        buyerAddress: cleanText(req.body.buyerAddress),
        buyerGstin: cleanText(req.body.buyerGstin),
        buyerPhone: cleanText(req.body.buyerPhone),
        bankName: cleanText(req.body.bankName),
        accountNumber: cleanText(req.body.accountNumber),
        ifscCode: cleanText(req.body.ifscCode),
        branchName: cleanText(req.body.branchName),
        declaration: cleanText(req.body.declaration),
        logo: req.files && req.files.logo ? req.files.logo[0].path : null,
        signature: req.files && req.files.signature ? req.files.signature[0].path : null,
        items
    };

    const uniqueFilename = `invoice_${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, 'uploads', uniqueFilename);

    generatePDF(data, pdfPath, () => {
        console.log("PDF generated successfully:", pdfPath);
        res.json({ pdfUrl: `/uploads/${uniqueFilename}` });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
