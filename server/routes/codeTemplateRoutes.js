const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { optionalAuthenticateToken } = require("../middleware/auth");

const {
  getCodeTemplates,
  getCodeTemplate,
  createCodeTemplate,
  updateCodeTemplate,
  deleteCodeTemplate,
  reorderCodeTemplates,
  getCodesForEvent,
  getCodeTemplatesForBrand,
  migrateEventCodeSettings,
} = require("../controllers/codeTemplateController");

// Get all code templates for authenticated user
router.get("/", authenticate, getCodeTemplates);

// Reorder templates (must be before :codeId route)
router.put("/reorder", authenticate, reorderCodeTemplates);

// Get codes for a specific event (for EventSettings, public event page)
router.get("/event/:eventId", optionalAuthenticateToken, getCodesForEvent);

// Migrate existing CodeSettings for an event (link them to CodeTemplates)
router.post("/migrate-event/:eventId", authenticate, migrateEventCodeSettings);

// Get all code templates attached to a specific brand (for RoleSetting, permissions)
router.get("/brand/:brandId", authenticate, getCodeTemplatesForBrand);

// Get a single code template with full details
router.get("/:codeId", authenticate, getCodeTemplate);

// Create a new code template
router.post("/", authenticate, createCodeTemplate);

// Update a code template
router.put("/:codeId", authenticate, updateCodeTemplate);

// Delete a code template
router.delete("/:codeId", authenticate, deleteCodeTemplate);

module.exports = router;
