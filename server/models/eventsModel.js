const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    title: { type: String, required: true },
    subTitle: { type: String },
    description: { type: String },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String, required: true },
    flyer: {
      landscape: {
        thumbnail: String,
        medium: String,
        full: String,
      },
      portrait: {
        thumbnail: String,
        medium: String,
        full: String,
      },
      square: {
        thumbnail: String,
        medium: String,
        full: String,
      },
    },
    guestCode: { type: Boolean, default: false },
    friendsCode: { type: Boolean, default: false },
    ticketCode: { type: Boolean, default: false },
    tableCode: { type: Boolean, default: false },
    link: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Event", EventSchema);
