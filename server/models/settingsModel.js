const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Placeholder for future user-specific settings if needed
const SettingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Example setting:
    // theme: { type: String, default: 'dark' },
    // Add other user-specific settings here
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Settings", SettingsSchema);
