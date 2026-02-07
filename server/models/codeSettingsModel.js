const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CodeSettingsSchema = new Schema(
  {
    // Brand this code belongs to (required for all codes)
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    // Event this code is for (null = brand-level code that applies to all events)
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    // If true and eventId is null, this code applies to all events in the brand
    isGlobalForBrand: {
      type: Boolean,
      default: false,
    },
    // User who created this code
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      // Default types: guest, ticket
      // Legacy types still supported: friends, table, backstage
      // Custom types can be added by users
      enum: ["guest", "ticket", "friends", "table", "backstage", "custom"],
      required: true,
    },
    condition: {
      type: String,
      default: "",
    },
    note: {
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
    color: {
      type: String,
      default: "#2196F3",
      validate: {
        validator: function (v) {
          return /^#[0-9A-Fa-f]{6}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid hex color!`,
      },
    },
    // Icon field to store the React icon name
    icon: {
      type: String,
      default: "RiCodeLine",
    },
    // Contact information requirements for guest codes
    requireEmail: {
      type: Boolean,
      default: true,
    }, // Whether email is required for guest code generation
    requirePhone: {
      type: Boolean,
      default: false,
    }, // Whether phone number is required for guest code generation
    // Additional fields for specific code types
    price: {
      type: Number,
    }, // For ticket codes
    tableNumber: {
      type: String,
    }, // For table codes
    // Link to CodeTemplate (for codes created from the new template system)
    codeTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "CodeTemplate",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique code names per brand/event combination
// For brand-level codes (eventId: null), name must be unique within brand
// For event-level codes, name must be unique within that event
CodeSettingsSchema.index(
  { brandId: 1, eventId: 1, name: 1 },
  { unique: true }
);

// Index for efficient queries by brand
CodeSettingsSchema.index({ brandId: 1, isGlobalForBrand: 1 });

// Keep legacy index for backward compatibility during migration
CodeSettingsSchema.index(
  { eventId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: { $ne: "custom" } },
    sparse: true,
  }
);

module.exports = mongoose.model("CodeSettings", CodeSettingsSchema);
