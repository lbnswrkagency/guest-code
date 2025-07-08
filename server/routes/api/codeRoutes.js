// codeRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const codeController = require("../../controllers/codeController");
// Import the new controller for dynamic code generation
const codesController = require("../../controllers/codesController");

// Middleware to check table permissions for table code operations
const checkTablePermissionsForCode = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Only apply to table code operations
      if (req.params.type !== 'table') {
        return next();
      }

      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const Role = require("../../models/roleModel");
      const TableCode = require("../../models/TableCode");
      const Event = require("../../models/eventsModel");
      const Brand = require("../../models/brandModel");
      
      // Get event from different sources depending on the route
      let eventId;
      
      if (req.body.event) {
        eventId = req.body.event;
      } else if (req.params.codeId) {
        // For edit/delete operations, get event from the code
        const tableCode = await TableCode.findById(req.params.codeId);
        if (!tableCode) {
          return res.status(404).json({ message: "Table code not found" });
        }
        eventId = tableCode.event;
      }
      
      if (!eventId) {
        return res.status(400).json({ message: "Event ID required" });
      }

      // Find the event to get its brand
      const event = await Event.findById(eventId).populate("brand");
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // First check if user is part of the brand team (primary check)
      const brand = await Brand.findById(event.brand._id);
      const isTeamMember = brand && brand.team && brand.team.some(member => 
        member.user.toString() === req.user.userId.toString()
      );

      // Also check if user is the brand owner
      const isBrandOwner = brand && brand.owner && brand.owner.toString() === req.user.userId.toString();

      // Get user roles for this brand if they exist
      let hasRolePermission = false;
      if (req.user.roles && req.user.roles.length > 0) {
        const userRoles = await Role.find({
          brandId: event.brand._id,
          _id: { $in: req.user.roles }
        });

        // Check if user has the required table permission through roles
        hasRolePermission = userRoles.some(role => 
          role.permissions && 
          role.permissions.tables && 
          role.permissions.tables[requiredPermission] === true
        );
      }

      // Allow access if user is team member, brand owner, or has role permission
      const hasPermission = isTeamMember || isBrandOwner || hasRolePermission;

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `You don't have permission to ${requiredPermission} table codes for this event` 
        });
      }

      next();
    } catch (error) {
      console.error("Error checking table permissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Existing routes...
router.get("/:type/codes", authenticate, checkTablePermissionsForCode("access"), codeController.fetchCodes);
router.delete("/:type/delete/:codeId", authenticate, checkTablePermissionsForCode("manage"), codeController.deleteCode);
router.put("/:type/edit/:codeId", authenticate, checkTablePermissionsForCode("manage"), codeController.editCode);
router.post("/:type/add", authenticate, checkTablePermissionsForCode("manage"), codeController.addCode);
router.get(
  "/:type/code/:codeId",
  authenticate,
  checkTablePermissionsForCode("access"),
  codeController.generateCodeImage
);

// New route for updating status
router.put(
  "/:type/status/:codeId",
  authenticate,
  checkTablePermissionsForCode("manage"),
  codeController.updateCodeStatus
);

// New route for generating and sending a code via email
router.post(
  "/:type/generate-and-send",
  authenticate,
  checkTablePermissionsForCode("manage"),
  codeController.generateAndSendCode
);

// New route for dynamic code generation - compatible with frontend
router.post("/generate", authenticate, codesController.createDynamicCode);

module.exports = router;
