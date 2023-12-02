const { jsPDF } = require("jspdf");

const createTicketPDF = async (
  event,
  qrCodeDataURL,
  name,
  email,
  condition,
  pax
) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text(`Event: ${event.title}`, 20, 20);

  doc.setFontSize(15);
  doc.text(`Date: ${event.date}`, 20, 40);
  doc.text(`Location: ${event.location}`, 20, 60);
  doc.text(`Name: ${name}`, 20, 80);
  doc.text(`Email: ${email}`, 20, 100);

  // Directly use qrCodeDataURL for the image source
  doc.addImage(qrCodeDataURL, "PNG", 20, 120, 50, 50);

  const pdfBytes = doc.output("arraybuffer");
  return Buffer.from(pdfBytes);
};

module.exports = createTicketPDF;
