const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BattleSignSchema = new Schema(
  {
    // Primary contact person (always required)
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    instagram: { type: String }, // Instagram username
    
    // Additional participants for team battles (2vs2, crew battles, etc.)
    participants: [{
      name: { type: String, required: true },
      instagram: { type: String },
    }],
    
    message: { type: String },
    // Link to the specific event this battle signup is for
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    // Dynamic categories - no longer hardcoded enum
    categories: [{ type: String, required: true }],
    status: {
      type: String,
      enum: ["pending", "confirmed", "declined"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Add index for efficient event-based queries
BattleSignSchema.index({ event: 1 });
BattleSignSchema.index({ event: 1, status: 1 });

module.exports = mongoose.model("BattleSign", BattleSignSchema);
