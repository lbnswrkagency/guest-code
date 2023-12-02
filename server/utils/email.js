const sgMail = require("@sendgrid/mail");
const createTicketPDF = require("../utils/pdf");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log("SECRET KEY", process.env.SENDGRID_API_KEY);

const sendVerificationEmail = async (to, token) => {
  try {
    console.debug("Preparing verification email...");
    const msg = {
      to,
      from: process.env.SENDER_EMAIL || "contact@guest-code.com",
      subject: "Guest Code - Email Verification",
      html: `<h2>Welcome to Guest Code!</h2><p>Please verify your email by clicking on the link below:</p><a href="http://localhost:3000/verify/${token}">Verify Email</a>`,
    };

    console.debug("Sending verification email to:", to);
    await sgMail.send(msg);
    console.debug("Verification email sent successfully to:", to);
  } catch (error) {
    console.error("Error sending verification email:", error);
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
  console.debug("Preparing QR code email for:", email);
  try {
    console.debug("Creating ticket PDF...");
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
      html: `<h2>Thank you for using Guest Code!</h2><p>Here is your QR code:</p><img src="${qrCodeDataURL}" alt="QR code" />`,
      attachments: [
        {
          content: ticketPdfBuffer.toString("base64"),
          filename: "ticket.pdf",
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };

    console.debug("Sending QR code email to:", email);
    await sgMail.send(msg);
    console.debug("QR code email sent successfully to:", email);
  } catch (error) {
    console.error("Error sending QR code email:", error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendQRCodeEmail,
};
