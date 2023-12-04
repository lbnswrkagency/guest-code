const SibApiV3Sdk = require("sib-api-v3-sdk");
const createTicketPDF = require("../utils/pdf");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const sendVerificationEmail = async (to, token) => {
  try {
    console.debug("Preparing verification email...");

    // Configure the verification email
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: "Afro Spiti",
      email: process.env.SENDER_EMAIL || "contact@guest-code.com",
    };
    sendSmtpEmail.subject = "Guest Code - Email Verification";
    sendSmtpEmail.htmlContent = `<h2>Welcome to Guest Code!</h2><p>Please verify your email by clicking on the link below:</p><a href="http://localhost:3000/verify/${token}">Verify Email</a>`;

    // Send the email
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.sendTransacEmail(sendSmtpEmail).then(
      function (data) {
        console.debug("Verification email sent successfully to:", to);
      },
      function (error) {
        console.error("Error sending verification email:", error);
      }
    );
  } catch (error) {
    console.error("Error preparing verification email:", error);
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

    // const pdfPath = path.join(
    //   __dirname,
    //   "../tickets",
    //   `${name}-${Date.now()}.pdf`
    // );
    // fs.writeFileSync(pdfPath, ticketPdfBuffer);

    // console.debug("PDF saved to:", pdfPath);

    // Configure the QR code email
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.sender = {
      name: "Afro Spiti",
      email: process.env.SENDER_EMAIL || "contact@guest-code.com",
    };
    sendSmtpEmail.subject = "Afro Spiti - Guest Code";
    sendSmtpEmail.htmlContent = `
    <h2>Hello ${name},</h2>
    <p>Thank you for getting your Guest Code. With this code, enjoy a special offer: buy one drink and get two, valid until 10 pm every Sunday at Afro Spiti, Bardeau.</p>
    <p>Please show the attached Guest Code at the bar for it to be scanned when you order.</p>
    <p>Remember, your Guest Code can be used once.</p>
    <p>We're looking forward to seeing you at the event!</p>
    <p>Cheers, Afro Spiti</p>
    `;

    sendSmtpEmail.attachment = [
      {
        content: ticketPdfBuffer.toString("base64"),
        name: "ticket.pdf",
        type: "application/pdf",
      },
    ];

    // Send the email
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.sendTransacEmail(sendSmtpEmail).then(
      function (data) {
        console.debug("QR code email sent successfully to:", email);
      },
      function (error) {
        console.error("Error sending QR code email:", error);
      }
    );
  } catch (error) {
    console.error("Error preparing QR code email:", error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendQRCodeEmail,
};
