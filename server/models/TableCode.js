// TableCodeSchema.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TableCodeSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    name: { type: String, required: true },
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TableCode", TableCodeSchema);
