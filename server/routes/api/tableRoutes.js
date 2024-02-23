const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const tableController = require("../../controllers/tableController");

// POST route to add a table code
router.post("/add", authenticate, tableController.addTableCode);

module.exports = router;
