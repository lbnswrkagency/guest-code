const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");
const Role = require("../models/roleModel");
const CodeSettings = require("../models/codeSettingsModel");
const mongoose = require("mongoose");

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


    // Find events where the brand is a co-host - use the exact same population as regular events
    const coHostedEvents = await Event.find({
      coHosts: brandId,
      parentEventId: { $exists: false } // Only get parent events
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
          // Get code settings for this event (this is what regular events get from Redux)
          const eventCodeSettings = await CodeSettings.find({
            eventId: event._id
          });


          // Convert event to plain object to ensure consistent structure
          const eventObj = event.toObject();
          
          // Attach code settings (regular events get this from Redux store)
          eventObj.codeSettings = eventCodeSettings;
          
          // Ensure all required date fields are present and properly formatted
          if (!eventObj.date && eventObj.startDate) {
            eventObj.date = eventObj.startDate; // Ensure backward compatibility
          }
          
          if (!eventObj.startDate && eventObj.date) {
            eventObj.startDate = eventObj.date; // Ensure forward compatibility
          }

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

          if (brandPermissions) {
            // Find permissions for this specific role
            const rolePermission = brandPermissions.rolePermissions.find(
              rp => rp.roleId.toString() === userRoleInCoHostBrand._id.toString()
            );

            if (rolePermission) {
              // Deep clone the permissions object to avoid modifying the original
              const permissions = JSON.parse(JSON.stringify(rolePermission.permissions.toObject ? rolePermission.permissions.toObject() : rolePermission.permissions));
              
              // Ensure codes is a proper object (Maps don't serialize to JSON)
              if (rolePermission.permissions.codes && rolePermission.permissions.codes instanceof Map) {
                permissions.codes = Object.fromEntries(rolePermission.permissions.codes);
              } else if (rolePermission.permissions.codes && typeof rolePermission.permissions.codes.toObject === 'function') {
                // Handle Mongoose Map type
                permissions.codes = rolePermission.permissions.codes.toObject();
              }
              
              eventObj.coHostBrandInfo.effectivePermissions = permissions;
            } else {
              eventObj.coHostBrandInfo.effectivePermissions = null;
            }
          } else {
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


    // Get custom code settings for this event from the CodeSettings collection
    const codeSettings = await CodeSettings.find({
      eventId: eventId,
      type: "custom", // Only get custom codes
      isEnabled: true // Only get enabled codes
    }).select("name type color limit maxPax condition icon");


    // Format the codes similar to how RoleSetting.js does it
    const formattedCodes = codeSettings.map(code => ({
      _id: code._id,
      name: code.name,
      type: code.type,
      color: code.color || "#ffc807",
      limit: code.limit || 999,
      maxPax: code.maxPax || 1,
      condition: code.condition || "",
      icon: code.icon || "RiCodeLine",
      hasLimits: true, // Custom codes typically have limits
      isCustom: true
    }));

    res.status(200).json(formattedCodes);
  } catch (error) {
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