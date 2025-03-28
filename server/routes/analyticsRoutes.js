const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { authenticate } = require("../middleware/authMiddleware");

// All analytics routes require authentication
router.use(authenticate);

// Get analytics summary for an event
router.get("/summary", analyticsController.getAnalyticsSummary);

module.exports = router;
