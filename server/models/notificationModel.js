const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "info",
      "success",
      "warning",
      "error",
      "color_change",
      "join_request",
      "join_request_accepted",
      "join_request_rejected",
      "new_follower",
      "table_request",
      "table_request_confirmed",
      "table_request_declined",
      "table_request_cancelled",
      "media_uploaded",
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JoinRequest",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ brandId: 1, type: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
