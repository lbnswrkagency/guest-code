const SibApiV3Sdk = require("sib-api-v3-sdk");
const createTicketPDF = require("../utils/pdf");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const createTicketPDFInvitation = require("../utils/pdf-invite");
// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const logoPath = path.join(__dirname, "logo.png"); // or 'logo.svg'
const logoData = fs.readFileSync(logoPath, { encoding: "base64" });
const logoBase64 = `data:image/png;base64,${logoData}`; // use 'image/svg+xml' for SVG

const sendVerificationEmail = async (to, token) => {
  try {
    console.debug("Preparing verification email...");

    // Configure the verification email
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: "Afro Spiti",
      email: process.env.SENDER_EMAIL || "contact@afrospiti.com",
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
      email: process.env.SENDER_EMAIL || "contact@afrospiti.com",
    };
    sendSmtpEmail.subject = "Afro Spiti - Guest Code";
    sendSmtpEmail.htmlContent = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="left" style="font-family: Arial, sans-serif; color: #333333;">
          <h2 style="font-size: 22px; margin-top: 0;">Hey ${name},</h2>
          <p style="font-size: 16px;">Thank you for getting your Guest Code. With this code, enjoy a special offer:</p>
          <h3 style="font-size: 18px;">FREE ENTRANCE, valid until midnight every Saturday at Afro Spiti, Baby Disco.</h3>
          <p style="font-size: 16px;">Please show the attached Guest Code at the entrance for it to be scanned when you order.</p>
          <p style="font-size: 16px;">Remember, your Guest Code can be used once.</p>
          <p style="font-size: 16px;">We're looking forward to seeing you at the event!</p>
          <p style="font-size: 16px; margin-bottom: 0;">Sincerely,</p>
          <br />
          <img src="https://guest-code.s3.eu-north-1.amazonaws.com/server/logo.png" alt="Logo" style="width: 100px; height: auto; display: block; margin-top: 20px;">
        </td>
      </tr>
    </table>

    `;

    sendSmtpEmail.attachment = [
      {
        content: ticketPdfBuffer.toString("base64"),
        name: `${name.replace(/\s+/g, "_")}_guestcode.pdf`,
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

const sendQRCodeInvitation = async (
  name,
  email,
  condition,
  pax,
  qrCodeDataURL,
  event
) => {
  console.debug("Preparing QR code invitation email for:", email);
  try {
    const ticketPdfBuffer = await createTicketPDFInvitation(
      event,
      qrCodeDataURL,
      name,
      email,
      condition,
      pax
    );

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.sender = {
      name: "Afro Spiti",
      email: process.env.SENDER_EMAIL || "contact@afrospiti.com",
    };
    sendSmtpEmail.subject = "Afro Spiti - Personal Invitation - Tonight";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333333; padding: 20px;">
        <h1 style="font-size: 24px;">Hey ${name},</h1>
        <p style="font-size: 16px;">This is your personal invitation for tonight. Afro Spiti has moved to Saturday, and we wanted to thank you for checking in with us the past season.</p>
        <h2 style="font-size: 18px;">You have free entrance all night with this invitation code.</h2>
        <p style="font-size: 16px;">Please show the attached Invitation Code at the entrance for it to be scanned when you order.</p>
        <p style="font-size: 16px;">Remember, your Invitation Code can be used once.</p>
        <p style="font-size: 16px;">We're looking forward to seeing you at the event!</p>
        <p style="font-size: 16px; margin-bottom: 0;">Sincerely,</p>
        <br />
        <img src="https://guest-code.s3.eu-north-1.amazonaws.com/server/logo.png" alt="Logo" style="width: 100px; height: auto; display: block; margin-top: 20px;">
      </div>
    `;

    sendSmtpEmail.attachment = [
      {
        content: ticketPdfBuffer.toString("base64"),
        name: `${name.replace(/\s+/g, "_")}_invitation.pdf`,
        type: "application/pdf",
      },
    ];

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.sendTransacEmail(sendSmtpEmail).then(
      function (data) {
        console.debug("Invitation email sent successfully to:", email);
      },
      function (error) {
        console.error("Error sending invitation email:", error);
      }
    );
  } catch (error) {
    console.error("Error preparing QR code invitation email:", error);
  }
};
module.exports = {
  sendVerificationEmail,
  sendQRCodeEmail,
  sendQRCodeInvitation,
};
