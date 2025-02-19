const Role = require("../models/Role");

// Create default roles for a brand
exports.createDefaultRoles = async (brandId, userId) => {
  try {
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
        codes: {
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
        },
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
        codes: {
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
        },
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

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { name, permissions } = req.body;

    if (!brandId || !name || !permissions) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const role = new Role({
      name,
      permissions,
      brandId,
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

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { name, permissions },
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
    const { roleId } = req.params;

    // Find the role first
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Prevent deleting OWNER role
    if (role.name === "OWNER") {
      return res.status(403).json({ message: "Cannot delete OWNER role" });
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
