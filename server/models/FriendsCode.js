const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FriendsCodeSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    name: { type: String, required: true },
    host: { type: String, required: true },
    email: { type: String, required: false },
    condition: { type: String, required: true },
    pax: { type: Number, required: true },
    paxChecked: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FriendsCode", FriendsCodeSchema);
