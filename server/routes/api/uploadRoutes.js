const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/auth");
const {
  handleImageUpload,
  handleImageDelete,
  handleMultipleUpload,
  handleAvatarUpload,
} = require("../../controllers/uploadController");

// Protected routes - require authentication
router.post("/image", authenticateToken, handleImageUpload);
router.delete("/image", authenticateToken, handleImageDelete);
router.post("/multiple", authenticateToken, handleMultipleUpload);
router.post("/avatar", authenticateToken, handleAvatarUpload);

module.exports = router;
