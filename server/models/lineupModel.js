const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LineUpSchema = new Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  avatar: { type: String },
  title: { type: String },
  event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
});

module.exports = mongoose.model("LineUp", LineUpSchema);
