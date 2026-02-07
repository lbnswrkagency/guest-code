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

// Combine update routes - use query param ?action=reorder for reordering
router.put("/events/:eventId", authenticate, (req, res, next) => {
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
  authenticate,
  ticketSettingsController.updateTicketSetting
);

// Delete a ticket setting
router.delete(
  "/events/:eventId/:ticketId",
  authenticate,
  ticketSettingsController.deleteTicketSetting
);

// Toggle ticket visibility
router.patch(
  "/events/:eventId/:ticketId/toggle-visibility",
  authenticate,
  ticketSettingsController.toggleTicketVisibility
);

// =====================================================
// Brand-level ticket routes
// =====================================================

// Get all brand-level tickets
router.get(
  "/brands/:brandId/tickets",
  authenticate,
  ticketSettingsController.getBrandTickets
);

// Create brand-level ticket
router.post(
  "/brands/:brandId/tickets",
  authenticate,
  ticketSettingsController.createBrandTicket
);

// Update brand-level ticket
router.put(
  "/brands/:brandId/tickets/:ticketId",
  authenticate,
  ticketSettingsController.updateBrandTicket
);

// Delete brand-level ticket
router.delete(
  "/brands/:brandId/tickets/:ticketId",
  authenticate,
  ticketSettingsController.deleteBrandTicket
);

module.exports = router;
