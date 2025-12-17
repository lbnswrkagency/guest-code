const Code = require("../models/codesModel");
const Event = require("../models/eventsModel");
const CodeSettings = require("../models/codeSettingsModel");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const puppeteer = require("puppeteer");
const { createEventEmailTemplate } = require("../utils/emailLayout");

// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Helper function to generate a unique code
const generateUniqueCode = async (length = 8) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = "";
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    const existingCode = await Code.findOne({ code });
    if (!existingCode) {
      isUnique = true;
    }
  }

  return code;
};

// Helper function to generate QR code
const generateQR = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(data), {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 1,
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

// Configure event code settings
const configureCodeSettings = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      codeSettingId,
      name,
      type,
      condition,
      maxPax,
      limit,
      isEnabled,
      isEditable,
    } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to modify this event
    if (
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this event" });
    }

    // Initialize codeSettings array if it doesn't exist
    if (!event.codeSettings) {
      event.codeSettings = [];
    }

    // If codeSettingId is provided, update existing code setting
    if (codeSettingId) {
      const settingIndex = event.codeSettings.findIndex(
        (setting) => setting._id.toString() === codeSettingId
      );

      if (settingIndex === -1) {
        return res.status(404).json({ message: "Code setting not found" });
      }

      // Update the code setting
      if (name && event.codeSettings[settingIndex].isEditable) {
        event.codeSettings[settingIndex].name = name;
      }

      if (condition !== undefined)
        event.codeSettings[settingIndex].condition = condition;
      if (maxPax !== undefined)
        event.codeSettings[settingIndex].maxPax = maxPax;
      if (limit !== undefined) event.codeSettings[settingIndex].limit = limit;
      if (isEnabled !== undefined)
        event.codeSettings[settingIndex].isEnabled = isEnabled;

      // Update legacy fields for backward compatibility
      if (type === "guest") event.guestCode = isEnabled;
      if (type === "friends") event.friendsCode = isEnabled;
      if (type === "ticket") event.ticketCode = isEnabled;
      if (type === "table") event.tableCode = isEnabled;
      if (type === "backstage") event.backstageCode = isEnabled;
    }
    // If no codeSettingId, create a new code setting
    else if (type) {
      // Validate the code type
      const validTypes = [
        "guest",
        "friends",
        "ticket",
        "table",
        "backstage",
        "custom",
      ];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid code type" });
      }

      // Create new code setting
      const newCodeSetting = {
        name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Code`,
        type,
        condition: condition || "",
        maxPax: maxPax || 1,
        limit: limit || 0,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        isEditable:
          type === "custom" || (isEditable !== undefined ? isEditable : false),
      };

      event.codeSettings.push(newCodeSetting);
    } else {
      return res
        .status(400)
        .json({ message: "Either codeSettingId or type must be provided" });
    }

    await event.save();

    return res.status(200).json({
      message: "Code settings updated successfully",
      codeSettings: event.codeSettings,
    });
  } catch (error) {
    console.error("Error configuring code settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all code settings for an event
const getCodeSettings = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to view this event
    if (
      req.user &&
      req.user._id &&
      event.user &&
      event.user.toString &&
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this event" });
    }

    // Log warning if event.user is undefined
    if (!event.user) {
    }

    return res.status(200).json({
      codeSettings: event.codeSettings || [],
    });
  } catch (error) {
    console.error("Error fetching code settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a code setting
const deleteCodeSetting = async (req, res) => {
  try {
    const { eventId, codeSettingId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to modify this event
    if (
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this event" });
    }

    // Find the code setting
    const settingIndex = event.codeSettings.findIndex(
      (setting) => setting._id.toString() === codeSettingId
    );

    if (settingIndex === -1) {
      return res.status(404).json({ message: "Code setting not found" });
    }

    // Check if this is a default code type that shouldn't be deleted
    const codeType = event.codeSettings[settingIndex].type;
    if (["guest", "ticket", "friends", "backstage"].includes(codeType)) {
      return res.status(400).json({
        message:
          "Cannot delete default code types. You can disable them instead.",
      });
    }

    // Remove the code setting
    event.codeSettings.splice(settingIndex, 1);
    await event.save();

    return res.status(200).json({
      message: "Code setting deleted successfully",
      codeSettings: event.codeSettings,
    });
  } catch (error) {
    console.error("Error deleting code setting:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create a new code
const createCode = async (req, res) => {
  try {
    const { eventId, codeSettingId, name } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Find the code setting
    const codeSetting = await CodeSettings.findById(codeSettingId);

    if (!codeSetting) {
      return res.status(404).json({ message: "Code setting not found" });
    }

    // Check if the code setting is enabled
    if (!codeSetting.isEnabled) {
      return res.status(400).json({
        message: `${codeSetting.name} is not enabled for this event`,
      });
    }

    // Generate a unique code
    const code = await generateUniqueCode();

    // Create QR code data
    const qrData = {
      code,
      type: codeSetting.type,
      eventId,
      name: name || codeSetting.name,
    };

    // Generate QR code
    const qrCode = await generateQR(qrData);

    // Create the code in the database
    const newCode = new Code({
      eventId,
      codeSettingId,
      type: codeSetting.type,
      name: name || codeSetting.name,
      code,
      qrCode,
      condition: codeSetting.condition || "",
      maxPax: codeSetting.maxPax || 1,
      limit: codeSetting.limit || 0,
      createdBy: req.user._id,
      // Add type-specific fields if needed
      price: codeSetting.price,
      tableNumber: codeSetting.tableNumber,
    });

    await newCode.save();

    return res.status(201).json({
      message: "Code created successfully",
      code: newCode,
    });
  } catch (error) {
    console.error("Error creating code:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Generate a dynamic code with enhanced features
const createDynamicCode = async (req, res) => {
  try {
    // Debug logging
    console.log("🔍 Code generation request received:");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
    console.log("🔑 User:", req.user ? req.user._id : "No user");
    console.log(
      "🔑 Auth header:",
      req.headers.authorization ? "Present" : "Missing"
    );
    console.log("🔑 User from request body:", req.body.createdBy);
    console.log("👤 Host information:", {
      host: req.body.host,
      hostId: req.body.hostId,
      metadata: req.body.metadata,
    });

    // Extract fields with fallbacks and multiple naming conventions
    const {
      name,
      event, // eventId from frontend
      host, // Name of the host
      hostId, // createdBy field in our model
      condition,
      pax, // maxPax in our model
      paxChecked = 0, // New field from frontend
      type, // Code type
      settings, // codeSettingId in our model
      tableNumber = "", // Optional for table codes
      // Alternative field names
      eventId = event,
      codeSettingId = settings,
      maxPax = pax,
      createdBy = hostId || req.body.createdBy, // Use createdBy from request body as fallback
      metadata = {}, // Get metadata if provided
      // Additional fields that might be sent from the client
      status = "active",
      isDynamic = true,
    } = req.body;

    // Use the first valid value found for each required field
    const effectiveEventId = event || eventId || req.body.eventId;
    let effectiveType = type || req.body.type;
    const effectiveSettings =
      settings ||
      codeSettingId ||
      req.body.codeSettingId ||
      (req.body.metadata && req.body.metadata.settingId
        ? req.body.metadata.settingId
        : null);
    const effectiveCreatedBy = createdBy || (req.user ? req.user._id : null);
    const effectiveHost =
      host ||
      metadata.hostName ||
      (req.user
        ? req.user.username || req.user.firstName || req.user.email
        : null);
    const effectiveUsername =
      metadata.hostUsername ||
      (req.user ? req.user.username || req.user.email : null);

    // Additional debug info for derived field values
    console.log("🔶 Effective field values:");
    console.log("- effectiveEventId:", effectiveEventId);
    console.log("- effectiveType:", effectiveType);
    console.log("- effectiveSettings:", effectiveSettings);
    console.log("- name:", name);
    console.log("- maxPax/pax:", maxPax || pax);
    console.log("- effectiveCreatedBy:", effectiveCreatedBy);
    console.log("- effectiveHost:", effectiveHost);
    console.log("- effectiveUsername:", effectiveUsername);
    console.log("- metadata:", JSON.stringify(metadata));

    // Validate required fields
    if (!effectiveEventId) {
      console.error("❌ Missing event ID field");
      return res
        .status(400)
        .json({ message: "Missing required field: event or eventId" });
    }

    if (!effectiveType) {
      console.error("❌ Missing type field");
      return res.status(400).json({ message: "Missing required field: type" });
    }

    // Ensure the type is one of the allowed values
    const allowedTypes = [
      "guest",
      "friends",
      "ticket",
      "table",
      "backstage",
      "custom",
    ];
    if (!allowedTypes.includes(effectiveType)) {
      console.warn(`⚠️ Invalid type: ${effectiveType}, defaulting to 'custom'`);
      effectiveType = "custom";
    }

    if (!effectiveSettings) {
      console.error("❌ Missing settings field");
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        message: "Missing required field: settings or codeSettingId",
        details:
          "Please ensure the code setting ID is provided in the request. Check the activeSetting object in the CodeGenerator component.",
      });
    }

    // Find the event
    const event_ = await Event.findById(effectiveEventId);
    if (!event_) {
      console.error(`❌ Event not found: ${effectiveEventId}`);
      return res.status(404).json({ message: "Event not found" });
    }

    // If createdBy is still undefined, use the event's user as a fallback
    if (!effectiveCreatedBy && event_.user) {
      console.log(
        `⚠️ Using event user as fallback for createdBy: ${event_.user}`
      );
      effectiveCreatedBy = event_.user;
    }

    // If still no createdBy, return an error
    if (!effectiveCreatedBy) {
      console.error("❌ No user ID available for createdBy field");
      return res.status(400).json({
        message: "Missing required field: createdBy",
        details:
          "Please ensure you are logged in or provide a user ID in the request.",
      });
    }

    // Find the code setting
    const CodeSettings = require("../models/codeSettingsModel");
    const codeSetting = await CodeSettings.findById(effectiveSettings);

    if (!codeSetting) {
      console.error("❌ Code setting not found:", effectiveSettings);
      return res.status(404).json({ message: "Code setting not found" });
    }

    // Check if the code setting is enabled
    if (!codeSetting.isEnabled) {
      console.error("❌ Code setting is not enabled:", codeSetting.name);
      return res.status(400).json({
        message: `${codeSetting.name} codes are no longer accepted`,
        status: "disabled",
      });
    }

    // Generate a unique code
    const code = await generateUniqueCode();
    console.log("✅ Generated unique code:", code);

    // Generate a security token for additional validation
    const securityToken = crypto.randomBytes(16).toString("hex");

    // Create QR code data with enhanced security
    const qrData = {
      code,
      securityToken,
      type: effectiveType,
      eventId: effectiveEventId,
      name: name || codeSetting.name,
      timestamp: Date.now(),
    };

    // Generate QR code
    const qrCode = await generateQR(qrData);
    console.log("✅ Generated QR code");

    // Create the dynamic code in the database with enhanced features
    const newCode = new Code({
      eventId: effectiveEventId,
      codeSettingId: effectiveSettings,
      type: effectiveType,
      name: name || codeSetting.name,
      code,
      qrCode,
      securityToken,
      condition: condition || codeSetting.condition || "",
      maxPax: maxPax || pax || codeSetting.maxPax || 1,
      paxChecked: paxChecked || 0,
      limit: codeSetting.limit || 0,
      createdBy: effectiveCreatedBy,
      status: status || "active",
      // Additional fields specific to this type
      tableNumber,
      // Dynamic code specific fields
      isDynamic: isDynamic || true,
      metadata: {
        ...metadata,
        codeType: codeSetting.name,
        settingId: codeSetting._id.toString(),
        settingName: codeSetting.name,
        displayName: codeSetting.name,
        actualType: effectiveType,
        generatedFrom: "CodeGenerator",
        host: effectiveHost,
        hostInfo: {
          id: effectiveCreatedBy,
          username: effectiveUsername,
        },
      },
    });

    console.log("📝 Saving code with data:", {
      eventId: newCode.eventId,
      type: newCode.type,
      name: newCode.name,
      createdBy: newCode.createdBy,
      condition: newCode.condition,
      maxPax: newCode.maxPax,
      paxChecked: newCode.paxChecked,
      metadata: newCode.metadata,
    });

    await newCode.save();
    console.log("✅ Code saved to database");

    // Return the generated code data for display
    return res.status(201).json({
      message: "Code generated successfully",
      code: {
        _id: newCode._id,
        code: newCode.code,
        qrCode: newCode.qrCode,
        name: newCode.name,
        type: newCode.type,
        maxPax: newCode.maxPax,
        paxChecked: newCode.paxChecked,
        condition: newCode.condition,
        metadata: newCode.metadata,
      },
    });
  } catch (error) {
    console.error("❌ Error creating dynamic code:", error);
    return res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Get all codes for an event
const getEventCodes = async (req, res) => {
  try {
    const { eventId, type } = req.params;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to view this event
    if (
      req.user &&
      req.user._id &&
      event.user &&
      event.user.toString &&
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this event" });
    }

    // Log warning if event.user is undefined
    if (!event.user) {
    }

    // Build query
    const query = { eventId };
    if (type) {
      query.type = type;
    }


    // Get all codes for this event
    const codes = await Code.find(query).sort({ createdAt: -1 });

    // Check if we have any codes with metadata.codeType
    const codesWithMetadataType = codes.filter(
      (code) => code.metadata && code.metadata.codeType
    );


    // Get code settings for reference
    const CodeSettings = require("../models/codeSettingsModel");
    const codeSettings = await CodeSettings.find({ eventId });

    // Combine codes with their settings and format for frontend display
    const codesWithSettings = codes.map((code) => {
      // Find the corresponding code setting if it exists
      const codeSetting = code.codeSettingId
        ? codeSettings.find(
            (s) => s._id.toString() === code.codeSettingId.toString()
          )
        : null;

      // Format data for frontend display
      return {
        _id: code._id,
        code: code.code,
        qrCode: code.qrCode,
        name: code.name || "Guest",
        guestName: code.guestName || code.name,
        condition: code.condition || "",
        type: code.type,
        status: code.status,
        maxPax: code.maxPax || 1,
        paxChecked: code.paxChecked || 0,
        usageCount: code.usageCount || 0,
        limit: code.limit || 0,
        isDynamic: code.isDynamic || false,
        tableNumber: code.tableNumber || "",
        createdAt: code.createdAt,
        updatedAt: code.updatedAt,
        createdBy: code.createdBy,
        metadata: code.metadata || {},
        // Include codeSetting details if available
        setting: codeSetting
          ? {
              name: codeSetting.name,
              type: codeSetting.type,
              condition: codeSetting.condition,
            }
          : null,
      };
    });

    return res.status(200).json(codesWithSettings);
  } catch (error) {
    console.error("❌ SERVER ERROR getting event codes:", error);
    return res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Get a specific code
const getCode = async (req, res) => {
  try {
    const { codeId } = req.params;

    const code = await Code.findById(codeId);
    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // Find the event
    const event = await Event.findById(code.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to view this code
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this code" });
    }

    return res.status(200).json(code);
  } catch (error) {
    console.error("Error fetching code:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update a code
const updateCode = async (req, res) => {
  try {
    const { codeId } = req.params;
    const { name, condition, maxPax, pax, paxChecked, status, tableNumber } =
      req.body;


    // Check if code exists
    const code = await Code.findById(codeId);
    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }


    // Find the event
    const event = await Event.findById(code.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get the user ID from the request
    const userId = req.user ? req.user._id || req.user.userId : null;

    // Skip permission check if user is admin
    if (req.user && req.user.isAdmin) {
    }
    // Skip permission check if event.user or userId is undefined
    else if (!event.user || !userId) {
    }
    // Check if user is the event creator
    else if (event.user.toString() === userId.toString()) {
    }
    // Check if user is part of the brand team
    else {
      try {
        // Find the brand
        const Brand = require("../models/brandModel");
        const brand = await Brand.findById(event.brand);

        if (!brand) {
          return res.status(404).json({ message: "Brand not found" });
        }

        // Check if user is the brand owner or part of the brand team
        const isOwner =
          brand.owner && brand.owner.toString() === userId.toString();
        const isTeamMember =
          brand.team &&
          brand.team.some(
            (member) =>
              member.user && member.user.toString() === userId.toString()
          );


        if (!isOwner && !isTeamMember) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this code" });
        }

      } catch (permError) {
        console.error("Error checking permissions:", permError);
        return res.status(500).json({ message: "Error checking permissions" });
      }
    }

    // Update fields
    try {
      if (name) code.name = name;
      if (condition) code.condition = condition;
      if (maxPax) code.maxPax = maxPax;

      // Handle pax field - update both pax and paxChecked for compatibility
      if (pax !== undefined) {
        // If the code has a pax field, update it
        if ("pax" in code) {
          code.pax = pax;
        }

        // Always update paxChecked
        code.paxChecked = pax;
      }

      // Handle paxChecked field directly if provided
      if (paxChecked !== undefined) {
        code.paxChecked = paxChecked;
      }

      if (status) code.status = status;
      if (tableNumber) code.tableNumber = tableNumber;

      await code.save();

      return res.status(200).json({
        message: "Code updated successfully",
        code,
      });
    } catch (updateError) {
      console.error("Error updating code:", updateError);
      return res.status(500).json({ message: "Error updating code" });
    }
  } catch (error) {
    console.error("Error in update code process:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a code
const deleteCode = async (req, res) => {
  try {
    const { codeId } = req.params;


    // Check if code exists
    const code = await Code.findById(codeId);
    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }


    // Find the event
    const event = await Event.findById(code.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get the user ID from the request
    const userId = req.user ? req.user._id || req.user.userId : null;

    // Skip permission check if user is admin
    if (req.user && req.user.isAdmin) {
    }
    // Skip permission check if event.user or userId is undefined
    else if (!event.user || !userId) {
    }
    // Check if user is the event creator
    else if (event.user.toString() === userId.toString()) {
    }
    // Check if user is part of the brand team
    else {
      try {
        // Find the brand
        const Brand = require("../models/brandModel");
        const brand = await Brand.findById(event.brand);

        if (!brand) {
          return res.status(404).json({ message: "Brand not found" });
        }

        // Check if user is the brand owner or part of the brand team
        const isOwner =
          brand.owner && brand.owner.toString() === userId.toString();
        const isTeamMember =
          brand.team &&
          brand.team.some(
            (member) =>
              member.user && member.user.toString() === userId.toString()
          );


        if (!isOwner && !isTeamMember) {
          console.log(
            `User ${userId} not authorized to delete code ${codeId}`
          );
          return res
            .status(403)
            .json({ message: "Not authorized to delete this code" });
        }

      } catch (permError) {
        console.error("Error checking permissions:", permError);
        return res.status(500).json({ message: "Error checking permissions" });
      }
    }

    // Delete the code
    try {
      const result = await Code.findByIdAndDelete(codeId);
      if (!result) {
        return res.status(500).json({ message: "Failed to delete code" });
      }

      return res.status(200).json({
        message: "Code deleted successfully",
      });
    } catch (deleteError) {
      console.error("Error deleting code:", deleteError);
      return res.status(500).json({ message: "Error deleting code" });
    }
  } catch (error) {
    console.error("Error in delete code process:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Generate QR code image for a code
const generateCodeImage = async (req, res) => {
  try {
    const { codeId } = req.params;

    const code = await Code.findById(codeId);
    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // Find the event
    const event = await Event.findById(code.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to view this code
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this code" });
    }

    // If QR code exists, return it
    if (code.qrCode) {
      // Convert base64 to buffer
      const qrBuffer = Buffer.from(code.qrCode.split(",")[1], "base64");

      res.set("Content-Type", "image/png");
      return res.send(qrBuffer);
    }

    // If QR code doesn't exist, generate it
    const qrData = {
      code: code.code,
      type: code.type,
      eventId: code.eventId.toString(),
      name: code.name,
    };

    const qrCode = await generateQR(qrData);

    // Save the QR code to the database
    code.qrCode = qrCode;
    await code.save();

    // Convert base64 to buffer
    const qrBuffer = Buffer.from(qrCode.split(",")[1], "base64");

    res.set("Content-Type", "image/png");
    return res.send(qrBuffer);
  } catch (error) {
    console.error("Error generating code image:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Verify a code
const verifyCode = async (req, res) => {
  try {
    const { code } = req.body;
    let codeDoc = null;

    // Check if the code is a valid MongoDB ObjectID
    const isValidObjectId = code && code.match(/^[0-9a-fA-F]{24}$/);

    if (isValidObjectId) {
      // First try to find by ID
      codeDoc = await Code.findById(code);
    }

    // If not found by ID, try to find by code string
    if (!codeDoc) {
      codeDoc = await Code.findOne({ code });
    }

    if (!codeDoc) {
      return res.status(404).json({ message: "Invalid code" });
    }

    // Check if code is active
    if (codeDoc.status !== "active") {
      return res.status(400).json({
        message: `Code is ${codeDoc.status}`,
        status: codeDoc.status,
      });
    }

    // Find the event
    const event = await Event.findById(codeDoc.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event is active
    if (!event.isLive) {
      return res.status(400).json({ message: "Event is not active" });
    }

    // Get the code setting
    const CodeSettings = require("../models/codeSettingsModel");
    const codeSetting = codeDoc.codeSettingId
      ? await CodeSettings.findById(codeDoc.codeSettingId)
      : await CodeSettings.findOne({
          eventId: codeDoc.eventId,
          type: codeDoc.type,
        });

    // Check if code setting is still enabled
    if (codeSetting && !codeSetting.isEnabled) {
      return res.status(400).json({
        message: `${codeSetting.name} codes are no longer accepted`,
        status: "disabled",
      });
    }

    // Check if code has reached its limit (if applicable)
    if (codeDoc.limit > 0 && codeDoc.usageCount >= codeDoc.limit) {
      codeDoc.status = "expired";
      await codeDoc.save();
      return res.status(400).json({
        message: "Code has reached its usage limit",
        status: "expired",
      });
    }

    // Increment usage count
    codeDoc.usageCount += 1;

    // If this was the last allowed use, mark as expired
    if (codeDoc.limit > 0 && codeDoc.usageCount >= codeDoc.limit) {
      codeDoc.status = "expired";
    }

    await codeDoc.save();

    return res.status(200).json({
      message: "Code verified successfully",
      code: codeDoc,
      event: {
        _id: event._id,
        title: event.title,
        startDate: event.startDate,
        location: event.location,
      },
      codeSetting: codeSetting
        ? {
            name: codeSetting.name,
            type: codeSetting.type,
            condition: codeSetting.condition,
          }
        : null,
    });
  } catch (error) {
    console.error("Error verifying code:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Track detailed usage of a code
const trackCodeUsage = async (req, res) => {
  try {
    const { codeId, paxUsed, location, deviceInfo } = req.body;

    // Find the code
    const code = await Code.findById(codeId);
    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // Check if code is active
    if (code.status !== "active") {
      return res.status(400).json({
        message: `This code is ${code.status}`,
      });
    }

    // Check if code is expired
    if (code.expiryDate && new Date() > code.expiryDate) {
      code.status = "expired";
      await code.save();
      return res.status(400).json({
        message: "This code has expired",
      });
    }

    // Check if code has reached its usage limit
    if (code.limit > 0 && code.usageCount >= code.limit) {
      code.status = "used";
      await code.save();
      return res.status(400).json({
        message: "This code has reached its usage limit",
      });
    }

    // Add usage record
    code.usage.push({
      timestamp: new Date(),
      paxUsed: paxUsed || 1,
      userId: req.user._id,
      location,
      deviceInfo,
    });

    // Update overall usage stats
    code.usageCount += 1;
    code.paxChecked += paxUsed || 1;

    // If this usage hits the limit, mark code as used
    if (code.limit > 0 && code.usageCount >= code.limit) {
      code.status = "used";
    }

    await code.save();

    return res.status(200).json({
      message: "Code usage tracked successfully",
      code: {
        _id: code._id,
        code: code.code,
        status: code.status,
        usageCount: code.usageCount,
        paxChecked: code.paxChecked,
        remainingUses:
          code.limit > 0
            ? Math.max(0, code.limit - code.usageCount)
            : "unlimited",
      },
    });
  } catch (error) {
    console.error("Error tracking code usage:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get code counts for an event
const getCodeCounts = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { type, displayType } = req.query;


    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Build query
    const query = { eventId };
    if (type) {
      query.type = type;
    }


    // Count codes
    const count = await Code.countDocuments(query);

    // Get all codes for this event and type
    const codes = await Code.find(query);

    // If displayType is provided, filter codes by metadata.codeType or metadata.settingName
    let filteredCodes = codes;
    if (displayType) {
      filteredCodes = codes.filter(
        (code) =>
          code.metadata?.codeType === displayType ||
          code.metadata?.settingName === displayType ||
          code.metadata?.displayName === displayType
      );
    }

    // Calculate pax used and total pax for the filtered codes
    const paxUsed = filteredCodes.reduce(
      (sum, code) => sum + (code.paxChecked || 0),
      0
    );
    const totalPax = filteredCodes.reduce(
      (sum, code) => sum + (code.maxPax || 1),
      0
    );


    // Get code settings for this type
    const CodeSettings = require("../models/codeSettingsModel");
    let codeSettingQuery = { eventId };

    // Only add type conditions if type is defined
    if (type) {
      codeSettingQuery.$or = [
        { type },
        { name: { $regex: type, $options: "i" } },
      ];
    }

    const codeSetting = await CodeSettings.findOne(codeSettingQuery);

    // Get limit and unlimited status from code setting
    const limit = codeSetting ? codeSetting.limit : 0;
    const unlimited = limit === 0; // If limit is 0, it's unlimited


    return res.status(200).json({
      count: filteredCodes.length, // Return the count of filtered codes
      paxUsed,
      totalPax,
      limit,
      unlimited,
      remaining: unlimited ? -1 : limit - paxUsed,
      filteredCount: filteredCodes.length,
    });
  } catch (error) {
    console.error("Error getting code counts:", error);
    return res.status(500).json({ message: "Server error: " + error.message });
  }
};

/**
 * Get code counts for a specific user
 */
const getUserCodeCounts = async (req, res) => {

  try {
    const { eventId, userId } = req.params;
    const { settingId } = req.query;


    // Validate that we have both eventId and userId
    if (!eventId || !userId) {

      // Try to get userId from the authenticated user if it's missing in the path
      let effectiveUserId = userId;
      if (!effectiveUserId && req.user) {
        effectiveUserId = req.user.userId || req.user._id;
      }

      // If we still don't have a userId, return an error
      if (!eventId || !effectiveUserId) {
        return res
          .status(400)
          .json({ message: "Event ID and User ID are required" });
      }

      // Continue with the effectiveUserId

      // Update userId for the rest of the function
      userId = effectiveUserId;
    }


    // Step 1: Get all code settings for this event
    const codeSettings = await CodeSettings.find({ eventId });

    // Create a map of codeSettingId to code setting details
    const codeSettingsMap = {};
    codeSettings.forEach((setting) => {
      codeSettingsMap[setting._id.toString()] = {
        id: setting._id.toString(),
        name: setting.name,
        type: setting.type,
        maxPax: setting.maxPax,
        condition: setting.condition,
        limit: setting.limit,
        unlimited: setting.unlimited || setting.limit === 0,
      };
    });

    // Step 2: Build the query to find codes created by this user for this event
    const query = {
      eventId,
      createdBy: userId,
    };

    // Add settingId to query if provided
    if (settingId) {
      query.codeSettingId = settingId;
    }

    // Step 3: Find all codes created by this user for this event
    const userCodes = await Code.find(query).populate("codeSettingId");


    // Step 4: Group codes by codeSettingId
    const codeCountsBySettingId = {};

    userCodes.forEach((code) => {
      // Get the setting ID from the code
      const settingId = code.codeSettingId
        ? typeof code.codeSettingId === "object"
          ? code.codeSettingId._id.toString()
          : code.codeSettingId.toString()
        : null;

      if (!settingId) {
        return;
      }

      // Initialize the counter and codes array if needed
      if (!codeCountsBySettingId[settingId]) {
        codeCountsBySettingId[settingId] = {
          count: 0,
          codes: [],
        };
      }

      // Increment the counter and add the code to the array
      codeCountsBySettingId[settingId].count++;
      codeCountsBySettingId[settingId].codes.push({
        id: code._id.toString(),
        name: code.name,
        type: code.type,
        code: code.code,
        pax: code.maxPax,
        condition: code.condition,
        metadata: code.metadata,
        createdAt: code.createdAt,
      });

      console.log(
        `📋 SERVER USER CODE: id=${code._id}, settingId=${settingId}, name=${code.name}`
      );
    });

    // Step 5: Combine the code counts with the code settings details
    const result = {};

    // Include all code settings, even if the user hasn't created any codes for them
    Object.keys(codeSettingsMap).forEach((settingId) => {
      const setting = codeSettingsMap[settingId];
      const counts = codeCountsBySettingId[settingId] || {
        count: 0,
        codes: [],
      };

      result[settingId] = {
        setting,
        count: counts.count,
        codes: counts.codes,
      };
    });


    // Step 6: Return the response
    const response = {
      settings: result,
      summary: {
        totalCodes: userCodes.length,
        settingsCount: Object.keys(result).length,
        activeSettingId: settingId || null,
        activeSettingCodes: settingId ? result[settingId]?.count || 0 : null,
      },
    };


    return res.json(response);
  } catch (error) {
    console.error("Error getting user code counts:", error);
    return res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Find a code by security token
const findBySecurityToken = async (req, res) => {
  try {
    const { securityToken } = req.body;

    if (!securityToken) {
      return res.status(400).json({ message: "Security token is required" });
    }

    console.log("Looking for code with securityToken:", securityToken);

    // Find the code by security token
    const code = await Code.findOne({ securityToken });

    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    console.log("Found code by securityToken:", code.code);

    return res.status(200).json({
      message: "Code found",
      code,
    });
  } catch (error) {
    console.error("Error finding code by security token:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get codes by event, user, and specific code settings
const getEventUserCodes = async (req, res) => {
  try {
    const { eventId, userId, codeSettingIds } = req.body;

    console.log("🔍 Getting codes for event, user and specific settings:", {
      eventId,
      userId,
      codeSettingIds,
    });

    // Validate required fields
    if (!eventId) {
      return res.status(400).json({ message: "Event ID is required" });
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Build query
    const query = {
      eventId,
      createdBy: userId,
    };

    // Add codeSettingIds to query if provided
    if (codeSettingIds && codeSettingIds.length > 0) {
      query.codeSettingId = { $in: codeSettingIds };
    }

    // Get all codes matching the query
    const codes = await Code.find(query).sort({ createdAt: -1 });

    console.log(`✅ Found ${codes.length} codes for the query`);

    // Group codes by codeSettingId
    const codesBySettingId = {};

    codes.forEach((code) => {
      const settingId = code.codeSettingId
        ? code.codeSettingId.toString()
        : "unknown";

      if (!codesBySettingId[settingId]) {
        codesBySettingId[settingId] = [];
      }

      codesBySettingId[settingId].push({
        id: code._id,
        code: code.code,
        name: code.name,
        type: code.type,
        maxPax: code.maxPax,
        paxChecked: code.paxChecked,
        condition: code.condition,
        tableNumber: code.tableNumber,
        qrCode: code.qrCode,
        createdAt: code.createdAt,
        status: code.status,
      });
    });

    return res.status(200).json({
      codes: codesBySettingId,
      totalCount: codes.length,
    });
  } catch (error) {
    console.error("Error getting event user codes:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Send a code by email
const sendCodeByEmail = async (req, res) => {
  try {
    const { codeId } = req.params;
    const { recipientName, recipientEmail } = req.body;

    // Validate required fields
    if (!recipientName || !recipientEmail) {
      return res.status(400).json({
        message: "Recipient name and email are required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // Find the code
    const code = await Code.findById(codeId);
    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // Find the event
    const event = await Event.findById(code.eventId)
      .populate({
        path: "lineups",
        select: "name category avatar",
      })
      .populate("brand");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Find code settings if available
    let codeSetting = null;
    if (code.codeSettingId) {
      codeSetting = await CodeSettings.findById(code.codeSettingId);
    }

    // Get brand colors or use defaults
    const primaryColor = codeSetting?.color || event?.primaryColor || "#ffc807";

    // Generate PDF version of the code
    const pdfBuffer = await generateCodePDF(code, event, codeSetting);

    // Set up the email sender using Brevo
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Format attachment
    const attachments = [
      {
        content: pdfBuffer.toString("base64"),
        name: `${code.type}_code_${code.code}.pdf`,
      },
    ];

    // Get code display name from settings or use capitalized type
    const displayType =
      codeSetting?.name ||
      code.type.charAt(0).toUpperCase() + code.type.slice(1);

    // Generate custom content section with code details
    const codeDetailsHtml = `
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h3 style="color: ${primaryColor}; margin-top: 0;">Your ${displayType}</h3>
        <p style="font-size: 16px; margin: 0 0 10px;">We've attached your ticket code as a PDF to this email. You can print it or show it on your phone at the event.</p>
        <div style="background-color: white; border-radius: 5px; padding: 15px; margin-top: 15px; border: 1px solid #eee;">
          <p style="margin: 0 0 5px;"><strong>Code:</strong> <span style="font-family: monospace; font-size: 16px; background-color: #f1f1f1; padding: 2px 6px; border-radius: 3px;">${
            code.code
          }</span></p>
          <p style="margin: 0 0 5px;"><strong>Type:</strong> ${displayType}</p>
          <p style="margin: 0 0 5px;"><strong>Name:</strong> ${
            code.name || recipientName
          }</p>
          <p style="margin: 0 0 5px;"><strong>People:</strong> ${
            code.maxPax || 1
          }</p>
          ${
            code.condition
              ? `<p style="margin: 0;"><strong>Conditions:</strong> ${code.condition}</p>`
              : ""
          }
        </div>
      </div>
    `;

    // Build the email using our template
    const emailHtml = createEventEmailTemplate({
      recipientName,
      eventTitle: event.title,
      eventDate: event.startDate,
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
          email: recipientEmail.trim(),
          name: recipientName.trim(),
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
      subject: `Your ${displayType} for ${event?.title || "Event"}`,
      htmlContent: emailHtml,
      attachment: attachments,
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(params);

    // Update the code to record that it was sent by email
    code.emailedTo = code.emailedTo || [];
    code.emailedTo.push({
      name: recipientName,
      email: recipientEmail,
      sentAt: new Date(),
    });
    await code.save();

    return res.status(200).json({
      message: "Code sent by email successfully",
      code: {
        _id: code._id,
        code: code.code,
        name: code.name,
        type: code.type,
      },
    });
  } catch (error) {
    console.error("Error sending code by email:", error);
    return res.status(500).json({ message: "Failed to send code by email" });
  }
};

// Generate PDF for a code
const generateCodePDF = async (code, event, codeSetting) => {
  try {
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(
      code.securityToken || code.code,
      {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 225,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      }
    );

    // Get brand colors or use defaults
    const primaryColor = codeSetting?.color || event?.primaryColor || "#ffc807";
    const accentColor = "#000000";

    // Get code display name from settings or use capitalized type
    const displayType =
      codeSetting?.name ||
      code.type.charAt(0).toUpperCase() + code.type.slice(1);

    // Format date
    const date = new Date(event?.startDate);
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const eventDate = {
      day: days[date.getDay()],
      date: date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      time: "20:00", // Default time if not specified
    };

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
              codeSetting?.condition ||
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

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating code PDF:", error);
    throw error;
  }
};

module.exports = {
  configureCodeSettings,
  getCodeSettings,
  deleteCodeSetting,
  createCode,
  createDynamicCode,
  getEventCodes,
  getCode,
  updateCode,
  deleteCode,
  generateCodeImage,
  verifyCode,
  trackCodeUsage,
  getCodeCounts,
  getUserCodeCounts,
  findBySecurityToken,
  getEventUserCodes,
  sendCodeByEmail,
};
