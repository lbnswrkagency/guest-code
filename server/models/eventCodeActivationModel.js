const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EventCodeActivationSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    codeTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "CodeTemplate", // Updated to reference CodeTemplate (user-level)
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    // For weekly events: should child events inherit this activation?
    applyToChildren: {
      type: Boolean,
      default: true,
    },
    // Event-specific overrides (optional)
    limitOverride: {
      type: Number,
    }, // Override the default limit for this event
    conditionOverride: {
      type: String,
    }, // Override condition for this event
    noteOverride: {
      type: String,
    }, // Override note for this event
    maxPaxOverride: {
      type: Number,
    }, // Override maxPax for this event
  },
  {
    timestamps: true,
  }
);

// Ensure unique combination of event and code template
EventCodeActivationSchema.index(
  { eventId: 1, codeTemplateId: 1 },
  { unique: true }
);

// Index for efficient lookups by event
EventCodeActivationSchema.index({ eventId: 1 });

// Index for efficient lookups by code template
EventCodeActivationSchema.index({ codeTemplateId: 1 });

module.exports = mongoose.model("EventCodeActivation", EventCodeActivationSchema);
