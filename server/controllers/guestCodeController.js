const Code = require("../models/codesModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer");
const { format } = require("date-fns");
const mongoose = require("mongoose");
const crypto = require("crypto");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const { createEventEmailTemplate } = require("../utils/emailLayout");

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

  try {
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error("Invalid date string:", dateString);
      return { day: "", date: "", time: "" };
    }

    // Get event time from the event object if available
    let timeString = "";

    // If the date has time information, use it
    if (date.getHours() !== 0 || date.getMinutes() !== 0) {
      timeString = format(date, "HH:mm");
    } else {
      // Default time if not specified
      timeString = "20:00";
    }

    console.log("Formatting date:", {
      original: dateString,
      parsed: date,
      formatted: {
        day: format(date, "EEEE"),
        date: format(date, "dd.MM.yyyy"),
        time: timeString,
      },
    });

    return {
      day: format(date, "EEEE"),
      date: format(date, "dd.MM.yyyy"),
      time: timeString,
    };
  } catch (error) {
    console.error("Error formatting date:", error);
    return { day: "", date: "", time: "" };
  }
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

    // Format date - prioritize startDate over date
    const eventDate = formatGuestCodeDate(event?.startDate || event?.date);

    // Use event's startTime if available
    if (event?.startTime && eventDate.time === "20:00") {
      eventDate.time = event.startTime;
      console.log("Using event's startTime:", event.startTime);
    }

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
      <body style="position: relative; background-color: ${primaryColor}; width: 390px; height: 760px; overflow: hidden; border-radius: 28px; color: #222222;">
        <!-- Header section with logo -->
        <div style="position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 3.25rem 2.313rem 0;">
          <h1 style="margin: 0; font-weight: 700; font-size: 1.85rem; color: #000000;">Guest Code</h1>
          ${
            brand?.logo?.medium
              ? `<div style="display: flex; align-items: center; justify-content: center; background-color: #000000; border-radius: 50%; width: 3.5rem; height: 3.5rem; overflow: hidden;"><img src="${brand.logo.medium}" style="max-width: 2.8rem; max-height: 2.8rem; object-fit: contain;"></div>`
              : `<div style="width: 3.5rem; height: 3.5rem; background-color: #000000; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
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
              ${
                event?.street
                  ? `<p style="margin: 0; font-weight: 500; font-size: 0.857em; line-height: 1.25rem;">${event.street}</p>`
                  : ""
              }
              ${
                event?.address && !event?.street
                  ? `<p style="margin: 0; font-weight: 500; font-size: 0.857em; line-height: 1.25rem;">${event.address}</p>`
                  : ""
              }
              ${
                event?.postalCode || event?.city
                  ? `<p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                      event.postalCode || ""
                    } ${event.city || ""}</p>`
                  : ""
              }
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
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.endTime || "04:00"
              }</p>
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
              <p style="margin: 0; color: ${primaryColor}; font-weight: 500; font-size: 0.7rem;">${
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

    // Ensure lineups are properly formatted with all fields
    const lineups = Array.isArray(event.lineups)
      ? event.lineups.map((lineup) => ({
          name: lineup.name || "",
          category: lineup.category || "Other",
          subtitle: lineup.subtitle || "",
          avatar: lineup.avatar || null,
        }))
      : [];

    // Use the emailLayout template
    const htmlContent = createEventEmailTemplate({
      recipientName: code.guestName || "Guest",
      eventTitle: event?.title || "Event",
      eventDate: event?.startDate || event?.date,
      eventLocation: event?.location || event?.venue || "",
      eventAddress: event?.street || event?.address || "",
      eventCity: event?.city || "",
      eventPostalCode: event?.postalCode || "",
      startTime: event?.startTime || "",
      endTime: event?.endTime || "",
      description: event?.description || "",
      lineups: lineups,
      primaryColor: "#ffc807",
      additionalContent: `
        <div style="background-color: #f8f8f8; border-left: 4px solid #ffc807; padding: 15px; margin: 20px 0;">
          <p style="font-size: 16px; margin: 0 0 10px; font-weight: bold;">Your Guest Code:</p>
          <p style="font-size: 18px; margin: 0 0 5px; font-weight: bold; color: #ffc807;">${
            code.code
          }</p>
          <p style="font-size: 14px; margin: 10px 0 0;">Max guests: ${
            code.maxPax || 1
          }</p>
          <p style="font-size: 14px; margin: 10px 0 0;">You can show this email or the attached PDF at the event entrance. The code can be scanned from your phone screen.</p>
        </div>
      `,
      footerText:
        "This is an automated email from GuestCode. Please do not reply to this message.",
    });

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
      bcc: [
        {
          email: "contact@guest-code.com",
        },
      ],
      replyTo: {
        email: "contact@guestcode.com",
        name: "GuestCode",
      },
      subject: `Your Guest Code for ${event?.title || "Event"}`,
      htmlContent: htmlContent,
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
  guestPhone,
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
      guestPhone,
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
    const { eventId, guestName, guestEmail, guestPhone, maxPax = 1 } = req.body;

    console.log("[GuestCode] Generate request:", {
      eventId,
      guestName,
      guestEmail,
      guestPhone,
      maxPax,
      isAuthenticated: !!req.user,
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });

    // Fetch event and code settings first to determine requirements
    const event = await Event.findById(eventId);
    if (!event) {
      console.log("[GuestCode] Event not found:", eventId);
      return res.status(404).json({ message: "Event not found" });
    }

    // Get guest code settings to check email/phone requirements
    const codeSettings = await mongoose.model("CodeSettings").findOne({
      eventId: eventId,
      type: "guest",
    });

    const requirePhone = codeSettings?.requirePhone === true; // Default to false

    // Validate basic required fields (email is always required)
    if (!eventId || !guestName || !guestEmail) {
      console.log("[GuestCode] Missing required fields");
      return res.status(400).json({
        message: "Event ID, guest name, and email are required",
      });
    }

    // Validate email format (always required)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail.trim())) {
      console.log("[GuestCode] Invalid email format:", guestEmail);
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // Validate phone if required
    if (requirePhone) {
      if (!guestPhone) {
        console.log("[GuestCode] Phone is required but not provided");
        return res.status(400).json({
          message: "Phone number is required",
        });
      }
      
      // Phone validation (allows various formats including local numbers)
      const cleanPhone = guestPhone.replace(/[\s\-\(\)\.]/g, '');
      // Accept international (+49...), local German (0...), and general formats
      const phoneRegex = /^(\+?[1-9]\d{1,14}|0\d{9,10})$/;
      if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 7) {
        console.log("[GuestCode] Invalid phone format:", guestPhone);
        return res.status(400).json({
          message: "Invalid phone number format",
        });
      }
    }

    // Sanitize inputs
    const sanitizedName = guestName.trim();
    const sanitizedEmail = guestEmail.trim(); // Email is always provided
    const sanitizedPhone = guestPhone ? guestPhone.trim() : null;

    // Check if a guest code already exists for this email and event
    const existingCode = await Code.findOne({
      eventId,
      guestEmail: sanitizedEmail,
      type: "guest",
    });

    if (existingCode) {
      console.log(
        "[GuestCode] Guest code already exists for email:",
        sanitizedEmail
      );
      return res.status(409).json({
        message: "You already received a Guest Code for this event.",
        code: {
          id: existingCode._id,
          guestName: existingCode.guestName,
          code: existingCode.code,
        },
        alreadyExists: true,
      });
    }

    // Get the current user ID if authenticated, otherwise use null
    const userId = req.user ? req.user._id : null;
    console.log("[GuestCode] User ID for code generation:", userId);

    // Populate the event with brand and lineups
    await event.populate("brand");
    await event.populate("lineups");

    console.log("[GuestCode] Found event:", {
      eventId: event._id,
      eventTitle: event.title,
      brandId: event.brand?._id,
      brandName: event.brand?.name,
    });

    try {
      // Create the guest code
      const code = await createGuestCode(
        eventId,
        sanitizedName,
        sanitizedEmail,
        sanitizedPhone,
        userId,
        maxPax
      );

      console.log("[GuestCode] Code created:", {
        codeId: code._id,
        code: code.code,
        guestName: code.guestName,
        maxPax: code.maxPax,
      });

      try {
        // Generate the PDF
        const { buffer: pdfBuffer } = await generateGuestCodePDF(code, event);
        console.log("[GuestCode] PDF generated successfully");

        // Send the email
        await sendGuestCodeEmail(code, event, sanitizedEmail, pdfBuffer);
        console.log("[GuestCode] Email sent successfully to:", sanitizedEmail);

        return res.status(200).json({
          message: "Guest code generated and sent successfully",
          code: {
            id: code._id,
            guestName: code.guestName,
            code: code.code,
          },
        });
      } catch (emailError) {
        console.error(`[GuestCode] Email error: ${emailError.message}`);

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
      console.error(`[GuestCode] Code generation error: ${codeError.message}`);
      return res.status(500).json({
        message: "Failed to generate guest code",
        error: codeError.message,
      });
    }
  } catch (error) {
    console.error(`[GuestCode] Server error: ${error.message}`);
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
      .select(
        "title date startTime endTime location street address postalCode city brand lineups venue"
      );

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
      .populate("lineups")
      .select(
        "title date startTime endTime location street address postalCode city brand lineups venue"
      );
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
