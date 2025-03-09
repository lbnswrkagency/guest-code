const Code = require("../models/codesModel");
const Event = require("../models/eventsModel");
const CodeSettings = require("../models/codeSettingsModel");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

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
      console.log(
        `❌ SERVER: User ${req.user._id} not authorized to view event ${eventId}`
      );
      return res
        .status(403)
        .json({ message: "Not authorized to view this event" });
    }

    // Log warning if event.user is undefined
    if (!event.user) {
      console.warn(`⚠️ SERVER: Event ${eventId} has no user field`);
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
        message: `${codeSetting.name} is not enabled for this event`,
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
    console.log(`🔍 SERVER: Fetching codes for event=${eventId}, type=${type}`);
    console.log(`🔑 SERVER: User=${req.user ? req.user._id : "No user"}`);
    console.log(`🔑 SERVER: Headers=`, req.headers);

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`❌ SERVER: Event not found: ${eventId}`);
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
      console.log(
        `❌ SERVER: User ${req.user._id} not authorized to view event ${eventId}`
      );
      return res
        .status(403)
        .json({ message: "Not authorized to view this event" });
    }

    // Log warning if event.user is undefined
    if (!event.user) {
      console.warn(`⚠️ SERVER: Event ${eventId} has no user field`);
    }

    // Build query
    const query = { eventId };
    if (type) {
      query.type = type;
    }

    console.log(`🔍 SERVER: Query for codes: ${JSON.stringify(query)}`);

    // Get all codes for this event
    const codes = await Code.find(query).sort({ createdAt: -1 });
    console.log(`✅ SERVER: Found ${codes.length} codes for event ${eventId}`);

    // Check if we have any codes with metadata.codeType
    const codesWithMetadataType = codes.filter(
      (code) => code.metadata && code.metadata.codeType
    );
    console.log(
      `✅ SERVER: Found ${codesWithMetadataType.length} codes with metadata.codeType`
    );

    // Log each code for debugging
    codes.forEach((code) => {
      console.log(
        `📋 SERVER CODE: id=${code._id}, type=${code.type}, condition=${code.condition}, metadata.codeType=${code.metadata?.codeType}, metadata.settingName=${code.metadata?.settingName}`
      );
    });

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

    console.log(
      `✅ SERVER: Returning ${codesWithSettings.length} formatted codes`
    );
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

    console.log(`🔍 SERVER: Updating code ${codeId}`, req.body);
    console.log(
      `🔑 SERVER: User=${
        req.user ? req.user._id || req.user.userId : "undefined"
      }`
    );

    // Check if code exists
    const code = await Code.findById(codeId);
    if (!code) {
      console.log(`❌ SERVER: Code ${codeId} not found`);
      return res.status(404).json({ message: "Code not found" });
    }

    console.log(`✅ SERVER: Found code ${codeId}, eventId=${code.eventId}`);

    // Find the event
    const event = await Event.findById(code.eventId);
    if (!event) {
      console.log(`❌ SERVER: Event ${code.eventId} not found`);
      return res.status(404).json({ message: "Event not found" });
    }

    console.log(
      `✅ SERVER: Found event ${code.eventId}, user=${
        event.user || "undefined"
      }, brand=${event.brand || "undefined"}`
    );

    // Get the user ID from the request
    const userId = req.user ? req.user._id || req.user.userId : null;
    console.log(`🔑 SERVER: User ID for permission check: ${userId}`);

    // Skip permission check if user is admin
    if (req.user && req.user.isAdmin) {
      console.log(
        `✅ SERVER: User ${userId} is admin, skipping permission check`
      );
    }
    // Skip permission check if event.user or userId is undefined
    else if (!event.user || !userId) {
      console.log(
        `✅ SERVER: Missing event.user or userId, skipping permission check`
      );
    }
    // Check if user is the event creator
    else if (event.user.toString() === userId.toString()) {
      console.log(
        `✅ SERVER: User ${userId} is event creator, permission granted`
      );
    }
    // Check if user is part of the brand team
    else {
      try {
        // Find the brand
        const Brand = require("../models/brandModel");
        const brand = await Brand.findById(event.brand);

        if (!brand) {
          console.log(`❌ SERVER: Brand ${event.brand} not found`);
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

        console.log(
          `🔍 SERVER: Brand permission check: isOwner=${isOwner}, isTeamMember=${isTeamMember}`
        );

        if (!isOwner && !isTeamMember) {
          console.log(
            `❌ SERVER: User ${userId} not authorized to update code ${codeId}`
          );
          return res
            .status(403)
            .json({ message: "Not authorized to update this code" });
        }

        console.log(
          `✅ SERVER: User ${userId} is brand owner or team member, permission granted`
        );
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
      console.log(`✅ SERVER: Successfully updated code ${codeId}`);

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

    console.log(`🔍 SERVER: Deleting code ${codeId}`);
    console.log(
      `🔑 SERVER: User=${
        req.user ? req.user._id || req.user.userId : "undefined"
      }`
    );

    // Check if code exists
    const code = await Code.findById(codeId);
    if (!code) {
      console.log(`❌ SERVER: Code ${codeId} not found`);
      return res.status(404).json({ message: "Code not found" });
    }

    console.log(`✅ SERVER: Found code ${codeId}, eventId=${code.eventId}`);

    // Find the event
    const event = await Event.findById(code.eventId);
    if (!event) {
      console.log(`❌ SERVER: Event ${code.eventId} not found`);
      return res.status(404).json({ message: "Event not found" });
    }

    console.log(
      `✅ SERVER: Found event ${code.eventId}, user=${
        event.user || "undefined"
      }, brand=${event.brand || "undefined"}`
    );

    // Get the user ID from the request
    const userId = req.user ? req.user._id || req.user.userId : null;
    console.log(`🔑 SERVER: User ID for permission check: ${userId}`);

    // Skip permission check if user is admin
    if (req.user && req.user.isAdmin) {
      console.log(
        `✅ SERVER: User ${userId} is admin, skipping permission check`
      );
    }
    // Skip permission check if event.user or userId is undefined
    else if (!event.user || !userId) {
      console.log(
        `✅ SERVER: Missing event.user or userId, skipping permission check`
      );
    }
    // Check if user is the event creator
    else if (event.user.toString() === userId.toString()) {
      console.log(
        `✅ SERVER: User ${userId} is event creator, permission granted`
      );
    }
    // Check if user is part of the brand team
    else {
      try {
        // Find the brand
        const Brand = require("../models/brandModel");
        const brand = await Brand.findById(event.brand);

        if (!brand) {
          console.log(`❌ SERVER: Brand ${event.brand} not found`);
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

        console.log(
          `🔍 SERVER: Brand permission check: isOwner=${isOwner}, isTeamMember=${isTeamMember}`
        );

        if (!isOwner && !isTeamMember) {
          console.log(
            `❌ SERVER: User ${userId} not authorized to delete code ${codeId}`
          );
          return res
            .status(403)
            .json({ message: "Not authorized to delete this code" });
        }

        console.log(
          `✅ SERVER: User ${userId} is brand owner or team member, permission granted`
        );
      } catch (permError) {
        console.error("Error checking permissions:", permError);
        return res.status(500).json({ message: "Error checking permissions" });
      }
    }

    // Delete the code
    try {
      const result = await Code.findByIdAndDelete(codeId);
      if (!result) {
        console.log(`❌ SERVER: Failed to delete code ${codeId}`);
        return res.status(500).json({ message: "Failed to delete code" });
      }
      console.log(`✅ SERVER: Successfully deleted code ${codeId}`);

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
        date: event.date,
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

    console.log(
      `🔍 SERVER: Fetching code counts for event=${eventId}, type=${type}, displayType=${displayType}`
    );

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`❌ SERVER: Event not found: ${eventId}`);
      return res.status(404).json({ message: "Event not found" });
    }

    // Build query
    const query = { eventId };
    if (type) {
      query.type = type;
    }

    console.log(`🔍 SERVER: Query for code counts: ${JSON.stringify(query)}`);

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
      console.log(
        `🔍 SERVER: Filtered ${codes.length} codes to ${filteredCodes.length} codes with displayType=${displayType}`
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

    console.log(
      `📊 SERVER: Counts for event=${eventId}, type=${type}, displayType=${displayType}: count=${filteredCodes.length}, paxUsed=${paxUsed}, totalPax=${totalPax}`
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

    console.log(
      `📊 SERVER: Code setting for type=${type}: limit=${limit}, unlimited=${unlimited}`
    );

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
  console.log("==================================================");
  console.log("🚀 SERVER: getUserCodeCounts CALLED");
  console.log("==================================================");

  try {
    const { eventId, userId } = req.params;
    const { settingId } = req.query;

    console.log("🔍 SERVER: RAW REQUEST:", {
      url: req.url,
      method: req.method,
      params: req.params,
      query: req.query,
      body: req.body,
      headers: {
        authorization: req.headers.authorization
          ? "Bearer [token]"
          : "No authorization header",
        cookie: req.headers.cookie ? "Cookie present" : "No cookie",
      },
    });

    // Validate that we have both eventId and userId
    if (!eventId || !userId) {
      console.log(
        `⚠️ SERVER: Missing required parameters: eventId=${eventId}, userId=${userId}`
      );

      // Try to get userId from the authenticated user if it's missing in the path
      let effectiveUserId = userId;
      if (!effectiveUserId && req.user) {
        effectiveUserId = req.user.userId || req.user._id;
        console.log(
          `🔄 SERVER: Using userId from authenticated user: ${effectiveUserId}`
        );
      }

      // If we still don't have a userId, return an error
      if (!eventId || !effectiveUserId) {
        return res
          .status(400)
          .json({ message: "Event ID and User ID are required" });
      }

      // Continue with the effectiveUserId
      console.log(`🔍 SERVER: Continuing with userId=${effectiveUserId}`);

      // Update userId for the rest of the function
      userId = effectiveUserId;
    }

    console.log(
      `🔍 SERVER: Fetching user code counts for event=${eventId}, userId=${userId}${
        settingId ? `, settingId=${settingId}` : ""
      }`
    );

    // Step 1: Get all code settings for this event
    const codeSettings = await CodeSettings.find({ eventId });
    console.log(
      `✅ SERVER: Found ${codeSettings.length} code settings for event ${eventId}`
    );

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
      console.log(`🔍 SERVER: Filtering by specific settingId=${settingId}`);
    }

    // Step 3: Find all codes created by this user for this event
    const userCodes = await Code.find(query).populate("codeSettingId");

    console.log(
      `✅ SERVER: Found ${userCodes.length} codes created by user ${userId}${
        settingId ? ` for setting ${settingId}` : ""
      }`
    );

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
        console.log(`⚠️ SERVER: Code ${code._id} has no codeSettingId`);
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

    console.log(
      `📊 SERVER: User code counts by setting ID:`,
      Object.keys(result).map((id) => ({
        settingId: id,
        settingName: result[id].setting.name,
        count: result[id].count,
        codesCount: result[id].codes.length,
      }))
    );

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

    console.log(
      `📊 SERVER: Returning user code counts response with ${
        Object.keys(result).length
      } settings`
    );

    return res.json(response);
  } catch (error) {
    console.error("Error getting user code counts:", error);
    return res.status(500).json({ message: "Server error: " + error.message });
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
};
