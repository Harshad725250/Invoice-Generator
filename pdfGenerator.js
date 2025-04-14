const PDFDocument = require('pdfkit');
const fs = require('fs');
const numberToWords = require('number-to-words');

function generatePDF(data, filePath, callback) {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Enlarged header box
    doc.rect(50, 50, 512, 160).stroke();

    // Insert logo (Left side)
    if (data.logo) {
        try {
            doc.image(data.logo, 55, 60, { width: 80 });
        } catch (error) {
            console.error("Error adding logo:", error);
        }
    }

    // Company Details (Centered)
    doc.font("Helvetica-Bold").fontSize(14).text(data.companyName || "No Company Name", 150, 60, { align: 'center' });
    doc.font("Helvetica").fontSize(10)
        .text(data.senderAddress || "No Address", 200, 80, { align: 'center', width: 300 })
        .moveDown(0.5);
    doc.font("Helvetica").fontSize(10)
        .text(`Ph: ${data.phoneNumber || "N/A"}`, { align: 'right' })
        .moveDown(0.5)
        .text(`GSTIN: ${data.gstin || "N/A"}`, { align: 'right' });

    // Invoice Number & Date (Left-aligned)
    doc.fontSize(10)
        .text(`Invoice No.: ${data.invoiceNumber || "N/A"}`, 50, 160)
        .text(`Date: ${data.invoiceDate || "N/A"}`, 50, 180);

    // Email & PAN (Right-aligned, same row as Invoice No. & Date)
    doc.fontSize(10)
        .text(`Email: ${data.senderEmail || "No Email"}`, 300, 160, { align: 'right' })
        .text(`PAN: ${data.panNumber || "No PAN"}`, 300, 180, { align: 'right' });

    // Consignee Details (Left-aligned)
    doc.moveDown(2);
    doc.fontSize(14).text("Consignee (Ship to)", 50, doc.y, { underline: true });
    doc.fontSize(12)
        .text(data.consigneeName || "N/A", 50)
        .text(data.consigneeAddress || "N/A", 50)
        .text(`GSTIN: ${data.consigneeGstin || "N/A"}`, 50)
        .text(`Ph No.: ${data.consigneePhone || "N/A"}`,50);

    // Buyer Details (Left-aligned)
    doc.moveDown();
    doc.fontSize(14).text("Buyer (Bill to)", 50, doc.y, { underline: true });
    doc.fontSize(12)
        .text(data.buyerName || "N/A", 50)
        .text(data.buyerAddress || "N/A", 50)
        .text(`GSTIN: ${data.buyerGstin || "N/A"}`, 50)
        .text(`Ph No.: ${data.buyerPhone || "N/A"}`,50);
    

    doc.moveDown();
    doc.fontSize(12).text("Items", { underline: true }).moveDown(0.5);
    
    const startX = 50;
    let startY = doc.y;
    const columnWidths = [40, 80, 150, 80, 60, 60, 80]; // Column widths
    const headers = ["Sl. No", "Part Code", "Description", "HSN Code", "Unit Price", "Quantity", "Total"];

    // Draw table headers with borders
    doc.font("Helvetica-Bold").fontSize(10);
    let x = startX;
    headers.forEach((header, i) => {
        doc.text(header, x, startY, { width: columnWidths[i], align: 'center' });
        x += columnWidths[i];
    });

    // Draw horizontal line below headers
    doc.moveTo(startX, startY + 15).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), startY + 15).stroke();

    let y = startY + 20; // Start position for first row
    let grandTotal = 0;

    // Draw table rows
    doc.font("Helvetica").fontSize(10);
    data.items.forEach((item, index) => {
        let x = startX;
        const rowHeight = 20; // Increase row height for spacing
        const total = (item.unitPrice * item.quantity).toFixed(2);
        grandTotal += parseFloat(total);

        const values = [
            index + 1,
            item.partCode || "-",
            item.description || "-",
            item.hsnCode || "-",
            item.unitPrice.toFixed(2) || "-",
            item.quantity || "-",
            total
        ];

        // Draw row values
        values.forEach((value, i) => {
            doc.text(value.toString(), x, y, { width: columnWidths[i], align: 'center' });
            x += columnWidths[i];
        });

        // Draw horizontal line after each row
        doc.moveTo(startX, y + rowHeight - 5).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), y + rowHeight - 5).stroke();

        y += rowHeight; // Move to next row
    });

    // Add extra space before the grand total row
    y += 10;

    // Draw a separate row for the grand total
    doc.moveTo(startX, y).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), y).stroke();
    y += 5;

    doc.font("Helvetica-Bold");
    doc.text("Grand Total (in USD)", startX + columnWidths.slice(0, 6).reduce((a, b) => a + b, 0) - 80, y, {
        width: 70,
        align: "right"
    });

    doc.text(grandTotal.toFixed(2), startX + columnWidths.reduce((a, b) => a + b, 0) - 80, y, {
        width: 80,
        align: "center"
    });

    // Convert Grand Total to Words
    const grandTotalWords = numberToWords.toWords(grandTotal).replace(/(^\w|\s\w)/g, m => m.toUpperCase());

    // Add spacing before writing grand total in words
    y += 20;
    doc.font("Helvetica").fontSize(10).text(`Grand Total (in words): ${grandTotalWords} Only`, startX, y, {
        align: "center"
    });
    
    // Add new sections: Bank Details, Signature/Stamp, Declaration
    y += 40; // Add more space before the new sections
    
    // Create a grid for the three new sections
    const sectionWidth = 170; // Width for each section
    const sectionHeight = 100; // Height for each section
    
    // Bank Details Section
    doc.rect(startX, y, sectionWidth, sectionHeight).stroke();
    doc.font("Helvetica-Bold").fontSize(12).text("Bank Details", startX + 5, y + 10);
    doc.font("Helvetica").fontSize(10)
        .text(data.bankName || "Bank Name: N/A", startX + 5, y + 30)
        .text(data.accountNumber || "Account No.: N/A", startX + 5, y + 45)
        .text(data.ifscCode || "IFSC Code: N/A", startX + 5, y + 60)
        .text(data.branchName || "Branch: N/A", startX + 5, y + 75);
    
    // Declaration Section
    doc.rect(startX + sectionWidth, y, sectionWidth, sectionHeight).stroke();
    doc.font("Helvetica-Bold").fontSize(12).text("Declaration", startX + sectionWidth + 5, y + 10);
    doc.font("Helvetica").fontSize(8)
        .text(data.declaration || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", 
            startX + sectionWidth + 5, y + 30, { width: sectionWidth - 10, align: 'left' });
    
    // Signature/Stamp Section
    doc.rect(startX + (sectionWidth * 2), y, sectionWidth, sectionHeight).stroke();
    doc.font("Helvetica-Bold").fontSize(12).text("Signature/ Stamp", startX + (sectionWidth * 2) + 5, y + 10);
    
    // Add signature image if provided
    if (data.signature) {
        try {
            doc.image(data.signature, startX + (sectionWidth * 2) + 35, y + 30, { width: 100 });
        } catch (error) {
            console.error("Error adding signature:", error);
        }
    }
    
    doc.font("Helvetica").fontSize(10).text("For " + (data.companyName || "Company"), 
        startX + (sectionWidth * 2) + 5, y + 80);

    doc.end();

    writeStream.on('finish', () => {
        console.log("PDF successfully created at:", filePath);
        console.log("Received items:", data.items);
        if (typeof callback === "function") {
            callback(filePath);
        }
    });

    writeStream.on('error', (err) => {
        console.error("Error writing PDF:", err);
    });
}

module.exports = { generatePDF };