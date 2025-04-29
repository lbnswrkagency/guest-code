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

// Combine update routes - use query param ?action=reorder for reordering
router.put("/events/:eventId", authMiddleware, (req, res, next) => {
  // If action is reorder, use reorderTickets controller
  if (req.query.action === "reorder") {
    return ticketSettingsController.reorderTickets(req, res, next);
  }
  // Otherwise pass to next handler
  next();
});

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

// Toggle ticket visibility
router.patch(
  "/events/:eventId/:ticketId/toggle-visibility",
  authMiddleware,
  ticketSettingsController.toggleTicketVisibility
);

module.exports = router;
