const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const roleController = require("../controllers/roleController");

// Get user's roles for a brand
router.get(
  "/brands/:brandId/user-roles",
  authenticateToken,
  roleController.getUserRolesForBrand
);

// Role management routes
router.get(
  "/brands/:brandId/roles",
  authenticateToken,
  roleController.getRoles
);
router.post(
  "/brands/:brandId/roles",
  authenticateToken,
  roleController.createRole
);
router.put(
  "/brands/:brandId/roles/:roleId",
  authenticateToken,
  roleController.updateRole
);
router.delete(
  "/brands/:brandId/roles/:roleId",
  authenticateToken,
  roleController.deleteRole
);

module.exports = router;
