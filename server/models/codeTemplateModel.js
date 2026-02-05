const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * CodeTemplate - User-level code template
 *
 * A code template belongs to a USER (not a brand).
 * One template can be attached to multiple brands via CodeBrandAttachment.
 *
 * Example: A user creates "Friends Code" template once, then attaches it
 * to Brand A, Brand B, and Brand C.
 */
const CodeTemplateSchema = new Schema(
  {
    userId: {
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
      default: "custom", // All codes are "custom" now
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
    defaultLimit: {
      type: Number,
      default: 0, // 0 = unlimited
    },
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
    icon: {
      type: String,
      default: "RiCodeLine",
    },
    requireEmail: {
      type: Boolean,
      default: true,
    },
    requirePhone: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique name per user
CodeTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("CodeTemplate", CodeTemplateSchema);
