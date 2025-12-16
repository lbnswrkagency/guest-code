const mongoose = require("mongoose");

/**
 * Revenue Sharing Model - Defines how revenue is shared between platform and event organizers
 * Used for determining commission rates for ticket sales
 */
const revenueSharingSchema = new mongoose.Schema(
  {
    // These can be null for global settings
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: false, // Null means global default
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: false, // Null means global default
    },

    // Commission structure (always sums to 100%)
    platformCommissionRate: {
      type: Number,
      required: true,
      default: 2, // 2% for platform (GuestCode)
      min: 0,
      max: 100,
    },
    brandCommissionRate: {
      type: Number,
      required: true,
      default: 98, // 98% for brand/event organizer
      min: 0,
      max: 100,
    },

    // Tax settings
    includeVAT: {
      type: Boolean,
      default: true, // If true, commission is calculated after VAT
    },
    vatRate: {
      type: Number,
      default: 0, // Will be set based on jurisdiction
    },

    // Payment terms
    paymentTerms: {
      type: String,
      enum: ["immediate", "net7", "net15", "net30", "net60", "monthly"],
      default: "net30",
    },
    minimumPayoutAmount: {
      type: Number,
      default: 50, // Minimum amount before payout is processed
      min: 0,
    },

    // Activation settings
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
    },

    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Create a validator to ensure rates add up to 100%
revenueSharingSchema.pre("save", function (next) {
  const totalRate = this.platformCommissionRate + this.brandCommissionRate;
  if (totalRate !== 100) {
    return next(new Error("Commission rates must sum to 100%"));
  }
  next();
});

// Create indexes for efficient queries
revenueSharingSchema.index({ eventId: 1 });
revenueSharingSchema.index({ brandId: 1 });
revenueSharingSchema.index({ isActive: 1 });

module.exports = mongoose.model("RevenueSharing", revenueSharingSchema);
