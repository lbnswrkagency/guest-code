const TableCode = require("../models/TableCode");
const Event = require("../models/eventsModel");
const QRCode = require("qrcode");
const crypto = require("crypto");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const puppeteer = require("puppeteer");
const { createEventEmailTemplate } = require("../utils/emailLayout");

// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Helper function to format date properly for display
const formatCodeDate = (dateString) => {
  // Check if dateString is valid
  if (!dateString) return "N/A";

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) return "N/A";

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

// Helper function to format date in DE format for ticket
const formatDateDE = (dateString) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) return "N/A";

  // Format as DD.MM.YYYY
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

// Helper function to get day of week
const getDayOfWeek = (dateString) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) return "N/A";

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[date.getDay()];
};

// Helper function to generate QR code
const generateQR = async (data) => {
  try {
    // Instead of JSON.stringify, convert to a simple string format
    const qrString = typeof data === "string" ? data : `table-${data.codeId}`;

    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 1,
      width: 225,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

const addTableCode = async (req, res) => {
  const {
    name,
    pax,
    tableNumber,
    event,
    host,
    hostId,
    condition,
    backstagePass,
    paxChecked,
    isAdmin,
  } = req.body;

  // Ensure that the user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const tableCodeData = {
      name,
      pax,
      tableNumber,
      event,
      host,
      hostId,
      condition: condition || "TABLE RESERVATION", // Default value
      paxChecked: paxChecked || 0, // Default value
      backstagePass: backstagePass || false,
      status: req.body.isAdmin ? "confirmed" : "pending",
      createdAt: new Date(),
    };

    const createdTableCode = await TableCode.create(tableCodeData);

    res.status(201).json({
      message: "Table Code created successfully",
      data: createdTableCode,
    });
  } catch (err) {
    console.error("Error creating table code:", err);
    res
      .status(500)
      .json({ message: "Error creating table code", error: err.message });
  }
};

/**
 * Get table counts for a specific event
 */
const getTableCounts = async (req, res) => {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({ message: "Event ID is required" });
  }

  try {
    // Fetch all table codes for this event
    const tableCounts = await TableCode.find({ event: eventId });

    res.status(200).json({
      tableCounts,
      totalCount: tableCounts.length,
    });
  } catch (error) {
    console.error("Error fetching table counts:", error);
    res.status(500).json({
      message: "Error fetching table counts",
      error: error.message,
    });
  }
};

/**
 * Generate a PNG image for viewing (not downloading)
 */
const generateCodeImage = async (req, res) => {
  try {
    const { codeId } = req.params;

    const tableCode = await TableCode.findById(codeId);
    if (!tableCode) {
      return res.status(404).json({ message: "Table code not found" });
    }

    // Find the event
    const event = await Event.findById(tableCode.event)
      .populate({
        path: "lineups",
        select: "name category avatar",
      })
      .populate("brand");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Generate PNG
    const pngBuffer = await generateTablePNG(tableCode, event);

    // Set headers for PNG inline display
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename=Table_${
        tableCode.tableNumber
      }_${tableCode.name.replace(/\s+/g, "_")}.png`,
      "Content-Length": pngBuffer.length,
    });

    // Send the PNG
    res.send(pngBuffer);
  } catch (error) {
    console.error("Error generating table code image:", error);
    res.status(500).json({
      message: "Error generating table code image",
      error: error.message,
    });
  }
};

/**
 * Generate a PNG image for downloading
 */
const generateCodePNGDownload = async (req, res) => {
  try {
    const { codeId } = req.params;

    const tableCode = await TableCode.findById(codeId);
    if (!tableCode) {
      return res.status(404).json({ message: "Table code not found" });
    }

    // Find the event
    const event = await Event.findById(tableCode.event)
      .populate({
        path: "lineups",
        select: "name category avatar",
      })
      .populate("brand");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Generate PNG
    const pngBuffer = await generateTablePNG(tableCode, event);

    // Set headers for PNG download
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename=Table_${
        tableCode.tableNumber
      }_${tableCode.name.replace(/\s+/g, "_")}.png`,
      "Content-Length": pngBuffer.length,
    });

    // Send the PNG
    res.send(pngBuffer);
  } catch (error) {
    console.error("Error downloading table code PNG:", error);
    res.status(500).json({
      message: "Error downloading table code PNG",
      error: error.message,
    });
  }
};

/**
 * Generate a PDF (primarily for email attachments)
 */
const generateCodePDF = async (req, res) => {
  try {
    const { codeId } = req.params;

    const tableCode = await TableCode.findById(codeId);
    if (!tableCode) {
      return res.status(404).json({ message: "Table code not found" });
    }

    // Find the event
    const event = await Event.findById(tableCode.event)
      .populate({
        path: "lineups",
        select: "name category avatar",
      })
      .populate("brand");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Generate PDF
    const pdfBuffer = await generateTablePDF(tableCode, event);

    // Set headers for PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Table_${
        tableCode.tableNumber
      }_${tableCode.name.replace(/\s+/g, "_")}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating table code PDF:", error);
    res.status(500).json({
      message: "Error generating table code PDF",
      error: error.message,
    });
  }
};

/**
 * Send a table code via email
 */
const sendTableCodeEmail = async (req, res) => {
  try {
    const { codeId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // Find the table code
    const tableCode = await TableCode.findById(codeId);
    if (!tableCode) {
      return res.status(404).json({ message: "Table code not found" });
    }

    // Find the event
    const event = await Event.findById(tableCode.event)
      .populate({
        path: "lineups",
        select: "name category avatar",
      })
      .populate("brand");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get brand colors or use defaults
    const primaryColor = event?.primaryColor || "#ffc807";

    // Generate PDF version of the code for email
    const pdfBuffer = await generateTablePDF(tableCode, event);

    // Set up the email sender using Brevo
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Format attachment
    const attachments = [
      {
        content: pdfBuffer.toString("base64"),
        name: `Table_${tableCode.tableNumber}_${tableCode.name.replace(
          /\s+/g,
          "_"
        )}.pdf`,
      },
    ];

    // Prioritize startDate over date, similar to guestCodeController
    const eventDate = event?.startDate || event?.date;
    const formattedDate = formatCodeDate(eventDate);
    const formattedDateDE = formatDateDE(eventDate);
    const dayOfWeek = getDayOfWeek(eventDate);

    // Generate custom content section with code details
    const codeDetailsHtml = `
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h3 style="color: ${primaryColor}; margin-top: 0;">Your Table Code</h3>
        <p style="font-size: 16px; margin: 0 0 10px;">We've attached your table code as a PDF to this email. You can print it or show it on your phone at the event.</p>
        <div style="background-color: white; border-radius: 5px; padding: 15px; margin-top: 15px; border: 1px solid #eee;">
          <p style="margin: 0 0 5px;"><strong>Event Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 5px;"><strong>Guest Name:</strong> ${
            tableCode.name
          }</p>
          <p style="margin: 0 0 5px;"><strong>Table Number:</strong> ${
            tableCode.tableNumber
          }</p>
          <p style="margin: 0 0 5px;"><strong>People:</strong> ${
            tableCode.pax || 1
          }</p>
          ${
            tableCode.condition
              ? `<p style="margin: 0;"><strong>Notes:</strong> ${tableCode.condition}</p>`
              : ""
          }
        </div>
      </div>
    `;

    // Build the email using our template but with proper date information
    const emailHtml = createEventEmailTemplate({
      recipientName: tableCode.name,
      eventTitle: event.title,
      eventDate: eventDate, // Use the correct date object
      eventLocation: event.location || event.venue || "",
      eventAddress: event.street || event.address || "",
      eventCity: event.city || "",
      eventPostalCode: event.postalCode || "",
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      lineups: event.lineups,
      primaryColor,
      additionalContent: codeDetailsHtml,
      footerText:
        "This is an automated email from GuestCode. Please do not reply to this message.",
    });

    // Set up email parameters
    const params = {
      sender: {
        name: "GuestCode",
        email: "no-reply@guestcode.io",
      },
      to: [
        {
          email: email.trim(),
          name: tableCode.name.trim(),
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
      subject: `Your Table Code for ${event?.title || "Event"}`,
      htmlContent: emailHtml,
      attachment: attachments,
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(params);

    // Update the code to record that it was sent by email
    tableCode.emailedTo = tableCode.emailedTo || [];
    tableCode.emailedTo.push({
      email: email,
      sentAt: new Date(),
    });
    await tableCode.save();

    return res.status(200).json({
      message: "Table code sent by email successfully",
      tableCode: {
        _id: tableCode._id,
        name: tableCode.name,
        tableNumber: tableCode.tableNumber,
      },
    });
  } catch (error) {
    console.error("[sendTableCodeEmail] Error sending email:", error);
    return res
      .status(500)
      .json({ message: "Failed to send table code by email" });
  }
};

// Generate PNG image of a table code
const generateTablePNG = async (tableCode, event) => {
  try {
    // Generate a unique display code if it doesn't exist
    // This is what will be shown to users - using tableNumber for simplicity
    const displayCode = `TABLE-${tableCode.tableNumber}`;

    // Generate QR code with the table ID
    const qrData = tableCode._id.toString();
    const qrCodeDataUrl = await generateQR(qrData);

    // Get brand colors or use defaults
    const primaryColor = event?.primaryColor || "#ffc807";
    const accentColor = "#000000";

    // Get event start and end times
    const startTime = event?.startTime || "23:00";
    const endTime = event?.endTime || "06:00";

    // Prioritize startDate over date, similar to guestCodeController
    const eventDate = event?.startDate || event?.date;

    // Create HTML template for the PNG
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
          
          /* VIP QR code section with luxury pattern */
          .qr-section {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          
          .qr-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: linear-gradient(135deg, #000000 25%, #222222 25%, #222222 50%, #000000 50%, #000000 75%, #222222 75%, #222222 100%);
            background-size: 20px 20px;
            opacity: 1;
          }
          
          .qr-gold-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, rgba(255, 215, 0, 0.3) 0%, rgba(0, 0, 0, 0) 70%);
          }
          
          .qr-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
          }
          
          .qr-code-image {
            background-color: white;
            width: 8rem;
            height: 8rem;
            border-radius: 0.5rem;
            border: 3px solid ${primaryColor};
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
          }
          
          .qr-code-text {
            position: absolute;
            top: 1rem;
            right: 1.5rem;
            color: ${primaryColor};
            font-weight: 600;
            font-size: 0.8rem;
            z-index: 20;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.9);
          }
          
          /* Luxury background styling */
          .luxury-bg-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
              linear-gradient(135deg, 
                rgba(255, 215, 0, 0.15) 25%, 
                transparent 25%, 
                transparent
              );
            background-size: 15px 15px;
            z-index: 1;
          }
        </style>
      </head>
      <body style="position: relative; background: linear-gradient(135deg, ${primaryColor} 0%, #e8b800 100%); width: 390px; height: 760px; overflow: hidden; border-radius: 28px; color: #222222;">
        <!-- Luxury background pattern overlay -->
        <div class="luxury-bg-pattern"></div>
        
        <!-- Header section with logo -->
        <div style="position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 3.25rem 2.313rem 0; z-index: 2;">
          <h1 style="margin: 0; font-weight: 700; font-size: 1.85rem; color: #000000; text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);">Table Code</h1>
          ${
            event.brand?.logo?.medium
              ? `<div style="display: flex; align-items: center; justify-content: center; background-color: #000000; border-radius: 50%; width: 3.5rem; height: 3.5rem; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);"><img src="${event.brand.logo.medium}" style="max-width: 2.8rem; max-height: 2.8rem; object-fit: contain;"></div>`
              : `<div style="width: 3.5rem; height: 3.5rem; background-color: #000000; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);">
              <span style="color: white; font-weight: bold; font-size: 1.5rem;">${
                event?.title?.charAt(0) || "E"
              }</span>
            </div>`
          }
        </div>
        
        <!-- Main content area - Whitish theme with improved contrast -->
        <div style="position: absolute; width: 20.375rem; height: 27rem; background-color: #f5f5f5; border-radius: 1.75rem; top: 7.5rem; left: 2rem; box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 2;">
          
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem; color: #222222;">${
            event?.title || "Event"
          }</h3>   
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">             
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">LOCATION</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.location || event?.venue || ""
              }</p>
              ${
                event?.street
                  ? `<p style="margin: 0; font-weight: 500; font-size: 0.857em; line-height: 1.25rem;">${event.street}</p>`
                  : ""
              }
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.postalCode ? `${event.postalCode} ` : ""
              }${event?.city || ""}</p>
            </div>
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">DATE</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${dayOfWeek}</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${formattedDateDE}</p>
            </div>
          </div>
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div> 
              <div style="margin-top: 0.5rem;">
                <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">START</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${startTime}</p>
              </div>
            </div>

            <div style="margin-top: 0.5rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">END</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${endTime}</p>
            </div>
          </div>
          
          <!-- Table Number Section -->
          <div style="margin-top: 1.5rem; padding-left: 2.438rem; padding-right: 2.438rem;">
            <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">TABLE NUMBER</p>
            <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
              tableCode.tableNumber
            }</p>
          </div>
          
          <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid ${primaryColor}; width: 15.5rem;"></div>

          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">GUEST</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                tableCode.name
              }</p>        
            </div>
            
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">PEOPLE</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                tableCode.pax || 1
              }</p>
            </div>
          </div>
        </div>

        <!-- QR Code section with luxury VIP-style background -->
        <div style="position: absolute; bottom: 2.938rem; left: 2rem; width: 20.375rem; height: 10rem; border-radius: 1.75rem; overflow: hidden; z-index: 2; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
          <div class="qr-section">
            <!-- Luxury pattern background -->
            <div class="qr-background"></div>
            <!-- Gold radial overlay -->
            <div class="qr-gold-overlay"></div>
            <!-- Centered QR code -->
            <div class="qr-container">
              <img class="qr-code-image" src="${qrCodeDataUrl}"></img>
            </div>
            <!-- Floating code text -->
            <div class="qr-code-text">
              <p style="margin: 0;">${displayCode}</p>
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

    // Generate PNG
    const pngBuffer = await page.screenshot({
      type: "png",
      omitBackground: true,
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 760,
      },
    });

    await browser.close();

    return pngBuffer;
  } catch (error) {
    console.error("Error generating table code PNG:", error);
    throw error;
  }
};

// Generate PDF for a table code (mainly for email)
const generateTablePDF = async (tableCode, event) => {
  try {
    // Get the PNG buffer first using the updated PNG generation method
    const pngBuffer = await generateTablePNG(tableCode, event);

    // Create HTML template that will embed the PNG image
    const htmlTemplate = `
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            background-color: transparent;
          }
          .container {
            width: 390px;
            height: 760px;
            overflow: hidden;
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="data:image/png;base64,${pngBuffer.toString(
            "base64"
          )}" alt="Table Code">
        </div>
      </body>
    </html>`;

    // Launch puppeteer to generate PDF from the HTML that includes the PNG
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(htmlTemplate);
    await page.emulateMediaType("screen");

    // Generate PDF with 9:16 aspect ratio exactly like in guestCodeController.js
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

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating table code PDF:", error);
    throw error;
  }
};

module.exports = {
  addTableCode,
  getTableCounts,
  generateCodeImage,
  generateCodePNGDownload,
  generateCodePDF,
  sendTableCodeEmail,
};
