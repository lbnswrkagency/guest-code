const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const codesController = require("../../controllers/codesController");

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  // Try to authenticate, but continue even if it fails
  try {
    authenticate(req, res, (err) => {
      // Continue to the next middleware regardless of authentication result
      next();
    });
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Code Settings Routes
// Get all code settings for an event (with optional authentication)
router.get(
  "/settings/events/:eventId",
  optionalAuth,
  codesController.getCodeSettings
);

// Configure code settings for an event (create or update)
router.put(
  "/settings/events/:eventId",
  authenticate,
  codesController.configureCodeSettings
);

// Delete a code setting
router.delete(
  "/settings/events/:eventId/:codeSettingId",
  authenticate,
  codesController.deleteCodeSetting
);

// Code Instance Routes
// Create a new code
router.post("/create", authenticate, codesController.createCode);

// Create a new dynamic code with enhanced features
router.post("/create-dynamic", authenticate, codesController.createDynamicCode);

// Backward compatibility route for existing frontend requests
router.post("/generate", authenticate, codesController.createDynamicCode);

// Get all codes for an event
router.get(
  "/events/:eventId/:type?",
  optionalAuth,
  codesController.getEventCodes
);

// Get code counts for an event
router.get("/counts/:eventId", optionalAuth, codesController.getCodeCounts);

// Get a specific code
router.get("/:id", optionalAuth, codesController.getCode);

// Update a code
router.put("/:codeId", authenticate, codesController.updateCode);

// Delete a code
router.delete("/:codeId", authenticate, codesController.deleteCode);

// Generate QR code image for a code
router.get("/:codeId/image", authenticate, codesController.generateCodeImage);

// Verify a code
router.post("/verify", authenticate, codesController.verifyCode);

// Track detailed usage of a code
router.post("/:codeId/usage", authenticate, codesController.trackCodeUsage);

// Add a new route for fetching user-specific code counts
router.get(
  "/user-counts/:eventId/:userId",
  authenticate,
  codesController.getUserCodeCounts
);

console.log("✅ Registered route: GET /codes/user-counts/:eventId/:userId");

module.exports = router;
