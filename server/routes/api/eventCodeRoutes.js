const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const { optionalAuthenticateToken } = require("../../middleware/auth");

const {
  getEventCodes,
  toggleEventCode,
  bulkActivateEventCodes,
  updateCodeOverrides,
  clearCodeOverrides,
} = require("../../controllers/eventCodeActivationController");

// Get all activated codes for an event
router.get("/:eventId", optionalAuthenticateToken, getEventCodes);

// Toggle a code template on/off for an event
router.post("/:eventId/toggle", authenticate, toggleEventCode);

// Bulk activate multiple code templates
router.post("/:eventId/bulk-activate", authenticate, bulkActivateEventCodes);

// Update event-specific overrides for a code
router.put("/:eventId/overrides/:activationId", authenticate, updateCodeOverrides);

// Clear all overrides for a code
router.delete("/:eventId/overrides/:activationId", authenticate, clearCodeOverrides);

module.exports = router;
