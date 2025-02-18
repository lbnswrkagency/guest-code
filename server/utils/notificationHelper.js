const Notification = require("../models/notificationModel");

const createSystemNotification = async ({
  userId,
  type,
  title,
  message,
  metadata = {},
  brandId = null,
  requestId = null,
}) => {
  try {
    console.log("[NotificationHelper] Creating notification:", {
      userId,
      type,
      title,
      timestamp: new Date().toISOString(),
    });

    const notification = new Notification({
      userId,
      type,
      title,
      message,
      metadata,
      brandId,
      requestId,
      read: false,
      createdAt: new Date(),
    });

    const savedNotification = await notification.save();

    // Get the io instance
    const io = global.io;

    if (io) {
      console.log("[NotificationHelper] Emitting via socket:", {
        room: `user:${userId}`,
        notificationId: savedNotification._id,
      });
      io.to(`user:${userId}`).emit("new_notification", savedNotification);
    }

    return savedNotification;
  } catch (error) {
    console.error("[NotificationHelper] Error creating notification:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Example usage:
// await createSystemNotification({
//   userId: user._id,
//   type: 'join_request',
//   title: 'New Join Request',
//   message: `@${requester.username} wants to join your brand`,
//   metadata: { requester },
//   brandId: brand._id,
//   requestId: joinRequest._id
// });

module.exports = {
  createSystemNotification,
};
