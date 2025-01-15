const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notificationController");
const { authenticate } = require("../../middleware/authMiddleware");

// Apply authentication middleware to specific routes instead of using router.use()
router.post("/create", authenticate, notificationController.createNotification);
router.get(
  "/user/:userId",
  authenticate,
  notificationController.getUserNotifications
);
router.put("/:id/read", authenticate, notificationController.markAsRead);
router.delete("/:id", authenticate, notificationController.deleteNotification);

module.exports = router;
