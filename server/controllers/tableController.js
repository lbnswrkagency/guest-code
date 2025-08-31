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
      width: 300, // Increased from 225 for higher resolution
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      rendererOpts: {
        quality: 1.0, // Highest quality
      },
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

// Generate a unique code for table codes
const generateUniqueTableCode = async () => {
  // Generate a random string (8 characters)
  const randomString = crypto.randomBytes(4).toString("hex").toUpperCase();

  // Check if code already exists
  const existingCode = await TableCode.findOne({ code: randomString });
  if (existingCode) {
    // Recursively generate a new code if this one exists
    return generateUniqueTableCode();
  }

  return randomString;
};

// Generate a unique security token for QR code
const generateSecurityToken = () => {
  // Generate a random string (32 characters)
  return crypto.randomBytes(16).toString("hex");
};

const addTableCode = async (req, res) => {
  const {
    name,
    firstName,
    lastName,
    email,
    phone,
    pax,
    tableNumber,
    event,
    host,
    hostId,
    condition,
    backstagePass,
    paxChecked,
    isPublic,
  } = req.body;

  try {
    // Validate auth if not a public request
    if (!isPublic && !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // First, always fetch the event details
    const eventDetails = await Event.findById(event)
      .populate({
        path: "lineups",
        select: "name category avatar",
      })
      .populate("brand");

    if (!eventDetails) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check table management permissions for authenticated users
    let hasTableManage = false;
    if (!isPublic && req.user) {
      // Get user roles to check table permissions
      const Role = require("../models/roleModel");
      const Brand = require("../models/brandModel");

      // First check if user is part of the brand team (primary check)
      const brand = await Brand.findById(eventDetails.brand._id);
      const isTeamMember =
        brand &&
        brand.team &&
        brand.team.some(
          (member) => member.user.toString() === req.user.userId.toString()
        );

      // Also check if user is the brand owner
      const isBrandOwner =
        brand &&
        brand.owner &&
        brand.owner.toString() === req.user.userId.toString();

      // Get user roles for this brand
      let hasRolePermission = false;

      // Since JWT only contains userId, we need to fetch the user's roles from database
      const User = require("../models/User");
      const userDoc = await User.findById(req.user.userId);

      if (userDoc) {
        // Find the user's role for this specific brand
        const userRoleId = brand.team?.find(
          (member) => member.user.toString() === req.user.userId.toString()
        )?.role;

        if (userRoleId) {
          const userRole = await Role.findOne({
            _id: userRoleId,
            brandId: eventDetails.brand._id,
          });

          if (userRole && userRole.permissions && userRole.permissions.tables) {
            hasRolePermission = userRole.permissions.tables.manage === true;
          }
        }
      }

      // Allow table management if user is team member, brand owner, or has role permission
      hasTableManage = isTeamMember || isBrandOwner || hasRolePermission;
    }

    // Use the already fetched event details for email
    const eventDetailsForEmail = eventDetails;

    // Generate unique code and security token
    const code = await generateUniqueTableCode();
    const securityToken = generateSecurityToken();

    // Generate QR code with the security token
    const qrData = securityToken;
    const qrCodeDataUrl = await generateQR(qrData);

    // Build the table code data
    const tableCodeData = {
      name: name || `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      phone,
      pax,
      tableNumber,
      event,
      host,
      hostId,
      condition: condition || "TABLE RESERVATION", // Default value
      paxChecked: paxChecked || 0, // Default value
      backstagePass: backstagePass || false,
      status: hasTableManage ? "confirmed" : "pending",
      code,
      qrCodeData: qrCodeDataUrl,
      securityToken,
      isPublic: isPublic || false, // Flag to identify public requests
      createdAt: new Date(),
    };

    const createdTableCode = await TableCode.create(tableCodeData);

    // If this is a public request, send a confirmation email
    if (isPublic && email) {
      try {
        // Get brand colors or use defaults
        const primaryColor =
          eventDetailsForEmail?.brand?.colors?.primary || "#3a1a5a";

        // Set up the email sender using Brevo
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        // Prioritize startDate over date
        const eventDate =
          eventDetailsForEmail?.startDate || eventDetailsForEmail?.date;
        const formattedDate = formatCodeDate(eventDate);
        const formattedDateDE = formatDateDE(eventDate);
        const dayOfWeek = getDayOfWeek(eventDate);

        // Table type/category display name
        let tableType = "Table";
        if (backstagePass) {
          tableType = "Dancefloor Table";
        } else if (tableNumber && tableNumber.startsWith("V")) {
          tableType = "VIP Booth";
        } else if (tableNumber && tableNumber.startsWith("F")) {
          tableType = "Front Row Table";
        }

        // Process lineups with safety check
        let safeLineups = [];
        if (
          eventDetailsForEmail.lineups &&
          Array.isArray(eventDetailsForEmail.lineups)
        ) {
          safeLineups = eventDetailsForEmail.lineups
            .filter((artist) => artist !== null && artist !== undefined)
            .map((artist) => {
              // Create a safe copy with all required properties
              return {
                ...artist,
                name: artist?.name || "Artist",
                category: artist?.category || "Performer",
                avatar: artist.avatar || null,
              };
            });
        }

        // Generate custom content section with table request details - Enhanced for better visual status
        const tableDetailsHtml = `
          <div style="background-color: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="color: ${primaryColor}; margin-top: 0;">Your Table Reservation Request</h3>
            <p style="font-size: 16px; margin: 0 0 10px;">Thank you for your table reservation request. Our team will review it and get back to you shortly.</p>
            
            <div style="background-color: white; border-radius: 5px; padding: 15px; margin-top: 15px; border: 1px solid #eee;">
              <div style="background-color: #FFF7E6; border-left: 4px solid #f39c12; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
                <p style="margin: 0; color: #000; font-size: 14px;">
                  <strong style="color: #f39c12;">⚠️ Status: PENDING REVIEW</strong><br>
                  Your request is currently being reviewed by our team. We may contact you via email or phone to finalize your reservation.
                </p>
              </div>
              
              <p style="margin: 0 0 5px;"><strong>Event:</strong> ${
                eventDetailsForEmail.title
              }</p>
              <p style="margin: 0 0 5px;"><strong>Event Date:</strong> ${formattedDate}</p>
              <p style="margin: 0 0 5px;"><strong>Guest Name:</strong> ${firstName} ${lastName}</p>
              <p style="margin: 0 0 5px;"><strong>Table Number:</strong> ${tableNumber} (${tableType})</p>
              <p style="margin: 0 0 5px;"><strong>Number of People:</strong> ${
                pax || 1
              }</p>
              ${
                condition
                  ? `<p style="margin: 0;"><strong>Notes:</strong> ${condition}</p>`
                  : ""
              }
            </div>
            
            <div style="background-color: #FFF7E6; border-left: 4px solid #f39c12; padding: 10px; margin-top: 15px; border-radius: 4px;">
              <p style="margin: 0; color: #000; font-size: 14px;">
                <strong style="color: #f39c12;">⚠️ Important:</strong> Please note that if your reservation is confirmed, you must arrive at the venue by 1:00 AM at the latest. Tables not claimed by this time may be given to other guests.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 15px;">
              <em>Please note:</em>
            </p>
            <ul style="font-size: 14px; color: #666; margin-top: 5px;">
              <li>Our team will contact you shortly to confirm your reservation.</li>
              <li>If approved, you will receive a confirmation email with your table code.</li>
              <li>Please be prepared to show your table code at the entrance.</li>
              <li>Arrive by 1:00 AM at the latest to secure your table.</li>
            </ul>
          </div>
        `;

        // Build the email using our template
        const emailHtml = createEventEmailTemplate({
          recipientName: `${firstName} ${lastName}`,
          eventTitle: eventDetailsForEmail.title,
          eventDate: eventDate,
          eventLocation:
            eventDetailsForEmail.location || eventDetailsForEmail.venue || "",
          eventAddress:
            eventDetailsForEmail.street || eventDetailsForEmail.address || "",
          eventCity: eventDetailsForEmail.city || "",
          eventPostalCode: eventDetailsForEmail.postalCode || "",
          startTime: eventDetailsForEmail.startTime,
          endTime: eventDetailsForEmail.endTime,
          description: eventDetailsForEmail.description,
          lineups: safeLineups, // Use the sanitized lineups
          primaryColor,
          additionalContent: tableDetailsHtml,
          footerText:
            "This is an automated email from GuestCode. Please do not reply to this message.",
          showEventDetails: true, // Always show event details
        });

        // Set up email parameters
        const sendParams = {
          sender: {
            name: "GuestCode",
            email: "no-reply@guestcode.io",
          },
          to: [
            {
              email: email.trim(),
              name: `${firstName} ${lastName}`.trim(),
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
          subject: `Table Reservation Request for ${
            eventDetailsForEmail?.title || "Event"
          }`,
          htmlContent: emailHtml,
        };

        // Send the email
        await apiInstance.sendTransacEmail(sendParams);

        // Update the code to record that it was sent by email
        createdTableCode.emailedTo = createdTableCode.emailedTo || [];
        createdTableCode.emailedTo.push({
          email: email,
          sentAt: new Date(),
        });
        await createdTableCode.save();
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
        // Don't return an error as the table code was still created successfully
      }
    }

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
    // Check user's table management permissions
    let hasTableManage = false;
    let tableCounts = [];

    // For authenticated requests, check permissions
    if (req.user) {
      const Role = require("../models/roleModel");
      const Event = require("../models/eventsModel");
      const Brand = require("../models/brandModel");

      // Get event details to find the brand
      const eventDetails = await Event.findById(eventId).populate("brand");
      if (!eventDetails) {
        return res.status(404).json({ message: "Event not found" });
      }

      // First check if user is part of the brand team
      const brand = await Brand.findById(eventDetails.brand._id);
      const isTeamMember =
        brand &&
        brand.team &&
        brand.team.some(
          (member) => member.user.toString() === req.user.userId.toString()
        );

      // Also check if user is the brand owner
      const isBrandOwner =
        brand &&
        brand.owner &&
        brand.owner.toString() === req.user.userId.toString();

      // Get user roles for this brand
      let hasRolePermission = false;

      // Since JWT only contains userId, we need to fetch the user's roles from database
      const User = require("../models/User");
      const userDoc = await User.findById(req.user.userId);

      if (userDoc) {
        // Find the user's role for this specific brand
        const userRoleId = brand.team?.find(
          (member) => member.user.toString() === req.user.userId.toString()
        )?.role;

        if (userRoleId) {
          const userRole = await Role.findOne({
            _id: userRoleId,
            brandId: eventDetails.brand._id,
          });

          if (userRole && userRole.permissions && userRole.permissions.tables) {
            hasRolePermission = userRole.permissions.tables.manage === true;
          }
        }
      }

      // Allow table management if user is team member, brand owner, or has role permission
      hasTableManage = isTeamMember || isBrandOwner || hasRolePermission;

      // Debug log to help understand permission issues
      console.log("TableCounts Debug:", {
        userId: req.user.userId,
        brandId: eventDetails.brand._id,
        isTeamMember,
        isBrandOwner,
        hasRolePermission,
        hasTableManage,
        userRoleId: brand.team?.find(
          (member) => member.user.toString() === req.user.userId.toString()
        )?.role,
        brandTeam: brand.team?.map((member) => ({
          user: member.user.toString(),
          role: member.role?.toString(),
        })),
      });

      // Fetch table codes based on permissions
      if (hasTableManage) {
        // Users with manage permission can see ALL table codes for this event
        tableCounts = await TableCode.find({ event: eventId });
      } else {
        // Users with only access permission can only see their own table codes
        tableCounts = await TableCode.find({
          event: eventId,
          hostId: req.user.userId,
        });
      }
    } else {
      // For public requests (no authentication), return empty array
      tableCounts = [];
    }

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

    // Sanitize filename for Content-Disposition header
    const sanitizedName = encodeURIComponent(
      tableCode.name.replace(/\s+/g, "_")
    );

    // Set headers for PNG inline display
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${tableCode.tableNumber}_table.png"; filename*=UTF-8''${sanitizedName}`,
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

    // Sanitize filename for Content-Disposition header
    const sanitizedName = encodeURIComponent(
      tableCode.name.replace(/\s+/g, "_")
    );

    // Set headers for PNG download
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="Table_${tableCode.tableNumber}.png"; filename*=UTF-8''Table_${tableCode.tableNumber}_${sanitizedName}.png`,
      "Content-Length": pngBuffer.length,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
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
    const pdfResult = await generateTablePDF(tableCode, event);
    const pdfBuffer = pdfResult.buffer;

    // Sanitize filename for Content-Disposition header
    const sanitizedName = encodeURIComponent(
      tableCode.name.replace(/\s+/g, "_")
    );

    // Set headers for PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Table_${tableCode.tableNumber}.pdf"; filename*=UTF-8''Table_${tableCode.tableNumber}_${sanitizedName}.pdf`,
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
 * Send a table code via email - Updated to match the guest code email approach
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
    const primaryColor = event?.brand?.colors?.primary || "#3a1a5a";

    // Generate PDF version of the code for email using the improved method
    const pdfResult = await generateTablePDF(tableCode, event);
    const pdfBuffer = pdfResult.buffer;

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

    // Prioritize startDate over date
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
          <p style="margin: 0 0 5px;"><strong>Unique Code:</strong> <span style="color: ${primaryColor}; font-weight: bold;">${
      tableCode.code || "N/A"
    }</span></p>
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
      showEventDetails: true, // Always show event details
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
        code: tableCode.code,
      },
    });
  } catch (error) {
    console.error("Error sending table code email:", error);
    res.status(500).json({
      message: "Error sending table code email",
      error: error.message,
    });
  }
};

/**
 * Send a confirmation email when a public table reservation is accepted
 */
const sendTableConfirmationEmail = async (req, res) => {
  try {
    const { codeId } = req.params;

    // Find the table code
    const tableCode = await TableCode.findById(codeId);
    if (!tableCode) {
      return res.status(404).json({ message: "Table code not found" });
    }

    // Check if this was a public request and has an email address
    if (!tableCode.isPublic || !tableCode.email) {
      return res.status(400).json({
        message:
          "Cannot send confirmation - not a public request or missing email",
      });
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

    // Generate PDF version of the code for email
    const pdfResult = await generateTablePDF(tableCode, event);
    const pdfBuffer = pdfResult.buffer;

    // Process lineups with safety check
    let safeLineups = [];
    if (event.lineups && Array.isArray(event.lineups)) {
      safeLineups = event.lineups
        .filter((artist) => artist !== null && artist !== undefined)
        .map((artist) => {
          return {
            ...artist,
            name: artist?.name || "Artist",
            category: artist?.category || "Performer",
            avatar: artist.avatar || null,
          };
        });
    }

    // Get brand colors or use defaults
    const primaryColor = event?.brand?.colors?.primary || "#3a1a5a";

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

    // Prioritize startDate over date
    const eventDate = event?.startDate || event?.date;
    const formattedDate = formatCodeDate(eventDate);
    const formattedDateDE = formatDateDE(eventDate);
    const dayOfWeek = getDayOfWeek(eventDate);

    // Determine table type
    let tableType = "Table";
    if (tableCode.backstagePass) {
      tableType = "Dancefloor Table";
    } else if (tableCode.tableNumber && tableCode.tableNumber.startsWith("V")) {
      tableType = "VIP Booth";
    } else if (tableCode.tableNumber && tableCode.tableNumber.startsWith("F")) {
      tableType = "Front Row Table";
    }

    // Generate custom content section with confirmed reservation details
    const confirmationDetailsHtml = `
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h3 style="color: ${primaryColor}; margin-top: 0;">Your Table Reservation is Confirmed!</h3>
        <p style="font-size: 16px; margin: 0 0 10px;">Great news! Your table reservation has been confirmed. We've attached your table code as a PDF to this email.</p>
        
        <div style="background-color: white; border-radius: 5px; padding: 15px; margin-top: 15px; border: 1px solid #eee;">
          <div style="background-color: #E6F7E9; border-left: 4px solid #27ae60; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
            <p style="margin: 0; color: #000; font-size: 14px;">
              <strong style="color: #27ae60;">✅ Status: CONFIRMED</strong><br>
              Your table reservation has been approved and confirmed!
            </p>
          </div>
          
          <p style="margin: 0 0 5px;"><strong>Event Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 5px;"><strong>Guest Name:</strong> ${
            tableCode.name
          }</p>
          <p style="margin: 0 0 5px;"><strong>Table Number:</strong> ${
            tableCode.tableNumber
          } (${tableType})</p>
          <p style="margin: 0 0 5px;"><strong>Unique Code:</strong> <span style="color: ${primaryColor}; font-weight: bold;">${
      tableCode.code || "N/A"
    }</span></p>
          <p style="margin: 0 0 5px;"><strong>People:</strong> ${
            tableCode.pax || 1
          }</p>
          ${
            tableCode.condition
              ? `<p style="margin: 0;"><strong>Notes:</strong> ${tableCode.condition}</p>`
              : ""
          }
        </div>
        
        <div style="background-color: #FFF7E6; border-left: 4px solid #f39c12; padding: 10px; margin-top: 15px; border-radius: 4px;">
          <p style="margin: 0; color: #000; font-size: 14px;">
            <strong style="color: #f39c12;">⚠️ Important:</strong> Please arrive at the venue by 1:00 AM at the latest. Tables not claimed by this time may be given to other guests.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 15px;">
          <strong>Important information:</strong>
        </p>
        <ul style="font-size: 14px; color: #666; margin-top: 5px;">
          <li>Please arrive with your table code (attached to this email) by 1:00 AM.</li>
          <li>You can show the PDF on your phone or print it out.</li>
          <li>The table will be held for 30 minutes after the event start time.</li>
        </ul>
      </div>
    `;

    // Build the email using our template
    const emailHtml = createEventEmailTemplate({
      recipientName: tableCode.name,
      eventTitle: event.title,
      eventDate: eventDate,
      eventLocation: event.location || event.venue || "",
      eventAddress: event.street || event.address || "",
      eventCity: event.city || "",
      eventPostalCode: event.postalCode || "",
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      lineups: safeLineups,
      primaryColor,
      additionalContent: confirmationDetailsHtml,
      footerText:
        "This is an automated email from GuestCode. Please do not reply to this message.",
      showEventDetails: true, // Always show event details
    });

    // Set up email parameters
    const params = {
      sender: {
        name: "GuestCode",
        email: "no-reply@guestcode.io",
      },
      to: [
        {
          email: tableCode.email.trim(),
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
      subject: `Your Table Reservation is Confirmed for ${
        event?.title || "Event"
      }`,
      htmlContent: emailHtml,
      attachment: attachments,
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(params);

    // Update the code to record that it was sent by email
    tableCode.emailedTo = tableCode.emailedTo || [];
    tableCode.emailedTo.push({
      email: tableCode.email,
      sentAt: new Date(),
      type: "confirmation",
    });
    await tableCode.save();

    return res.status(200).json({
      message: "Confirmation email sent successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    res.status(500).json({
      message: "Error sending confirmation email",
      error: error.message,
    });
  }
};

// Add a new function to send cancellation emails
/**
 * Send a cancellation email when a public table reservation is cancelled
 */
const sendTableCancellationEmail = async (req, res) => {
  try {
    const { codeId } = req.params;

    // Find the table code
    const tableCode = await TableCode.findById(codeId);
    if (!tableCode) {
      return res.status(404).json({ message: "Table code not found" });
    }

    // Check if this was a public request and has an email address
    if (!tableCode.isPublic || !tableCode.email) {
      return res.status(400).json({
        message:
          "Cannot send cancellation - not a public request or missing email",
      });
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

    // Process lineups with safety check including avatar
    let safeLineups = [];
    if (event.lineups && Array.isArray(event.lineups)) {
      safeLineups = event.lineups
        .filter((artist) => artist !== null && artist !== undefined)
        .map((artist) => {
          return {
            ...artist,
            name: artist?.name || "Artist",
            category: artist?.category || "Performer",
            avatar: artist.avatar || null,
          };
        });
    }

    // Get brand colors or use defaults
    const primaryColor = event?.brand?.colors?.primary || "#3a1a5a";

    // Set up the email sender using Brevo
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Prioritize startDate over date
    const eventDate = event?.startDate || event?.date;
    const formattedDate = formatCodeDate(eventDate);

    // Determine table type
    let tableType = "Table";
    if (tableCode.backstagePass) {
      tableType = "Dancefloor Table";
    } else if (tableCode.tableNumber && tableCode.tableNumber.startsWith("V")) {
      tableType = "VIP Booth";
    } else if (tableCode.tableNumber && tableCode.tableNumber.startsWith("F")) {
      tableType = "Front Row Table";
    }

    // Generate custom content section with cancellation details
    const cancellationDetailsHtml = `
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h3 style="color: ${primaryColor}; margin-top: 0;">Your Table Reservation has been Cancelled</h3>
        <p style="font-size: 16px; margin: 0 0 10px;">We're sorry to inform you that your table reservation has been cancelled.</p>
        
        <div style="background-color: white; border-radius: 5px; padding: 15px; margin-top: 15px; border: 1px solid #eee;">
          <div style="background-color: #FFEBEE; border-left: 4px solid #f44336; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
            <p style="margin: 0; color: #000; font-size: 14px;">
              <strong style="color: #f44336;">❌ Status: CANCELLED</strong><br>
              Your table reservation is no longer valid.
            </p>
          </div>
          
          <p style="margin: 0 0 5px;"><strong>Event Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 5px;"><strong>Guest Name:</strong> ${
            tableCode.name
          }</p>
          <p style="margin: 0 0 5px;"><strong>Table Number:</strong> ${
            tableCode.tableNumber
          } (${tableType})</p>
          <p style="margin: 0 0 5px;"><strong>People:</strong> ${
            tableCode.pax || 1
          }</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 15px;">
          If you have any questions or would like to make a new reservation, please contact us directly.
        </p>
      </div>
    `;

    // Build the email using our template
    const emailHtml = createEventEmailTemplate({
      recipientName: tableCode.name,
      eventTitle: event.title,
      eventDate: eventDate,
      eventLocation: event.location || event.venue || "",
      eventAddress: event.street || event.address || "",
      eventCity: event.city || "",
      eventPostalCode: event.postalCode || "",
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      lineups: safeLineups,
      primaryColor,
      additionalContent: cancellationDetailsHtml,
      footerText:
        "This is an automated email from GuestCode. Please do not reply to this message.",
      showEventDetails: true,
    });

    // Set up email parameters
    const params = {
      sender: {
        name: "GuestCode",
        email: "no-reply@guestcode.io",
      },
      to: [
        {
          email: tableCode.email.trim(),
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
      subject: `Your Table Reservation has been Cancelled for ${
        event?.title || "Event"
      }`,
      htmlContent: emailHtml,
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(params);

    // Update the code to record that it was sent by email
    tableCode.emailedTo = tableCode.emailedTo || [];
    tableCode.emailedTo.push({
      email: tableCode.email,
      sentAt: new Date(),
      type: "cancellation",
    });
    await tableCode.save();

    return res.status(200).json({
      message: "Cancellation email sent successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error sending cancellation email:", error);
    res.status(500).json({
      message: "Error sending cancellation email",
      error: error.message,
    });
  }
};

// Add a new function to send declined emails
/**
 * Send a decline email when a public table reservation is declined
 */
const sendTableDeclinedEmail = async (req, res) => {
  try {
    const { codeId } = req.params;

    // Find the table code
    const tableCode = await TableCode.findById(codeId);
    if (!tableCode) {
      return res.status(404).json({ message: "Table code not found" });
    }

    // Check if this was a public request and has an email address
    if (!tableCode.isPublic || !tableCode.email) {
      return res.status(400).json({
        message:
          "Cannot send decline email - not a public request or missing email",
      });
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

    // Process lineups with safety check including avatar
    let safeLineups = [];
    if (event.lineups && Array.isArray(event.lineups)) {
      safeLineups = event.lineups
        .filter((artist) => artist !== null && artist !== undefined)
        .map((artist) => {
          return {
            ...artist,
            name: artist?.name || "Artist",
            category: artist?.category || "Performer",
            avatar: artist.avatar || null,
          };
        });
    }

    // Get brand colors or use defaults
    const primaryColor = event?.brand?.colors?.primary || "#3a1a5a";

    // Set up the email sender using Brevo
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Prioritize startDate over date
    const eventDate = event?.startDate || event?.date;
    const formattedDate = formatCodeDate(eventDate);

    // Determine table type
    let tableType = "Table";
    if (tableCode.backstagePass) {
      tableType = "Dancefloor Table";
    } else if (tableCode.tableNumber && tableCode.tableNumber.startsWith("V")) {
      tableType = "VIP Booth";
    } else if (tableCode.tableNumber && tableCode.tableNumber.startsWith("F")) {
      tableType = "Front Row Table";
    }

    // Generate custom content section with declined reservation details
    const declineDetailsHtml = `
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h3 style="color: ${primaryColor}; margin-top: 0;">Your Table Reservation Request has been Declined</h3>
        <p style="font-size: 16px; margin: 0 0 10px;">We regret to inform you that we are unable to accommodate your table reservation request for this event.</p>
        
        <div style="background-color: white; border-radius: 5px; padding: 15px; margin-top: 15px; border: 1px solid #eee;">
          <div style="background-color: #FFEBEE; border-left: 4px solid #f44336; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
            <p style="margin: 0; color: #000; font-size: 14px;">
              <strong style="color: #f44336;">❌ Status: DECLINED</strong><br>
              Unfortunately, we could not approve your table reservation request.
            </p>
          </div>
          
          <p style="margin: 0 0 5px;"><strong>Event Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 5px;"><strong>Guest Name:</strong> ${
            tableCode.name
          }</p>
          <p style="margin: 0 0 5px;"><strong>Table Type:</strong> ${tableType}</p>
          <p style="margin: 0 0 5px;"><strong>People:</strong> ${
            tableCode.pax || 1
          }</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 15px;">
          This could be due to capacity limitations or other constraints. We appreciate your interest and hope you will still join us for the event.
          If you have any questions, please feel free to contact us.
        </p>
      </div>
    `;

    // Build the email using our template
    const emailHtml = createEventEmailTemplate({
      recipientName: tableCode.name,
      eventTitle: event.title,
      eventDate: eventDate,
      eventLocation: event.location || event.venue || "",
      eventAddress: event.street || event.address || "",
      eventCity: event.city || "",
      eventPostalCode: event.postalCode || "",
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      lineups: safeLineups,
      primaryColor,
      additionalContent: declineDetailsHtml,
      footerText:
        "This is an automated email from GuestCode. Please do not reply to this message.",
      showEventDetails: true,
    });

    // Set up email parameters
    const params = {
      sender: {
        name: "GuestCode",
        email: "no-reply@guestcode.io",
      },
      to: [
        {
          email: tableCode.email.trim(),
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
      subject: `Your Table Reservation Request for ${
        event?.title || "Event"
      } has been Declined`,
      htmlContent: emailHtml,
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(params);

    // Update the code to record that it was sent by email
    tableCode.emailedTo = tableCode.emailedTo || [];
    tableCode.emailedTo.push({
      email: tableCode.email,
      sentAt: new Date(),
      type: "declined",
    });
    await tableCode.save();

    return res.status(200).json({
      message: "Decline email sent successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error sending decline email:", error);
    res.status(500).json({
      message: "Error sending decline email",
      error: error.message,
    });
  }
};

// Generate PNG image of a table code
const generateTablePNG = async (tableCode, event) => {
  try {
    // Validate input objects
    if (!tableCode) {
      throw new Error("Table code object is required");
    }

    if (!event) {
      throw new Error("Event object is required");
    }

    // Use the stored code or generate a display code
    const displayCode = tableCode.code || `TABLE-${tableCode.tableNumber}`;

    // Generate QR code with better error handling
    let qrCodeDataUrl;
    try {
      qrCodeDataUrl =
        tableCode.qrCodeData ||
        (await generateQR(tableCode.securityToken || tableCode._id.toString()));
    } catch (qrError) {
      console.error("QR code generation failed:", qrError);
      // Fallback to a simple text representation if QR fails
      qrCodeDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    }

    // Force purple theme colors, ignore any event colors
    const primaryColor = "#4A1D96"; // Enhanced vibrant purple
    const accentColor = "#d4af37"; // Gold
    const darkColor = "#301568"; // Darker purple for depth
    const lightColor = "#f5f5f7"; // Very light gray for text areas

    // Get event start and end times with safe defaults
    const startTime = event?.startTime || "23:00";
    const endTime = event?.endTime || "06:00";

    // Prioritize startDate over date with null checks
    const eventDate = event?.startDate || event?.date || new Date();

    // Get formatted dates and day of week
    const formattedDateDE = formatDateDE(eventDate);
    const dayOfWeek = getDayOfWeek(eventDate);

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
            position: relative;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${darkColor} 100%);
            width: 390px;
            height: 760px;
            overflow: hidden;
            border-radius: 28px;
            color: #222222;
          }
          
          /* Luxury background styling */
          .luxury-bg-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
              repeating-linear-gradient(
                -45deg,
                rgba(212, 175, 55, 0.1),
                rgba(212, 175, 55, 0.1) 2px,
                transparent 2px,
                transparent 8px
              );
            z-index: 1;
          }
          
          /* Diagonal stripes for VIP section backgrounds */
          .vip-bg-pattern {
            background-image: 
              linear-gradient(135deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%),
              linear-gradient(225deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%),
              linear-gradient(315deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%),
              linear-gradient(45deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%);
            background-size: 20px 20px;
            background-position: 0 0, 10px 0, 10px -10px, 0px 10px;
          }
          
          .header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3.25rem 2.313rem 0;
            z-index: 2;
          }
          .header h1 {
            margin: 0;
            font-weight: 700;
            font-size: 1.85rem;
            color: ${lightColor};
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
          }
          .logo {
            width: 3.5rem;
            height: 3.5rem;
            background-color: #000000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 1.5rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), 0 0 0 2px ${accentColor};
          }
          .logo img {
            max-width: 2.8rem;
            max-height: 2.8rem;
            object-fit: contain;
          }
          .main-content {
            position: absolute;
            width: 20.375rem;
            height: 27rem;
            background-color: ${lightColor};
            border-radius: 1.75rem;
            top: 7.5rem;
            left: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(212, 175, 55, 0.3);
            z-index: 2;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            padding-left: 2.438rem;
          }
          .info-section {
            margin-top: 0.75rem;
          }
          .info-label {
            margin: 0;
            color: ${primaryColor};
            font-weight: 600;
            font-size: 0.625rem;
            line-height: 1rem;
            text-transform: uppercase;
          }
          .info-value {
            margin: 0;
            font-weight: 500;
            font-size: 0.857rem;
            line-height: 1.25rem;
            color: #222;
          }
          .divider {
            margin-top: 1.313rem;
            margin-bottom: .3rem;
            margin-left: 2.438rem;
            border: 1px solid ${accentColor};
            width: 15.5rem;
          }
          .table-number-section {
            margin-top: 1.5rem;
            padding: 0.75rem 2.438rem;
            background: rgba(58, 26, 90, 0.07);
          }
          .qr-section {
            position: absolute;
            bottom: 2.938rem;
            left: 2rem;
            width: 20.375rem;
            height: 10rem;
            border-radius: 1.75rem;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(212, 175, 55, 0.3);
            background-color: #222222;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .qr-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              45deg,
              ${darkColor},
              ${darkColor} 10px,
              #121212 10px,
              #121212 20px
            );
            opacity: 0.8;
          }
          .qr-gold-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(
              circle at center,
              rgba(212, 175, 55, 0.2) 0%,
              rgba(212, 175, 55, 0) 70%
            );
          }
          .qr-container {
            position: relative;
            background-color: white;
            padding: 10px;
            border-radius: 0.5rem;
            border: 2px solid ${accentColor};
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2;
          }
          .qr-code-image {
            width: 8rem;
            height: 8rem;
            display: block;
          }
          .qr-code-text {
            position: absolute;
            top: 1rem;
            right: 1.5rem;
            background-color: ${darkColor};
            color: ${accentColor};
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.7rem;
            z-index: 3;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            border: 1px solid ${accentColor};
          }
        </style>
      </head>
      <body>
        <!-- Luxury background pattern overlay -->
        <div class="luxury-bg-pattern"></div>
        
        <!-- Header section with logo -->
        <div class="header">
          <h1>Table Code</h1>
          ${
            event?.brand?.logo?.medium
              ? `<div class="logo"><img src="${event.brand.logo.medium}" alt="Brand logo"></div>`
              : `<div class="logo"><span>${
                  event?.brand?.name?.charAt(0) || "G"
                }</span></div>`
          }
        </div>
        
        <!-- Main content area -->
        <div class="main-content vip-bg-pattern">
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem;">${
            event?.title || "Event"
          }</h3>   
          
          <div class="info-grid" style="margin-top: 1.5rem;">             
            <div>
              <p class="info-label">LOCATION</p>
              <p class="info-value">${event?.location || event?.venue || ""}</p>
              ${
                event?.street ? `<p class="info-value">${event.street}</p>` : ""
              }
              ${
                event?.address && !event?.street
                  ? `<p class="info-value">${event.address}</p>`
                  : ""
              }
              ${
                event?.postalCode || event?.city
                  ? `<p class="info-value">${event.postalCode || ""} ${
                      event.city || ""
                    }</p>`
                  : ""
              }
            </div>
            <div>
              <p class="info-label">DATE</p>
              <p class="info-value">${dayOfWeek}</p>
              <p class="info-value">${formattedDateDE}</p>
            </div>
          </div>
          
          <div class="info-grid" style="margin-top: 1.5rem;">
            <div class="info-section"> 
              <p class="info-label">START</p>
              <p class="info-value">${startTime}</p>
            </div>
            <div class="info-section">
              <p class="info-label">END</p>
              <p class="info-value">${endTime}</p>
            </div>
          </div>
          
          <div class="table-number-section">
            <p class="info-label">TABLE NUMBER</p>
            <p style="margin: 0; font-weight: 700; font-size: 1.25rem; line-height: 1.5rem; color: ${primaryColor};">${
      tableCode.tableNumber
    }</p>
          </div>
          
          <div class="divider"></div>

          <div class="info-grid">
            <div class="info-section">
              <p class="info-label">GUEST</p>
              <p class="info-value">${tableCode.name}</p>        
            </div>
            
            <div class="info-section">
              <p class="info-label">PEOPLE</p>
              <p class="info-value">${tableCode.pax || 1}</p>
            </div>
          </div>
        </div>

        <!-- QR Code section -->
        <div class="qr-section">
          <div class="qr-background"></div>
          <div class="qr-gold-overlay"></div>
          <div class="qr-container">
            <img class="qr-code-image" src="${qrCodeDataUrl}" alt="QR code">
          </div>
          <div class="qr-code-text">
            <p style="margin: 0;">${tableCode.code || displayCode}</p>
          </div>
        </div>
      </body>
    </html>`;

    // Launch puppeteer with more robust error handling
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Set content with longer timeout
      await page.setContent(htmlTemplate, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      await page.emulateMediaType("screen");

      // Set viewport to match the ticket dimensions (9:16 aspect ratio)
      await page.setViewport({
        width: 390,
        height: 760,
        deviceScaleFactor: 2.0, // Higher resolution for crisp image
      });

      // Generate PNG with high resolution
      const pngBuffer = await page.screenshot({
        type: "png",
        fullPage: true,
        omitBackground: false,
      });

      return pngBuffer;
    } catch (puppeteerError) {
      console.error("Puppeteer error in generateTablePNG:", puppeteerError);
      throw new Error(`PNG generation failed: ${puppeteerError.message}`);
    } finally {
      if (browser) {
        await browser.close().catch((err) => {
          console.error("Error closing browser:", err);
        });
      }
    }
  } catch (error) {
    console.error("Error in generateTablePNG:", error);
    console.error("Stack trace:", error.stack);
    throw error;
  }
};

// Generate PDF for a table code (used for email and download)
const generateTablePDF = async (tableCode, event) => {
  try {
    // Validate input objects
    if (!tableCode) {
      throw new Error("Table code object is required");
    }

    if (!event) {
      throw new Error("Event object is required");
    }

    // Force purple theme colors, ignore any event colors - EXACT SAME values as PNG
    const primaryColor = "#4A1D96"; // Enhanced vibrant purple
    const accentColor = "#d4af37"; // Gold
    const darkColor = "#301568"; // Darker purple for depth
    const lightColor = "#f5f5f7"; // Light background

    // Generate QR code with better error handling
    let qrCodeDataUrl;
    try {
      const qrData = tableCode.securityToken || tableCode._id.toString();
      qrCodeDataUrl = await generateQR(qrData);
    } catch (qrError) {
      console.error("QR code generation failed:", qrError);
      // Fallback to a simple text representation if QR fails
      qrCodeDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    }

    // Format date - prioritize startDate over date with null checks
    const eventDate = event?.startDate || event?.date || new Date();
    const formattedDate = formatCodeDate(eventDate);
    const formattedDateDE = formatDateDE(eventDate);
    const dayOfWeek = getDayOfWeek(eventDate);

    // Get event start and end times with safe defaults
    const startTime = event?.startTime || "23:00";
    const endTime = event?.endTime || "06:00";

    // Generate a displayCode
    const displayCode = `TABLE-${tableCode.tableNumber}`;

    // Create HTML template for the table code - with luxury VIP style
    const htmlTemplate = `
    <html>
      <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            margin: 0;
            size: 390px 760px;
          }
          body {
            font-family: 'Manrope', sans-serif;
            margin: 0;
            padding: 0;
            position: relative;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${darkColor} 100%);
            width: 390px;
            height: 760px;
            overflow: hidden;
            border-radius: 28px;
            color: #222222;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Luxury background styling */
          .luxury-bg-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
              repeating-linear-gradient(
                -45deg,
                rgba(212, 175, 55, 0.1),
                rgba(212, 175, 55, 0.1) 2px,
                transparent 2px,
                transparent 8px
              );
            z-index: 1;
          }
          
          /* Diagonal stripes for VIP section backgrounds */
          .vip-bg-pattern {
            background-image: 
              linear-gradient(135deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%),
              linear-gradient(225deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%),
              linear-gradient(315deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%),
              linear-gradient(45deg, rgba(212, 175, 55, 0.1) 25%, transparent 25%);
            background-size: 20px 20px;
            background-position: 0 0, 10px 0, 10px -10px, 0px 10px;
          }
          
          .header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3.25rem 2.313rem 0;
            z-index: 2;
          }
          .header h1 {
            margin: 0;
            font-weight: 700;
            font-size: 1.85rem;
            color: ${lightColor};
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
          }
          .logo {
            width: 3.5rem;
            height: 3.5rem;
            background-color: #000000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 1.5rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), 0 0 0 2px ${accentColor};
          }
          .logo img {
            max-width: 2.8rem;
            max-height: 2.8rem;
            object-fit: contain;
          }
          .main-content {
            position: absolute;
            width: 20.375rem;
            height: 27rem;
            background-color: ${lightColor};
            border-radius: 1.75rem;
            top: 7.5rem;
            left: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(212, 175, 55, 0.3);
            z-index: 2;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            padding-left: 2.438rem;
          }
          .info-section {
            margin-top: 0.75rem;
          }
          .info-label {
            margin: 0;
            color: ${primaryColor};
            font-weight: 600;
            font-size: 0.625rem;
            line-height: 1rem;
            text-transform: uppercase;
          }
          .info-value {
            margin: 0;
            font-weight: 500;
            font-size: 0.857rem;
            line-height: 1.25rem;
            color: #222;
          }
          .divider {
            margin-top: 1.313rem;
            margin-bottom: .3rem;
            margin-left: 2.438rem;
            border: 1px solid ${accentColor};
            width: 15.5rem;
          }
          .table-number-section {
            margin-top: 1.5rem;
            padding: 0.75rem 2.438rem;
            background: rgba(58, 26, 90, 0.07);
          }
          .qr-section {
            position: absolute;
            bottom: 2.938rem;
            left: 2rem;
            width: 20.375rem;
            height: 10rem;
            border-radius: 1.75rem;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(212, 175, 55, 0.3);
            background-color: #222222;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .qr-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              45deg,
              ${darkColor},
              ${darkColor} 10px,
              #121212 10px,
              #121212 20px
            );
            opacity: 0.8;
          }
          .qr-gold-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(
              circle at center,
              rgba(212, 175, 55, 0.2) 0%,
              rgba(212, 175, 55, 0) 70%
            );
          }
          .qr-container {
            position: relative;
            background-color: white;
            padding: 10px;
            border-radius: 0.5rem;
            border: 2px solid ${accentColor};
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2;
          }
          .qr-code-image {
            width: 8rem;
            height: 8rem;
            display: block;
          }
          .qr-code-text {
            position: absolute;
            top: 1rem;
            right: 1.5rem;
            background-color: ${darkColor};
            color: ${accentColor};
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.7rem;
            z-index: 3;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            border: 1px solid ${accentColor};
          }
        </style>
      </head>
      <body>
        <!-- Luxury background pattern overlay -->
        <div class="luxury-bg-pattern"></div>
        
        <!-- Header section with logo -->
        <div class="header">
          <h1>Table Code</h1>
          ${
            event?.brand?.logo?.medium
              ? `<div class="logo"><img src="${event.brand.logo.medium}" alt="Brand logo"></div>`
              : `<div class="logo"><span>${
                  event?.brand?.name?.charAt(0) || "G"
                }</span></div>`
          }
        </div>
        
        <!-- Main content area -->
        <div class="main-content vip-bg-pattern">
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem;">${
            event?.title || "Event"
          }</h3>   
          
          <div class="info-grid" style="margin-top: 1.5rem;">             
            <div>
              <p class="info-label">LOCATION</p>
              <p class="info-value">${event?.location || event?.venue || ""}</p>
              ${
                event?.street ? `<p class="info-value">${event.street}</p>` : ""
              }
              ${
                event?.address && !event?.street
                  ? `<p class="info-value">${event.address}</p>`
                  : ""
              }
              ${
                event?.postalCode || event?.city
                  ? `<p class="info-value">${event.postalCode || ""} ${
                      event.city || ""
                    }</p>`
                  : ""
              }
            </div>
            <div>
              <p class="info-label">DATE</p>
              <p class="info-value">${dayOfWeek}</p>
              <p class="info-value">${formattedDateDE}</p>
            </div>
          </div>
          
          <div class="info-grid" style="margin-top: 1.5rem;">
            <div class="info-section"> 
              <p class="info-label">START</p>
              <p class="info-value">${startTime}</p>
            </div>
            <div class="info-section">
              <p class="info-label">END</p>
              <p class="info-value">${endTime}</p>
            </div>
          </div>
          
          <div class="table-number-section">
            <p class="info-label">TABLE NUMBER</p>
            <p style="margin: 0; font-weight: 700; font-size: 1.25rem; line-height: 1.5rem; color: ${primaryColor};">${
      tableCode.tableNumber
    }</p>
          </div>
          
          <div class="divider"></div>

          <div class="info-grid">
            <div class="info-section">
              <p class="info-label">GUEST</p>
              <p class="info-value">${tableCode.name}</p>        
            </div>
            
            <div class="info-section">
              <p class="info-label">PEOPLE</p>
              <p class="info-value">${tableCode.pax || 1}</p>
            </div>
          </div>
        </div>

        <!-- QR Code section -->
        <div class="qr-section">
          <div class="qr-background"></div>
          <div class="qr-gold-overlay"></div>
          <div class="qr-container">
            <img class="qr-code-image" src="${qrCodeDataUrl}" alt="QR code">
          </div>
          <div class="qr-code-text">
            <p style="margin: 0;">${tableCode.code || displayCode}</p>
          </div>
        </div>
      </body>
    </html>`;

    // Launch puppeteer with more robust error handling
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Set content with longer timeout
      await page.setContent(htmlTemplate, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      await page.emulateMediaType("screen");

      // Set viewport to match the ticket dimensions (9:16 aspect ratio)
      await page.setViewport({
        width: 390,
        height: 760,
        deviceScaleFactor: 2.0, // Higher resolution for crisp image
      });

      // Generate high-quality PDF
      const pdfBuffer = await page.pdf({
        width: "390px",
        height: "760px",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px",
        },
        scale: 1.0, // Ensure 1:1 scaling
      });

      return {
        buffer: pdfBuffer,
        html: htmlTemplate,
      };
    } catch (puppeteerError) {
      console.error("Puppeteer error in generateTablePDF:", puppeteerError);
      throw new Error(`PDF generation failed: ${puppeteerError.message}`);
    } finally {
      if (browser) {
        await browser.close().catch((err) => {
          console.error("Error closing browser:", err);
        });
      }
    }
  } catch (error) {
    console.error("Error in generateTablePDF:", error);
    console.error("Stack trace:", error.stack);
    throw error;
  }
};

// Add a function to send email notifications about table updates
/**
 * Send an update email when a table reservation details are changed
 */
const sendTableUpdateEmail = async (req, res) => {
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

    // Generate PDF version of the updated code for email
    const pdfResult = await generateTablePDF(tableCode, event);
    const pdfBuffer = pdfResult.buffer;

    // Get brand colors or use defaults
    const primaryColor = event?.brand?.colors?.primary || "#3a1a5a";

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

    // Prioritize startDate over date
    const eventDate = event?.startDate || event?.date;
    const formattedDate = formatCodeDate(eventDate);

    // Determine table type
    let tableType = "Table";
    if (tableCode.backstagePass) {
      tableType = "Dancefloor Table";
    } else if (tableCode.tableNumber && tableCode.tableNumber.startsWith("V")) {
      tableType = "VIP Booth";
    } else if (tableCode.tableNumber && tableCode.tableNumber.startsWith("F")) {
      tableType = "Front Row Table";
    }

    // Generate custom content section with updated reservation details
    const updateDetailsHtml = `
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h3 style="color: ${primaryColor}; margin-top: 0;">Your Table Reservation has been Updated</h3>
        <p style="font-size: 16px; margin: 0 0 10px;">We've attached your updated table code as a PDF to this email. Details of your reservation have been changed as shown below.</p>
        
        <div style="background-color: white; border-radius: 5px; padding: 15px; margin-top: 15px; border: 1px solid #eee;">
          <div style="background-color: #E6F7FF; border-left: 4px solid #1890ff; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
            <p style="margin: 0; color: #000; font-size: 14px;">
              <strong style="color: #1890ff;">🔄 Status: UPDATED</strong><br>
              Your table reservation details have been updated. Please refer to the information below.
            </p>
          </div>
          
          <p style="margin: 0 0 5px;"><strong>Event Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 5px;"><strong>Guest Name:</strong> ${
            tableCode.name
          }</p>
          <p style="margin: 0 0 5px;"><strong>Table Number:</strong> ${
            tableCode.tableNumber
          } (${tableType})</p>
          <p style="margin: 0 0 5px;"><strong>Unique Code:</strong> <span style="color: ${primaryColor}; font-weight: bold;">${
      tableCode.code || "N/A"
    }</span></p>
          <p style="margin: 0 0 5px;"><strong>People:</strong> ${
            tableCode.pax || 1
          }</p>
          ${
            tableCode.condition
              ? `<p style="margin: 0;"><strong>Notes:</strong> ${tableCode.condition}</p>`
              : ""
          }
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 15px;">
          Please use this updated table code on the day of the event. The previous code is no longer valid.
        </p>
      </div>
    `;

    // Build the email using our template
    const emailHtml = createEventEmailTemplate({
      recipientName: tableCode.name,
      eventTitle: event.title,
      eventDate: eventDate,
      eventLocation: event.location || event.venue || "",
      eventAddress: event.street || event.address || "",
      eventCity: event.city || "",
      eventPostalCode: event.postalCode || "",
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      lineups: event.lineups,
      primaryColor,
      additionalContent: updateDetailsHtml,
      footerText:
        "This is an automated email from GuestCode. Please do not reply to this message.",
      showEventDetails: true,
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
      subject: `Your Updated Table Reservation for ${event?.title || "Event"}`,
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
      type: "update",
    });
    await tableCode.save();

    return res.status(200).json({
      message: "Table update notification sent successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error sending table update email:", error);
    res.status(500).json({
      message: "Error sending table update email",
      error: error.message,
    });
  }
};

/**
 * Get available table layouts
 */
const getAvailableTableLayouts = async (req, res) => {
  try {
    // Define available table layouts with their metadata
    const availableLayouts = [
      {
        id: "studio",
        name: "Studio Layout",
        description:
          "Professional studio layout with VIP, DJ, and premium areas",
        component: "TableLayoutStudio",
        totalTables: 24,
        areas: ["VIP", "DJ Area", "Backstage", "Premium"],
        previewImage: "/images/layouts/studio-preview.jpg", // Optional preview image
      },
      {
        id: "bolivar",
        name: "Bolivar Layout",
        description:
          "Classic club layout with multiple zones and flexible seating",
        component: "TableLayoutBolivar",
        totalTables: 28,
        areas: ["Main Floor", "DJ Zone", "VIP Section", "Bar Area"],
        previewImage: "/images/layouts/bolivar-preview.jpg",
      },
      {
        id: "venti",
        name: "Venti Layout",
        description:
          "Modern garden-themed layout with premium suites and VIP lounges",
        component: "TableLayoutVenti",
        totalTables: 18,
        areas: ["Standard Tables", "DJ Area", "VIP Lounge", "Premium Suite"],
        previewImage: "/images/layouts/venti-preview.jpg",
      },
    ];

    res.status(200).json({
      success: true,
      layouts: availableLayouts,
    });
  } catch (error) {
    console.error("Error fetching available table layouts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available table layouts",
      error: error.message,
    });
  }
};

module.exports = {
  addTableCode,
  getTableCounts,
  generateCodeImage,
  generateCodePNGDownload,
  generateCodePDF,
  sendTableCodeEmail,
  sendTableConfirmationEmail,
  sendTableCancellationEmail,
  sendTableDeclinedEmail,
  sendTableUpdateEmail,
  getAvailableTableLayouts,
};
