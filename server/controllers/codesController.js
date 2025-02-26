const Code = require("../models/codesModel");
const Event = require("../models/eventsModel");
const QRCode = require("qrcode");
const crypto = require("crypto");

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
    // Only check permissions if req.user exists (might be bypassed in some routes)
    if (
      req.user &&
      event.user &&
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this event" });
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
    const CodeSettings = require("../models/codeSettingsModel");
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
      event.user &&
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this event" });
    }

    // Build query
    const query = { eventId };
    if (type) {
      query.type = type;
    }

    // Get all codes for this event
    const codes = await Code.find(query).sort({ createdAt: -1 });

    // Get code settings for reference
    const CodeSettings = require("../models/codeSettingsModel");
    const codeSettings = await CodeSettings.find({ eventId });

    // Combine codes with their settings
    const codesWithSettings = codes.map((code) => {
      const setting = codeSettings.find(
        (s) =>
          s._id.toString() === code.codeSettingId?.toString() ||
          s.type === code.type
      );

      return {
        ...code.toObject(),
        setting: setting ? setting.toObject() : null,
      };
    });

    return res.status(200).json({
      codes: codesWithSettings,
    });
  } catch (error) {
    console.error("Error fetching event codes:", error);
    return res.status(500).json({ message: "Server error" });
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
    const { name, condition, maxPax, status } = req.body;

    const code = await Code.findById(codeId);
    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // Find the event
    const event = await Event.findById(code.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to update this code
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this code" });
    }

    // Update fields
    if (name) code.name = name;
    if (condition) code.condition = condition;
    if (maxPax) code.maxPax = maxPax;
    if (status) code.status = status;

    await code.save();

    return res.status(200).json({
      message: "Code updated successfully",
      code,
    });
  } catch (error) {
    console.error("Error updating code:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a code
const deleteCode = async (req, res) => {
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

    // Check if user has permission to delete this code
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this code" });
    }

    await Code.findByIdAndDelete(codeId);

    return res.status(200).json({
      message: "Code deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting code:", error);
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

    const codeDoc = await Code.findOne({ code });
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

module.exports = {
  configureCodeSettings,
  getCodeSettings,
  deleteCodeSetting,
  createCode,
  getEventCodes,
  getCode,
  updateCode,
  deleteCode,
  generateCodeImage,
  verifyCode,
};
