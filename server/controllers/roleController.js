const Role = require("../models/Role");

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

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { name, permissions },
      { new: true }
    );

    if (!updatedRole) {
      return res.status(404).json({ message: "Role not found" });
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
    const { roleId } = req.params;

    if (!roleId) {
      return res.status(400).json({ message: "Role ID is required" });
    }

    const deletedRole = await Role.findByIdAndDelete(roleId);

    if (!deletedRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("[RoleController:deleteRole] Error:", error);
    res.status(500).json({
      message: "Error deleting role",
      error: error.message,
    });
  }
};
