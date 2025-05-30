const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  memberNumber: {
    type: String,
    required: true,
    unique: true,
    match: [/^\d{5}$/, "Member number must be 5 digits"],
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  pax: {
    type: Number,
    default: 3,
  },
  paxChecked: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  // Optional: Link to a brand or event if members are specific
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
  },
  // eventId: { // If check-ins should be logged per event for a member
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Event'
  // },
  lastCheckInEventId: {
    // To know at which event the last check-in happened
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

memberSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
