const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const backstageController = require("../../controllers/backstageController");

// POST route to add a friend's code
router.post("/add", authenticate, backstageController.addBackstageCode);

module.exports = router;
