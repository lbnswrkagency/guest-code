const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const codeSettingsController = require("../../controllers/codeSettingsController");

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

// Get all code settings for an event (with optional authentication)
router.get(
  "/events/:eventId",
  optionalAuth,
  codeSettingsController.getCodeSettings
);

// Configure code settings for an event (create or update)
router.put(
  "/events/:eventId",
  authenticate,
  codeSettingsController.configureCodeSettings
);

// Delete a code setting
router.delete(
  "/events/:eventId/:codeSettingId",
  authenticate,
  codeSettingsController.deleteCodeSetting
);

module.exports = router;
