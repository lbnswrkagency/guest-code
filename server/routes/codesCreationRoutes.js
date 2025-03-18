const express = require("express");
const router = express.Router();
const {
  getCodePDF,
  getCodeView,
  getCodeImage,
  getCodePNG,
  getCodePNGDownload,
} = require("../controllers/codesCreationController");
const { protect } = require("../middleware/authMiddleware");

// Route to get code PDF for download
router.get("/:codeId/pdf", protect, getCodePDF);

// Route to view code PDF in browser
router.get("/:codeId/view", protect, getCodeView);

// Route to get code as PNG for fullscreen viewing
router.get("/:codeId/png", protect, getCodePNG);

// Route to download code as PNG
router.get("/:codeId/png-download", protect, getCodePNGDownload);

// Route to get code image (QR code)
router.get("/:codeId/image", protect, getCodeImage);

module.exports = router;
