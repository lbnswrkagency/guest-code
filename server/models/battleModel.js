// BattleCodeSchema.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BattleCodeSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    // Primary contact person
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true },
    phone: { type: String },
    instagram: { type: String }, // Instagram username
    
    // Additional participants for team battles
    participants: [{
      name: { type: String, required: true },
      instagram: { type: String },
    }],
    
    categories: [{ type: String, required: true }], // Battle categories they're participating in
    message: { type: String }, // Optional message from participant
    battleSignId: { type: Schema.Types.ObjectId, ref: "BattleSign" }, // Reference to original signup
    status: {
      type: String,
      enum: ["pending", "confirmed", "declined", "cancelled"],
      default: "pending",
    },
    code: { type: String, unique: true },
    qrCodeData: { type: String },
    securityToken: { type: String },
    emailedTo: [
      {
        email: { type: String },
        sentAt: { type: Date, default: Date.now },
      },
    ],
    isPublic: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BattleCode", BattleCodeSchema);