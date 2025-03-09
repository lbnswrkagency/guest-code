const CodeSettings = require("../models/codeSettingsModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");

// Helper to get parent event ID if this is a child event
const getParentEventId = async (eventId) => {
  const event = await Event.findById(eventId);

  // If this is a child event (has a parentEventId), return the parent's ID
  if (event && event.parentEventId) {
    console.log(
      "[CodeSettings] Child event detected, using parent event ID:",
      event.parentEventId
    );
    return event.parentEventId;
  }

  // Otherwise return the original event ID
  return eventId;
};

// Get all code settings for a brand by finding all events for the brand and then getting their code settings
const getCodeSettingsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Find the brand to verify it exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Find all events for this brand
    const events = await Event.find({ brand: brandId });
    if (!events || events.length === 0) {
      return res.json({ codeSettings: [] });
    }

    // Get event IDs, making sure to use parent event IDs for child events
    const eventIds = await Promise.all(
      events.map(async (event) => {
        // If this event has a parent, use the parent's ID
        if (event.parentEventId) {
          return event.parentEventId;
        }
        return event._id;
      })
    );

    // Remove duplicate event IDs
    const uniqueEventIds = [...new Set(eventIds)];

    // Find all code settings for these events
    const codeSettings = await CodeSettings.find({
      eventId: { $in: uniqueEventIds },
    });

    console.log(
      `[CodeSettings] Found ${codeSettings.length} code settings for brand ${brandId} with fields:`,
      codeSettings.map((cs) => ({
        _id: cs._id,
        name: cs.name,
        type: cs.type,
        maxPax: cs.maxPax,
        condition: cs.condition,
        eventId: cs.eventId,
      }))
    );

    // Add the unlimited field to each code setting before sending
    const codeSettingsWithUnlimited = codeSettings.map((setting) => {
      // Convert to plain object to add the unlimited property
      const settingObj = setting.toObject();

      // If limit is 0, it's unlimited
      settingObj.unlimited = settingObj.limit === 0;

      // Ensure _id is included and properly formatted
      settingObj._id = setting._id.toString();

      return settingObj;
    });

    return res.json({ codeSettings: codeSettingsWithUnlimited });
  } catch (error) {
    console.error("[CodeSettings] Error fetching brand code settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all code settings for an event
const getCodeSettings = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event to verify it exists and populate the brand
    const event = await Event.findById(eventId).populate("brand");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get the parent event ID if this is a child event
    const parentEventId = await getParentEventId(eventId);

    // Check if user has permission to view this event
    // Only check permissions if req.user exists (might be bypassed in some routes)
    if (req.user && event.user) {
      // Use userId from token or fall back to _id if necessary
      const userId = req.user.userId || req.user._id;

      // First check direct ownership
      const isDirectOwner = event.user.toString() === userId.toString();
      let isBrandTeamMember = false;

      if (!isDirectOwner && !req.user.isAdmin) {
        // If not direct owner, check if user is part of the brand team
        const brand = await Brand.findOne({
          _id: event.brand,
          $or: [{ owner: userId }, { "team.user": userId }],
        });

        isBrandTeamMember = !!brand;
        console.log("[CodeSettings] Brand team check:", {
          userId: userId.toString(),
          isBrandTeamMember,
          brandFound: !!brand,
        });

        // If user is not owner, not admin, and not brand team member, deny access
        if (!isBrandTeamMember) {
          console.log("[CodeSettings] Authorization failed:", {
            eventUser: event.user.toString(),
            requestUser: userId.toString(),
            isDirectOwner,
            isBrandTeamMember,
            isAdmin: !!req.user.isAdmin,
          });
          return res
            .status(403)
            .json({ message: "Not authorized to view this event" });
        }
      }
    }

    // Get all code settings for this event (or its parent)
    const allCodeSettings = await CodeSettings.find({ eventId: parentEventId });

    // Check for any potential duplicate types before returning
    const uniqueCodeSettings = [];
    const seenTypes = new Set();

    allCodeSettings.forEach((setting) => {
      // For custom types, always include them
      if (setting.type === "custom") {
        uniqueCodeSettings.push(setting);
        return;
      }

      // For non-custom types, check if we've seen this type before
      if (!seenTypes.has(setting.type)) {
        seenTypes.add(setting.type);
        uniqueCodeSettings.push(setting);
      } else {
        console.log(
          `[CodeSettings] Warning: Found duplicate setting type ${setting.type}, ID: ${setting._id}`
        );
      }
    });

    console.log("[CodeSettings] Retrieved settings:", {
      requestedEventId: eventId,
      parentEventId: parentEventId !== eventId ? parentEventId : undefined,
      totalSettingsCount: allCodeSettings.length,
      uniqueSettingsCount: uniqueCodeSettings.length,
    });

    // Include the brand's primary color in the response
    const primaryColor = event.brand?.colors?.primary || "#ffc807";

    // Convert settings to plain objects and ensure _id is included
    const formattedSettings = uniqueCodeSettings.map((setting) => {
      const settingObj = setting.toObject();
      // Ensure _id is included and properly formatted
      settingObj._id = setting._id.toString();
      // If limit is 0, it's unlimited
      settingObj.unlimited = settingObj.limit === 0;
      return settingObj;
    });

    return res.status(200).json({
      codeSettings: formattedSettings,
      eventName: event.title, // Include event name
      eventLogo: event.flyer, // Include event logo
      primaryColor: primaryColor, // Include brand's primary color
    });
  } catch (error) {
    console.error("Error fetching code settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Configure code settings (create or update)
const configureCodeSettings = async (req, res) => {
  try {
    console.log("[CodeSettings] === DEBUG AUTH START ===");
    console.log("[CodeSettings] Request headers:", {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    console.log("[CodeSettings] Request cookies:", req.cookies);
    console.log("[CodeSettings] Request user:", req.user);
    console.log("[CodeSettings] Request user ID:", req.user?._id);
    console.log("[CodeSettings] Request params:", req.params);
    console.log("[CodeSettings] Request body:", req.body);
    console.log("[CodeSettings] === DEBUG AUTH END ===");

    console.log("[CodeSettings] Configure request received:", {
      url: req.originalUrl,
      method: req.method,
      params: req.params,
      body: req.body,
      hasUser: !!req.user,
      userId: req.user?._id,
      headers: {
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
      },
      cookies: req.cookies,
      timestamp: new Date().toISOString(),
    });

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
      color,
      icon,
    } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log("[CodeSettings] Event not found:", eventId);
      return res.status(404).json({ message: "Event not found" });
    }

    // Get the parent event ID if this is a child event
    const parentEventId = await getParentEventId(eventId);

    console.log("[CodeSettings] Event found:", {
      eventId: event._id,
      eventUser: event.user,
      requestUser: req.user?._id,
      brandId: event.brand,
      parentEventId:
        parentEventId !== eventId.toString() ? parentEventId : undefined,
    });

    // Check if user has permission to modify this event
    if (!req.user) {
      console.log(
        "[CodeSettings] Authentication required - no user in request"
      );
      return res.status(401).json({ message: "Authentication required" });
    }

    // Log warning if userId is missing but don't fail the request
    if (!req.user.userId) {
      console.log(
        "[CodeSettings] WARNING: req.user exists but userId is missing:",
        req.user
      );
      // Let's try to continue with the request and see what happens
    }

    // Use userId from token or fall back to _id if necessary
    const userId = req.user.userId || req.user._id;

    // First check direct ownership - same as before
    const isDirectOwner = event.user.toString() === userId.toString();
    let isBrandTeamMember = false;

    if (!isDirectOwner) {
      // If not direct owner, check if user is part of the brand team
      const brand = await Brand.findOne({
        _id: event.brand,
        $or: [{ owner: userId }, { "team.user": userId }],
      });

      isBrandTeamMember = !!brand;
      console.log("[CodeSettings] Brand team check:", {
        userId: userId.toString(),
        isBrandTeamMember,
        brandFound: !!brand,
      });
    }

    // Allow if user is event owner, brand team member, or admin
    if (!isDirectOwner && !isBrandTeamMember && !req.user.isAdmin) {
      console.log("[CodeSettings] Authorization failed:", {
        eventUser: event.user.toString(),
        requestUser: userId.toString(),
        isDirectOwner,
        isBrandTeamMember,
        isAdmin: !!req.user.isAdmin,
      });
      return res
        .status(403)
        .json({ message: "Not authorized to modify this event" });
    }

    console.log("[CodeSettings] Authorization successful");

    let codeSetting;

    // If codeSettingId is provided, try to update existing code setting
    if (codeSettingId) {
      try {
        // Check if the codeSettingId is a valid MongoDB ObjectId
        const mongoose = require("mongoose");
        const isValidObjectId = mongoose.Types.ObjectId.isValid(codeSettingId);

        if (isValidObjectId) {
          // If it's a valid ObjectId, look up by ID
          console.log(
            "[CodeSettings] Looking up setting by valid ObjectId:",
            codeSettingId
          );
          codeSetting = await CodeSettings.findById(codeSettingId);
        } else if (type) {
          // If it's not a valid ObjectId but we have type, look up by event and type
          console.log(
            "[CodeSettings] Temporary ID detected, looking up by type instead:",
            {
              tempId: codeSettingId,
              type: type,
              eventId: parentEventId,
            }
          );
          codeSetting = await CodeSettings.findOne({
            eventId: parentEventId,
            type,
          });
        } else {
          console.log(
            "[CodeSettings] Invalid codeSettingId and no type provided:",
            codeSettingId
          );
          return res.status(400).json({
            message:
              "Invalid code setting ID format and no type provided for fallback",
          });
        }
      } catch (lookupError) {
        console.log(
          "[CodeSettings] Error looking up code setting:",
          lookupError
        );
        // If there's an error finding by ID, try by type as a fallback
        if (type) {
          codeSetting = await CodeSettings.findOne({
            eventId: parentEventId,
            type,
          });
        }
      }

      if (!codeSetting) {
        console.log("[CodeSettings] Code setting not found:", {
          codeSettingId,
          type,
          eventId: parentEventId,
        });

        // If we have a type, create a new setting instead of failing
        if (type) {
          console.log(
            "[CodeSettings] Creating new code setting for type:",
            type
          );
          // If setting doesn't exist, create new
          codeSetting = new CodeSettings({
            eventId: parentEventId,
            name:
              name || `${type.charAt(0).toUpperCase() + type.slice(1)} Code`,
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
            color: color || "#2196F3",
            icon: icon || "RiCodeLine",
          });
        } else {
          return res.status(404).json({ message: "Code setting not found" });
        }
      } else {
        console.log("[CodeSettings] Updating existing code setting:", {
          id: codeSetting._id,
          type: codeSetting.type,
          currentEnabled: codeSetting.isEnabled,
          newEnabled: isEnabled,
        });

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
        if (color !== undefined) codeSetting.color = color;
        if (icon !== undefined) codeSetting.icon = icon;
      }

      await codeSetting.save();
    }
    // If no codeSettingId but type is provided, create or update by type
    else if (type) {
      // For non-custom types, try to find existing setting
      // For custom types, use both type and name to find the setting
      let query = {
        eventId: parentEventId,
        type,
      };

      // For custom codes, also check the name to ensure uniqueness
      if (type === "custom" && name) {
        query.name = name;
      }

      codeSetting = await CodeSettings.findOne(query);

      if (!codeSetting) {
        console.log("[CodeSettings] Creating new code setting for type:", type);
        // If setting doesn't exist, create new
        codeSetting = new CodeSettings({
          eventId: parentEventId,
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
          color: color || "#2196F3",
          icon: icon || "RiCodeLine",
        });
      } else {
        console.log("[CodeSettings] Updating existing code setting by type:", {
          type,
          id: codeSetting._id,
          currentEnabled: codeSetting.isEnabled,
          newEnabled: isEnabled,
        });

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
        if (color !== undefined) codeSetting.color = color;
        if (icon !== undefined) codeSetting.icon = icon;
      }

      await codeSetting.save();
    } else {
      console.log("[CodeSettings] Missing required parameters");
      return res
        .status(400)
        .json({ message: "Either codeSettingId or type must be provided" });
    }

    // Update legacy fields in Event model (use the actual event, not parent)
    if (type === "guest") event.guestCode = codeSetting.isEnabled;
    if (type === "ticket") event.ticketCode = codeSetting.isEnabled;

    // If this is a child event, update the parent event's legacy fields too
    if (parentEventId !== eventId.toString()) {
      const parentEvent = await Event.findById(parentEventId);
      if (parentEvent) {
        if (type === "guest") parentEvent.guestCode = codeSetting.isEnabled;
        if (type === "ticket") parentEvent.ticketCode = codeSetting.isEnabled;
        await parentEvent.save();
      }
    }

    await event.save();

    // Get all code settings for this event to return
    const allCodeSettings = await CodeSettings.find({ eventId: parentEventId });

    // Check for any potential duplicate types before returning
    const uniqueCodeSettings = [];
    const seenTypes = new Set();

    allCodeSettings.forEach((setting) => {
      // For custom types, always include them
      if (setting.type === "custom") {
        uniqueCodeSettings.push(setting);
        return;
      }

      // For non-custom types, check if we've seen this type before
      if (!seenTypes.has(setting.type)) {
        seenTypes.add(setting.type);
        uniqueCodeSettings.push(setting);
      } else {
        console.log(
          `[CodeSettings] Warning: Found duplicate setting type ${setting.type}, ID: ${setting._id}`
        );
      }
    });

    console.log("[CodeSettings] Configuration successful:", {
      totalSettingsCount: allCodeSettings.length,
      uniqueSettingsCount: uniqueCodeSettings.length,
    });

    return res.status(200).json({
      message: "Code settings updated successfully",
      codeSettings: uniqueCodeSettings,
    });
  } catch (error) {
    console.error("[CodeSettings] Error configuring code settings:", error);
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

    // Get the parent event ID if this is a child event
    const parentEventId = await getParentEventId(eventId);

    // Check if user has permission to modify this event
    if (!req.user) {
      console.log(
        "[CodeSettings] Authentication required - no user in request"
      );
      return res.status(401).json({ message: "Authentication required" });
    }

    // Use userId from token or fall back to _id if necessary
    const userId = req.user.userId || req.user._id;

    // First check direct ownership
    const isDirectOwner = event.user.toString() === userId.toString();
    let isBrandTeamMember = false;

    if (!isDirectOwner && !req.user.isAdmin) {
      // If not direct owner, check if user is part of the brand team
      const brand = await Brand.findOne({
        _id: event.brand,
        $or: [{ owner: userId }, { "team.user": userId }],
      });

      isBrandTeamMember = !!brand;
      console.log("[CodeSettings] Brand team check:", {
        userId: userId.toString(),
        isBrandTeamMember,
        brandFound: !!brand,
      });

      // If user is not owner, not admin, and not brand team member, deny access
      if (!isBrandTeamMember) {
        console.log("[CodeSettings] Authorization failed:", {
          eventUser: event.user.toString(),
          requestUser: userId.toString(),
          isDirectOwner,
          isBrandTeamMember,
          isAdmin: !!req.user.isAdmin,
        });
        return res
          .status(403)
          .json({ message: "Not authorized to modify this event" });
      }
    }

    // Find the code setting
    const codeSetting = await CodeSettings.findById(codeSettingId);
    if (!codeSetting) {
      return res.status(404).json({ message: "Code setting not found" });
    }

    // Check if this is a default code type that shouldn't be deleted
    if (["guest", "ticket"].includes(codeSetting.type)) {
      return res.status(400).json({
        message:
          "Cannot delete default code types. You can disable them instead.",
      });
    }

    // Delete the code setting
    await CodeSettings.findByIdAndDelete(codeSettingId);

    // Get all remaining code settings
    const codeSettings = await CodeSettings.find({ eventId: parentEventId });

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
    // Check if any settings already exist for each type
    const existingGuestSetting = await CodeSettings.findOne({
      eventId,
      type: "guest",
    });
    const existingTicketSetting = await CodeSettings.findOne({
      eventId,
      type: "ticket",
    });

    // Only create settings that don't exist
    const settingsToCreate = [];

    if (!existingGuestSetting) {
      settingsToCreate.push({
        name: "Guest Code",
        type: "guest",
        isEnabled: false,
        isEditable: false,
      });
    }

    if (!existingTicketSetting) {
      settingsToCreate.push({
        name: "Ticket Code",
        type: "ticket",
        isEnabled: false,
        isEditable: false,
      });
    }

    // If no new settings need to be created, return early
    if (settingsToCreate.length === 0) {
      console.log(
        "[CodeSettings] All default settings already exist for event:",
        eventId
      );
      return true;
    }

    // Create only the missing settings
    await Promise.all(
      settingsToCreate.map(async (setting) => {
        const newSetting = new CodeSettings({
          eventId,
          ...setting,
        });
        await newSetting.save();
      })
    );

    console.log(
      "[CodeSettings] Initialized missing default settings for event:",
      {
        eventId,
        createdTypes: settingsToCreate.map((s) => s.type),
      }
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
  getCodeSettingsByBrand,
};
