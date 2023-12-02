const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");

const {
  verifyCustomDomain,
  updateCustomDomain,
} = require("../../controllers/dnsController.js");

// Verify custom domain
router.post("/verify", authenticate, verifyCustomDomain);

// Update custom domain settings
router.put("/update", authenticate, updateCustomDomain);

module.exports = router;
