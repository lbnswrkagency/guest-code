const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CodeSettingsSchema = new Schema(
  {
    // Brand this code belongs to (null for user-level codes not yet attached to a brand)
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
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
    // User who created this code (always required - codes belong to users)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  },
  {
    timestamps: true,
  }
);

// Compound index for unique code names per brand/event combination (brand-level codes only)
// For brand-level codes (eventId: null), name must be unique within brand
// For event-level codes, name must be unique within that event
// Partial: only applies when brandId is not null (user-level codes use a separate index)
CodeSettingsSchema.index(
  { brandId: 1, eventId: 1, name: 1 },
  { unique: true, partialFilterExpression: { brandId: { $type: "objectId" } } }
);

// Unique index for user-level codes (no brand attached)
// Each user can only have one code with a given name when brandId is null
// Also requires createdBy to be a valid ObjectId to avoid conflicts with legacy codes
// that have both brandId: null AND createdBy: null
CodeSettingsSchema.index(
  { createdBy: 1, name: 1 },
  { unique: true, partialFilterExpression: { brandId: null, createdBy: { $type: "objectId" } } }
);

// Index for efficient queries by brand
CodeSettingsSchema.index({ brandId: 1, isGlobalForBrand: 1 });

// Non-unique index on eventId+type for efficient queries (legacy compatibility)
// Uniqueness is now enforced by the brandId+eventId+name compound index above
CodeSettingsSchema.index({ eventId: 1, type: 1 });

module.exports = mongoose.model("CodeSettings", CodeSettingsSchema);
