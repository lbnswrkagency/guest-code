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

    // For each co-hosted event, fetch and attach code settings AND ensure complete data structure
    const eventsWithFullData = await Promise.all(
      coHostedEvents.map(async (event) => {
        try {
          const eventBrandId = event.brand._id || event.brand;
          const effectiveEventId = event.parentEventId || event._id;

          // Inline migration: backfill brandId on legacy event-level codes
          await CodeSettings.updateMany(
            { eventId: effectiveEventId, brandId: null },
            { $set: { brandId: eventBrandId } }
          );

          // Get code settings for this event - BOTH brand-level AND event-level
          // This mirrors the logic in getMainHostCustomCodes and getCodesForEvent
          // Also includes legacy codes with brandId: null as a safety net
          const rawCodeSettings = await CodeSettings.find({
            isEnabled: true,
            $or: [
              { brandId: eventBrandId, eventId: null, isGlobalForBrand: true },
              { brandId: eventBrandId, eventId: effectiveEventId },
              { brandId: null, eventId: effectiveEventId }, // Legacy codes without brandId
            ],
          });

          console.log(`[CoHost Debug] Event: ${event._id} "${event.title}"`);
          console.log(`[CoHost Debug] Query: brandId=${eventBrandId}, effectiveEventId=${effectiveEventId}`);
          console.log(`[CoHost Debug] Codes found: ${rawCodeSettings.length}`);
          rawCodeSettings.forEach(cs => {
            console.log(`  [Code] ${cs.name} | _id: ${cs._id} | brandId: ${cs.brandId} | eventId: ${cs.eventId} | isGlobal: ${cs.isGlobalForBrand}`);
          });

          // Convert to plain objects with explicit fields to ensure frontend compatibility
          // The frontend filter requires: isEnabled === true && brandId
          const eventCodeSettings = rawCodeSettings.map(cs => ({
            _id: cs._id.toString(),
            name: cs.name,
            type: cs.type || 'custom',
            condition: cs.condition || '',
            note: cs.note || '',
            maxPax: cs.maxPax || 1,
            limit: cs.limit || 0,
            isEnabled: cs.isEnabled, // Already filtered for true, but include explicitly
            isEditable: cs.isEditable,
            color: cs.color || '#2196F3',
            icon: cs.icon || 'RiCodeLine',
            // CRITICAL: Use existing brandId OR fallback to event's brand for legacy codes
            brandId: (cs.brandId || eventBrandId)?.toString(),
            eventId: cs.eventId?.toString() || null,
            isGlobalForBrand: cs.isGlobalForBrand || false,
            createdBy: cs.createdBy?.toString(),
            requireEmail: cs.requireEmail,
            requirePhone: cs.requirePhone,
            price: cs.price,
            tableNumber: cs.tableNumber,
            // Add flag to indicate if this is inherited from brand level
            isInherited: cs.eventId === null,
          }));

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
          // Child events can have their own coHostRolePermissions (per-child overrides).
          // If a child has none, inherit from parent event.
          let coHostPermissions = eventObj.coHostRolePermissions || [];

          if (coHostPermissions.length === 0 && eventObj.parentEventId) {
            const parentEvent = await Event.findById(eventObj.parentEventId)
              .select('coHostRolePermissions')
              .lean();
            coHostPermissions = parentEvent?.coHostRolePermissions || [];
          }

          // More robust brandId comparison - handle both string and ObjectId
          const userBrandIdStr = brandId.toString();
          const brandPermissions = coHostPermissions.find(cp => {
            const cpBrandIdStr = cp.brandId?.toString?.() || String(cp.brandId);
            return cpBrandIdStr === userBrandIdStr;
          });

          // Debug logging for permission resolution
          console.log(`\n========== CoHost Permission Resolution ==========`);
          console.log(`Event ID: ${event._id}`);
          console.log(`Event Title: ${event.title}`);
          console.log(`Is Child Event: ${!!eventObj.parentEventId}`);
          console.log(`Co-Host Brand ID: ${brandId}`);
          console.log(`User Role ID: ${userRoleInCoHostBrand._id}`);
          console.log(`User Role Name: ${userRoleInCoHostBrand.name}`);
          console.log(`Is Founder: ${userRoleInCoHostBrand.isFounder}`);
          console.log(`\nCoHostPermissions count: ${coHostPermissions.length}`);
          console.log(`Available brands in coHostPermissions:`,
            coHostPermissions.map(cp => ({
              brandId: cp.brandId?.toString?.() || String(cp.brandId),
              roleCount: cp.rolePermissions?.length || 0
            }))
          );
          console.log(`Found brandPermissions for this co-host: ${!!brandPermissions}`);

          if (brandPermissions) {
            console.log(`\nRole permissions in this brand's coHostPermissions:`);
            brandPermissions.rolePermissions?.forEach((rp, i) => {
              const codesObj = rp.permissions?.codes || {};
              console.log(`  [${i}] RoleId: ${rp.roleId?.toString?.() || String(rp.roleId)}`);
              console.log(`       Code permissions:`, JSON.stringify(codesObj, null, 2).split('\n').join('\n       '));
            });

            // More robust roleId comparison - handle both string and ObjectId
            const userRoleIdStr = userRoleInCoHostBrand._id.toString();
            console.log(`\nLooking for roleId: ${userRoleIdStr}`);

            const rolePermission = brandPermissions.rolePermissions?.find(rp => {
              const rpRoleIdStr = rp.roleId?.toString?.() || String(rp.roleId);
              const matches = rpRoleIdStr === userRoleIdStr;
              console.log(`  Comparing: ${rpRoleIdStr} === ${userRoleIdStr} ? ${matches}`);
              return matches;
            });

            console.log(`Found matching rolePermission: ${!!rolePermission}`);

            if (rolePermission?.permissions) {
              // Use normalizePermissions to ensure consistent format
              // This handles Map-to-object conversion and ensures all fields exist
              // Pass eventCodeSettings for permission key remapping (name -> _id)
              console.log(`\nRaw permissions before normalization:`, JSON.stringify(rolePermission.permissions, null, 2));
              console.log(`[CoHost Debug] Stored permission keys:`, Object.keys(rolePermission.permissions?.codes || {}));
              const normalizedPerms = normalizePermissions(rolePermission.permissions, eventCodeSettings);
              console.log(`[CoHost Debug] After normalization — effectivePermissions.codes keys:`, Object.keys(normalizedPerms.codes));
              console.log(`\nNormalized effectivePermissions.codes (after remapping):`, JSON.stringify(normalizedPerms.codes, null, 2));
              console.log(`========== End Permission Resolution ==========\n`);
              eventObj.coHostBrandInfo.effectivePermissions = normalizedPerms;
            } else {
              console.log(`\n⚠️  No permissions found for this role!`);
              console.log(`    This means main host hasn't set permissions for the founder role.`);
              console.log(`========== End Permission Resolution ==========\n`);
              eventObj.coHostBrandInfo.effectivePermissions = null;
            }
          } else {
            console.log(`\n⚠️  No brandPermissions found for this co-host!`);
            console.log(`    This means the main host hasn't configured any permissions for this brand.`);
            console.log(`========== End Permission Resolution ==========\n`);
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

    // Inline migration: backfill brandId on legacy event-level codes
    await CodeSettings.updateMany(
      { eventId: effectiveEventId, brandId: null },
      { $set: { brandId: brandId } }
    );

    // Query for both brand-level and event-level codes
    // Also includes legacy codes with brandId: null as a safety net
    const allCodes = await CodeSettings.find({
      isEnabled: true,
      $or: [
        { brandId: brandId, eventId: null, isGlobalForBrand: true },
        { brandId: brandId, eventId: effectiveEventId },
        { brandId: null, eventId: effectiveEventId }, // Legacy codes without brandId
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
      console.log(`[saveCoHostPermissions] Processing roleId: ${roleId}, type: ${typeof roleId}`);
      console.log(`[saveCoHostPermissions] Codes for this role:`,
        permissions[roleId]?.codes ? JSON.stringify(permissions[roleId].codes, null, 2) : 'none'
      );
      rolePermissions.push({
        roleId: roleId,
        permissions: permissions[roleId]
      });
    });

    const newPermissionData = {
      brandId: brandId,
      rolePermissions: rolePermissions
    };

    console.log(`[saveCoHostPermissions] Saving permissions for brand ${brandId}:`,
      JSON.stringify(newPermissionData, null, 2)
    );

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

    console.log(`[saveCoHostPermissions] Saved successfully. Verifying...`);
    const verifyEvent = await Event.findById(eventId);
    console.log(`[saveCoHostPermissions] Verification - stored permissions:`,
      JSON.stringify(verifyEvent.coHostRolePermissions, null, 2)
    );

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

    // Fetch code settings for key remapping (same logic as getCoHostedEvents)
    const eventBrandId = event.brand._id || event.brand;
    const effectiveEventId = event.parentEventId || event._id;
    const rawCodeSettings = await CodeSettings.find({
      isEnabled: true,
      $or: [
        { brandId: eventBrandId, eventId: null, isGlobalForBrand: true },
        { brandId: eventBrandId, eventId: effectiveEventId },
        { brandId: null, eventId: effectiveEventId }, // Legacy codes without brandId
      ],
    });

    // Format code settings for remapping
    const codeSettings = rawCodeSettings.map(cs => ({
      _id: cs._id.toString(),
      name: cs.name,
    }));

    // Convert to the format the frontend expects
    // Use normalizePermissions with codeSettings to remap permission keys (name -> _id)
    const formattedPermissions = {};
    brandPermissions.rolePermissions.forEach(rp => {
      // Use normalizePermissions to handle Map-to-object conversion and key remapping
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