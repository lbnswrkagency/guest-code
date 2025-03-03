const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const {
  generateGuestCode,
  validateGuestCode,
  getGuestCodePDF,
} = require("../../controllers/guestCodeController");

// Guest code routes
router.post("/generate", generateGuestCode);
router.get("/validate/:securityToken", validateGuestCode);
router.get("/pdf/:codeId", getGuestCodePDF);

module.exports = router;
