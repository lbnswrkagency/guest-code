const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { protect } = require("../middleware/authMiddleware");

// Get user's tickets
router.get("/my-tickets", protect, ticketController.getUserTickets);

// Validate a ticket (for scanning)
router.post(
  "/validate/:securityToken",
  protect,
  ticketController.validateTicket
);

// Create tickets directly (for pay-at-entrance option) - no auth required for public access
router.post("/create-direct", ticketController.createDirectTickets);

module.exports = router;
