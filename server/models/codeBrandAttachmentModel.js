const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * CodeBrandAttachment - Links code templates to brands
 *
 * When a user attaches their code template to a brand:
 * - isGlobalForBrand: true = code applies to ALL events in that brand
 * - isGlobalForBrand: false = code only applies to specific events
 *   (use EventCodeActivation to specify which events)
 */
const CodeBrandAttachmentSchema = new Schema(
  {
    codeTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "CodeTemplate",
      required: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    isGlobalForBrand: {
      type: Boolean,
      default: true, // Apply to all events in this brand by default
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique attachment per code-brand pair
CodeBrandAttachmentSchema.index(
  { codeTemplateId: 1, brandId: 1 },
  { unique: true }
);

// Index for efficient lookups by brand
CodeBrandAttachmentSchema.index({ brandId: 1 });

// Index for efficient lookups by code template
CodeBrandAttachmentSchema.index({ codeTemplateId: 1 });

module.exports = mongoose.model("CodeBrandAttachment", CodeBrandAttachmentSchema);
