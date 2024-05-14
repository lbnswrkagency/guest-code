const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BrandSchema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  logo: { type: String }, // URL to the logo on S3
  events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
});

module.exports = mongoose.model("Brand", BrandSchema);
