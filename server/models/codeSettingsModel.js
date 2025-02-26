const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CodeSettingsSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["guest", "friends", "ticket", "table", "backstage", "custom"],
      required: true,
    },
    condition: {
      type: String,
      default: "",
    },
    maxPax: {
      type: Number,
      default: 1,
    },
    limit: {
      type: Number,
      default: 0,
    }, // 0 means unlimited
    isEnabled: {
      type: Boolean,
      default: true,
    },
    isEditable: {
      type: Boolean,
      default: false,
    }, // Whether name can be edited
    // Additional fields for specific code types
    price: {
      type: Number,
    }, // For ticket codes
    tableNumber: {
      type: String,
    }, // For table codes
  },
  {
    timestamps: true,
  }
);

// Create a compound index to ensure uniqueness of non-custom code types per event
CodeSettingsSchema.index(
  { eventId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: { $ne: "custom" } },
  }
);

module.exports = mongoose.model("CodeSettings", CodeSettingsSchema);
