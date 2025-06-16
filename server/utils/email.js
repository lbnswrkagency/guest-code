const SibApiV3Sdk = require("sib-api-v3-sdk");
const createTicketPDF = require("../utils/pdf");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const createTicketPDFInvitation = require("../utils/pdf-invite");
// Import the email layout utility
const { createEventEmailTemplate } = require("../utils/emailLayout");
const User = require("../models/User");

// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const logoUrl =
  "https://guest-code.s3.eu-north-1.amazonaws.com/server/logo.png"; // Use the same URL as in your other emails

// Environment-aware base URL
const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://guest-code.com";
  }
  return "http://localhost:9231";
};

const sendVerificationEmail = async (to, token) => {
  try {
    console.debug("Preparing verification email...");

    const verificationLink = `${getBaseUrl()}/verify-email/${token}`;

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: "GuestCode",
      email: process.env.SENDER_EMAIL || "contact@guest-code.com",
    };
    sendSmtpEmail.subject = "Welcome to GuestCode - Verify Your Email";

    // Create additional content with verification button
    const additionalContent = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" style="background: linear-gradient(314deg, #d1a300 0%, #ffc807 100%); color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email</a>
      </div>
      <p style="color: #666; font-size: 14px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="color: #0066cc; font-size: 14px; word-break: break-all;">${verificationLink}</p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't create an account with us, please ignore this email.</p>
    `;

    // Use the common email template with showEventDetails set to false
    sendSmtpEmail.htmlContent = createEventEmailTemplate({
      recipientName: "New User",
      eventTitle: "Welcome to GuestCode",
      description:
        "Thank you for joining GuestCode! To complete your registration and start creating amazing events, please verify your email address by clicking the button below:",
      primaryColor: "#ffc807",
      additionalContent: additionalContent,
      footerText: "GuestCode - The Future of Event Management",
      showEventDetails: false,
    });

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.debug("Verification email sent successfully to:", to);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
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

    // Configure the QR code email
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.bcc = [{ email: "contact@guest-code.com" }];
    sendSmtpEmail.sender = {
      name: event?.brand?.name || "Afro Spiti",
      email: process.env.SENDER_EMAIL || "contact@afrospiti.com",
    };
    sendSmtpEmail.subject = `${
      event?.brand?.name || "Afro Spiti"
    } - Guest Code`;

    // Create additional content specific to the QR code
    const additionalContent = `
      <div style="background-color: #f8f8f8; border-left: 4px solid #ffc807; padding: 15px; margin: 20px 0;">
        <p style="font-size: 16px; margin: 0 0 10px; font-weight: bold;">Guest Code Details:</p>
        <p style="font-size: 16px; margin: 0 0 5px;">Condition: <strong>${
          condition || "No specific conditions"
        }</strong></p>
        <p style="font-size: 16px; margin: 0 0 5px;">People: <strong>${
          pax || 1
        }</strong></p>
        <p style="font-size: 16px; margin: 0;">Please show the attached Guest Code at the entrance for it to be scanned.</p>
      </div>
    `;

    // Use the common email template
    sendSmtpEmail.htmlContent = createEventEmailTemplate({
      recipientName: name,
      eventTitle: event?.title || "Event",
      eventDate: event?.date,
      eventLocation: event?.location || event?.venue || "",
      eventAddress: event?.street || event?.address || "",
      eventCity: event?.city || "",
      eventPostalCode: event?.postalCode || "",
      startTime: event?.startTime || "20:00",
      endTime: event?.endTime || "04:00",
      description:
        "Thank you for getting your Guest Code. With this code, enjoy special access to our event.",
      primaryColor: event?.brand?.colors?.primary || "#ffc807",
      additionalContent: additionalContent,
      footerText: "Remember, your Guest Code can be used once.",
    });

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

const sendQRCodeInvitation = async (name, email, pdfPath) => {
  console.debug("Preparing QR code invitation email for:", email);
  try {
    const pdfData = fs.readFileSync(pdfPath);

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.bcc = [{ email: "contact@guest-code.com" }];
    sendSmtpEmail.sender = {
      name: "Afro Spiti",
      email: process.env.SENDER_EMAIL || "contact@afrospiti.com",
    };
    sendSmtpEmail.subject =
      "Afro Spiti - Personal Invitation - Hendricks Birthday Special - Tonight - Studio 24";

    // Create additional content specific to the invitation
    const additionalContent = `
      <div style="background-color: #f8f8f8; border-left: 4px solid #ffc807; padding: 15px; margin: 20px 0;">
        <p style="font-size: 16px; margin: 0 0 10px; font-weight: bold;">Invitation Details:</p>
        <p style="font-size: 16px; margin: 0 0 5px;">Special Event: <strong>Hendricks' Birthday Special</strong></p>
        <p style="font-size: 16px; margin: 0 0 5px;">Benefit: <strong>Free entrance all night</strong></p>
        <p style="font-size: 16px; margin: 0;">Please show the attached Invitation Code at the entrance for it to be scanned.</p>
      </div>
    `;

    // Use the common email template
    sendSmtpEmail.htmlContent = createEventEmailTemplate({
      recipientName: name,
      eventTitle: "Afro Spiti - Hendricks Birthday Special",
      eventDate: new Date(), // Current date since it's tonight
      eventLocation: "Studio 24",
      eventAddress: "Studio 24, Athens",
      eventCity: "Athens",
      startTime: "22:00",
      endTime: "04:00",
      description:
        "We wanted to say thank you for joining us in the past. This is your personal invitation for Afro Spiti tonight. Join us for a special night as we celebrate Hendricks' Birthday with an incredible lineup!",
      primaryColor: "#ffc807",
      additionalContent: additionalContent,
      footerText: "Remember, your Invitation Code can only be used once.",
    });

    sendSmtpEmail.attachment = [
      {
        content: pdfData.toString("base64"),
        name: path.basename(pdfPath),
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

const sendPasswordResetEmail = async (to, token) => {
  try {
    console.debug("Preparing password reset email...");

    // Find the user to get their name
    const user = await User.findOne({ email: to });
    const userName = user
      ? `${user.firstName} ${user.lastName}`
      : "GuestCode User";

    const resetLink = `${getBaseUrl()}/reset-password/${token}`;

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: "GuestCode",
      email: process.env.SENDER_EMAIL || "contact@guest-code.com",
    };
    sendSmtpEmail.subject = "GuestCode - Reset Your Password";

    // Create reset password specific HTML rather than using the event template
    sendSmtpEmail.htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background-color: #ffc807; margin-bottom: 20px; border-radius: 8px; color: #222;">
        <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Hello ${userName},</p>
      
      <div style="margin-bottom: 20px;">
        <p style="font-size: 16px; line-height: 1.5;">We received a request to reset your password for your GuestCode account. To create a new password, please click the button below:</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background: linear-gradient(314deg, #d1a300 0%, #ffc807 100%); color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="color: #0066cc; font-size: 14px; word-break: break-all;">${resetLink}</p>
      
      <div style="margin-top: 30px; font-size: 14px; color: #666;">
        <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
      </div>
      
      <div style="margin-top: 30px;">
        <p style="font-size: 16px; line-height: 1.5;">Best regards,<br>The GuestCode Team</p>
      </div>
      
      <div style="text-align: center; padding: 20px; background-color: #f8f8f8; border-radius: 8px; margin-top: 30px;">
        <p style="font-size: 14px; color: #666; margin: 0;">GuestCode - The Future of Event Management</p>
      </div>
    </div>
    `;

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.debug("Password reset email sent successfully to:", to);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendQRCodeEmail,
  sendQRCodeInvitation,
  sendPasswordResetEmail,
};
