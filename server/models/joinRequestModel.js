const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const JoinRequestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    message: { type: String }, // Optional message from the user
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only have one pending request per brand
JoinRequestSchema.index({ user: 1, brand: 1 }, { unique: true });

module.exports = mongoose.model("JoinRequest", JoinRequestSchema);
