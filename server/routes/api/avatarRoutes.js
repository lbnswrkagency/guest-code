const express = require("express");
const multer = require("multer");
const avatarController = require("../../controllers/avatarController");
const { authenticate } = require("../../middleware/authMiddleware");
const router = express.Router();

const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fieldSize: 10 * 1024 * 1024,
  },
}).single("profileImage");

const handleUpload = (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          error: "Upload error",
          message: err.message,
        });
      }
      return res.status(500).json({
        error: "Upload failed",
        message: err.message,
      });
    }
    next();
  });
};

router.post(
  "/profile-img-upload",
  authenticate,
  handleUpload,
  avatarController.uploadAvatar
);

router.use((error, req, res, next) => {
  console.error("Route error:", error);
  res.status(500).json({
    error: "Server error",
    message: error.message,
  });
});

module.exports = router;
