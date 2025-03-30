const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const tableController = require("../../controllers/tableController");

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

module.exports = router;
