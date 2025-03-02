const express = require("express");
const router = express.Router();
const { checkOutSession } = require("../../controllers/stripeController");
const { authenticateToken } = require("../../middleware/auth");

// Create checkout session
router.post("/create-checkout-session", checkOutSession);

module.exports = router;
