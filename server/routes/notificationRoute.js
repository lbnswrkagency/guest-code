const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.post("/create", notificationController.createNotification);
router.get("/user/:userId", notificationController.getUserNotifications);
router.put("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
