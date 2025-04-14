document.getElementById("invoiceForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(this); 

    try {
        const response = await fetch("http://localhost:3000/generate-pdf", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (result.pdfUrl) {
            console.log("PDF Generated:", result.pdfUrl);
            window.open(result.pdfUrl, "_blank"); 
        } else {
            console.error("PDF generation failed. Server response:", result);
        }
    } catch (error) {
        console.error("Error generating PDF:", error);
    }
});


document.addEventListener("DOMContentLoaded", function () {
    const itemTableBody = document.querySelector("#itemTable tbody");
    const addItemButton = document.getElementById("addItem");
    const invoiceForm = document.getElementById("invoiceForm");

    // Function to add a new row to the item table
    function addRow() {
        const rowCount = itemTableBody.rows.length + 1;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${rowCount}</td>
            <td><input type="text" name="partCode[]" required></td>
            <td><input type="text" name="description[]" required></td>
            <td><input type="text" name="hsnCode[]" required></td>
            <td><input type="number" name="unitPrice[]" class="unitPrice" required></td>
            <td><input type="number" name="unitQuantity[]" class="unitQuantity" required></td>
            <td class="totalPrice">0</td>
            <td><button type="button" class="removeRow">❌</button></td>
        `;
        itemTableBody.appendChild(row);
        updateEventListeners();
    }

    function removeRow(event) {
        if (event.target.classList.contains("removeRow")) {
            event.target.closest("tr").remove();
        }
    }

    function updateTotals(event) {
        const row = event.target.closest("tr");
        const price = parseFloat(row.querySelector(".unitPrice").value) || 0;
        const quantity = parseFloat(row.querySelector(".unitQuantity").value) || 0;
        row.querySelector(".totalPrice").textContent = (price * quantity).toFixed(2);
    }

    function updateEventListeners() {
        document.querySelectorAll(".unitPrice, .unitQuantity").forEach(input => {
            input.removeEventListener("input", updateTotals);
            input.addEventListener("input", updateTotals);
        });
    }

    invoiceForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const formData = new FormData(this);
        const items = [];

        document.querySelectorAll("#itemTable tbody tr").forEach((row, index) => {
            items.push({
                slNo: index + 1,
                partCode: row.querySelector("[name='partCode[]']").value,
                description: row.querySelector("[name='description[]']").value,
                hsnCode: row.querySelector("[name='hsnCode[]']").value,
                unitPrice: row.querySelector("[name='unitPrice[]']").value,
                unitQuantity: row.querySelector("[name='unitQuantity[]']").value,
                total: row.querySelector(".totalPrice").textContent,
            });
        });
        
        formData.append("items", JSON.stringify(items));

        fetch("http://localhost:3000/generate-pdf", {
            method: "POST",
            body: formData
        }).then(response => response.json())
          .then(result => {
              if (result.pdfUrl) {
                  window.open(result.pdfUrl, "_blank");
              }
          })
          .catch(error => console.error("Error generating PDF:", error));
    });


    addItemButton.addEventListener("click", addRow);
    itemTableBody.addEventListener("click", removeRow);
    updateEventListeners();
});
