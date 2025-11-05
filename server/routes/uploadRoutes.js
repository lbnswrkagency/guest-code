const express = require("express");
const router = express.Router();
const {
  handleImageUpload,
  handleImageDelete,
} = require("../controllers/uploadController");
const { authenticateToken } = require("../middleware/auth");

// Protected routes - require authentication
router.post("/image", authenticateToken, handleImageUpload);
router.delete("/image", authenticateToken, handleImageDelete);

module.exports = router;
