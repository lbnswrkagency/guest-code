const CodeSettings = require("../models/codeSettingsModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const Role = require("../models/roleModel");

// Helper to get parent event ID if this is a child event
const getParentEventId = async (eventId) => {
  const event = await Event.findById(eventId);

  // If this is a child event (has a parentEventId), return the parent's ID
  if (event && event.parentEventId) {
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
      }),
    );

    // Remove duplicate event IDs
    const uniqueEventIds = [...new Set(eventIds)];

    // Find all code settings for these events
    const codeSettings = await CodeSettings.find({
      eventId: { $in: uniqueEventIds },
    });

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

        // If user is not owner, not admin, and not brand team member, deny access
        if (!isBrandTeamMember) {
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
      }
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
    console.error("🔴 [codeSettingsController] getCodeSettings Error:", error);
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
      note,
      maxPax,
      limit,
      isEnabled,
      isEditable,
      price,
      tableNumber,
      color,
      icon,
      requireEmail,
      requirePhone,
    } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get the parent event ID if this is a child event
    const parentEventId = await getParentEventId(eventId);

    // Check if user has permission to modify this event
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
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
    }

    // Allow if user is event owner, brand team member, or admin
    if (!isDirectOwner && !isBrandTeamMember && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this event" });
    }

    let codeSetting;
    let isNewCodeSetting = false; // Flag to track if this is a new setting

    // If codeSettingId is provided, try to update existing code setting
    if (codeSettingId) {
      try {
        // Check if the codeSettingId is a valid MongoDB ObjectId
        const mongoose = require("mongoose");
        const isValidObjectId = mongoose.Types.ObjectId.isValid(codeSettingId);

        if (isValidObjectId) {
          // If it's a valid ObjectId, look up by ID
          codeSetting = await CodeSettings.findById(codeSettingId);
        } else if (type) {
          // If it's not a valid ObjectId but we have type, look up by event and type
          codeSetting = await CodeSettings.findOne({
            eventId: parentEventId,
            type,
          });
        } else {
          return res.status(400).json({
            message:
              "Invalid code setting ID format and no type provided for fallback",
          });
        }
      } catch (lookupError) {
        // If there's an error finding by ID, try by type as a fallback
        if (type) {
          codeSetting = await CodeSettings.findOne({
            eventId: parentEventId,
            type,
          });
        }
      }

      if (!codeSetting) {
        // If we have a type, create a new setting instead of failing
        if (type) {
          // If setting doesn't exist, create new
          isNewCodeSetting = true;
          codeSetting = new CodeSettings({
            brandId: event.brand,
            eventId: parentEventId,
            createdBy: userId,
            name:
              name || `${type.charAt(0).toUpperCase() + type.slice(1)} Code`,
            type,
            condition: condition || "",
            note: note || "",
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
            requireEmail: requireEmail !== undefined ? requireEmail : true,
            requirePhone: requirePhone !== undefined ? requirePhone : false,
          });
        } else {
          return res.status(404).json({ message: "Code setting not found" });
        }
      } else {
        // Update the code setting
        if (name !== undefined && codeSetting.isEditable) {
          codeSetting.name = name;
        }
        if (condition !== undefined) codeSetting.condition = condition;
        if (note !== undefined) codeSetting.note = note;
        if (maxPax !== undefined) codeSetting.maxPax = maxPax;
        if (limit !== undefined) codeSetting.limit = limit;
        if (isEnabled !== undefined) codeSetting.isEnabled = isEnabled;
        if (price !== undefined) codeSetting.price = price;
        if (tableNumber !== undefined) codeSetting.tableNumber = tableNumber;
        if (color !== undefined) codeSetting.color = color;
        if (icon !== undefined) codeSetting.icon = icon;
        if (requireEmail !== undefined) codeSetting.requireEmail = requireEmail;
        if (requirePhone !== undefined) codeSetting.requirePhone = requirePhone;
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
        // If setting doesn't exist, create new
        isNewCodeSetting = true;
        codeSetting = new CodeSettings({
          brandId: event.brand,
          eventId: parentEventId,
          createdBy: userId,
          name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Code`,
          type,
          condition: condition || "",
          note: note || "",
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
          requireEmail: requireEmail !== undefined ? requireEmail : true,
          requirePhone: requirePhone !== undefined ? requirePhone : false,
        });
      } else {
        // Update existing setting
        if (name !== undefined && codeSetting.isEditable) {
          codeSetting.name = name;
        }
        if (condition !== undefined) codeSetting.condition = condition;
        if (note !== undefined) codeSetting.note = note;
        if (maxPax !== undefined) codeSetting.maxPax = maxPax;
        if (limit !== undefined) codeSetting.limit = limit;
        if (isEnabled !== undefined) codeSetting.isEnabled = isEnabled;
        if (price !== undefined) codeSetting.price = price;
        if (tableNumber !== undefined) codeSetting.tableNumber = tableNumber;
        if (color !== undefined) codeSetting.color = color;
        if (icon !== undefined) codeSetting.icon = icon;
        if (requireEmail !== undefined) codeSetting.requireEmail = requireEmail;
        if (requirePhone !== undefined) codeSetting.requirePhone = requirePhone;
      }

      await codeSetting.save();
    } else {
      return res
        .status(400)
        .json({ message: "Either codeSettingId or type must be provided" });
    }

    // Update legacy fields in Event model (only guest code is still a static type)
    if (type === "guest") {
      event.guestCode = codeSetting.isEnabled;

      // If this is a child event, update the parent event's legacy fields too
      if (parentEventId !== eventId.toString()) {
        const parentEvent = await Event.findById(parentEventId);
        if (parentEvent) {
          parentEvent.guestCode = codeSetting.isEnabled;
          await parentEvent.save();
        }
      }
    }

    await event.save();

    // If this is a new code setting (any type), update the founder role permissions
    if (isNewCodeSetting) {
      try {
        // Find the brand associated with the event
        const brand = await Brand.findById(event.brand);
        if (brand) {
          // Find the founder role for this brand
          const founderRole = await Role.findOne({
            brandId: brand._id,
            isFounder: true,
          });

          if (founderRole) {
            // Update founder role with proper permissions format for the code generator
            // Make sure the codes object exists in permissions
            if (!founderRole.permissions) {
              founderRole.permissions = {};
            }

            if (!founderRole.permissions.codes) {
              founderRole.permissions.codes = {};
            }

            // Set permissions for this specific code type using _id
            const permissionKey = codeSetting._id.toString();
            founderRole.permissions.codes[permissionKey] = {
              generate: true,
              limit: 0,
              unlimited: true,
            };

            await founderRole.save();
          }
        }
      } catch (roleError) {
        console.error("Error updating founder role permissions:", roleError);
        // Don't fail the main operation if this part fails
      }
    }

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
      }
    });

    return res.status(200).json({
      message: "Code settings updated successfully",
      codeSettings: uniqueCodeSettings,
    });
  } catch (error) {
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

      // If user is not owner, not admin, and not brand team member, deny access
      if (!isBrandTeamMember) {
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

    // Check if this is the guest code type which shouldn't be deleted (flagship feature)
    if (codeSetting.type === "guest") {
      return res.status(400).json({
        message:
          "Cannot delete the Guest Code type. You can disable it instead.",
      });
    }

    // First, update any founder roles that might have permissions for this code setting
    try {
      // Find the brand associated with the event
      const brand = await Brand.findById(event.brand);
      if (brand) {
        // Find the founder role for this brand
        const founderRole = await Role.findOne({
          brandId: brand._id,
          isFounder: true,
        });

        if (
          founderRole &&
          founderRole.permissions &&
          founderRole.permissions.codes
        ) {
          // Remove the permission using _id as the key
          const permissionKey = codeSetting._id.toString();
          if (founderRole.permissions.codes[permissionKey]) {
            delete founderRole.permissions.codes[permissionKey];
            founderRole.markModified('permissions.codes');
            await founderRole.save();
          }
        }
      }
    } catch (roleError) {
      console.error("Error updating founder role permissions:", roleError);
      // Don't fail the main operation if this part fails
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
    return res.status(500).json({ message: "Server error" });
  }
};

// Initialize default code settings for an event
// Only creates guest code - all other code types are dynamically created by hosts
const initializeDefaultSettings = async (eventId, brandId = null) => {
  try {
    // If brandId not provided, get it from the event
    if (!brandId) {
      const event = await Event.findById(eventId);
      if (event) {
        brandId = event.brand;
      }
    }

    // Check if guest setting already exists
    const existingGuestSetting = await CodeSettings.findOne({
      eventId,
      type: "guest",
    });

    // If guest setting already exists, no need to create anything
    if (existingGuestSetting) {
      // Update with brandId if missing (migration support)
      if (!existingGuestSetting.brandId && brandId) {
        existingGuestSetting.brandId = brandId;
        await existingGuestSetting.save();
      }
      // Backfill brandId on ALL legacy codes for this event
      if (brandId) {
        await CodeSettings.updateMany(
          { eventId: eventId, brandId: null },
          { $set: { brandId: brandId } }
        );
      }
      return true;
    }

    // Create only the guest code setting (the static flagship feature)
    const newSetting = new CodeSettings({
      brandId: brandId,
      eventId,
      name: "Guest Code",
      type: "guest",
      isEnabled: false,
      isEditable: false,
      requireEmail: true,
      requirePhone: false,
    });
    await newSetting.save();

    return true;
  } catch (error) {
    console.error("Error initializing default settings:", error);
    return false;
  }
};

// ========================================
// BRAND-LEVEL CODE CRUD FUNCTIONS
// These handle codes that apply to all events in a brand
// ========================================

// Get all brand-level codes (eventId: null, isGlobalForBrand: true)
const getBrandCodes = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check that requesting user is brand owner or team member
    const userId = req.user.userId || req.user._id;
    const isOwner = brand.owner.toString() === userId.toString();
    const isTeamMember = brand.team?.some(
      member => member.user.toString() === userId.toString()
    );
    if (!isOwner && !isTeamMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get all brand-level codes (eventId is null)
    const brandCodes = await CodeSettings.find({
      brandId: brandId,
      eventId: null,
    }).sort({ sortOrder: 1, createdAt: 1 });

    // Format response
    const formattedCodes = brandCodes.map((code) => {
      const codeObj = code.toObject();
      codeObj._id = code._id.toString();
      codeObj.unlimited = codeObj.limit === 0;
      return codeObj;
    });

    return res.status(200).json({ codes: formattedCodes });
  } catch (error) {
    console.error("🔴 [codeSettingsController] getBrandCodes Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create a brand-level code
const createBrandCode = async (req, res) => {
  try {
    const { brandId } = req.params;
    const {
      name,
      type = "custom",
      condition,
      note,
      maxPax,
      limit,
      isEnabled,
      isEditable,
      color,
      icon,
      requireEmail,
      requirePhone,
      price,
      tableNumber,
      isGlobalForBrand = true,
    } = req.body;

    // Verify brand exists and user has permission
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check user permission - OWNER ONLY for brand-level code management
    const userId = req.user.userId || req.user._id;
    const isOwner = brand.owner.toString() === userId.toString();

    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Only brand owners can create brand-level codes"
      });
    }

    // Check if a brand-level code with the same name already exists
    const existingCode = await CodeSettings.findOne({
      brandId: brandId,
      eventId: null,
      name: name,
    });

    if (existingCode) {
      return res.status(400).json({
        message: `A code with the name "${name}" already exists for this brand`,
      });
    }

    // Create the brand-level code
    const newCode = new CodeSettings({
      brandId: brandId,
      eventId: null, // null = brand-level
      isGlobalForBrand: isGlobalForBrand,
      createdBy: userId,
      name: name,
      type: type,
      condition: condition || "",
      note: note || "",
      maxPax: maxPax || 1,
      limit: limit || 0,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      isEditable: isEditable !== undefined ? isEditable : true,
      color: color || "#2196F3",
      icon: icon || "RiCodeLine",
      requireEmail: requireEmail !== undefined ? requireEmail : true,
      requirePhone: requirePhone !== undefined ? requirePhone : false,
      price: price,
      tableNumber: tableNumber,
    });

    await newCode.save();

    // Update founder role permissions to include this new code
    try {
      const founderRole = await Role.findOne({
        brandId: brandId,
        isFounder: true,
      });

      if (founderRole) {
        if (!founderRole.permissions) founderRole.permissions = {};
        if (!founderRole.permissions.codes) founderRole.permissions.codes = {};

        founderRole.permissions.codes[newCode._id.toString()] = {
          generate: true,
          limit: 0,
          unlimited: true,
        };

        await founderRole.save();
      }
    } catch (roleError) {
      console.error("Error updating founder role:", roleError);
    }

    const codeObj = newCode.toObject();
    codeObj._id = newCode._id.toString();
    codeObj.unlimited = codeObj.limit === 0;

    return res.status(201).json({
      message: "Brand code created successfully",
      code: codeObj,
    });
  } catch (error) {
    console.error("🔴 [codeSettingsController] createBrandCode Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update a brand-level code
const updateBrandCode = async (req, res) => {
  try {
    const { brandId, codeId } = req.params;
    const {
      name,
      condition,
      note,
      maxPax,
      limit,
      isEnabled,
      isEditable,
      color,
      icon,
      requireEmail,
      requirePhone,
      price,
      tableNumber,
      isGlobalForBrand,
    } = req.body;

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check user permission - OWNER ONLY for brand-level code management
    const userId = req.user.userId || req.user._id;
    const isOwner = brand.owner.toString() === userId.toString();

    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Only brand owners can update brand-level codes"
      });
    }

    // Find the code
    const code = await CodeSettings.findOne({
      _id: codeId,
      brandId: brandId,
      eventId: null,
    });

    if (!code) {
      return res.status(404).json({ message: "Brand code not found" });
    }

    // Update fields
    if (name !== undefined && code.isEditable) code.name = name;
    if (condition !== undefined) code.condition = condition;
    if (note !== undefined) code.note = note;
    if (maxPax !== undefined) code.maxPax = maxPax;
    if (limit !== undefined) code.limit = limit;
    if (isEnabled !== undefined) code.isEnabled = isEnabled;
    if (isEditable !== undefined) code.isEditable = isEditable;
    if (color !== undefined) code.color = color;
    if (icon !== undefined) code.icon = icon;
    if (requireEmail !== undefined) code.requireEmail = requireEmail;
    if (requirePhone !== undefined) code.requirePhone = requirePhone;
    if (price !== undefined) code.price = price;
    if (tableNumber !== undefined) code.tableNumber = tableNumber;
    if (isGlobalForBrand !== undefined) code.isGlobalForBrand = isGlobalForBrand;

    await code.save();

    const codeObj = code.toObject();
    codeObj._id = code._id.toString();
    codeObj.unlimited = codeObj.limit === 0;

    return res.status(200).json({
      message: "Brand code updated successfully",
      code: codeObj,
    });
  } catch (error) {
    console.error("🔴 [codeSettingsController] updateBrandCode Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a brand-level code
const deleteBrandCode = async (req, res) => {
  try {
    const { brandId, codeId } = req.params;

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check user permission - OWNER ONLY for brand-level code management
    const userId = req.user.userId || req.user._id;
    const isOwner = brand.owner.toString() === userId.toString();

    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Only brand owners can delete brand-level codes"
      });
    }

    // Find the code
    const code = await CodeSettings.findOne({
      _id: codeId,
      brandId: brandId,
      eventId: null,
    });

    if (!code) {
      return res.status(404).json({ message: "Brand code not found" });
    }

    // Don't allow deleting guest code
    if (code.type === "guest") {
      return res.status(400).json({
        message: "Cannot delete the Guest Code. You can disable it instead.",
      });
    }

    const codeIdStr = code._id.toString();

    // Delete the code
    await CodeSettings.findByIdAndDelete(codeId);

    // Remove from role permissions (keyed by _id)
    try {
      const roles = await Role.find({ brandId: brandId });
      for (const role of roles) {
        if (role.permissions?.codes?.[codeIdStr]) {
          delete role.permissions.codes[codeIdStr];
          role.markModified('permissions.codes');
          await role.save();
        }
      }
    } catch (roleError) {
      console.error("Error removing from role permissions:", roleError);
    }

    return res.status(200).json({
      message: "Brand code deleted successfully",
    });
  } catch (error) {
    console.error("🔴 [codeSettingsController] deleteBrandCode Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all codes for an event (merged: brand-level + event-level)
// Brand-level codes with isGlobalForBrand=true apply to all events
// Event-level codes with same name override brand-level codes
const getCodesForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId).populate("brand");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const brandId = event.brand._id;

    // Get parent event ID if this is a child event
    const parentEventId = await getParentEventId(eventId);

    // Query for both brand-level and event-level codes
    const allCodes = await CodeSettings.find({
      brandId: brandId,
      $or: [
        { eventId: null, isGlobalForBrand: true }, // Brand-level global codes
        { eventId: parentEventId }, // Event-specific codes
      ],
    }).sort({ sortOrder: 1, createdAt: 1 });

    // Merge codes: event-level overrides brand-level by name
    const codesByName = new Map();

    for (const code of allCodes) {
      const name = code.name;
      const existingCode = codesByName.get(name);

      // If no existing code, or this is event-level (overrides brand-level)
      if (!existingCode || code.eventId) {
        codesByName.set(name, code);
      }
    }

    // Format response
    const mergedCodes = Array.from(codesByName.values()).map((code) => {
      const codeObj = code.toObject();
      codeObj._id = code._id.toString();
      codeObj.unlimited = codeObj.limit === 0;
      // Add flag to indicate if this is inherited from brand
      codeObj.isInherited = code.eventId === null;
      return codeObj;
    });

    return res.status(200).json({
      codeSettings: mergedCodes,
      eventName: event.title,
      eventLogo: event.flyer,
      primaryColor: event.brand?.colors?.primary || "#ffc807",
    });
  } catch (error) {
    console.error("🔴 [codeSettingsController] getCodesForEvent Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ========================================
// USER-LEVEL CODE CRUD FUNCTIONS
// These handle codes not yet attached to any brand
// ========================================

// Get all user-level codes (brandId: null, owned by current user)
const getUserCodes = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const userCodes = await CodeSettings.find({
      createdBy: userId,
      brandId: null,
    }).sort({ createdAt: 1 });

    const formattedCodes = userCodes.map((code) => {
      const codeObj = code.toObject();
      codeObj._id = code._id.toString();
      codeObj.unlimited = codeObj.limit === 0;
      return codeObj;
    });

    return res.status(200).json({ codes: formattedCodes });
  } catch (error) {
    console.error("🔴 [codeSettingsController] getUserCodes Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create a user-level code (no brand attached)
const createUserCode = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const {
      name,
      type = "custom",
      condition,
      note,
      maxPax,
      limit,
      isEnabled,
      isEditable,
      color,
      icon,
      requireEmail,
      requirePhone,
      price,
      tableNumber,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Code name is required" });
    }

    // Check if user already has a code with this name (no brand)
    const existingCode = await CodeSettings.findOne({
      createdBy: userId,
      brandId: null,
      name: name,
    });

    if (existingCode) {
      return res.status(400).json({
        message: `You already have a code named "${name}"`,
      });
    }

    const newCode = new CodeSettings({
      brandId: null,
      eventId: null,
      isGlobalForBrand: false,
      createdBy: userId,
      name,
      type,
      condition: condition || "",
      note: note || "",
      maxPax: maxPax || 1,
      limit: limit || 0,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      isEditable: isEditable !== undefined ? isEditable : true,
      color: color || "#2196F3",
      icon: icon || "RiCodeLine",
      requireEmail: requireEmail !== undefined ? requireEmail : true,
      requirePhone: requirePhone !== undefined ? requirePhone : false,
      price,
      tableNumber,
    });

    await newCode.save();

    const codeObj = newCode.toObject();
    codeObj._id = newCode._id.toString();
    codeObj.unlimited = codeObj.limit === 0;

    return res.status(201).json({
      message: "Code created successfully",
      code: codeObj,
    });
  } catch (error) {
    console.error("🔴 [codeSettingsController] createUserCode Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update a user-level code
const updateUserCode = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { codeId } = req.params;
    const {
      name,
      condition,
      note,
      maxPax,
      limit,
      isEnabled,
      isEditable,
      color,
      icon,
      requireEmail,
      requirePhone,
      price,
      tableNumber,
    } = req.body;

    const code = await CodeSettings.findOne({
      _id: codeId,
      createdBy: userId,
      brandId: null,
    });

    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    if (name !== undefined && code.isEditable) code.name = name;
    if (condition !== undefined) code.condition = condition;
    if (note !== undefined) code.note = note;
    if (maxPax !== undefined) code.maxPax = maxPax;
    if (limit !== undefined) code.limit = limit;
    if (isEnabled !== undefined) code.isEnabled = isEnabled;
    if (isEditable !== undefined) code.isEditable = isEditable;
    if (color !== undefined) code.color = color;
    if (icon !== undefined) code.icon = icon;
    if (requireEmail !== undefined) code.requireEmail = requireEmail;
    if (requirePhone !== undefined) code.requirePhone = requirePhone;
    if (price !== undefined) code.price = price;
    if (tableNumber !== undefined) code.tableNumber = tableNumber;

    await code.save();

    const codeObj = code.toObject();
    codeObj._id = code._id.toString();
    codeObj.unlimited = codeObj.limit === 0;

    return res.status(200).json({
      message: "Code updated successfully",
      code: codeObj,
    });
  } catch (error) {
    console.error("🔴 [codeSettingsController] updateUserCode Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a user-level code
const deleteUserCode = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { codeId } = req.params;

    const code = await CodeSettings.findOne({
      _id: codeId,
      createdBy: userId,
      brandId: null,
    });

    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    await CodeSettings.findByIdAndDelete(codeId);

    return res.status(200).json({
      message: "Code deleted successfully",
    });
  } catch (error) {
    console.error("🔴 [codeSettingsController] deleteUserCode Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCodeSettings,
  configureCodeSettings,
  deleteCodeSetting,
  initializeDefaultSettings,
  getCodeSettingsByBrand,
  // Brand-level functions
  getBrandCodes,
  createBrandCode,
  updateBrandCode,
  deleteBrandCode,
  getCodesForEvent,
  // User-level functions
  getUserCodes,
  createUserCode,
  updateUserCode,
  deleteUserCode,
};
