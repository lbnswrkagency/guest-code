const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BattleSignSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String },
    categories: [
      { type: String, enum: ["allStyles", "afroStyles", "dancehall"] },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BattleSign", BattleSignSchema);
