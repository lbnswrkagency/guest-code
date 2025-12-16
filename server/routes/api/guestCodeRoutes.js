const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const { optionalAuthenticateToken } = require("../../middleware/auth");
const {
  generateGuestCode,
  validateGuestCode,
  getGuestCodePDF,
} = require("../../controllers/guestCodeController");

// Guest code routes - use optionalAuthenticateToken to allow both authenticated and non-authenticated requests
router.post("/generate", optionalAuthenticateToken, generateGuestCode);
router.get("/validate/:securityToken", validateGuestCode);
router.get("/pdf/:codeId", getGuestCodePDF);

module.exports = router;
