const express = require("express");
const router = express.Router();
const { verifyAlphaKey } = require("../controllers/alphaKeysController");
const { authenticateToken } = require("../middleware/auth");

// Route to verify an alpha key
router.post("/verify", authenticateToken, verifyAlphaKey);

module.exports = router;
