const Role = require("../models/roleModel");
const Brand = require("../models/brandModel");
const CodeSetting = require("../models/codeSettingsModel");

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

    // Create OWNER role
    const ownerRole = new Role({
      name: "OWNER",
      brandId,
      createdBy: userId,
      isDefault: true,
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
      },
    });

    // Create MEMBER role
    const memberRole = new Role({
      name: "MEMBER",
      brandId,
      createdBy: userId,
      isDefault: true,
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
      },
    });

    await Promise.all([ownerRole.save(), memberRole.save()]);
    return [ownerRole, memberRole];
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
      // Add OWNER role
      const ownerRole = await Role.findOne({
        brandId,
        name: "OWNER",
        isDefault: true,
      });

      if (ownerRole) {
        userRoles.push(ownerRole);
      }
    }

    // Check if user is a team member
    const isMember =
      brand.team &&
      brand.team.some(
        (member) => member.user && member.user.toString() === userId.toString()
      );

    if (isMember) {
      // Find team member's role
      const teamMember = brand.team.find(
        (member) => member.user && member.user.toString() === userId.toString()
      );

      if (teamMember && teamMember.role) {
        // Find the role object for this role name
        const memberRole = await Role.findOne({
          brandId,
          name: teamMember.role,
        });

        if (memberRole) {
          userRoles.push(memberRole);
        }
      }

      // Always add MEMBER role
      const memberRole = await Role.findOne({
        brandId,
        name: "MEMBER",
        isDefault: true,
      });

      if (memberRole) {
        userRoles.push(memberRole);
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

    // Prevent creating another OWNER role
    if (name.toUpperCase() === "OWNER") {
      return res
        .status(403)
        .json({ message: "Cannot create another OWNER role" });
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

    // Prevent updating OWNER role
    if (role.name === "OWNER") {
      return res.status(403).json({ message: "Cannot modify OWNER role" });
    }

    // Prevent changing role name to OWNER
    if (name && name.toUpperCase() === "OWNER") {
      return res.status(403).json({ message: "Cannot rename role to OWNER" });
    }

    // Process code permissions if present
    if (permissions && permissions.codes) {
      permissions.codes = processCodePermissions(permissions.codes);
    }

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      {
        name: name ? name.toUpperCase() : role.name, // Store all role names in uppercase
        permissions,
        updatedBy: req.user._id,
      },
      { new: true }
    );

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

    // Prevent deleting OWNER role
    if (role.name === "OWNER") {
      return res.status(403).json({ message: "Cannot delete OWNER role" });
    }

    // Check if role is assigned to any team members
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const isRoleAssigned = brand.team.some(
      (member) => member.role === role.name
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

// Add this function to the exports
exports.getUserRoles = async (req, res) => {
  try {
    console.log(
      "[RoleController:getUserRoles] Fetching roles for user:",
      req.user._id
    );

    // Find all roles where brandId exists (to filter out any corrupted data)
    const roles = await Role.find({
      brandId: { $exists: true },
    });

    console.log(
      "[RoleController:getUserRoles] Found roles:",
      roles.map((r) => ({
        id: r._id,
        name: r.name,
        brandId: r.brandId,
      }))
    );

    res.status(200).json(roles);
  } catch (error) {
    console.error("[RoleController:getUserRoles] Error:", error);
    res.status(500).json({ message: "Error fetching user roles" });
  }
};
