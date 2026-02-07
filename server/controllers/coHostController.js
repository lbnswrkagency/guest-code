const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");
const Role = require("../models/roleModel");
const CodeSettings = require("../models/codeSettingsModel");
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

// Get all co-hosted events for a brand
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
      // Find the founder role for this brand
      const Role = require("../models/roleModel");
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

    // DEBUG LOG
    console.log('\n[CO-HOST DEBUG] ========== getCoHostedEvents ==========');
    console.log('[CO-HOST DEBUG] Brand:', coHostBrand.name, '- ID:', brandId);
    console.log('[CO-HOST DEBUG] User role:', userRoleInCoHostBrand.name, '- ID:', userRoleInCoHostBrand._id?.toString());

    // Find events where the brand is a co-host - include BOTH parent AND child events
    // Child events can have their own co-hosts and coHostRolePermissions
    const coHostedEvents = await Event.find({
      coHosts: brandId
      // Removed parentEventId filter - child events can have their own co-host permissions
    })
      .populate("brand", "name username logo colors") // Include brand colors for UI
      .populate("coHosts", "name username logo")
      .populate("user", "username firstName lastName avatar")
      .populate("lineups") // Full lineup population like regular events
      .populate("genres") // Full genre population like regular events
      .sort({ date: -1 }); // Use same sort field as regular events

    // DEBUG LOG
    console.log('[CO-HOST DEBUG] Total co-hosted events found:', coHostedEvents.length);
    coHostedEvents.forEach((ev, idx) => {
      console.log(`[CO-HOST DEBUG] Event ${idx}:`, {
        title: ev.title,
        _id: ev._id?.toString(),
        parentEventId: ev.parentEventId?.toString() || 'NONE (parent)',
        weekNumber: ev.weekNumber,
        coHostRolePermissions_count: ev.coHostRolePermissions?.length || 0
      });
    });

    // For each co-hosted event, fetch and attach code settings AND ensure complete data structure
    const eventsWithFullData = await Promise.all(
      coHostedEvents.map(async (event) => {
        try {
          const brandId = event.brand._id || event.brand;
          const effectiveEventId = event.parentEventId || event._id;

          // Get code settings for this event (CodeTemplate system syncs to CodeSettings)
          const eventCodeSettings = await CodeSettings.find({
            eventId: effectiveEventId
          });


          // Convert event to plain object to ensure consistent structure
          const eventObj = event.toObject();
          
          // Attach code settings (regular events get this from Redux store)
          eventObj.codeSettings = eventCodeSettings;

          // Ensure flyer object exists (even if empty) for consistent structure
          if (!eventObj.flyer) {
            eventObj.flyer = {};
          }

          // Ensure arrays exist for consistent structure
          if (!eventObj.lineups) eventObj.lineups = [];
          if (!eventObj.genres) eventObj.genres = [];
          if (!eventObj.coHosts) eventObj.coHosts = [];

          // Ensure string fields exist
          if (!eventObj.title) eventObj.title = '';
          if (!eventObj.description) eventObj.description = '';
          if (!eventObj.location) eventObj.location = '';

          // Attach co-host information
          eventObj.coHostBrandInfo = {
            brandId: brandId,
            brandName: coHostBrand.name,
            userRole: {
              _id: userRoleInCoHostBrand._id,
              name: userRoleInCoHostBrand.name,
              isFounder: userRoleInCoHostBrand.isFounder,
              permissions: userRoleInCoHostBrand.permissions
            }
          };

          // Find co-host permissions for this specific event and brand/role combination
          const coHostPermissions = eventObj.coHostRolePermissions || [];
          const brandPermissions = coHostPermissions.find(
            cp => cp.brandId.toString() === brandId.toString()
          );

          // DEBUG LOG for each event
          console.log(`[CO-HOST DEBUG] --- Processing: ${eventObj.title} (${eventObj._id}) ---`);
          console.log('[CO-HOST DEBUG] coHostRolePermissions count:', coHostPermissions.length);
          console.log('[CO-HOST DEBUG] brandPermissions found:', !!brandPermissions);

          if (brandPermissions) {
            console.log('[CO-HOST DEBUG] brandPermissions.brandId:', brandPermissions.brandId?.toString());
            console.log('[CO-HOST DEBUG] rolePermissions in brand:', brandPermissions.rolePermissions?.map(rp => ({
              roleId: rp.roleId?.toString(),
              hasCodePerms: Object.keys(rp.permissions?.codes || {}).length > 0,
              codeNames: Object.keys(rp.permissions?.codes || {})
            })));
            console.log('[CO-HOST DEBUG] Looking for user roleId:', userRoleInCoHostBrand._id?.toString());

            // Find permissions for this specific role
            const rolePermission = brandPermissions.rolePermissions?.find(
              rp => rp.roleId?.toString() === userRoleInCoHostBrand._id.toString()
            );

            console.log('[CO-HOST DEBUG] rolePermission MATCH:', !!rolePermission);

            if (rolePermission?.permissions) {
              console.log('[CO-HOST DEBUG] Found permissions.codes:', Object.keys(rolePermission.permissions?.codes || {}));
              // Use normalizePermissions to ensure consistent format
              // This handles Map-to-object conversion and ensures all fields exist
              eventObj.coHostBrandInfo.effectivePermissions = normalizePermissions(
                rolePermission.permissions
              );
              console.log('[CO-HOST DEBUG] effectivePermissions set:', !!eventObj.coHostBrandInfo.effectivePermissions);
            } else {
              console.log('[CO-HOST DEBUG] No rolePermission found - setting effectivePermissions to null');
              eventObj.coHostBrandInfo.effectivePermissions = null;
            }
          } else {
            console.log('[CO-HOST DEBUG] No brandPermissions found - setting effectivePermissions to null');
            eventObj.coHostBrandInfo.effectivePermissions = null;
          }
          
          return eventObj;
        } catch (error) {
          // Return basic event structure if processing fails
          const eventObj = event.toObject();
          eventObj.codeSettings = [];
          return eventObj;
        }
      })
    );

    res.status(200).json(eventsWithFullData);
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

    // Query for both brand-level and event-level codes
    // IMPORTANT: brandId is REQUIRED to exclude old legacy codes
    const allCodes = await CodeSettings.find({
      brandId: brandId, // Required for all codes
      isEnabled: true,
      $or: [
        // Brand-level global codes (apply to all events in brand)
        { eventId: null, isGlobalForBrand: true },
        // Event-specific codes
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

// Save co-host role permissions for an event
exports.saveCoHostPermissions = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { brandId, permissions } = req.body;

    // Validate event exists and user has permission
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

    // Check if brand is actually a co-host
    if (!event.coHosts.includes(brandId)) {
      return res.status(400).json({ 
        message: "Brand is not a co-host of this event" 
      });
    }

    // Update or create co-host role permissions
    let coHostPermissions = event.coHostRolePermissions || [];
    
    // Find existing permissions for this brand
    const existingIndex = coHostPermissions.findIndex(
      cp => cp.brandId.toString() === brandId
    );

    // Convert permissions object to the format we need
    const rolePermissions = [];
    Object.keys(permissions).forEach(roleId => {
      rolePermissions.push({
        roleId: roleId,
        permissions: permissions[roleId]
      });
    });

    const newPermissionData = {
      brandId: brandId,
      rolePermissions: rolePermissions
    };

    if (existingIndex >= 0) {
      // Update existing permissions
      coHostPermissions[existingIndex] = newPermissionData;
    } else {
      // Add new permissions
      coHostPermissions.push(newPermissionData);
    }

    // Save to event
    event.coHostRolePermissions = coHostPermissions;
    await event.save();

    res.status(200).json({
      message: "Co-host permissions saved successfully",
      permissions: newPermissionData
    });
  } catch (error) {
    console.error("Error saving co-host permissions:", error);
    res.status(500).json({ message: "Error saving co-host permissions" });
  }
};

// Get existing co-host permissions for an event
exports.getCoHostPermissions = async (req, res) => {
  try {
    const { eventId, brandId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Find permissions for this brand
    const coHostPermissions = event.coHostRolePermissions || [];
    const brandPermissions = coHostPermissions.find(
      cp => cp.brandId.toString() === brandId
    );

    if (!brandPermissions) {
      return res.status(404).json({ message: "No permissions found for this co-host" });
    }

    // Convert to the format the frontend expects
    const formattedPermissions = {};
    brandPermissions.rolePermissions.forEach(rp => {
      formattedPermissions[rp.roleId] = rp.permissions;
    });

    res.status(200).json(formattedPermissions);
  } catch (error) {
    console.error("Error fetching co-host permissions:", error);
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