const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { authenticateToken } = require("../middleware/auth");

// All settings routes require authentication
router.use(authenticateToken);

// --- User Settings ---
router.get("/user", settingsController.getUserSettings); // Placeholder
router.put("/user/profile", settingsController.updateUserProfile); // Placeholder
router.put("/user/password", settingsController.changePassword); // Placeholder

// --- Brand Meta Pixel (Removed - Belongs in brand routes) ---
// router.put("/brand/metapixel", settingsController.updateBrandMetaPixel);

module.exports = router;
