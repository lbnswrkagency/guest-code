const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["global", "private"],
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          default: "text",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Add index for better query performance
ChatSchema.index({ participants: 1 });
ChatSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Chat", ChatSchema);
