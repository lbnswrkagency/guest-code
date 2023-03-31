const sgMail = require("@sendgrid/mail");
const createTicketPDF = require("../utils/pdf");

sgMail.setApiKey(
  process.env.SENDGRID_API_KEY ||
    "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"
);

const sendVerificationEmail = async (to, token) => {
  try {
    const msg = {
      to,
      from: process.env.SENDER_EMAIL || "contact@guest-code.com", // Updated sender email
      subject: "Guest Code - Email Verification",
      html: `
        <h2>Welcome to Guest Code!</h2>
        <p>Please verify your email by clicking on the link below:</p>
        <a href="http://localhost:3000/verify/${token}">Verify Email</a>
      `,
    };

    await sgMail.send(msg);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const sendQRCodeEmail = async (
  name,
  email,
  condition,
  pax,
  qrCodeDataURL,
  event
) => {
  console.log("Creating ticket PDF...");
  try {
    // Call createTicketPDF with the event object and the QR code data URL
    const ticketPdfBuffer = await createTicketPDF(
      event,
      qrCodeDataURL,
      name,
      email,
      condition,
      pax
    );

    const msg = {
      to: email,
      from: process.env.SENDER_EMAIL || "contact@guest-code.com",
      subject: "Your Guest Code QR Code",
      html: `
        <h2>Thank you for using Guest Code!</h2>
        <p>Here is your QR code:</p>
        <img src="${qrCodeDataURL}" alt="QR code" />
      `,
      attachments: [
        {
          content: ticketPdfBuffer.toString("base64"),
          filename: "ticket.pdf",
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };

    await sgMail.send(msg);
  } catch (error) {
    console.error("Error sending QR code email:", error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendQRCodeEmail,
};
