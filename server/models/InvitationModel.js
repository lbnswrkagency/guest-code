const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InvitationCodeSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    condition: { type: String, required: true },
    pax: { type: Number, required: true },
    paxChecked: { type: Number, required: true, default: 0 },
    guestCode: {
      type: Schema.Types.ObjectId,
      ref: "GuestCode",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InvitationCode", InvitationCodeSchema);
