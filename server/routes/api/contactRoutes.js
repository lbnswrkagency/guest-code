const express = require("express");
const router = express.Router();
const contactController = require("../../controllers/contactController");

// POST route to send contact form data
router.post("/send", contactController.sendContactForm);

module.exports = router;
