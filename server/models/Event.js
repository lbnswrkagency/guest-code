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
  time: { type: String, required: true },
  location: { type: String, required: true },
  guestCode: { type: Boolean, default: false },
  friendsCode: { type: Boolean, default: false },
  ticketCode: { type: Boolean, default: false },
  tableCode: { type: Boolean, default: false },
  carousel: { type: Boolean, default: false },
  link: { type: String, required: true, unique: true },
  guestCodes: [{ type: Schema.Types.ObjectId, ref: "GuestCode" }],
  guestCodeCondition: { type: String, default: "" },
});

module.exports = mongoose.model("Event", EventSchema);
