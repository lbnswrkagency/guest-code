const express = require("express");
const router = express.Router();
const { optionalAuthenticateToken } = require("../middleware/auth");
const { getUpcomingEventData } = require("../controllers/allController");

/**
 * Timing middleware for performance tracking
 */
const timingMiddleware = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

/**
 * @route GET /api/all/upcoming-event-data
 * @desc OPTIMIZED: Get comprehensive data for UpcomingEvent component in one request
 * @params brandId OR brandUsername (query parameters)
 * @params limit (optional, default 10)
 * @access Public (with optional authentication for enhanced data)
 */
router.get("/upcoming-event-data", timingMiddleware, optionalAuthenticateToken, getUpcomingEventData);

module.exports = router;