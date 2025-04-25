const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const tableController = require("../../controllers/tableController");

// Add public route for adding table code (no authentication)
router.post("/public/add", tableController.addTableCode);

// Add public route for getting table counts (no authentication)
router.get("/public/counts/:eventId", tableController.getTableCounts);

// POST route to add a table code
router.post("/add", authenticate, tableController.addTableCode);

// GET route to fetch table counts for a specific event
router.get("/counts/:eventId", authenticate, tableController.getTableCounts);

// GET route to view a table code as PNG (for inline viewing)
router.get(
  "/code/:codeId/png",
  authenticate,
  tableController.generateCodeImage
);

// GET route to download a table code as PNG
router.get(
  "/code/:codeId/png-download",
  authenticate,
  tableController.generateCodePNGDownload
);

// GET route to generate a PDF (for email attachment)
router.get("/code/:codeId/pdf", authenticate, tableController.generateCodePDF);

// POST route to send a table code via email
router.post(
  "/code/:codeId/send",
  authenticate,
  tableController.sendTableCodeEmail
);

// POST route to send a confirmation email when a public request is approved
router.post(
  "/code/:codeId/confirm",
  authenticate,
  tableController.sendTableConfirmationEmail
);

// POST route to send a cancellation email when a public request is cancelled
router.post(
  "/code/:codeId/cancel",
  authenticate,
  tableController.sendTableCancellationEmail
);

// POST route to send a decline email when a public request is declined
router.post(
  "/code/:codeId/decline",
  authenticate,
  tableController.sendTableDeclinedEmail
);

// POST route to send an update email when a table code details are changed
router.post(
  "/code/:codeId/update",
  authenticate,
  tableController.sendTableUpdateEmail
);

module.exports = router;
