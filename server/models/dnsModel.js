const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DnsSchema = new Schema({
  event: { type: Schema.Types.ObjectId, ref: "Event" },
  customDomain: { type: String, required: true },
  verificationToken: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DNS", DnsSchema);
