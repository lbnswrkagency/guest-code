const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const ticketSettingsController = require("../../controllers/ticketSettingsController");

// Get all ticket settings for an event
router.get(
  "/events/:eventId",
  authenticate,
  ticketSettingsController.getTicketSettings
);

// Public endpoint for event ticket settings (no authentication)
router.get(
  "/public/events/:eventId",
  ticketSettingsController.getTicketSettings
);

// Create a new ticket setting
router.post(
  "/events/:eventId",
  authenticate,
  ticketSettingsController.createTicketSetting
);

// Update a ticket setting
router.put(
  "/events/:eventId/:ticketId",
  authenticate,
  ticketSettingsController.updateTicketSetting
);

// Delete a ticket setting
router.delete(
  "/events/:eventId/:ticketId",
  authenticate,
  ticketSettingsController.deleteTicketSetting
);

module.exports = router;
