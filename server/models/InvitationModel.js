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
    // Legacy GuestCode reference (optional)
    guestCode: {
      type: Schema.Types.ObjectId,
      ref: "GuestCode",
      required: false,
    },
    // New codesModel reference (optional)
    code: {
      type: Schema.Types.ObjectId,
      ref: "Code",
      required: false,
    },
  },
  { timestamps: true }
);

// Add validation to ensure either guestCode OR code is provided (but not both)
InvitationCodeSchema.pre('save', function(next) {
  if (!this.guestCode && !this.code) {
    return next(new Error('Either guestCode or code reference must be provided'));
  }
  if (this.guestCode && this.code) {
    return next(new Error('Cannot reference both guestCode and code - use only one'));
  }
  next();
});

module.exports = mongoose.model("InvitationCode", InvitationCodeSchema);
