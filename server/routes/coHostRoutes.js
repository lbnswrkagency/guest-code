const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  searchBrands,
  getCoHostedEvents,
  updateEventCoHosts,
  getAvailableCoHosts,
  removeCoHost,
  getCoHostRoles,
  getMainHostCustomCodes,
  saveCoHostPermissions,
  getCoHostPermissions,
  getCoHostDefaultPermissions
} = require("../controllers/coHostController");

// Search brands for co-hosting
router.get("/search", authenticate, searchBrands);

// Get co-hosted events for a brand
router.get("/brand/:brandId/events", authenticate, getCoHostedEvents);

// Get available co-hosts for an event
router.get("/event/:eventId/available", authenticate, getAvailableCoHosts);

// Update co-hosts for an event
router.put("/event/:eventId", authenticate, updateEventCoHosts);

// Remove a co-host from an event
router.delete("/event/:eventId/brand/:brandId", authenticate, removeCoHost);

// Get roles for a co-host brand
router.get("/roles/:brandId", authenticate, getCoHostRoles);

// Get main host's custom codes for an event
router.get("/custom-codes/:eventId", authenticate, getMainHostCustomCodes);

// Save co-host role permissions for an event
router.post("/permissions/:eventId", authenticate, saveCoHostPermissions);

// Get existing co-host permissions for an event
router.get("/permissions/:eventId/:brandId", authenticate, getCoHostPermissions);

// Get co-host brand's default role permissions (for inheritance)
router.get("/default-permissions/:brandId", authenticate, getCoHostDefaultPermissions);

module.exports = router;