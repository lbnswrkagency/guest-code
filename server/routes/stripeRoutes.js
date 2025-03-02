const express = require("express");
const { checkOutSession } = require("../controllers/stripeController");
const router = express.Router();

router.post("/create-checkout-session", checkOutSession);

module.exports = router;
