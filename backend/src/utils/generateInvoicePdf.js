import PDFDocument from "pdfkit";

export const generateInvoicePdfBuffer = (payment) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    /* ---------- Header ---------- */
    doc
      .fontSize(18)
      .text("INVOICE", { align: "center" })
      .moveDown();

    doc
      .fontSize(10)
      .text(`Invoice No: ${payment.invoice.invoiceNumber}`)
      .text(`Bill No: ${payment.billNumber}`)
      .text(`Date: ${new Date(payment.invoice.issuedAt).toDateString()}`)
      .moveDown();

    /* ---------- Seller ---------- */
    doc.fontSize(12).text("Advocate", { underline: true });
    doc
      .fontSize(10)
      .text(payment.invoice.sellerSnapshot?.name || "Advocate")
      .text(payment.invoice.sellerSnapshot?.email || "")
      .moveDown();

    /* ---------- Buyer ---------- */
    doc.fontSize(12).text("Client", { underline: true });
    doc
      .fontSize(10)
      .text(payment.invoice.buyerSnapshot?.name || "Client")
      .text(payment.invoice.buyerSnapshot?.email || "")
      .moveDown();

    /* ---------- Line Items ---------- */
    doc.fontSize(12).text("Details", { underline: true }).moveDown(0.5);

    payment.lineItems.forEach((item) => {
      doc
        .fontSize(10)
        .text(
          `${item.title} | ${item.quantity} × ₹${item.unitPrice} = ₹${item.amount}`
        );
    });

    doc.moveDown();

    /* ---------- Totals ---------- */
    doc
      .fontSize(10)
      .text(`Subtotal: ₹${payment.subtotal}`)
      .text(`${payment.tax.label}: ₹${payment.tax.amount}`)
      .fontSize(12)
      .text(`Total: ₹${payment.total}`, { underline: true });

    doc.end();
  });
};
