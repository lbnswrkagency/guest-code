const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const qrController = require("../../controllers/qrController");

// POST route to validate a ticket
router.post("/validate", authenticate, qrController.validateTicket);

// PUT route to increase paxChecked
router.put("/increase/:ticketId", authenticate, qrController.increasePax);

// PUT route to decrease paxChecked
router.put("/decrease/:ticketId", authenticate, qrController.decreasePax);

module.exports = router;
