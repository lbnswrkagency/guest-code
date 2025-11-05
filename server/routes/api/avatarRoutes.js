const express = require("express");
const multer = require("multer");
const avatarController = require("../../controllers/avatarController");
const { authenticateToken } = require("../../middleware/auth");
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
  console.log("[AvatarRoutes] Starting upload process", {
    headers: req.headers,
    userId: req.user?._id,
    hasFile: !!req.file,
    timestamp: new Date().toISOString(),
  });

  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error("[AvatarRoutes] Upload middleware error:", {
        error: err.message,
        code: err.code,
        field: err.field,
        timestamp: new Date().toISOString(),
      });

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
    console.log("[AvatarRoutes] Upload middleware success", {
      userId: req.user?._id,
      fileSize: req.file?.size,
      timestamp: new Date().toISOString(),
    });
    next();
  });
};

// Log authentication status before the actual route
router.use((req, res, next) => {
  console.log("[AvatarRoutes] Pre-auth check:", {
    hasAuthHeader: !!req.headers.authorization,
    authHeader: req.headers.authorization,
    userId: req.user?._id,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
  next();
});

router.post(
  "/profile-img-upload",
  authenticateToken,
  (req, res, next) => {
    console.log("[AvatarRoutes] Post-auth check:", {
      userId: req.user?._id,
      isAuthenticated: !!req.user,
      timestamp: new Date().toISOString(),
    });
    next();
  },
  handleUpload,
  avatarController.uploadAvatar
);

router.use((error, req, res, next) => {
  console.error("[AvatarRoutes] Route error:", {
    error: error.message,
    stack: error.stack,
    userId: req.user?._id,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
  res.status(500).json({
    error: "Server error",
    message: error.message,
  });
});

module.exports = router;
