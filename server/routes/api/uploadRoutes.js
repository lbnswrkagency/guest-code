const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/auth");
const {
  handleImageUpload,
  handleImageDelete,
  handleMultipleUpload,
} = require("../../controllers/uploadController");

// Protected routes - require authentication
router.post("/image", authenticateToken, handleImageUpload);
router.delete("/image", authenticateToken, handleImageDelete);
router.post("/multiple", authenticateToken, handleMultipleUpload);

module.exports = router;
