// TableCodeSchema.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TableCodeSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String },
    host: { type: String, required: true },
    pax: { type: Number, required: true },
    paxChecked: { type: Number, required: true },
    tableNumber: { type: String, required: true },
    hostId: { type: Schema.Types.ObjectId, ref: "User" },
    backstagePass: { type: Boolean, default: false },
    condition: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "declined", "cancelled"],
      default: "pending",
    },
    statusChangedBy: { type: Schema.Types.ObjectId, ref: "User" },
    statusChangedAt: { type: Date },
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

module.exports = mongoose.model("TableCode", TableCodeSchema);
