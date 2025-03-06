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

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${userId}`).emit("new_notification", savedNotification);
    }

    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(500).json({
      message: "Error creating notification",
      error: error.message,
    });
  }
};

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;
    const notifications = await Notification.find({
      userId: req.params.userId,
    })
      .populate("brandId", "name username")
      .sort({ createdAt: -1 });

    // Ensure brand data is included in metadata if not already present
    const processedNotifications = notifications.map((notification) => {
      if (
        notification.brandId &&
        notification.metadata &&
        !notification.metadata.brand
      ) {
        return {
          ...notification.toObject(),
          metadata: {
            ...notification.metadata,
            brand: {
              id: notification.brandId._id,
              name: notification.brandId.name,
              username: notification.brandId.username,
            },
          },
        };
      }
      return notification;
    });

    res.json(processedNotifications);
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
    res.status(500).json({ message: "Error updating notification" });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${notification.userId}`).emit(
        "notification_deleted",
        req.params.id
      );
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
