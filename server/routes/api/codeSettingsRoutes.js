const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const codeSettingsController = require("../../controllers/codeSettingsController");

// Get all code settings for an event (with optional authentication)
router.get(
  "/events/:eventId",
  authenticate,
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
