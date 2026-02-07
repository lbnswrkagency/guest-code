const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const codeSettingsController = require("../../controllers/codeSettingsController");

// ========================================
// BRAND-LEVEL CODE ROUTES
// These handle codes that apply to all events in a brand
// ========================================

// Get all brand-level codes
router.get(
  "/brands/:brandId/codes",
  authenticate,
  codeSettingsController.getBrandCodes
);

// Create a brand-level code
router.post(
  "/brands/:brandId/codes",
  authenticate,
  codeSettingsController.createBrandCode
);

// Update a brand-level code
router.put(
  "/brands/:brandId/codes/:codeId",
  authenticate,
  codeSettingsController.updateBrandCode
);

// Delete a brand-level code
router.delete(
  "/brands/:brandId/codes/:codeId",
  authenticate,
  codeSettingsController.deleteBrandCode
);

// ========================================
// EVENT-LEVEL CODE ROUTES
// ========================================

// Get all code settings for a brand (legacy - still needed for some components)
router.get(
  "/brands/:brandId",
  authenticate,
  codeSettingsController.getCodeSettingsByBrand
);

// Get all codes for an event (merged: brand-level + event-level)
router.get(
  "/events/:eventId/codes",
  authenticate,
  codeSettingsController.getCodesForEvent
);

// Get all code settings for an event (legacy endpoint)
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
