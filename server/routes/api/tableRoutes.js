const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const tableController = require("../../controllers/tableController");

// Middleware to check table permissions
const checkTablePermissions = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const Role = require("../../models/roleModel");
      const Event = require("../../models/eventsModel");
      const Brand = require("../../models/brandModel");
      
      // Get event from request params or body
      const eventId = req.params.eventId || req.body.event || req.body.eventId;
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

      // Get user roles for this brand
      let hasRolePermission = false;
      
      // Since JWT only contains userId, we need to fetch the user's roles from database
      const User = require("../../models/User");
      const userDoc = await User.findById(req.user.userId);
      
      if (userDoc) {
        // Find the user's role for this specific brand
        const userRoleId = brand.team?.find(member => 
          member.user.toString() === req.user.userId.toString()
        )?.role;
        
        if (userRoleId) {
          const userRole = await Role.findOne({
            _id: userRoleId,
            brandId: event.brand._id
          });
          
          if (userRole && userRole.permissions && userRole.permissions.tables) {
            hasRolePermission = userRole.permissions.tables[requiredPermission] === true;
          }
        }
      }

      // Check co-host permissions if user doesn't have main event permissions
      let hasCoHostPermission = false;
      if (!isTeamMember && !isBrandOwner && !hasRolePermission) {
        // Check if this event has co-hosts and if user's brand is a co-host
        if (event.coHosts && event.coHosts.length > 0) {
          const CoHostRelationship = require("../../models/coHostRelationshipModel");

          // Find all brands where the user is a team member or owner
          const userBrands = await Brand.find({
            $or: [
              { owner: req.user.userId },
              { "team.user": req.user.userId }
            ]
          });

          // Check if any of the user's brands are co-hosts for this event
          for (const userBrand of userBrands) {
            const isCoHost = event.coHosts.some(
              coHostId => coHostId.toString() === userBrand._id.toString()
            );

            if (isCoHost) {
              // Look up permissions from CoHostRelationship model (new unified system)
              const relationship = await CoHostRelationship.findOne({
                hostBrand: event.brand._id,
                coHostBrand: userBrand._id,
                isActive: true
              });

              if (relationship && relationship.rolePermissions) {
                // Find the user's role in this co-host brand
                const userRoleInCoHostBrand = userBrand.team?.find(
                  member => member.user.toString() === req.user.userId.toString()
                )?.role;

                // Check if user is owner of co-host brand
                const isCoHostBrandOwner = userBrand.owner &&
                  userBrand.owner.toString() === req.user.userId.toString();

                if (userRoleInCoHostBrand || isCoHostBrandOwner) {
                  let rolePermission;

                  if (isCoHostBrandOwner) {
                    // Owners get the permissions of any admin role with table access
                    rolePermission = relationship.rolePermissions.find(rp =>
                      rp.permissions?.tables?.[requiredPermission] === true
                    );
                  } else {
                    // Find permissions for user's specific role
                    rolePermission = relationship.rolePermissions.find(
                      rp => rp.roleId.toString() === userRoleInCoHostBrand.toString()
                    );
                  }

                  if (rolePermission?.permissions?.tables?.[requiredPermission] === true) {
                    hasCoHostPermission = true;
                    break; // Found permission, no need to check other brands
                  }
                }
              }
            }
          }
        }
      }

      // Allow access if user is team member, brand owner, has role permission, or has co-host permission
      const hasPermission = isTeamMember || isBrandOwner || hasRolePermission || hasCoHostPermission;

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `You don't have permission to ${requiredPermission} tables for this event` 
        });
      }

      next();
    } catch (error) {
      console.error("Error checking table permissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to check table permissions for code operations
const checkTablePermissionsForCode = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const TableCode = require("../../models/TableCode");
      const Event = require("../../models/eventsModel");
      const Role = require("../../models/roleModel");
      const Brand = require("../../models/brandModel");
      
      // Get event from code
      const { codeId } = req.params;
      if (!codeId) {
        return res.status(400).json({ message: "Code ID required" });
      }

      // Find the table code to get the event
      const tableCode = await TableCode.findById(codeId);
      if (!tableCode) {
        return res.status(404).json({ message: "Table code not found" });
      }

      // Find the event to get its brand
      const event = await Event.findById(tableCode.event).populate("brand");
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

      // Get user roles for this brand
      let hasRolePermission = false;
      
      // Since JWT only contains userId, we need to fetch the user's roles from database
      const User = require("../../models/User");
      const userDoc = await User.findById(req.user.userId);
      
      if (userDoc) {
        // Find the user's role for this specific brand
        const userRoleId = brand.team?.find(member => 
          member.user.toString() === req.user.userId.toString()
        )?.role;
        
        if (userRoleId) {
          const userRole = await Role.findOne({
            _id: userRoleId,
            brandId: event.brand._id
          });
          
          if (userRole && userRole.permissions && userRole.permissions.tables) {
            hasRolePermission = userRole.permissions.tables[requiredPermission] === true;
          }
        }
      }

      // Check co-host permissions if user doesn't have main event permissions
      let hasCoHostPermission = false;
      if (!isTeamMember && !isBrandOwner && !hasRolePermission) {
        // Check if this event has co-hosts and if user's brand is a co-host
        if (event.coHosts && event.coHosts.length > 0) {
          const CoHostRelationship = require("../../models/coHostRelationshipModel");

          // Find all brands where the user is a team member or owner
          const userBrands = await Brand.find({
            $or: [
              { owner: req.user.userId },
              { "team.user": req.user.userId }
            ]
          });

          // Check if any of the user's brands are co-hosts for this event
          for (const userBrand of userBrands) {
            const isCoHost = event.coHosts.some(
              coHostId => coHostId.toString() === userBrand._id.toString()
            );

            if (isCoHost) {
              // Look up permissions from CoHostRelationship model (new unified system)
              const relationship = await CoHostRelationship.findOne({
                hostBrand: event.brand._id,
                coHostBrand: userBrand._id,
                isActive: true
              });

              if (relationship && relationship.rolePermissions) {
                // Find the user's role in this co-host brand
                const userRoleInCoHostBrand = userBrand.team?.find(
                  member => member.user.toString() === req.user.userId.toString()
                )?.role;

                // Check if user is owner of co-host brand
                const isCoHostBrandOwner = userBrand.owner &&
                  userBrand.owner.toString() === req.user.userId.toString();

                if (userRoleInCoHostBrand || isCoHostBrandOwner) {
                  let rolePermission;

                  if (isCoHostBrandOwner) {
                    // Owners get the permissions of any admin role with table access
                    rolePermission = relationship.rolePermissions.find(rp =>
                      rp.permissions?.tables?.[requiredPermission] === true
                    );
                  } else {
                    // Find permissions for user's specific role
                    rolePermission = relationship.rolePermissions.find(
                      rp => rp.roleId.toString() === userRoleInCoHostBrand.toString()
                    );
                  }

                  if (rolePermission?.permissions?.tables?.[requiredPermission] === true) {
                    hasCoHostPermission = true;
                    break; // Found permission, no need to check other brands
                  }
                }
              }
            }
          }
        }
      }

      // Allow access if user is team member, brand owner, has role permission, or has co-host permission
      const hasPermission = isTeamMember || isBrandOwner || hasRolePermission || hasCoHostPermission;

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

// Add public route for adding table code (no authentication)
router.post("/public/add", tableController.addTableCode);

// Add public route for getting table counts (no authentication)
router.get("/public/counts/:eventId", tableController.getTableCounts);

// POST route to add a table code
router.post("/add", authenticate, tableController.addTableCode);

// GET route to fetch table counts for a specific event
router.get("/counts/:eventId", authenticate, checkTablePermissions("access"), tableController.getTableCounts);

// GET route to list available table layouts
router.get("/layouts", authenticate, checkTablePermissions("access"), tableController.getAvailableTableLayouts);

// GET route to view a table code as PNG (for inline viewing)
router.get(
  "/code/:codeId/png",
  authenticate,
  checkTablePermissionsForCode("access"),
  tableController.generateCodeImage
);

// GET route to download a table code as PNG
router.get(
  "/code/:codeId/png-download",
  authenticate,
  checkTablePermissionsForCode("access"),
  tableController.generateCodePNGDownload
);

// GET route to generate a PDF (for email attachment)
router.get("/code/:codeId/pdf", authenticate, checkTablePermissionsForCode("access"), tableController.generateCodePDF);

// POST route to send a table code via email
router.post(
  "/code/:codeId/send",
  authenticate,
  checkTablePermissionsForCode("manage"),
  tableController.sendTableCodeEmail
);

// POST route to send a confirmation email when a public request is approved
router.post(
  "/code/:codeId/confirm",
  authenticate,
  checkTablePermissionsForCode("manage"),
  tableController.sendTableConfirmationEmail
);

// POST route to send a cancellation email when a public request is cancelled
router.post(
  "/code/:codeId/cancel",
  authenticate,
  checkTablePermissionsForCode("manage"),
  tableController.sendTableCancellationEmail
);

// POST route to send a decline email when a public request is declined
router.post(
  "/code/:codeId/decline",
  authenticate,
  checkTablePermissionsForCode("manage"),
  tableController.sendTableDeclinedEmail
);

// POST route to send an update email when a table code details are changed
router.post(
  "/code/:codeId/update",
  authenticate,
  checkTablePermissionsForCode("manage"),
  tableController.sendTableUpdateEmail
);

// POST route to generate a table summary PDF for multiple events
router.post(
  "/summary/generate-pdf",
  authenticate,
  tableController.generateTableSummaryPDF
);

// POST route to generate a minimalistic table plan PDF for VIP staff
router.post(
  "/plan/generate-pdf",
  authenticate,
  checkTablePermissions("access"),
  tableController.generateTablePlanPDF
);

module.exports = router;
