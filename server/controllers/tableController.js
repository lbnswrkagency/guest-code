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

      // Only allow table management if user has explicit role permission or is the brand owner
      // Being a team member alone should NOT grant table management rights
      hasTableManage = isBrandOwner || hasRolePermission;
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

      // First check if user is part of the brand team (main event permissions)
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

      // Get user roles for this brand (main event permissions)
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

      // Check co-host permissions - always check regardless of main brand membership
      let hasCoHostPermission = false;

      // Check if this event has co-hosts and if user's brand is a co-host
      if (eventDetails.coHosts && eventDetails.coHosts.length > 0) {
          // Find all brands where the user is a team member or owner
          const userBrands = await Brand.find({
            $or: [
              { owner: req.user.userId },
              { "team.user": req.user.userId }
            ]
          });

          // Check if any of the user's brands are co-hosts for this event
          for (const userBrand of userBrands) {
            const isCoHost = eventDetails.coHosts.some(
              coHostId => coHostId.toString() === userBrand._id.toString()
            );

            if (isCoHost) {
              // Check co-host permissions for this brand/role combination
              const coHostPermissions = eventDetails.coHostRolePermissions || [];
              const brandPermissions = coHostPermissions.find(
                cp => cp.brandId.toString() === userBrand._id.toString()
              );

              if (brandPermissions) {
                // Find the user's role in this co-host brand
                const userRoleInCoHostBrand = userBrand.team?.find(
                  member => member.user.toString() === req.user.userId.toString()
                )?.role;

                // Check if user is owner of co-host brand
                const isCoHostBrandOwner = userBrand.owner && userBrand.owner.toString() === req.user.userId.toString();

                if (userRoleInCoHostBrand || isCoHostBrandOwner) {
                  // Find permissions for this specific role (or use owner permissions)
                  let rolePermission;
                  if (isCoHostBrandOwner) {
                    // Owners get the permissions of any admin role
                    rolePermission = brandPermissions.rolePermissions.find(rp => {
                      // Find a role with table management permissions
                      return rp.permissions && rp.permissions.tables && rp.permissions.tables.manage === true;
                    });
                  } else {
                    rolePermission = brandPermissions.rolePermissions.find(
                      rp => rp.roleId.toString() === userRoleInCoHostBrand.toString()
                    );
                  }

                  if (rolePermission && rolePermission.permissions && rolePermission.permissions.tables) {
                    hasCoHostPermission = rolePermission.permissions.tables.manage === true || rolePermission.permissions.tables.access === true;
                    if (hasCoHostPermission) {
                      break; // Found permission, no need to check other brands
                    }
                  }
                }
              }
            }
          }
        }

      // Allow table management if user has explicit role permission, is the brand owner, or has co-host permissions
      hasTableManage = isBrandOwner || hasRolePermission || hasCoHostPermission;

      // Check if this is a co-hosted event visualization request
      const isCoHostedVisualization = req.query.coHosted === 'true' && hasCoHostPermission;

      // Fetch table codes based on permissions
      if (hasTableManage || isCoHostedVisualization) {
        // Users with manage permission OR co-host users requesting visualization can see ALL table codes for this event
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
      {
        id: "harlem",
        name: "Harlem Layout",
        description:
          "Urban upscale layout",
        component: "TableLayoutHarlem",
        totalTables: 18,
        areas: ["Standard Tables", "DJ Area", "VIP Lounge", "Premium Suite"],
        previewImage: "/images/layouts/harlem-preview.jpg",
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

/**
 * Generate a table summary PDF for multiple events
 */
const generateTableSummaryPDF = async (req, res) => {
  try {
    const { eventIds } = req.body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ message: "Event IDs array is required" });
    }

    // Check user permissions - require table summary permission
    let hasSummaryPermission = false;
    if (req.user) {
      const Role = require("../models/roleModel");
      const Brand = require("../models/brandModel");
      const User = require("../models/User");

      // Get the first event to determine brand and check permissions
      const firstEvent = await Event.findById(eventIds[0]).populate("brand");
      if (!firstEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user is part of the brand team
      const brand = await Brand.findById(firstEvent.brand._id);
      const isTeamMember = brand && brand.team && brand.team.some(member => 
        member.user.toString() === req.user.userId.toString()
      );

      // Check if user is the brand owner
      const isBrandOwner = brand && brand.owner && brand.owner.toString() === req.user.userId.toString();

      // Get user roles for this brand
      let hasRolePermission = false;
      const userDoc = await User.findById(req.user.userId);
      
      if (userDoc) {
        const userRoleId = brand.team?.find(member => 
          member.user.toString() === req.user.userId.toString()
        )?.role;
        
        if (userRoleId) {
          const userRole = await Role.findOne({
            _id: userRoleId,
            brandId: firstEvent.brand._id
          });
          
          if (userRole && userRole.permissions && userRole.permissions.tables) {
            hasRolePermission = userRole.permissions.tables.summary === true;
          }
        }
      }

      // Allow summary generation if user is team member, brand owner, or has role permission
      hasSummaryPermission = isTeamMember || isBrandOwner || hasRolePermission;
    }

    if (!hasSummaryPermission) {
      return res.status(403).json({ 
        message: "You don't have permission to generate table summaries" 
      });
    }

    // Fetch all events and their table data
    const events = await Event.find({ _id: { $in: eventIds } })
      .populate("brand", "name username logo")
      .sort({ startDate: -1, date: -1 });

    if (events.length === 0) {
      return res.status(404).json({ message: "No events found" });
    }

    // Fetch table codes for all events (including weekly child events)
    const allEventIds = [];
    for (const event of events) {
      allEventIds.push(event._id);
      
      // If this is a weekly event, also get child events
      if (event.isWeekly) {
        const childEvents = await Event.find({ parentEventId: event._id });
        allEventIds.push(...childEvents.map(child => child._id));
      }
    }

    const tableCodes = await TableCode.find({ 
      event: { $in: allEventIds },
      status: { $ne: "cancelled" } // Exclude cancelled reservations
    }).populate("event", "title startDate date isWeekly weekNumber");

    // Group table data by event
    const eventTableData = {};
    events.forEach(event => {
      eventTableData[event._id.toString()] = {
        event,
        tables: [],
        childEvents: {}
      };
    });

    // Organize table codes by event
    tableCodes.forEach(tableCode => {
      const eventId = tableCode.event._id.toString();
      const parentEventId = tableCode.event.parentEventId?.toString();
      
      if (parentEventId && eventTableData[parentEventId]) {
        // This is a child event table - group under parent
        const weekNumber = tableCode.event.weekNumber || 0;
        if (!eventTableData[parentEventId].childEvents[weekNumber]) {
          eventTableData[parentEventId].childEvents[weekNumber] = {
            event: tableCode.event,
            tables: []
          };
        }
        eventTableData[parentEventId].childEvents[weekNumber].tables.push(tableCode);
      } else if (eventTableData[eventId]) {
        // This is a parent event table
        eventTableData[eventId].tables.push(tableCode);
      }
    });

    // Generate PDF summary
    const pdfBuffer = await generateSummaryPDF(eventTableData);

    // Set response headers for PDF download
    const brandName = events[0]?.brand?.name || 'Brand';
    const date = new Date().toISOString().split('T')[0];
    const filename = `${brandName}_Table_Summary_${date}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating table summary PDF:", error);
    res.status(500).json({
      message: "Error generating table summary PDF",
      error: error.message,
    });
  }
};

/**
 * Generate the actual PDF for table summary
 */
const generateSummaryPDF = async (eventTableData) => {
  const primaryColor = "#4A1D96";
  const accentColor = "#d4af37";
  const darkColor = "#301568";

  // Calculate enhanced summary statistics
  let totalEvents = 0;
  let totalTables = 0;
  let totalPax = 0;
  let totalCheckedInPax = 0;
  let totalCheckedInTables = 0;
  let totalRevenue = 0;
  let publicRevenue = 0; // Track public request revenue separately
  const statusCounts = { confirmed: 0, pending: 0, declined: 0 };
  const hostStats = {}; // Track revenue by host

  const eventSummaries = Object.values(eventTableData).map(eventData => {
    const { event, tables, childEvents } = eventData;
    totalEvents++;

    let eventTables = tables.length;
    let eventPax = tables.reduce((sum, table) => sum + (table.pax || 0), 0);
    let eventCheckedInPax = tables.reduce((sum, table) => sum + (table.paxChecked || 0), 0);
    let eventCheckedInTables = tables.filter(table => (table.paxChecked || 0) > 0).length;
    let eventRevenue = eventCheckedInTables * 20; // 20€ per checked-in table

    // Process parent event hosts
    tables.forEach(table => {
      statusCounts[table.status] = (statusCounts[table.status] || 0) + 1;
      
      if ((table.paxChecked || 0) > 0) {
        if (table.isPublic) {
          // Handle public requests separately
          publicRevenue += 20;
        } else {
          const hostName = table.host || 'Unknown Host';
          if (!hostStats[hostName]) {
            hostStats[hostName] = { tables: 0, revenue: 0 };
          }
          hostStats[hostName].tables++;
          hostStats[hostName].revenue += 20;
        }
      }
    });

    // Add child event data
    const childEventSummaries = Object.entries(childEvents).map(([weekNumber, childData]) => {
      const childTables = childData.tables.length;
      const childPax = childData.tables.reduce((sum, table) => sum + (table.pax || 0), 0);
      const childCheckedInPax = childData.tables.reduce((sum, table) => sum + (table.paxChecked || 0), 0);
      const childCheckedInTables = childData.tables.filter(table => (table.paxChecked || 0) > 0).length;
      const childRevenue = childCheckedInTables * 20;

      // Update totals
      eventTables += childTables;
      eventPax += childPax;
      eventCheckedInPax += childCheckedInPax;
      eventCheckedInTables += childCheckedInTables;
      eventRevenue += childRevenue;

      // Process child event hosts
      const childHostStats = {};
      let childPublicRevenue = 0;
      childData.tables.forEach(table => {
        statusCounts[table.status] = (statusCounts[table.status] || 0) + 1;
        
        if ((table.paxChecked || 0) > 0) {
          if (table.isPublic) {
            // Handle public requests separately
            publicRevenue += 20;
            childPublicRevenue += 20;
          } else {
            const hostName = table.host || 'Unknown Host';
            
            // Update global host stats
            if (!hostStats[hostName]) {
              hostStats[hostName] = { tables: 0, revenue: 0 };
            }
            hostStats[hostName].tables++;
            hostStats[hostName].revenue += 20;

            // Update child host stats
            if (!childHostStats[hostName]) {
              childHostStats[hostName] = { tables: 0, revenue: 0 };
            }
            childHostStats[hostName].tables++;
            childHostStats[hostName].revenue += 20;
          }
        }
      });

      return {
        weekNumber: parseInt(weekNumber),
        event: childData.event,
        tables: childData.tables,
        tableCount: childTables,
        paxCount: childPax,
        checkedInPax: childCheckedInPax,
        checkedInTables: childCheckedInTables,
        revenue: childRevenue,
        hostStats: childHostStats,
        publicRevenue: childPublicRevenue
      };
    }).sort((a, b) => a.weekNumber - b.weekNumber);

    // Update global totals
    totalTables += eventTables;
    totalPax += eventPax;
    totalCheckedInPax += eventCheckedInPax;
    totalCheckedInTables += eventCheckedInTables;
    totalRevenue += eventRevenue;

    return {
      event,
      tables,
      childEvents: childEventSummaries,
      tableCount: eventTables,
      paxCount: eventPax,
      checkedInPax: eventCheckedInPax,
      checkedInTables: eventCheckedInTables,
      revenue: eventRevenue
    };
  }).sort((a, b) => {
    const dateA = new Date(a.event.startDate || a.event.date);
    const dateB = new Date(b.event.startDate || b.event.date);
    return dateB - dateA;
  });

  // Generate HTML for the enhanced summary PDF
  const htmlTemplate = `
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin: 30px;
          size: A4;
        }
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          line-height: 1.4;
        }
        .header {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${darkColor} 100%);
          color: white;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 8px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          font-weight: bold;
        }
        .header .date {
          font-size: 14px;
          opacity: 0.9;
        }
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid ${accentColor};
          text-align: center;
        }
        .stat-card.revenue {
          border-left-color: #28a745;
        }
        .stat-number {
          font-size: 20px;
          font-weight: bold;
          color: ${primaryColor};
          margin-bottom: 5px;
        }
        .stat-number.revenue {
          color: #28a745;
        }
        .stat-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          font-weight: 600;
        }
        .host-summary {
          background: #f8f9fa;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .host-summary h3 {
          margin: 0 0 15px 0;
          color: ${primaryColor};
          font-size: 16px;
        }
        .host-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        .host-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 10px;
          font-size: 12px;
        }
        .host-name {
          font-weight: bold;
          color: ${primaryColor};
          margin-bottom: 5px;
        }
        .host-stats {
          color: #666;
        }
        .host-revenue {
          color: #28a745;
          font-weight: bold;
        }
        .event-section {
          margin-bottom: 30px;
          break-inside: avoid;
        }
        .event-header {
          background: ${primaryColor};
          color: white;
          padding: 15px;
          border-radius: 8px 8px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .event-title {
          font-size: 16px;
          font-weight: bold;
          margin: 0;
        }
        .event-meta {
          font-size: 12px;
          opacity: 0.9;
        }
        .event-stats {
          background: #f8f9fa;
          padding: 10px 15px;
          border-radius: 0 0 8px 8px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          font-size: 12px;
        }
        .event-stat {
          text-align: center;
        }
        .event-stat-number {
          font-size: 16px;
          font-weight: bold;
          color: ${primaryColor};
        }
        .event-stat-number.revenue {
          color: #28a745;
        }
        .event-stat-label {
          color: #666;
          margin-top: 2px;
          font-size: 10px;
        }
        .tables-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 8px;
          margin-top: 15px;
        }
        .table-card {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          padding: 10px;
          font-size: 11px;
        }
        .table-card.confirmed {
          border-left: 4px solid #28a745;
        }
        .table-card.pending {
          border-left: 4px solid #ffc107;
        }
        .table-card.declined {
          border-left: 4px solid #dc3545;
        }
        .table-card.checked-in {
          background: #f8fff8;
          border-left: 4px solid #28a745;
        }
        .table-card.public-request {
          background: #fffbf0;
          border-right: 3px solid #f39c12;
        }
        .table-card.public-request.checked-in {
          background: #f8fff8;
          border-left: 4px solid #28a745;
          border-right: 3px solid #f39c12;
        }
        .table-number {
          font-weight: bold;
          font-size: 13px;
          color: ${primaryColor};
          margin-bottom: 4px;
        }
        .table-guest {
          margin-bottom: 2px;
          font-weight: 500;
        }
        .table-host {
          color: #666;
          font-size: 10px;
          margin-bottom: 2px;
        }
        .table-pax {
          color: #666;
          font-size: 10px;
        }
        .table-pax.checked-in {
          color: #28a745;
          font-weight: bold;
        }
        .checked-in-badge {
          background: #28a745;
          color: white;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 10px;
          margin-top: 4px;
          display: inline-block;
        }
        .child-event {
          margin-top: 15px;
          padding-left: 20px;
          border-left: 3px solid ${accentColor};
        }
        .child-event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .child-event-title {
          font-size: 14px;
          font-weight: 600;
          color: ${darkColor};
        }
        .child-event-stats {
          display: flex;
          gap: 15px;
          font-size: 11px;
          color: #666;
        }
        .child-host-summary {
          background: #fff;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          padding: 10px;
          margin: 10px 0;
          font-size: 11px;
        }
        .child-host-title {
          font-weight: bold;
          color: ${primaryColor};
          margin-bottom: 8px;
        }
        .status-legend {
          display: flex;
          gap: 15px;
          margin-top: 30px;
          font-size: 12px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
        .legend-color.confirmed { background: #28a745; }
        .legend-color.pending { background: #ffc107; }
        .legend-color.declined { background: #dc3545; }
        .legend-color.checked-in { background: #d4edda; border: 1px solid #28a745; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Enhanced Table Summary Report</h1>
        <div class="date">Generated on ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
      </div>

      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-number">${totalEvents}</div>
          <div class="stat-label">Events</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${totalTables}</div>
          <div class="stat-label">Total Tables</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${totalCheckedInTables}</div>
          <div class="stat-label">Checked-In Tables</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${totalCheckedInPax}/${totalPax}</div>
          <div class="stat-label">Checked-In/Total Guests</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${statusCounts.confirmed || 0}</div>
          <div class="stat-label">Confirmed</div>
        </div>
        <div class="stat-card revenue">
          <div class="stat-number revenue">€${totalRevenue}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>

      ${Object.keys(hostStats).length > 0 || publicRevenue > 0 ? `
      <div class="host-summary">
        <h3>Revenue Summary</h3>
        <div class="host-grid">
          ${publicRevenue > 0 ? `
            <div class="host-card">
              <div class="host-name" style="color: #f39c12;">Public Requests</div>
              <div class="host-stats">${publicRevenue / 20} checked-in table${publicRevenue / 20 !== 1 ? 's' : ''}</div>
              <div class="host-revenue">€${publicRevenue}</div>
            </div>
          ` : ''}
          ${Object.entries(hostStats)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .map(([hostName, stats]) => `
            <div class="host-card">
              <div class="host-name">${hostName}</div>
              <div class="host-stats">${stats.tables} checked-in table${stats.tables !== 1 ? 's' : ''}</div>
              <div class="host-revenue">€${stats.revenue}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${eventSummaries.map(summary => `
        <div class="event-section">
          <div class="event-header">
            <div>
              <div class="event-title">${summary.event.title}</div>
              <div class="event-meta">
                ${formatCodeDate(summary.event.startDate || summary.event.date)}
                ${summary.event.isWeekly ? ' • Weekly Series' : ''}
              </div>
            </div>
          </div>
          
          <div class="event-stats">
            <div class="event-stat">
              <div class="event-stat-number">${summary.tableCount}</div>
              <div class="event-stat-label">Tables</div>
            </div>
            <div class="event-stat">
              <div class="event-stat-number">${summary.checkedInTables}</div>
              <div class="event-stat-label">Checked-In</div>
            </div>
            <div class="event-stat">
              <div class="event-stat-number">${summary.checkedInPax}/${summary.paxCount}</div>
              <div class="event-stat-label">Guests (In/Total)</div>
            </div>
            <div class="event-stat">
              <div class="event-stat-number">${summary.tables.filter(t => t.status === 'confirmed').length + summary.childEvents.reduce((sum, child) => sum + child.tables.filter(t => t.status === 'confirmed').length, 0)}</div>
              <div class="event-stat-label">Confirmed</div>
            </div>
            <div class="event-stat">
              <div class="event-stat-number revenue">€${summary.revenue}</div>
              <div class="event-stat-label">Revenue</div>
            </div>
          </div>

          ${summary.tables.length > 0 ? `
          <div class="tables-grid">
            ${summary.tables.map(table => `
              <div class="table-card ${table.status} ${(table.paxChecked || 0) > 0 ? 'checked-in' : ''} ${table.isPublic ? 'public-request' : ''}">
                <div class="table-number">Table ${table.tableNumber}</div>
                <div class="table-guest">${table.name}</div>
                <div class="table-host">${table.isPublic ? 'Public Request' : `Host: ${table.host}`}</div>
                <div class="table-pax ${(table.paxChecked || 0) > 0 ? 'checked-in' : ''}">${table.paxChecked || 0}/${table.pax} guests</div>
                ${(table.paxChecked || 0) > 0 ? '<div class="checked-in-badge">✓ CHECKED-IN</div>' : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${summary.childEvents.map(child => `
            <div class="child-event">
              <div class="child-event-header">
                <div class="child-event-title">Week ${child.weekNumber} - ${formatCodeDate(child.event.startDate || child.event.date)}</div>
                <div class="child-event-stats">
                  <span>${child.checkedInTables}/${child.tableCount} checked-in</span>
                  <span>${child.checkedInPax}/${child.paxCount} guests</span>
                  <span style="color: #28a745; font-weight: bold;">€${child.revenue}</span>
                </div>
              </div>

              ${Object.keys(child.hostStats || {}).length > 0 || (child.publicRevenue || 0) > 0 ? `
              <div class="child-host-summary">
                <div class="child-host-title">Week ${child.weekNumber} Revenue:</div>
                ${[
                  (child.publicRevenue || 0) > 0 ? `<span style="color: #f39c12;">Public: €${child.publicRevenue} (${child.publicRevenue / 20} table${child.publicRevenue / 20 !== 1 ? 's' : ''})</span>` : null,
                  ...Object.entries(child.hostStats)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([hostName, stats]) => `<span>${hostName}: €${stats.revenue} (${stats.tables} table${stats.tables !== 1 ? 's' : ''})</span>`)
                ].filter(Boolean).join(' • ')}
              </div>
              ` : ''}

              ${child.tables.length > 0 ? `
              <div class="tables-grid">
                ${child.tables.map(table => `
                  <div class="table-card ${table.status} ${(table.paxChecked || 0) > 0 ? 'checked-in' : ''} ${table.isPublic ? 'public-request' : ''}">
                    <div class="table-number">Table ${table.tableNumber}</div>
                    <div class="table-guest">${table.name}</div>
                    <div class="table-host">${table.isPublic ? 'Public Request' : `Host: ${table.host}`}</div>
                    <div class="table-pax ${(table.paxChecked || 0) > 0 ? 'checked-in' : ''}">${table.paxChecked || 0}/${table.pax} guests</div>
                    ${(table.paxChecked || 0) > 0 ? '<div class="checked-in-badge">✓ CHECKED-IN</div>' : ''}
                  </div>
                `).join('')}
              </div>
              ` : '<div style="font-style: italic; color: #666; margin-top: 10px;">No tables for this week</div>'}
            </div>
          `).join('')}
        </div>
      `).join('')}

      <div class="status-legend">
        <div class="legend-item">
          <div class="legend-color confirmed"></div>
          <span>Confirmed</span>
        </div>
        <div class="legend-item">
          <div class="legend-color pending"></div>
          <span>Pending</span>
        </div>
        <div class="legend-item">
          <div class="legend-color declined"></div>
          <span>Declined</span>
        </div>
        <div class="legend-item">
          <div class="legend-color checked-in"></div>
          <span>Checked-In (Revenue €20/table)</span>
        </div>
      </div>
    </body>
  </html>`;

  // Generate PDF using puppeteer
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlTemplate, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating summary PDF:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch((err) => {
        console.error("Error closing browser:", err);
      });
    }
  }
};

/**
 * Generate a minimalistic table plan PDF for VIP staff
 * Shows tables organized by area with minimal styling to save ink
 */
const generateTablePlanPDF = async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: "Event ID is required" });
    }

    // Permission check is handled by middleware (checkTablePermissions)
    // Fetch event and table codes
    const event = await Event.findById(eventId).populate("brand", "name");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Fetch confirmed and pending table codes for this event
    const tableCodes = await TableCode.find({
      event: eventId,
      status: { $in: ["confirmed", "pending"] }
    }).sort({ tableNumber: 1 });

    // Get the table layout configuration dynamically based on event's tableLayout
    const getLayoutConfig = (layoutName) => {
      // Harlem layout configuration (matches frontend TableLayoutHarlem.js)
      if (layoutName === "harlem") {
        return {
          tableConfig: {
            V1: { minSpend: 300, category: "V" },
            V2: { minSpend: 300, category: "V" },
            V3: { minSpend: 300, category: "V" },
            V4: { minSpend: 300, category: "V" },
            V5: { minSpend: 300, category: "V" },
            V6: { minSpend: 300, category: "V" },
            V7: { minSpend: 300, category: "V" },
            V8: { minSpend: 300, category: "V" },
            V9: { minSpend: 300, category: "V" },
            V10: { minSpend: 300, category: "V" },
            V11: { minSpend: 300, category: "V" },
            V12: { minSpend: 300, category: "V" },
            V13: { minSpend: 300, category: "V" },
            V14: { minSpend: 300, category: "V" },
            VS1: { minSpend: 160, category: "VS" },
            VS2: { minSpend: 160, category: "VS" },
            VS3: { minSpend: 160, category: "VS" },
            S1: { minSpend: 120, category: "S" },
            S2: { minSpend: 120, category: "S" },
            S3: { minSpend: 120, category: "S" },
            S4: { minSpend: 120, category: "S" },
            S5: { minSpend: 120, category: "S" },
            S6: { minSpend: 120, category: "S" },
            S7: { minSpend: 120, category: "S" },
            S8: { minSpend: 120, category: "S" },
            S9: { minSpend: 120, category: "S" },
            S10: { minSpend: 120, category: "S" },
            S11: { minSpend: 120, category: "S" },
            S12: { minSpend: 120, category: "S" },
            S13: { minSpend: 120, category: "S" },
            B0: { minSpend: 500, category: "B" },
            B1: { minSpend: 500, category: "B" },
            B2: { minSpend: 500, category: "B" },
            B3: { minSpend: 500, category: "B" },
            B4: { minSpend: 500, category: "B" },
            B5: { minSpend: 500, category: "B" },
            B6: { minSpend: 500, category: "B" },
            B7: { minSpend: 500, category: "B" },
            B8: { minSpend: 500, category: "B" },
            B9: { minSpend: 500, category: "B" },
            D1: { minSpend: 300, category: "D" },
            D2: { minSpend: 300, category: "D" },
            E1: { minSpend: 1000, category: "E" },
            E2: { minSpend: 1000, category: "E" },
            E3: { minSpend: 1000, category: "E" },
          },
          categoryAreaNames: {
            S: "Standing",
            D: "Standing Backstage",
            V: "VIP",
            VS: "VIP Standing",
            B: "Backstage",
            E: "Exclusive Backstage",
          }
        };
      }
      // Add other layouts here (studio, bolivar, venti) when needed
      // For now, return empty config for unknown layouts
      return {
        tableConfig: {},
        categoryAreaNames: {}
      };
    };

    // Get the layout configuration for this event
    const layoutConfig = getLayoutConfig(event.tableLayout);
    const { tableConfig, categoryAreaNames } = layoutConfig;

    // Group tables by category/area using the dynamic configuration
    const tablesByArea = {};

    tableCodes.forEach(table => {
      // Get table configuration
      const config = tableConfig[table.tableNumber];

      if (config && config.category) {
        // Use the category to get the area name
        const areaName = categoryAreaNames[config.category] || config.category;

        if (!tablesByArea[areaName]) {
          tablesByArea[areaName] = [];
        }

        tablesByArea[areaName].push(table);
      } else {
        // Fallback for tables not in configuration
        const areaName = "Other";
        if (!tablesByArea[areaName]) {
          tablesByArea[areaName] = [];
        }
        tablesByArea[areaName].push(table);
      }
    });

    // Sort tables within each area by minimum spend (highest to lowest)
    Object.keys(tablesByArea).forEach(area => {
      tablesByArea[area].sort((a, b) => {
        const configA = tableConfig[a.tableNumber];
        const configB = tableConfig[b.tableNumber];
        const minSpendA = configA ? configA.minSpend : 0;
        const minSpendB = configB ? configB.minSpend : 0;
        return minSpendB - minSpendA; // Descending order (highest first)
      });
    });

    // Sort areas for consistent display
    const sortedAreas = Object.keys(tablesByArea).sort();

    // Generate minimalistic PDF
    const pdfBuffer = await generateMinimalisticPlanPDF(event, tablesByArea, sortedAreas);

    // Set response headers
    const eventDate = event.startDate || event.date;
    const formattedDate = eventDate ? new Date(eventDate).toISOString().split('T')[0] : 'NoDate';
    const filename = `Table_Plan_${event.title.replace(/\s+/g, '_')}_${formattedDate}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating table plan PDF:", error);
    res.status(500).json({
      message: "Error generating table plan PDF",
      error: error.message,
    });
  }
};

/**
 * Generate the minimalistic PDF for table plan
 * Designed to minimize ink usage with white background and simple styling
 */
const generateMinimalisticPlanPDF = async (event, tablesByArea, sortedAreas) => {
  const eventDate = event.startDate || event.date;
  const formattedDate = eventDate ? formatCodeDate(eventDate) : 'No Date';
  const totalTables = Object.values(tablesByArea).reduce((sum, tables) => sum + tables.length, 0);

  // Minimalistic HTML template with very light styling
  const htmlTemplate = `
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin: 20mm;
          size: A4;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #000;
          line-height: 1.4;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #000;
        }
        .header h1 {
          font-size: 24px;
          margin: 0 0 5px 0;
          font-weight: bold;
        }
        .header p {
          font-size: 12px;
          margin: 3px 0;
        }
        .area-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .area-header {
          background: #f5f5f5;
          padding: 8px 10px;
          margin-bottom: 10px;
          border-left: 4px solid #000;
        }
        .area-title {
          font-size: 14px;
          font-weight: bold;
          margin: 0;
        }
        .table-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .table-item {
          border: 1px solid #ddd;
          padding: 8px;
          page-break-inside: avoid;
        }
        .table-number {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .table-guest {
          font-size: 13px;
          margin-bottom: 2px;
        }
        .table-pax {
          font-size: 11px;
          color: #666;
        }
        .status-badge {
          display: inline-block;
          font-size: 9px;
          padding: 2px 6px;
          border: 1px solid #999;
          border-radius: 3px;
          margin-left: 5px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${event.title || 'Event'}</h1>
        <p>${formattedDate}</p>
        <p>${event.location || ''} | Total Tables: ${totalTables}</p>
      </div>

      ${sortedAreas.map(area => {
        const tables = tablesByArea[area];
        return `
          <div class="area-section">
            <div class="area-header">
              <h2 class="area-title">${area} (${tables.length} table${tables.length !== 1 ? 's' : ''})</h2>
            </div>
            <div class="table-grid">
              ${tables.map(table => `
                <div class="table-item">
                  <div class="table-number">
                    Table ${table.tableNumber}
                    ${table.status === 'pending' ? '<span class="status-badge">PENDING</span>' : ''}
                  </div>
                  <div class="table-guest">${table.name}</div>
                  <div class="table-pax">${table.pax} guest${table.pax !== 1 ? 's' : ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}

      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>${event.brand?.name || ''}</p>
      </div>
    </body>
  </html>`;

  // Generate PDF using puppeteer
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm"
      }
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
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
  sendTableConfirmationEmail,
  sendTableCancellationEmail,
  sendTableDeclinedEmail,
  sendTableUpdateEmail,
  getAvailableTableLayouts,
  generateTableSummaryPDF,
  generateTablePlanPDF,
};
