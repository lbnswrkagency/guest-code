const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const codesController = require("../../controllers/codesController");
const Code = require("../../models/codesModel");

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

// Send a code by email
router.post("/:codeId/email", authenticate, codesController.sendCodeByEmail);

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

// Find a code by security token
router.post(
  "/findBySecurityToken",
  authenticate,
  codesController.findBySecurityToken
);

// Get codes by event, user, and specific code settings
router.post(
  "/event-user-codes",
  authenticate,
  codesController.getEventUserCodes
);

// Add route for updating paxChecked
router.put("/:id/update-pax", authenticate, async (req, res) => {
  try {
    const codeId = req.params.id;
    const { increment = true, eventId } = req.body;

    console.log(`Code update-pax: ID=${codeId}, increment=${increment}`);

    // Find the code
    const code = await Code.findById(codeId);

    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // Check if code belongs to eventId if provided
    if (eventId && code.eventId && code.eventId.toString() !== eventId) {
      return res.status(400).json({
        message: "This code belongs to a different event",
      });
    }

    // Check if code is active
    if (code.status !== "active") {
      return res.status(400).json({
        message: `Code is ${code.status}`,
        status: code.status,
      });
    }

    // Update paxChecked
    if (increment) {
      // Don't exceed maxPax
      if (code.paxChecked >= code.maxPax) {
        return res.status(400).json({
          message: "Maximum capacity reached",
          paxChecked: code.paxChecked,
          maxPax: code.maxPax,
        });
      }
      code.paxChecked += 1;
    } else {
      // Don't go below 0
      if (code.paxChecked <= 0) {
        return res.status(400).json({
          message: "No check-ins to remove",
          paxChecked: code.paxChecked,
        });
      }
      code.paxChecked -= 1;
    }

    // Record usage entry
    code.usage.push({
      timestamp: new Date(),
      paxUsed: increment ? 1 : -1,
      userId: req.user._id,
      deviceInfo: req.headers["user-agent"] || "Unknown device",
    });

    // Update usageCount for metrics
    if (increment) {
      code.usageCount += 1;
    }

    // Save changes
    await code.save();

    console.log(
      `Updated paxChecked to ${code.paxChecked} for code ${code.code}`
    );

    // Return updated code
    return res.status(200).json({
      _id: code._id,
      code: code.code,
      type: code.type,
      maxPax: code.maxPax,
      paxChecked: code.paxChecked,
      status: code.status,
      updatedAt: code.updatedAt,
    });
  } catch (error) {
    console.error("Error updating paxChecked:", error);
    return res
      .status(500)
      .json({ message: "Server error updating paxChecked" });
  }
});

module.exports = router;
