const QRCode = require("qrcode");
const puppeteer = require("puppeteer");
const Code = require("../models/codesModel");
const Event = require("../models/eventsModel");
const CodeSettings = require("../models/codeSettingsModel");
const Brand = require("../models/brandModel");

/**
 * Generate QR code for a code
 * @param {string} codeId - The ID of the code
 * @param {string} securityToken - The security token for the code
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
const generateCodeQR = async (codeId, securityToken) => {
  try {
    // Instead of creating a URL, just use the security token directly
    // This matches the approach used in guestCodeController.js
    const qrData = securityToken;

    // Generate QR code as base64 string
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 225,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrCodeImage;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};

/**
 * Format date for display in the code PDF
 * @param {Date} dateString - The date string to format
 * @returns {Object} - Formatted date object
 */
const formatCodeDate = (dateString) => {
  if (!dateString) {
    return {
      day: "Sunday",
      date: "01.01.2023",
      time: "20:00",
    };
  }

  const date = new Date(dateString);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return {
    day: days[date.getDay()],
    date: date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: "20:00", // Default time if not specified
  };
};

/**
 * Generate PDF for a code
 * @param {Object} code - The code object
 * @param {Object} event - The event object
 * @param {Object} codeSettings - The code settings object
 * @returns {Promise<Object>} - Object containing PDF buffer and HTML
 */
const generateCodePDF = async (code, event, codeSettings) => {
  try {
    // Fetch related data
    const brand = event?.brand || null;

    // Get brand colors or use defaults
    const primaryColor =
      codeSettings?.color || event?.primaryColor || "#ffc807";
    const accentColor = "#000000";

    // Get code display name from settings or use capitalized type
    const displayType =
      codeSettings?.name ||
      code.type.charAt(0).toUpperCase() + code.type.slice(1);

    // Generate QR code
    const qrCodeDataUrl = await generateCodeQR(code._id, code.securityToken);

    // Format date
    const eventDate = formatCodeDate(event?.date);

    // Use event's startTime if available
    if (event?.startTime && eventDate.time === "20:00") {
      eventDate.time = event.startTime;
    }

    // Create HTML template for the code
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
          <h1 style="margin: 0; font-weight: 700; font-size: 1.85rem; color: #000000;">${displayType}</h1>
          ${
            brand?.logo?.medium
              ? `<div style="display: flex; align-items: center; justify-content: center; background-color: #000000; border-radius: 50%; width: 3.5rem; height: 3.5rem; overflow: hidden;"><img src="${brand.logo.medium}" style="max-width: 2.8rem; max-height: 2.8rem; object-fit: contain;"></div>`
              : `<div style="width: 3.5rem; height: 3.5rem; background-color: #000000; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 1.5rem;">${
                event?.name?.charAt(0) || "E"
              }</span>
            </div>`
          }
        </div>
        
        <!-- Main content area - Whitish theme with improved contrast -->
        <div style="position: absolute; width: 20.375rem; height: 27rem; background-color: #f5f5f5; border-radius: 1.75rem; top: 7.5rem; left: 2rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
          
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem; color: #222222;">${
            event?.name || "Event"
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
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.endTime || "06:00"
              }</p>
            </div>
          </div>
          
          <!-- Entry Requirements Section -->
          <div style="margin-top: 1.5rem; padding-left: 2.438rem; padding-right: 2.438rem;">
            <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Entry Requirements</p>
            <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
              code.condition ||
              codeSettings?.condition ||
              "Free entrance all night"
            }</p>
          </div>
          
          <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid ${primaryColor}; width: 15.5rem;"></div>

          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Guest</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                code.name
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
    console.error("Error generating code PDF:", error);
    throw error;
  }
};

/**
 * Get code PDF for download
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCodePDF = async (req, res) => {
  try {
    console.log(
      "[getCodePDF] Starting to process request for codeId:",
      req.params.codeId
    );
    console.log("[getCodePDF] User:", req.user);

    const { codeId } = req.params;

    // Find the code
    const code = await Code.findById(codeId);
    if (!code) {
      console.log("[getCodePDF] Code not found:", codeId);
      return res.status(404).json({ message: "Code not found" });
    }
    console.log("[getCodePDF] Found code:", code._id);

    // Find the event
    const event = await Event.findById(code.eventId).populate("brand");
    if (!event) {
      console.log("[getCodePDF] Event not found:", code.eventId);
      return res.status(404).json({ message: "Event not found" });
    }
    console.log("[getCodePDF] Found event:", event._id);

    // Find code settings if available
    let codeSettings = null;
    if (code.codeSettingId) {
      codeSettings = await CodeSettings.findById(code.codeSettingId);
      console.log("[getCodePDF] Found code settings:", codeSettings?._id);
    }

    // Get display name for the code
    const displayName =
      codeSettings?.name ||
      code.type.charAt(0).toUpperCase() + code.type.slice(1);
    console.log("[getCodePDF] Using display name:", displayName);

    // Generate PDF
    console.log("[getCodePDF] Generating PDF...");
    const { buffer } = await generateCodePDF(code, event, codeSettings);
    console.log("[getCodePDF] PDF generated successfully");

    // Set response headers for download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${code.name}-${displayName}.pdf"`
    );

    // Send PDF
    console.log("[getCodePDF] Sending PDF response");
    res.send(buffer);
  } catch (error) {
    console.error("[getCodePDF] Error:", error);
    res.status(500).json({ message: "Failed to generate code PDF" });
  }
};

/**
 * Get code PDF for viewing in browser
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCodeView = async (req, res) => {
  try {
    console.log(
      "[getCodeView] Starting to process request for codeId:",
      req.params.codeId
    );
    console.log("[getCodeView] User:", req.user);

    const { codeId } = req.params;

    // Find the code
    const code = await Code.findById(codeId);
    if (!code) {
      console.log("[getCodeView] Code not found:", codeId);
      return res.status(404).json({ message: "Code not found" });
    }
    console.log("[getCodeView] Found code:", code._id);

    // Find the event
    const event = await Event.findById(code.eventId).populate("brand");
    if (!event) {
      console.log("[getCodeView] Event not found:", code.eventId);
      return res.status(404).json({ message: "Event not found" });
    }
    console.log("[getCodeView] Found event:", event._id);

    // Find code settings if available
    let codeSettings = null;
    if (code.codeSettingId) {
      codeSettings = await CodeSettings.findById(code.codeSettingId);
      console.log("[getCodeView] Found code settings:", codeSettings?._id);
    }

    // Generate PDF
    console.log("[getCodeView] Generating PDF...");
    const { buffer } = await generateCodePDF(code, event, codeSettings);
    console.log("[getCodeView] PDF generated successfully");

    // Set response headers for inline viewing
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");

    // Prevent caching to ensure fresh content
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Send PDF
    console.log("[getCodeView] Sending PDF response");
    res.send(buffer);
  } catch (error) {
    console.error("[getCodeView] Error:", error);
    res
      .status(500)
      .json({ message: "Failed to generate code PDF for viewing" });
  }
};

/**
 * Get code image (QR code only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCodeImage = async (req, res) => {
  try {
    const { codeId } = req.params;

    // Find the code
    const code = await Code.findById(codeId);
    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // Generate QR code
    const qrCodeImage = await generateCodeQR(code._id, code.securityToken);

    // Set content type
    res.setHeader("Content-Type", "image/png");

    // Extract the base64 data from the data URL
    const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, "");

    // Convert base64 to buffer and send
    const imageBuffer = Buffer.from(base64Data, "base64");
    res.send(imageBuffer);
  } catch (error) {
    console.error("Error getting code image:", error);
    res.status(500).json({ message: "Failed to generate code image" });
  }
};

/**
 * Generate PNG version of the code ticket
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCodePNG = async (req, res) => {
  try {
    console.log(
      "[getCodePNG] Starting to process request for codeId:",
      req.params.codeId
    );

    const { codeId } = req.params;

    // Find the code
    const code = await Code.findById(codeId);
    if (!code) {
      console.log("[getCodePNG] Code not found:", codeId);
      return res.status(404).json({ message: "Code not found" });
    }

    // Find the event
    const event = await Event.findById(code.eventId).populate("brand");
    if (!event) {
      console.log("[getCodePNG] Event not found:", code.eventId);
      return res.status(404).json({ message: "Event not found" });
    }

    // Find code settings if available
    let codeSettings = null;
    if (code.codeSettingId) {
      codeSettings = await CodeSettings.findById(code.codeSettingId);
    }

    // Generate QR code
    const qrCodeDataUrl = await generateCodeQR(code._id, code.securityToken);

    // Get brand colors or use defaults
    const primaryColor =
      codeSettings?.color || event?.primaryColor || "#ffc807";

    // Get code display name from settings or use capitalized type
    const displayType =
      codeSettings?.name ||
      code.type.charAt(0).toUpperCase() + code.type.slice(1);

    // Format date
    const eventDate = formatCodeDate(event?.date);

    // Use event's startTime if available
    if (event?.startTime && eventDate.time === "20:00") {
      eventDate.time = event.startTime;
    }

    // Create HTML template for the code (same as PDF)
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
          <h1 style="margin: 0; font-weight: 700; font-size: 1.85rem; color: #000000;">${displayType}</h1>
          ${
            event.brand?.logo?.medium
              ? `<div style="display: flex; align-items: center; justify-content: center; background-color: #000000; border-radius: 50%; width: 3.5rem; height: 3.5rem; overflow: hidden;"><img src="${event.brand.logo.medium}" style="max-width: 2.8rem; max-height: 2.8rem; object-fit: contain;"></div>`
              : `<div style="width: 3.5rem; height: 3.5rem; background-color: #000000; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 1.5rem;">${
                event?.name?.charAt(0) || "E"
              }</span>
            </div>`
          }
        </div>
        
        <!-- Main content area - Whitish theme with improved contrast -->
        <div style="position: absolute; width: 20.375rem; height: 27rem; background-color: #f5f5f5; border-radius: 1.75rem; top: 7.5rem; left: 2rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
          
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem; color: #222222;">${
            event?.name || "Event"
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
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.endTime || "06:00"
              }</p>
            </div>
          </div>
          
          <!-- Entry Requirements Section -->
          <div style="margin-top: 1.5rem; padding-left: 2.438rem; padding-right: 2.438rem;">
            <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Entry Requirements</p>
            <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
              code.condition ||
              codeSettings?.condition ||
              "Free entrance all night"
            }</p>
          </div>
          
          <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid ${primaryColor}; width: 15.5rem;"></div>

          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Guest</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                code.name
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

    // Launch puppeteer to generate PNG
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(htmlTemplate);
    await page.emulateMediaType("screen");

    // Set viewport to match the ticket dimensions (9:16 aspect ratio)
    await page.setViewport({
      width: 390,
      height: 760,
      deviceScaleFactor: 2, // Higher resolution for crisp image
    });

    // Take screenshot as PNG
    const pngBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
      omitBackground: false,
    });

    await browser.close();

    // Set response headers
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Send PNG
    res.send(pngBuffer);
  } catch (error) {
    console.error("[getCodePNG] Error:", error);
    res.status(500).json({ message: "Failed to generate code PNG" });
  }
};

module.exports = {
  getCodePDF,
  getCodeView,
  getCodeImage,
  getCodePNG,
};
