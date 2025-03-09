const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const qrController = require("../../controllers/qrController");
const codesController = require("../../controllers/codesController");

// POST route to validate a ticket - now maps to both legacy and new code system
router.post("/validate", authenticate, async (req, res, next) => {
  try {
    // First try the new verification system
    if (req.body.ticketId) {
      // Convert ticketId to code format for the new system
      req.body.code = req.body.ticketId;
    }

    // Try the new verify endpoint
    await codesController.verifyCode(req, res);
  } catch (error) {
    // If it fails, fall back to the legacy system
    console.log("Falling back to legacy QR code system:", error.message);
    qrController.validateTicket(req, res);
  }
});

// PUT route to increase paxChecked - now uses trackCodeUsage from codesController
router.put("/increase/:ticketId", authenticate, async (req, res, next) => {
  try {
    // Prepare payload for the new code system
    req.body = {
      codeId: req.params.ticketId,
      paxUsed: 1,
      location: "Scanner App",
      deviceInfo: req.headers["user-agent"] || "Unknown Device",
    };

    // Try the new endpoint
    await codesController.trackCodeUsage(req, res);
  } catch (error) {
    // Fall back to legacy system
    console.log("Falling back to legacy QR code system:", error.message);
    qrController.increasePax(req, res);
  }
});

// PUT route to decrease paxChecked - now uses trackCodeUsage from codesController
router.put("/decrease/:ticketId", authenticate, async (req, res, next) => {
  try {
    // Prepare payload for the new code system
    req.body = {
      codeId: req.params.ticketId,
      paxUsed: -1,
      location: "Scanner App",
      deviceInfo: req.headers["user-agent"] || "Unknown Device",
    };

    // Try the new endpoint
    await codesController.trackCodeUsage(req, res);
  } catch (error) {
    // Fall back to legacy system
    console.log("Falling back to legacy QR code system:", error.message);
    qrController.decreasePax(req, res);
  }
});

// Keep legacy count endpoints but make them try new endpoints first
router.get("/counts", authenticate, async (req, res, next) => {
  try {
    // First try getting counts from the new code system
    const eventId = req.query.eventId;
    if (eventId) {
      req.params = { eventId };
      await codesController.getCodeCounts(req, res);
    } else {
      throw new Error("EventId required for new code system");
    }
  } catch (error) {
    // Fall back to legacy counts
    console.log("Falling back to legacy count system:", error.message);
    qrController.getCounts(req, res);
  }
});

router.get("/user-counts", authenticate, async (req, res, next) => {
  try {
    // First try getting user counts from the new code system
    const userId = req.query.userId;
    const eventId = req.query.eventId;

    if (userId && eventId) {
      req.params = { userId, eventId };
      await codesController.getUserCodeCounts(req, res);
    } else {
      throw new Error("Both userId and eventId required for new code system");
    }
  } catch (error) {
    // Fall back to legacy user count system
    console.log("Falling back to legacy user count system:", error.message);
    qrController.getUserSpecificCounts(req, res);
  }
});

module.exports = router;
