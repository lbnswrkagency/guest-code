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

// Base URL for email links - all links go to the frontend
// Frontend routes handle the UI, then call the server API
const getClientUrl = () => {
  return "https://guest-code.com";
};

const sendVerificationEmail = async (to, token, user) => {
  try {
    console.debug("Preparing verification email...");

    const verificationLink = `${getClientUrl()}/verify-email/${token}`;
    const firstName = user?.firstName || "there";
    const username = user?.username || "";

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: "GuestCode",
      email: process.env.SENDER_EMAIL || "contact@guest-code.com",
    };
    sendSmtpEmail.subject = `Welcome to GuestCode, ${firstName}! 🎉`;

    // Create additional content with verification button and personalized message
    const additionalContent = `
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="font-size: 16px; margin: 0 0 10px;">Your account details:</p>
        <p style="font-size: 18px; margin: 0; font-weight: bold;">@${username}</p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">You're just one step away from discovering the best events in your city! Verify your email to get started:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" style="background: linear-gradient(314deg, #d1a300 0%, #ffc807 100%); color: #000; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Verify My Email</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #0066cc; font-size: 14px; word-break: break-all;">${verificationLink}</p>

      
      <p style="color: #666; font-size: 13px; margin-top: 30px; font-style: italic;">This verification link will expire in 1 hour. If you didn't create this account, please ignore this email.</p>
    `;

    // Use the common email template with showEventDetails set to false
    sendSmtpEmail.htmlContent = createEventEmailTemplate({
      recipientName: firstName,
      eventTitle: "Welcome to GuestCode! 🎉",
      description: `Hey ${firstName}, we're thrilled to have you join the GuestCode community! Your username @${username} is ready to go.`,
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
  event,
  note = ""
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
      pax,
      note
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
        ${note ? `<p style="font-size: 14px; color: #555; font-style: italic; margin: 5px 0;">${note}</p>` : ''}
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
      eventDate: event?.startDate,
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

const sendQRCodeInvitation = async (name, email, pdfPath, eventId, codeId = null) => {
  try {
    // Fetch event data
    const Event = require("../models/eventsModel");
    const event = await Event.findById(eventId)
      .populate("brand")
      .populate("lineups")
      .populate("genres");

    if (!event) {
      console.error("Event not found for ID:", eventId);
      throw new Error("Event not found");
    }

    const pdfData = fs.readFileSync(pdfPath);
    const primaryColor = event.brand?.colors?.primary || "#ffc807";

    // Clean the name - strip "Guest Code for " prefix if present
    const cleanName = name.replace(/^Guest Code for /i, "").trim();

    // Format the event date
    const eventDate = new Date(event.startDate);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const formattedDate = `${days[eventDate.getDay()]}, ${eventDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;

    // Build lineup HTML with pictures
    let lineupHtml = "";
    if (event.lineups && event.lineups.length > 0) {
      const artistsHtml = event.lineups.map(artist => {
        const avatarUrl = artist.avatar?.medium || artist.avatar?.small || artist.avatar || "";
        const avatarHtml = avatarUrl
          ? `<img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" alt="${artist.name}">`
          : `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: ${primaryColor}; color: #000; text-align: center; line-height: 40px; font-weight: bold;">${artist.name.charAt(0).toUpperCase()}</div>`;

        return `
          <td style="padding: 8px; text-align: center;">
            ${avatarHtml}
            <div style="font-size: 12px; margin-top: 4px; font-weight: 500;">${artist.name}</div>
          </td>
        `;
      }).join("");

      lineupHtml = `
        <div style="margin: 25px 0;">
          <p style="font-size: 14px; color: #666; margin: 0 0 10px; font-weight: 600;">LINE UP:</p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>${artistsHtml}</tr>
          </table>
        </div>
      `;
    }

    // Create unsubscribe section
    const unsubscribeSection = codeId ? `
      <div style="margin-top: 40px; text-align: center; padding: 30px 20px; border-top: 1px solid #eee; background-color: #fafafa; border-radius: 8px;">
        <p style="font-size: 14px; color: #666; margin: 0 0 15px 0;">Don't want to receive personal invitations?</p>
        <a href="${getClientUrl()}/unsubscribe/${codeId}"
           style="display: inline-block; padding: 10px 24px; background-color: #f0f0f0; color: #666; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid #ddd;">
           Unsubscribe from invites
        </a>
        <p style="font-size: 12px; color: #999; margin: 15px 0 0 0; font-style: italic; line-height: 1.5;">
          Sorry if we bothered you – this was not an advertisement, just a heartfelt invite to a great event.
        </p>
      </div>
    ` : '';

    // Build the personal email HTML directly (no generic template)
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email }];
    // No BCC for personal invites - too many emails
    sendSmtpEmail.sender = {
      name: event.brand?.name || "GuestCode",
      email: process.env.SENDER_EMAIL || "contact@guest-code.com",
    };
    sendSmtpEmail.subject = `Personal Invitation - ${event.title} - Happy New Year 🎊`;

    sendSmtpEmail.htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

      <!-- Personal greeting and message FIRST -->
      <p style="font-size: 18px; line-height: 1.6; margin: 0 0 20px;">Hey ${cleanName},</p>

      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 15px;">
        We wanted to reach out personally because you've been part of our community. This isn't just another event email – it's a thank you for being with us.
      </p>

      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
        We'd love to see you at <strong>${event.title}</strong>. Your name is on the list, and we've attached your personal invitation below.
      </p>

      <!-- Event details box BELOW the personal message -->
      <div style="background-color: #f8f8f8; border-radius: 12px; padding: 20px; margin: 25px 0;">
        <div style="display: flex; margin-bottom: 15px;">
          <div style="flex: 1;">
            <p style="font-size: 12px; color: ${primaryColor}; margin: 0 0 4px; font-weight: 600; text-transform: uppercase;">Event</p>
            <p style="font-size: 16px; margin: 0; font-weight: 600;">${event.title}</p>
          </div>
        </div>

        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="50%" style="padding-right: 10px;">
              <p style="font-size: 12px; color: ${primaryColor}; margin: 0 0 4px; font-weight: 600; text-transform: uppercase;">Date</p>
              <p style="font-size: 14px; margin: 0;">${formattedDate}</p>
            </td>
            <td width="50%">
              <p style="font-size: 12px; color: ${primaryColor}; margin: 0 0 4px; font-weight: 600; text-transform: uppercase;">Time</p>
              <p style="font-size: 14px; margin: 0;">${event.startTime || "22:00"} - ${event.endTime || "06:00"}</p>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 15px;">
              <p style="font-size: 12px; color: ${primaryColor}; margin: 0 0 4px; font-weight: 600; text-transform: uppercase;">Location</p>
              <p style="font-size: 14px; margin: 0;">${event.location || event.venue || ""}</p>
              ${event.street ? `<p style="font-size: 14px; margin: 0; color: #666;">${event.street}</p>` : ""}
              ${event.postalCode || event.city ? `<p style="font-size: 14px; margin: 0; color: #666;">${event.postalCode || ""} ${event.city || ""}</p>` : ""}
            </td>
          </tr>
        </table>
      </div>

      ${lineupHtml}

      <!-- Invitation details -->
      <div style="background-color: ${primaryColor}20; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <p style="font-size: 14px; margin: 0 0 8px; font-weight: 600;">Your Benefit:</p>
        <p style="font-size: 16px; margin: 0 0 10px; font-weight: bold;">Free entrance all night</p>
        <p style="font-size: 14px; margin: 0; color: #555;">Please show the attached Personal Invitation at the entrance.</p>
      </div>

      <!-- Closing -->
      <p style="font-size: 16px; line-height: 1.6; margin: 25px 0 5px;">See you there! 🎊</p>
      <p style="font-size: 16px; line-height: 1.6; margin: 0;">– The ${event.brand?.name || "Event"} Team</p>

      ${unsubscribeSection}
    </div>
    `;

    sendSmtpEmail.attachment = [
      {
        content: pdfData.toString("base64"),
        name: `${cleanName.replace(/\s+/g, "_")}_Invitation.pdf`,
        type: "application/pdf",
      },
    ];

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    await apiInstance.sendTransacEmail(sendSmtpEmail);
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

    const resetLink = `${getClientUrl()}/reset-password/${token}`;

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
