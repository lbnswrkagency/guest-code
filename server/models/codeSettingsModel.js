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

// Create a compound index to ensure uniqueness of non-custom code types per event
CodeSettingsSchema.index(
  { eventId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: { $ne: "custom" } },
  }
);

module.exports = mongoose.model("CodeSettings", CodeSettingsSchema);
