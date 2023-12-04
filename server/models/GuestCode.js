const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GuestCodeSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    name: { type: String, required: true },
    email: { type: String, required: true },
    condition: { type: String, required: true },
    pax: { type: Number, required: true },
    paxChecked: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GuestCode", GuestCodeSchema);
