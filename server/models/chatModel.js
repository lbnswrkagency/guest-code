const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["global", "direct"],
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
