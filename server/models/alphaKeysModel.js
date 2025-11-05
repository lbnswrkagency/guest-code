const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AlphaKeySchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      length: 4,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for code lookups
AlphaKeySchema.index({ code: 1 });

module.exports = mongoose.model("AlphaKey", AlphaKeySchema);
