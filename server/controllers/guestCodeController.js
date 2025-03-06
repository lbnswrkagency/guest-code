const Code = require("../models/codesModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer");
const { format } = require("date-fns");
const mongoose = require("mongoose");
const crypto = require("crypto");
const SibApiV3Sdk = require("sib-api-v3-sdk");

// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Generate a unique code
const generateUniqueCode = async () => {
  // Generate a random string (8 characters)
  const randomString = crypto.randomBytes(4).toString("hex").toUpperCase();

  // Check if code already exists
  const existingCode = await Code.findOne({ code: randomString });
  if (existingCode) {
    // Recursively generate a new code if this one exists
    return generateUniqueCode();
  }

  return randomString;
};

// Generate a unique security token for QR code
const generateSecurityToken = async () => {
  // Generate a random string (32 characters)
  return crypto.randomBytes(16).toString("hex");
};

// Format date for display on guest code
const formatGuestCodeDate = (dateString) => {
  if (!dateString) return { day: "", date: "", time: "" };

  const date = new Date(dateString);
  return {
    day: format(date, "EEEE"),
    date: format(date, "dd.MM.yyyy"),
    time: format(date, "HH:mm"),
  };
};

// Generate QR code for the guest code
const generateGuestCodeQR = async (securityToken) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(securityToken, {
      margin: 1,
      width: 225,
      color: {
        dark: "#000000", // Black dots
        light: "#ffffff", // White background
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

// Generate PDF for the guest code
const generateGuestCodePDF = async (code, event) => {
  try {
    // Fetch related data
    const brand = event ? await Brand.findById(event.brand) : null;

    // Get code settings to display condition
    const codeSettings = await mongoose.model("CodeSettings").findOne({
      eventId: event._id,
      type: "guest",
    });

    const condition = codeSettings?.condition || "";

    // Get brand colors or use defaults
    const primaryColor = brand?.colors?.primary || "#ffc807";
    const accentColor = brand?.colors?.accent || "#000000";

    // Generate QR code
    const qrCodeDataUrl = await generateGuestCodeQR(code.securityToken);

    // Format date
    const eventDate = formatGuestCodeDate(event?.date);

    // Create HTML template for the guest code - white theme, opposite of tickets
    const htmlTemplate = `
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Manrope', sans-serif;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body style="position: relative; background-color: white; width: 390px; height: 760px; overflow: hidden; border-radius: 28px; color: #222222;">
        <!-- Header section with logo -->
        <div style="position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 3.25rem 2.313rem 0;">
          <h1 style="margin: 0; font-weight: 700; font-size: 1.85rem; color: #000000;">Guest Code</h1>
          ${
            brand?.logo?.medium
              ? `<div style="display: flex; align-items: center; justify-content: center; background-color: #000000; border-radius: 50%; width: 3.5rem; height: 3.5rem; padding: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><img src="${brand.logo.medium}" style="max-width: 2.8rem; max-height: 2.8rem; object-fit: contain;"></div>`
              : `<div style="width: 3.5rem; height: 3.5rem; background-color: ${primaryColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 1.5rem;">${
                brand?.name?.charAt(0) || "G"
              }</span>
            </div>`
          }
        </div>
        
        <!-- Main content area - Whitish theme with improved contrast -->
        <div style="position: absolute; width: 20.375rem; height: 27rem; background-color: #f5f5f5; border-radius: 1.75rem; top: 7.5rem; left: 2rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
          
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem; color: #222222;">${
            event?.title || "Event"
          }</h3>   
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">             
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Location</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.location || event?.venue || ""
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857em; line-height: 1.25rem;">${
                event?.street || ""
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.postalCode ? `${event.postalCode} ` : ""
              }${event?.city || ""}</p>
            </div>
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Date</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                eventDate.day
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                eventDate.date
              }</p>
            </div>
          </div>
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div> 
              <div style="margin-top: 0.5rem;">
                <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Start</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                  event?.startTime || eventDate.time
                }</p>
              </div>
            </div>

            <div style="margin-top: 0.5rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">End</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">04:00</p>
            </div>
          </div>
          
          <!-- New Condition Section -->
          <div style="margin-top: 1.5rem; padding-left: 2.438rem; padding-right: 2.438rem;">
            <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Entry Requirements</p>
            <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
              condition || "No special requirements"
            }</p>
          </div>
          
          <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid ${primaryColor}; width: 15.5rem;"></div>

          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Guest</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                code.guestName
              }</p>        
            </div>
            
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">People</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                code.maxPax || 1
              }</p>
            </div>
          </div>
        </div>

        <!-- QR Code section with centered QR and floating code -->
        <div style="position: absolute; bottom: 2.938rem; left: 2rem; background-color: #222222; width: 20.375rem; height: 10rem; border-radius: 1.75rem; display: flex; justify-content: center; align-items: center;">
          <div style="position: relative; width: 100%; height: 100%;">
            <!-- Centered QR code -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
              <img style="background-color: white; width: 8rem; height: 8rem; border-radius: 0.5rem;" src="${qrCodeDataUrl}"></img>
            </div>
            
            <!-- Floating code text -->
            <div style="position: absolute; top: 1rem; right: 1.5rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 500; font-size: 0.8rem;">${
      code.code
    }</p>
            </div>
          </div>
        </div>
      </body>
    </html>`;

    // Launch puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(htmlTemplate);
    await page.emulateMediaType("screen");

    // Generate PDF with 9:16 aspect ratio
    const pdfBuffer = await page.pdf({
      width: "390px",
      height: "760px",
      printBackground: true,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
    });

    await browser.close();

    return {
      buffer: pdfBuffer,
      html: htmlTemplate,
    };
  } catch (error) {
    console.error("Error generating guest code PDF:", error);
    throw error;
  }
};

// Send guest code via email
const sendGuestCodeEmail = async (code, event, email, pdfBuffer) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Format attachment
    const attachments = [
      {
        content: pdfBuffer.toString("base64"),
        name: `guest_code_${code.code}.pdf`,
      },
    ];

    // Build email template
    const params = {
      sender: {
        name: "GuestCode",
        email: "no-reply@guestcode.io",
      },
      to: [
        {
          email: email.trim(),
          name: code.guestName || "Guest",
        },
      ],
      replyTo: {
        email: "no-reply@guestcode.io",
        name: "GuestCode",
      },
      subject: `Your Guest Code for ${event?.title || "Event"}`,
      htmlContent: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px; background-color: #f8f8f8; margin-bottom: 20px; border-radius: 8px;">
            <h1 style="color: #222; margin: 0; font-size: 28px;">Your Guest Code</h1>
            <p style="margin: 10px 0 0; color: #555;">For ${
              event?.title || "the event"
            }</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Hello ${
            code.guestName
          },</p>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Here is your guest code for the event. Please keep this email and bring it with you to the event.</p>
          
          <div style="background-color: #f8f8f8; border-left: 4px solid #ffc807; padding: 15px; margin-bottom: 20px;">
            <p style="font-size: 16px; margin: 0 0 10px; font-weight: bold;">Code Details:</p>
            <p style="font-size: 16px; margin: 0 0 5px;">Code: <strong>${
              code.code
            }</strong></p>
            <p style="font-size: 16px; margin: 0;">Event Date: <strong>${
              formatGuestCodeDate(event?.date).date
            }</strong></p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">You can show this email or the attached PDF at the event entrance. The code can be scanned from your phone screen.</p>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 30px;">We look forward to seeing you at the event!</p>
          
          <div style="text-align: center; padding: 20px; background-color: #f8f8f8; border-radius: 8px;">
            <p style="font-size: 14px; color: #666; margin: 0;">This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `,
      attachment: attachments,
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(params);
    return result;
  } catch (error) {
    console.error("Error sending guest code email:", error);
    throw error;
  }
};

// Create a guest code
const createGuestCode = async (
  eventId,
  guestName,
  guestEmail,
  userId,
  maxPax = 1
) => {
  try {
    // Generate unique code
    const code = await generateUniqueCode();

    // Generate security token for validation
    const securityToken = await generateSecurityToken();

    // Generate QR code with the security token
    const qrCodeDataUrl = await QRCode.toDataURL(securityToken, {
      margin: 1,
      width: 225,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // Create new code document
    const newCode = new Code({
      eventId,
      type: "guest",
      name: `Guest Code for ${guestName}`,
      code,
      qrCode: qrCodeDataUrl,
      securityToken,
      createdBy:
        userId || new mongoose.Types.ObjectId("000000000000000000000000"), // Default guest user ID if not provided
      guestName,
      guestEmail,
      status: "active",
      maxPax: maxPax, // Use the provided maxPax parameter
      paxChecked: 0,
      usageCount: 0,
    });

    // Save to database
    await newCode.save();

    return newCode;
  } catch (error) {
    console.error("[createGuestCode] Error:", error);
    throw error;
  }
};

// Generate guest code
const generateGuestCode = async (req, res) => {
  try {
    const { eventId, guestName, guestEmail, maxPax = 1 } = req.body;

    // Validate required fields
    if (!eventId || !guestName || !guestEmail) {
      return res.status(400).json({
        message: "Event ID, guest name, and email are required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail.trim())) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // Sanitize inputs
    const sanitizedName = guestName.trim();
    const sanitizedEmail = guestEmail.trim();

    // Get the current user ID if authenticated, otherwise use null
    const userId = req.user ? req.user._id : null;

    // Fetch the event with brand and lineups
    const event = await Event.findById(eventId)
      .populate("brand")
      .populate("lineups");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    try {
      // Create the guest code
      const code = await createGuestCode(
        eventId,
        sanitizedName,
        sanitizedEmail,
        userId,
        maxPax
      );

      try {
        // Generate the PDF
        const { buffer: pdfBuffer } = await generateGuestCodePDF(code, event);

        // Send the email
        await sendGuestCodeEmail(code, event, sanitizedEmail, pdfBuffer);

        return res.status(200).json({
          message: "Guest code generated and sent successfully",
          code: {
            id: code._id,
            guestName: code.guestName,
            code: code.code,
          },
        });
      } catch (emailError) {
        console.error(`[generateGuestCode] Email error: ${emailError.message}`);

        // Still return the code even if email fails
        return res.status(207).json({
          message: "Guest code generated but email could not be sent",
          error: emailError.message,
          code: {
            id: code._id,
            guestName: code.guestName,
            code: code.code,
          },
        });
      }
    } catch (codeError) {
      console.error(
        `[generateGuestCode] Code generation error: ${codeError.message}`
      );
      return res.status(500).json({
        message: "Failed to generate guest code",
        error: codeError.message,
      });
    }
  } catch (error) {
    console.error(`[generateGuestCode] Server error: ${error.message}`);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Validate a guest code by security token
const validateGuestCode = async (req, res) => {
  try {
    const { securityToken } = req.params;

    if (!securityToken) {
      return res.status(400).json({ message: "Security token is required" });
    }

    // Find the code
    const code = await Code.findOne({ securityToken, type: "guest" });
    if (!code) {
      return res.status(404).json({ message: "Invalid code" });
    }

    // Check if code is active
    if (code.status !== "active") {
      return res.status(403).json({
        message: `Code is ${code.status}`,
        status: code.status,
      });
    }

    // Check if we've reached max usage
    if (code.maxPax > 0 && code.paxChecked >= code.maxPax) {
      // Update status to used
      code.status = "used";
      await code.save();

      return res.status(403).json({
        message: "Code has reached maximum usage",
        status: "used",
      });
    }

    // Increment usage count
    code.paxChecked += 1;
    code.usageCount += 1;

    // If we've reached max usage, mark as used
    if (code.maxPax > 0 && code.paxChecked >= code.maxPax) {
      code.status = "used";
    }

    await code.save();

    // Get event details
    const event = await Event.findById(code.eventId)
      .populate("brand")
      .populate("lineups")
      .select("title date startTime location brand lineups");

    // Return success with code and event details
    res.status(200).json({
      message: "Code validated successfully",
      code,
      event,
    });
  } catch (error) {
    console.error("Error validating guest code:", error);
    res.status(500).json({
      message: "Error validating guest code",
      error: error.message,
    });
  }
};

// Get PDF for a guest code
const getGuestCodePDF = async (req, res) => {
  try {
    const { codeId } = req.params;

    // Find the code
    const code = await Code.findById(codeId).select("-qrCode");
    if (!code || code.type !== "guest") {
      return res.status(404).json({ message: "Guest code not found" });
    }

    // Get the event
    const event = await Event.findById(code.eventId)
      .populate("brand")
      .populate("lineups");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Generate the PDF
    const { buffer } = await generateGuestCodePDF(code, event);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="guest_code_${code.code}.pdf"`
    );

    // Send the PDF
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Error getting guest code PDF:", error);
    res.status(500).json({
      message: "Error getting guest code PDF",
      error: error.message,
    });
  }
};

module.exports = {
  generateGuestCode,
  validateGuestCode,
  getGuestCodePDF,
};
