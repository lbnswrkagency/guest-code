const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");
const Role = require("../models/roleModel");
const CodeSettings = require("../models/codeSettingsModel");
const CoHostRelationship = require("../models/coHostRelationshipModel");
const mongoose = require("mongoose");
const { normalizePermissions, ensurePlainObject } = require("../utils/permissionResolver");

// Search brands for co-hosting
exports.searchBrands = async (req, res) => {
  try {
    const { q, exclude } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }

    // Build search query
    const searchQuery = {
      $and: [
        {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } }
          ]
        }
      ]
    };

    // Exclude specific brand if provided
    if (exclude) {
      searchQuery.$and.push({ _id: { $ne: exclude } });
    }

    // Search brands
    const brands = await Brand.find(searchQuery)
      .select("name username logo description")
      .limit(10)
      .sort({ followers: -1 }); // Sort by popularity

    res.status(200).json(brands);
  } catch (error) {
    console.error("Error searching brands:", error);
    res.status(500).json({ message: "Error searching brands" });
  }
};

// Get all co-hosted events for a brand - returns grouped by host brand
exports.getCoHostedEvents = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.userId;

    // First, find the user's role in the co-hosting brand
    const coHostBrand = await Brand.findById(brandId).populate({
      path: 'team.role',
      model: 'Role'
    });

    if (!coHostBrand) {
      return res.status(404).json({ message: "Co-host brand not found" });
    }

    // Find user's role in this brand
    let userRoleInCoHostBrand = null;

    // Check if user is the owner
    if (coHostBrand.owner.toString() === userId.toString()) {
      const founderRole = await Role.findOne({
        brandId: brandId,
        isFounder: true
      });
      userRoleInCoHostBrand = founderRole;
    } else {
      // Check if user is in the team
      const teamMember = coHostBrand.team.find(member =>
        member.user.toString() === userId.toString()
      );

      if (teamMember) {
        userRoleInCoHostBrand = teamMember.role;
      } else {
        return res.status(403).json({ message: "User is not a member of this co-host brand" });
      }
    }

    if (!userRoleInCoHostBrand) {
      return res.status(403).json({ message: "No role found for user in co-host brand" });
    }

    // Find ALL events where the brand is a co-host
    const coHostedEvents = await Event.find({
      coHosts: brandId
    })
      .populate("brand", "name username logo colors")
      .populate("coHosts", "name username logo")
      .populate("user", "username firstName lastName avatar")
      .populate("lineups")
      .populate("genres")
      .sort({ date: -1 });

    // Group events by host brand - get global permissions ONCE per relationship
    const eventsByHostBrand = new Map();

    for (const event of coHostedEvents) {
      const eventObj = event.toObject();
      const hostBrandId = (eventObj.brand._id || eventObj.brand).toString();

      if (!eventsByHostBrand.has(hostBrandId)) {
        // First event for this host brand - fetch global permissions from CoHostRelationship
        const relationship = await CoHostRelationship.findOne({
          hostBrand: hostBrandId,
          coHostBrand: brandId,
          isActive: true
        });

        // Find permissions for user's role
        let effectivePermissions = null;
        if (relationship) {
          const userRoleIdStr = userRoleInCoHostBrand._id.toString();
          const rolePermission = relationship.rolePermissions?.find(
            (rp) => {
              const rpRoleIdStr = rp.roleId?.toString?.() || String(rp.roleId);
              return rpRoleIdStr === userRoleIdStr;
            }
          );

          if (rolePermission?.permissions) {
            effectivePermissions = rolePermission.permissions;
          }
        }

        // Get host brand's code settings (brand-level codes)
        const hostBrandCodes = await CodeSettings.find({
          isEnabled: true,
          createdBy: { $type: "objectId" },
          brandId: hostBrandId,
          eventId: null,
          isGlobalForBrand: true,
        }).lean();

        const codeSettings = hostBrandCodes.map(cs => ({
          _id: cs._id.toString(),
          name: cs.name,
          type: cs.type || 'custom',
          condition: cs.condition || '',
          note: cs.note || '',
          maxPax: cs.maxPax || 1,
          limit: cs.limit || 0,
          isEnabled: cs.isEnabled,
          color: cs.color || '#2196F3',
          icon: cs.icon || 'RiCodeLine',
          brandId: hostBrandId,
        }));

        // Normalize permissions with code settings for key remapping
        const normalizedPerms = effectivePermissions
          ? normalizePermissions(effectivePermissions, codeSettings)
          : null;

        eventsByHostBrand.set(hostBrandId, {
          hostBrand: {
            _id: hostBrandId,
            name: eventObj.brand.name,
            username: eventObj.brand.username,
            logo: eventObj.brand.logo,
            colors: eventObj.brand.colors,
          },
          coHostBrand: {
            _id: brandId.toString(),
            name: coHostBrand.name,
          },
          userRole: {
            _id: userRoleInCoHostBrand._id,
            name: userRoleInCoHostBrand.name,
            isFounder: userRoleInCoHostBrand.isFounder,
            permissions: userRoleInCoHostBrand.permissions,
          },
          permissions: normalizedPerms,
          codeSettings: codeSettings,
          events: [],
        });
      }

      // Add event to this host brand's list
      const relationship = eventsByHostBrand.get(hostBrandId);

      // Ensure required fields exist on event
      eventObj.flyer = eventObj.flyer || {};
      eventObj.lineups = eventObj.lineups || [];
      eventObj.genres = eventObj.genres || [];
      eventObj.coHosts = eventObj.coHosts || [];
      eventObj.title = eventObj.title || "";
      eventObj.description = eventObj.description || "";
      eventObj.location = eventObj.location || "";

      // Add minimal co-host reference
      eventObj.coHostBrand = relationship.coHostBrand;
      eventObj.hostBrandId = hostBrandId;

      relationship.events.push(eventObj);
    }

    // Convert Map to array
    const relationships = Array.from(eventsByHostBrand.values());

    res.status(200).json(relationships);
  } catch (error) {
    res.status(500).json({ message: "Error fetching co-hosted events" });
  }
};

// Update co-hosts for an event
exports.updateEventCoHosts = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { coHosts } = req.body;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to edit this event
    const brand = await Brand.findOne({
      _id: event.brand,
      $or: [
        { owner: req.user.userId },
        { "team.user": req.user.userId }
      ]
    });

    if (!brand) {
      return res.status(403).json({ 
        message: "You don't have permission to edit this event" 
      });
    }

    // Validate co-host IDs
    const validCoHosts = [];
    if (coHosts && Array.isArray(coHosts)) {
      for (const coHostId of coHosts) {
        if (mongoose.Types.ObjectId.isValid(coHostId)) {
          // Make sure co-host exists and isn't the main host
          const coHostBrand = await Brand.findById(coHostId);
          if (coHostBrand && coHostId !== event.brand.toString()) {
            validCoHosts.push(coHostId);
          }
        }
      }
    }

    // Update event with co-hosts
    event.coHosts = validCoHosts;
    await event.save();

    // Populate the updated event
    await event.populate("coHosts", "name username logo");

    res.status(200).json({
      message: "Co-hosts updated successfully",
      coHosts: event.coHosts
    });
  } catch (error) {
    console.error("Error updating co-hosts:", error);
    res.status(500).json({ message: "Error updating co-hosts" });
  }
};

// Get brands available for co-hosting (excluding already selected ones)
exports.getAvailableCoHosts = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get current event to exclude main brand
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get brands where user is a team member
    const userBrands = await Brand.find({
      $or: [
        { owner: req.user.userId },
        { "team.user": req.user.userId }
      ],
      _id: { 
        $ne: event.brand, // Exclude the main event brand
        $nin: event.coHosts || [] // Exclude already selected co-hosts
      }
    })
    .select("name username logo description")
    .sort({ name: 1 });

    res.status(200).json(userBrands);
  } catch (error) {
    console.error("Error fetching available co-hosts:", error);
    res.status(500).json({ message: "Error fetching available co-hosts" });
  }
};

// Remove a co-host from an event
exports.removeCoHost = async (req, res) => {
  try {
    const { eventId, brandId } = req.params;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to edit this event
    const brand = await Brand.findOne({
      _id: event.brand,
      $or: [
        { owner: req.user.userId },
        { "team.user": req.user.userId }
      ]
    });

    if (!brand) {
      return res.status(403).json({ 
        message: "You don't have permission to edit this event" 
      });
    }

    // Remove the co-host
    event.coHosts = event.coHosts.filter(
      coHost => coHost.toString() !== brandId
    );
    await event.save();

    res.status(200).json({
      message: "Co-host removed successfully",
      coHosts: event.coHosts
    });
  } catch (error) {
    console.error("Error removing co-host:", error);
    res.status(500).json({ message: "Error removing co-host" });
  }
};

// Get roles for a co-host brand
exports.getCoHostRoles = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Validate brandId
    if (!brandId || !mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: "Invalid brand ID" });
    }

    // Find all roles for the brand, INCLUDING founder roles since co-host founder is important
    const roles = await Role.find({
      brandId: brandId
    }).select("name description permissions isFounder isDefault");


    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: "Error fetching co-host roles" });
  }
};

// Get main host's custom codes for an event
// Now uses simplified CodeSettings with brand-level support
exports.getMainHostCustomCodes = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate eventId parameter
    if (!eventId || eventId === 'undefined' || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid or missing event ID" });
    }

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const brandId = event.brand;
    const effectiveEventId = event.parentEventId || eventId;

    // Inline migration: backfill brandId on legacy event-level codes
    await CodeSettings.updateMany(
      { eventId: effectiveEventId, brandId: null },
      { $set: { brandId: brandId } }
    );

    // Query for both brand-level and event-level codes
    // Only NEW codes (have createdBy set) - legacy codes are filtered out
    const allCodes = await CodeSettings.find({
      isEnabled: true,
      createdBy: { $type: "objectId" },  // Only NEW codes
      brandId: brandId,
      $or: [
        { eventId: null, isGlobalForBrand: true },
        { eventId: effectiveEventId },
      ],
    }).select("name type color limit maxPax condition icon brandId eventId isGlobalForBrand");

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
    const formattedCodes = Array.from(codesByName.values()).map(code => ({
      _id: code._id,
      name: code.name,
      type: code.type || "custom",
      color: code.color || "#ffc807",
      limit: code.limit || 999,
      maxPax: code.maxPax || 1,
      condition: code.condition || "",
      icon: code.icon || "RiCodeLine",
      hasLimits: true,
      isGlobal: code.isGlobalForBrand === true,
      isBrandLevel: code.eventId === null,
    }));

    res.status(200).json(formattedCodes);
  } catch (error) {
    console.error("Error fetching main host custom codes:", error);
    res.status(500).json({ message: "Error fetching main host custom codes" });
  }
};

// Save co-host role permissions GLOBALLY to CoHostRelationship model
// These permissions apply to ALL events where this co-host is added
exports.saveCoHostPermissions = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { brandId: coHostBrandId, permissions } = req.body;

    // Validate event exists and get the host brand
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const hostBrandId = event.brand;

    // Check if user has permission to edit this host brand
    const hostBrand = await Brand.findOne({
      _id: hostBrandId,
      $or: [
        { owner: req.user.userId },
        { "team.user": req.user.userId }
      ]
    });

    if (!hostBrand) {
      return res.status(403).json({
        message: "You don't have permission to edit this brand's co-host settings"
      });
    }

    // Check if brand is actually a co-host of this event
    if (!event.coHosts.includes(coHostBrandId)) {
      return res.status(400).json({
        message: "Brand is not a co-host of this event"
      });
    }

    // Convert permissions object to the format we need
    const rolePermissions = [];
    Object.keys(permissions).forEach(roleId => {
      rolePermissions.push({
        roleId: new mongoose.Types.ObjectId(roleId),
        permissions: permissions[roleId]
      });
    });

    // Update or create CoHostRelationship
    const updatedRelationship = await CoHostRelationship.findOneAndUpdate(
      {
        hostBrand: hostBrandId,
        coHostBrand: coHostBrandId
      },
      {
        hostBrand: hostBrandId,
        coHostBrand: coHostBrandId,
        rolePermissions: rolePermissions,
        isActive: true
      },
      {
        upsert: true, // Create if doesn't exist
        new: true,    // Return updated document
        runValidators: true
      }
    );

    res.status(200).json({
      message: "Co-host permissions saved successfully (global)",
      permissions: {
        hostBrand: hostBrandId,
        coHostBrand: coHostBrandId,
        rolePermissions: rolePermissions
      }
    });
  } catch (error) {
    console.error("Error saving co-host permissions:", error);
    res.status(500).json({ message: "Error saving co-host permissions" });
  }
};

// Get GLOBAL co-host permissions from CoHostRelationship model
exports.getCoHostPermissions = async (req, res) => {
  try {
    const { eventId, brandId: coHostBrandId } = req.params;

    // Get event to find the host brand
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const hostBrandId = event.brand._id || event.brand;

    // Find the CoHostRelationship
    const relationship = await CoHostRelationship.findOne({
      hostBrand: hostBrandId,
      coHostBrand: coHostBrandId,
      isActive: true
    });

    if (!relationship) {
      return res.status(404).json({ message: "No permissions found for this co-host" });
    }

    // Fetch code settings for key remapping (only NEW codes)
    const effectiveEventId = event.parentEventId || event._id;
    const rawCodeSettings = await CodeSettings.find({
      isEnabled: true,
      createdBy: { $type: "objectId" },  // Only NEW codes
      brandId: hostBrandId,
      $or: [
        { eventId: null, isGlobalForBrand: true },
        { eventId: effectiveEventId },
      ],
    });

    // Format code settings for remapping
    const codeSettings = rawCodeSettings.map(cs => ({
      _id: cs._id.toString(),
      name: cs.name,
    }));

    // Convert to the format the frontend expects
    const formattedPermissions = {};
    relationship.rolePermissions.forEach(rp => {
      formattedPermissions[rp.roleId.toString()] = normalizePermissions(rp.permissions, codeSettings);
    });

    res.status(200).json(formattedPermissions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching co-host permissions" });
  }
};

// Get co-host brand's default role permissions (including custom codes for matching)
exports.getCoHostDefaultPermissions = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Find all roles for the co-host brand
    const roles = await Role.find({
      brandId: brandId
    }).select("name permissions isFounder isDefault");

    // Format permissions for each role using the unified normalizePermissions
    const rolesWithPermissions = roles.map(role => {
      // Use normalizePermissions to ensure consistent format
      const fullPermissions = normalizePermissions(role.permissions);

      return {
        roleId: role._id,
        roleName: role.name,
        isFounder: role.isFounder,
        isDefault: role.isDefault,
        permissions: fullPermissions
      };
    });

    res.status(200).json(rolesWithPermissions);
  } catch (error) {
    console.error("Error fetching co-host default permissions:", error);
    res.status(500).json({ message: "Error fetching co-host default permissions" });
  }
};

// Get co-host brand's code templates (for permission inheritance matching by name)
// This endpoint is used when the main host wants to inherit code permissions from a co-host brand
// It only returns code names and IDs - no sensitive data
exports.getCoHostBrandCodes = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Validate brandId
    if (!brandId || !mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: "Invalid brand ID" });
    }

    // Fetch the brand's code templates (brand-level codes only, NEW codes)
    const codes = await CodeSettings.find({
      brandId: brandId,
      eventId: null, // Brand-level codes only
      isGlobalForBrand: true,
      isEnabled: true,
      createdBy: { $type: "objectId" },  // Only NEW codes
    }).select("_id name type color icon");

    // Format response with minimal data needed for matching
    const formattedCodes = codes.map(code => ({
      _id: code._id.toString(),
      name: code.name,
      type: code.type || "custom",
      color: code.color || "#ffc807",
      icon: code.icon || "RiCodeLine",
    }));

    res.status(200).json({ codes: formattedCodes });
  } catch (error) {
    console.error("Error fetching co-host brand codes:", error);
    res.status(500).json({ message: "Error fetching co-host brand codes" });
  }
};