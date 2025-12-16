const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

// Get all notifications for the authenticated user
router.get("/", authenticateToken, notificationController.getUserNotifications);

// Get notifications for a specific user
router.get(
  "/user/:userId",
  authenticateToken,
  notificationController.getUserNotifications
);

// Create a new notification
router.post(
  "/create",
  authenticateToken,
  notificationController.createNotification
);

// Mark a notification as read
router.put("/:id/read", authenticateToken, notificationController.markAsRead);

// Delete a specific notification
router.delete(
  "/:id",
  authenticateToken,
  notificationController.deleteNotification
);

// Delete all notifications for a user (optional)
router.delete(
  "/user/:userId/all",
  authenticateToken,
  notificationController.deleteNotification
);

module.exports = router;
