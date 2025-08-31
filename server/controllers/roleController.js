const Role = require("../models/roleModel");
const Brand = require("../models/brandModel");
const CodeSetting = require("../models/codeSettingsModel");
const mongoose = require("mongoose");

// Create default roles for a brand
exports.createDefaultRoles = async (brandId, userId) => {
  try {
    // Prepare default code permissions
    const defaultCodePermissions = {
      friends: {
        generate: true,
        limit: 0,
        unlimited: true,
      },
      backstage: {
        generate: true,
        limit: 0,
        unlimited: true,
      },
      table: {
        generate: true,
      },
      ticket: {
        generate: true,
      },
      guest: {
        generate: true,
      },
    };

    // Default limited permissions
    const limitedCodePermissions = {
      friends: {
        generate: true,
        limit: 10,
        unlimited: false,
      },
      backstage: {
        generate: false,
        limit: 0,
        unlimited: false,
      },
      table: {
        generate: false,
      },
      ticket: {
        generate: false,
      },
      guest: {
        generate: false,
      },
    };

    // Create Founder role (renamed from OWNER/FOUNDER)
    const founderRole = new Role({
      name: "Founder",
      brandId,
      createdBy: userId,
      isDefault: true,
      isFounder: true,
      permissions: {
        events: {
          create: true,
          edit: true,
          delete: true,
          view: true,
        },
        team: {
          manage: true,
          view: true,
        },
        analytics: {
          view: true,
        },
        codes: defaultCodePermissions,
        scanner: {
          use: true,
        },
        tables: {
          access: true,
          manage: true,
        },
        battles: {
          view: true,
          edit: true,
          delete: true,
        },
      },
    });

    // Create Member role
    const memberRole = new Role({
      name: "Member",
      brandId,
      createdBy: userId,
      isDefault: true,
      isFounder: false,
      permissions: {
        events: {
          create: false,
          edit: false,
          delete: false,
          view: true,
        },
        team: {
          manage: false,
          view: true,
        },
        analytics: {
          view: false,
        },
        codes: limitedCodePermissions,
        scanner: {
          use: false,
        },
        tables: {
          access: false,
          manage: false,
        },
        battles: {
          view: false,
          edit: false,
          delete: false,
        },
      },
    });

    await Promise.all([founderRole.save(), memberRole.save()]);
    return [founderRole, memberRole];
  } catch (error) {
    console.error("[RoleController:createDefaultRoles] Error:", error);
    throw error;
  }
};

// Process and normalize code permissions before saving
const processCodePermissions = (codePermissions) => {
  const processedPermissions = {};

  if (codePermissions && typeof codePermissions === "object") {
    // Loop through each code type
    Object.keys(codePermissions).forEach((codeType) => {
      const permission = codePermissions[codeType];

      // Basic structure for all code types
      processedPermissions[codeType] = {
        generate: Boolean(permission.generate),
      };

      // Add limit and unlimited if applicable
      if (typeof permission.limit !== "undefined") {
        processedPermissions[codeType].limit = parseInt(permission.limit) || 0;
        processedPermissions[codeType].unlimited = Boolean(
          permission.unlimited
        );
      }
    });
  }

  return processedPermissions;
};

// Get all roles for a brand
exports.getRoles = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({ message: "Brand ID is required" });
    }

    const roles = await Role.find({ brandId });
    res.status(200).json(roles);
  } catch (error) {
    console.error("[RoleController:getRoles] Error:", error);
    res.status(500).json({
      message: "Error fetching roles",
      error: error.message,
    });
  }
};

// Get user roles for a specific brand
exports.getUserRolesForBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user._id;

    if (!brandId) {
      return res.status(400).json({ message: "Brand ID is required" });
    }

    // Find the brand to check if user is owner
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Prepare roles array
    const userRoles = [];

    // Check if user is the owner
    const isOwner = brand.owner.toString() === userId.toString();
    if (isOwner) {
      // Add Founder role
      const founderRole = await Role.findOne({
        brandId,
        isFounder: true,
        isDefault: true,
      });

      if (founderRole) {
        userRoles.push(founderRole);
      }
    }

    // Check if user is a team member
    const isMember =
      brand.team &&
      brand.team.some(
        (member) => member.user && member.user.toString() === userId.toString()
      );

    if (isMember) {
      // Find team member's role - now using role ObjectId
      const teamMember = brand.team.find(
        (member) => member.user && member.user.toString() === userId.toString()
      );

      if (teamMember && teamMember.role) {
        // If role is stored as an ObjectId, we need to fetch it
        if (mongoose.Types.ObjectId.isValid(teamMember.role)) {
          const memberRole = await Role.findById(teamMember.role);
          if (memberRole) {
            userRoles.push(memberRole);
          }
        } else {
          // Backward compatibility for existing data where role might be a string
          const memberRole = await Role.findOne({
            brandId,
            name: teamMember.role,
          });

          if (memberRole) {
            userRoles.push(memberRole);
          }
        }
      }

      // Always add Member role if not already added
      if (!userRoles.some((role) => role.name === "Member")) {
        const memberRole = await Role.findOne({
          brandId,
          name: "Member",
          isDefault: true,
        });

        if (memberRole) {
          userRoles.push(memberRole);
        }
      }
    }

    // Add any custom roles assigned directly to the user
    const customRoles = await Role.find({
      brandId,
      assignedUsers: userId,
    });

    if (customRoles && customRoles.length > 0) {
      userRoles.push(...customRoles);
    }

    res.status(200).json(userRoles);
  } catch (error) {
    console.error("[RoleController:getUserRolesForBrand] Error:", error);
    res.status(500).json({
      message: "Error fetching user roles",
      error: error.message,
    });
  }
};

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { name, permissions } = req.body;

    if (!brandId || !name || !permissions) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if trying to create a Founder role by checking the name
    if (name.toUpperCase() === "FOUNDER") {
      return res
        .status(403)
        .json({ message: "Cannot create another Founder role" });
    }

    // Process code permissions
    if (permissions.codes) {
      permissions.codes = processCodePermissions(permissions.codes);
    }

    const role = new Role({
      name: name.toUpperCase(), // Store all role names in uppercase
      permissions,
      brandId,
      createdBy: req.user._id,
      isFounder: false, // Explicitly set to false for new roles
    });

    const savedRole = await role.save();
    res.status(201).json(savedRole);
  } catch (error) {
    console.error("[RoleController:createRole] Error:", error);
    res.status(500).json({
      message: "Error creating role",
      error: error.message,
    });
  }
};

// Update a role
exports.updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, permissions } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: "Role ID is required" });
    }

    // Find the role first
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Allow updating Founder role by removing this check
    // if (role.isFounder) {
    //   return res.status(403).json({ message: "Cannot modify Founder role" });
    // }

    // Prevent changing role name to Founder
    if (name && name.toUpperCase() === "FOUNDER" && !role.isFounder) {
      return res.status(403).json({ message: "Cannot rename role to Founder" });
    }

    // Store the old role name for later use if we're changing the name
    const oldRoleName = role.name;
    const newRoleName = name ? name.toUpperCase() : oldRoleName;
    const isNameChanging = newRoleName !== oldRoleName;

    // Process code permissions if present
    if (permissions && permissions.codes) {
      permissions.codes = processCodePermissions(permissions.codes);
    }

    // Update the role in the role model
    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      {
        name: newRoleName, // Store all role names in uppercase
        permissions,
        updatedBy: req.user._id,
        // Don't allow changing isFounder flag
      },
      { new: true }
    );

    // If the role name has changed, update all brand team members with this role
    if (isNameChanging) {
      try {
        // Find the brand associated with this role
        const brandId = role.brandId;

        // Find the brand
        const brand = await Brand.findById(brandId);

        if (brand && brand.team && Array.isArray(brand.team)) {
          let teamUpdated = false;
          let updatedCount = 0;

          // Update team members with the old role name (case-insensitive)
          brand.team.forEach((member) => {
            // Check if role is a string or ObjectId and compare appropriately
            if (member.role) {
              if (
                typeof member.role === "string" &&
                member.role.toUpperCase() === oldRoleName.toUpperCase()
              ) {
                // String comparison for legacy data
                member.role = newRoleName;
                teamUpdated = true;
                updatedCount++;
              } else if (
                member.role.toString &&
                role._id &&
                member.role.toString() === role._id.toString()
              ) {
                // ObjectId comparison - team member has a reference to this role's ID
                // We don't need to update anything here as the reference to role ID stays the same
                // Just update our tracking metrics
                teamUpdated = true;
                updatedCount++;
              }
            }
          });

          // Save the brand if any team members were updated
          if (teamUpdated) {
            await brand.save();
          }
        }
      } catch (updateError) {
        console.error(
          "[RoleController:updateRole] Error updating brand team members:",
          updateError
        );
        // We don't want to fail the entire request if updating team members fails
      }
    }

    res.status(200).json(updatedRole);
  } catch (error) {
    console.error("[RoleController:updateRole] Error:", error);
    res.status(500).json({
      message: "Error updating role",
      error: error.message,
    });
  }
};

// Delete a role
exports.deleteRole = async (req, res) => {
  try {
    const { roleId, brandId } = req.params;

    // Find the role first
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Prevent deleting Founder role
    if (role.isFounder) {
      return res.status(403).json({ message: "Cannot delete Founder role" });
    }

    // Check if role is assigned to any team members
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const isRoleAssigned = brand.team.some(
      (member) => member.role.toString() === role._id.toString()
    );
    if (isRoleAssigned) {
      return res.status(400).json({
        message: "Cannot delete role that is assigned to team members",
        isAssigned: true,
      });
    }

    await Role.findByIdAndDelete(roleId);
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("[RoleController:deleteRole] Error:", error);
    res.status(500).json({
      message: "Error deleting role",
      error: error.message,
    });
  }
};

// Get user roles
exports.getUserRoles = async (req, res) => {
  try {
    // Find all roles where brandId exists (to filter out any corrupted data)
    const roles = await Role.find({
      brandId: { $exists: true },
    });

    res.status(200).json(roles);
  } catch (error) {
    console.error("[RoleController:getUserRoles] Error:", error);
    res.status(500).json({ message: "Error fetching user roles" });
  }
};

// Update just the permissions for a role
exports.updatePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: "Role ID is required" });
    }

    // Find the role first
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Process code permissions if present
    let processedPermissions = { ...permissions };
    if (permissions && permissions.codes) {
      processedPermissions.codes = processCodePermissions(permissions.codes);
    }

    // Update just the permissions
    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      {
        permissions: processedPermissions,
        updatedBy: req.user._id,
      },
      { new: true }
    );

    res.status(200).json(updatedRole);
  } catch (error) {
    console.error("[RoleController:updatePermissions] Error:", error);
    res.status(500).json({
      message: "Error updating role permissions",
      error: error.message,
    });
  }
};

module.exports = {
  createDefaultRoles: exports.createDefaultRoles,
  getRoles: exports.getRoles,
  getUserRolesForBrand: exports.getUserRolesForBrand,
  createRole: exports.createRole,
  updateRole: exports.updateRole,
  deleteRole: exports.deleteRole,
  getUserRoles: exports.getUserRoles,
  updatePermissions: exports.updatePermissions,
};
