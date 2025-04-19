const express = require("express");
const router = express.Router();
const ticketSettingsController = require("../controllers/ticketSettingsController");
const authMiddleware = require("../middleware/authMiddleware");

// Get all ticket settings for an event
router.get(
  "/events/:eventId",
  authMiddleware,
  ticketSettingsController.getTicketSettings
);

// Public route to get ticket settings for an event (no auth required)
router.get(
  "/public/events/:eventId",
  ticketSettingsController.getTicketSettings
);

// Create a new ticket setting
router.post(
  "/events/:eventId",
  authMiddleware,
  ticketSettingsController.createTicketSetting
);

// Add the reorder endpoint to update ticket order
// This route MUST come before the /:ticketId routes to avoid conflicts
router.put(
  "/events/:eventId/reorder",
  authMiddleware,
  ticketSettingsController.reorderTickets
);

// Update a ticket setting
router.put(
  "/events/:eventId/:ticketId",
  authMiddleware,
  ticketSettingsController.updateTicketSetting
);

// Delete a ticket setting
router.delete(
  "/events/:eventId/:ticketId",
  authMiddleware,
  ticketSettingsController.deleteTicketSetting
);

module.exports = router;
