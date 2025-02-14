const Notification = require("../models/notificationModel");

exports.createNotification = async (req, res) => {
  try {
    const { userId, type, title, message, metadata } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const notification = new Notification({
      userId,
      type,
      title,
      message,
      metadata: metadata || {},
      read: false,
      createdAt: new Date(),
    });

    const savedNotification = await notification.save();

    // Emit through Socket.IO if available
    const io = req.app.get("io");
    if (io) {
      console.log("[Notification:Create] Emitting new notification", {
        userId,
        notificationId: savedNotification._id,
        room: `user:${userId}`,
        timestamp: new Date().toISOString(),
      });

      io.to(`user:${userId}`).emit("new_notification", savedNotification);
    } else {
      console.log("[Notification:Create] Socket.IO not available");
    }

    res.status(201).json(savedNotification);
  } catch (error) {
    console.error("[Notification:Create] Error:", error);
    res.status(500).json({
      message: "Error creating notification",
      error: error.message,
    });
  }
};

exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${notification.userId}`).emit(
        "notification_updated",
        notification
      );
    }

    res.json(notification);
  } catch (error) {
    console.error("[Notification] Error marking as read:", error.message);
    res.status(500).json({ message: "Error updating notification" });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Emit deletion through Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${notification.userId}`).emit(
        "notification_deleted",
        req.params.id
      );
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: error.message });
  }
};
