const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EventSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  title: { type: String, required: true },
  subTitle: { type: String },
  text: { type: String },
  flyer: {
    instagramStory: { type: String },
    squareFormat: { type: String },
    landscape: { type: String },
  },
  video: {
    instagramStory: { type: String },
    squareFormat: { type: String },
    landscape: { type: String },
  },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  location: { type: String, required: true },
  guestCode: { type: Boolean, default: false },
  friendsCode: { type: Boolean, default: false },
  ticketCode: { type: Boolean, default: false },
  tableCode: { type: Boolean, default: false },
  carousel: { type: Boolean, default: false },
  link: { type: String, required: true, unique: true },

  guestCodeCondition: { type: String, default: "" },
  logo: { type: String },

  // New Page Content Structure
  page: {
    navigation: {
      activated: { type: Boolean, default: false },
    },
    header: {
      activated: { type: Boolean, default: false },
    },
    lineup: {
      activated: { type: Boolean, default: false },
    },
    event: {
      activated: { type: Boolean, default: false },
    },
    explain: {
      activated: { type: Boolean, default: false },
    },
    slider: {
      activated: { type: Boolean, default: false },
    },
    guestcode: {
      activated: { type: Boolean, default: false },
    },
    aboutus: {
      activated: { type: Boolean, default: false },
    },
    social: {
      activated: { type: Boolean, default: false },
      instagram: { type: String },
      tiktok: { type: String },
      title: { type: String },
    },
    location: {
      activated: { type: Boolean, default: false },
    },
    spotify: {
      activated: { type: Boolean, default: false },
    },
    contact: {
      activated: { type: Boolean, default: false },
    },
  },

  brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
  location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  series: {
    isRecurring: { type: Boolean, default: false },
    parentEvent: { type: Schema.Types.ObjectId, ref: "Event" },
    recurrencePattern: {
      frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
      dayOfWeek: { type: Number }, // 0-6 for Sunday-Saturday
      endDate: { type: Date },
    },
  },
  team: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["host", "promoter", "staff", "security"] },
    },
  ],
});

module.exports = mongoose.model("Event", EventSchema);
