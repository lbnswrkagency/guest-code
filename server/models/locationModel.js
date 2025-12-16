const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LocationSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true }, // club, bar, restaurant, etc.
    description: { type: String },
    logo: { type: String },
    coverImage: { type: String },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String },
    },
    capacity: { type: Number },
    features: {
      hasParking: { type: Boolean, default: false },
      hasVIP: { type: Boolean, default: false },
      hasSmoking: { type: Boolean, default: false },
      hasOutdoor: { type: Boolean, default: false },
      isWheelchairAccessible: { type: Boolean, default: false },
    },
    contact: {
      email: { type: String },
      phone: { type: String },
      website: { type: String },
    },
    openingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Location", LocationSchema);
