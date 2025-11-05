const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const qrController = require("../../controllers/qrController");
const codesController = require("../../controllers/codesController");

// POST route to validate a ticket - now directly uses qrController
router.post("/validate", authenticate, qrController.validateTicket);

// PUT route to increase paxChecked
router.put("/increase/:ticketId", authenticate, qrController.increasePax);

// PUT route to decrease paxChecked
router.put("/decrease/:ticketId", authenticate, qrController.decreasePax);

// New route for ticket model check-in/check-out
router.put(
  "/tickets/:ticketId/update-pax",
  authenticate,
  qrController.updateTicketPax
);

// Add route for Code model check-in/check-out
router.put(
  "/codes/:ticketId/update-pax",
  authenticate,
  qrController.updateCodePax
);

// Add route for TableCode model check-in/check-out
router.put(
  "/tablecodes/:ticketId/update-pax",
  authenticate,
  qrController.updateTableCodePax
);

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
