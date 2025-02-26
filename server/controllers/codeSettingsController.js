const CodeSettings = require("../models/codeSettingsModel");
const Event = require("../models/eventsModel");

// Get all code settings for an event
const getCodeSettings = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event to verify it exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to view this event
    // Only check permissions if req.user exists (might be bypassed in some routes)
    if (
      req.user &&
      event.user &&
      req.user._id && // Make sure req.user._id exists
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this event" });
    }

    // Get all code settings for this event
    const codeSettings = await CodeSettings.find({ eventId });

    return res.status(200).json({
      codeSettings,
    });
  } catch (error) {
    console.error("Error fetching code settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Configure code settings (create or update)
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
      price,
      tableNumber,
    } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to modify this event
    // Only check permissions if req.user exists (might be bypassed in some routes)
    if (
      req.user &&
      event.user &&
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this event" });
    }

    let codeSetting;

    // If codeSettingId is provided, update existing code setting
    if (codeSettingId) {
      codeSetting = await CodeSettings.findById(codeSettingId);

      if (!codeSetting) {
        return res.status(404).json({ message: "Code setting not found" });
      }

      // Update the code setting
      if (name !== undefined && codeSetting.isEditable) {
        codeSetting.name = name;
      }
      if (condition !== undefined) codeSetting.condition = condition;
      if (maxPax !== undefined) codeSetting.maxPax = maxPax;
      if (limit !== undefined) codeSetting.limit = limit;
      if (isEnabled !== undefined) codeSetting.isEnabled = isEnabled;
      if (price !== undefined) codeSetting.price = price;
      if (tableNumber !== undefined) codeSetting.tableNumber = tableNumber;

      await codeSetting.save();
    }
    // If no codeSettingId but type is provided, create or update by type
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

      // For non-custom types, try to find existing setting
      if (type !== "custom") {
        codeSetting = await CodeSettings.findOne({ eventId, type });
      }

      // If setting doesn't exist or it's a custom type, create new
      if (!codeSetting) {
        codeSetting = new CodeSettings({
          eventId,
          name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Code`,
          type,
          condition: condition || "",
          maxPax: maxPax || 1,
          limit: limit || 0,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
          isEditable:
            type === "custom" ||
            (isEditable !== undefined ? isEditable : false),
          price,
          tableNumber,
        });
      } else {
        // Update existing setting
        if (name !== undefined && codeSetting.isEditable) {
          codeSetting.name = name;
        }
        if (condition !== undefined) codeSetting.condition = condition;
        if (maxPax !== undefined) codeSetting.maxPax = maxPax;
        if (limit !== undefined) codeSetting.limit = limit;
        if (isEnabled !== undefined) codeSetting.isEnabled = isEnabled;
        if (price !== undefined) codeSetting.price = price;
        if (tableNumber !== undefined) codeSetting.tableNumber = tableNumber;
      }

      await codeSetting.save();
    } else {
      return res
        .status(400)
        .json({ message: "Either codeSettingId or type must be provided" });
    }

    // Update legacy fields in Event model for backward compatibility
    if (type === "guest") event.guestCode = codeSetting.isEnabled;
    if (type === "friends") event.friendsCode = codeSetting.isEnabled;
    if (type === "ticket") event.ticketCode = codeSetting.isEnabled;
    if (type === "table") event.tableCode = codeSetting.isEnabled;
    if (type === "backstage") event.backstageCode = codeSetting.isEnabled;

    await event.save();

    // Get all code settings for this event to return
    const allCodeSettings = await CodeSettings.find({ eventId });

    return res.status(200).json({
      message: "Code settings updated successfully",
      codeSettings: allCodeSettings,
    });
  } catch (error) {
    console.error("Error configuring code settings:", error);

    // Handle duplicate key error (trying to create duplicate non-custom type)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "This code type already exists for this event",
      });
    }

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
    // Only check permissions if req.user exists (might be bypassed in some routes)
    if (
      req.user &&
      event.user &&
      event.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this event" });
    }

    // Find the code setting
    const codeSetting = await CodeSettings.findById(codeSettingId);
    if (!codeSetting) {
      return res.status(404).json({ message: "Code setting not found" });
    }

    // Check if this is a default code type that shouldn't be deleted
    if (
      ["guest", "ticket", "friends", "backstage"].includes(codeSetting.type)
    ) {
      return res.status(400).json({
        message:
          "Cannot delete default code types. You can disable them instead.",
      });
    }

    // Delete the code setting
    await CodeSettings.findByIdAndDelete(codeSettingId);

    // Get all remaining code settings
    const codeSettings = await CodeSettings.find({ eventId });

    return res.status(200).json({
      message: "Code setting deleted successfully",
      codeSettings,
    });
  } catch (error) {
    console.error("Error deleting code setting:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Initialize default code settings for an event
const initializeDefaultSettings = async (eventId) => {
  try {
    // Check if any settings already exist
    const existingSettings = await CodeSettings.find({ eventId });
    if (existingSettings.length > 0) {
      return; // Settings already exist, no need to initialize
    }

    // Default settings
    const defaultSettings = [
      {
        name: "Guest Code",
        type: "guest",
        isEnabled: false,
        isEditable: false,
      },
      {
        name: "Ticket Code",
        type: "ticket",
        isEnabled: false,
        isEditable: false,
      },
      {
        name: "Friends Code",
        type: "friends",
        isEnabled: false,
        isEditable: true,
      },
      {
        name: "Backstage Code",
        type: "backstage",
        isEnabled: false,
        isEditable: true,
      },
    ];

    // Create all default settings
    await Promise.all(
      defaultSettings.map(async (setting) => {
        const newSetting = new CodeSettings({
          eventId,
          ...setting,
        });
        await newSetting.save();
      })
    );

    return true;
  } catch (error) {
    console.error("Error initializing default code settings:", error);
    return false;
  }
};

module.exports = {
  getCodeSettings,
  configureCodeSettings,
  deleteCodeSetting,
  initializeDefaultSettings,
};
