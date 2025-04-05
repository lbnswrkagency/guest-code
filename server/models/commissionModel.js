const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    isGuestPurchase: {
      type: Boolean,
      default: false,
    },
    orderAmount: {
      type: Number,
      required: true,
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 0.02, // 2% commission
    },
    commissionAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paidToUser: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
    },
    invoiceNumber: {
      type: String,
    },
    paymentMethod: {
      type: String,
    },
    notes: {
      type: String,
    },

    // Tax and accounting fields
    fiscalYear: {
      type: Number,
      default: function () {
        return new Date(this.createdAt || Date.now()).getFullYear();
      },
    },
    fiscalQuarter: {
      type: Number,
      default: function () {
        const month = new Date(this.createdAt || Date.now()).getMonth();
        return Math.floor(month / 3) + 1; // 1-4 for quarters
      },
    },
    taxLiability: {
      type: Number,
      default: 0,
    },
    taxJurisdiction: {
      type: String, // Country or state code where tax applies
    },
    isReportedForTax: {
      type: Boolean,
      default: false,
    },

    // Payment processing
    settlementBatchId: {
      type: String, // For grouping commissions paid together
    },
    settlementDate: {
      type: Date,
    },
    paymentReference: {
      type: String, // External payment reference
    },

    // Creator payment details
    creatorPaymentMethod: {
      type: String, // e.g., "bank_transfer", "paypal", etc.
    },
    creatorPaymentDetails: {
      type: mongoose.Schema.Types.Mixed, // JSON object with payment details
    },

    // Transaction fees
    processingFee: {
      type: Number,
      default: 0,
    },
    netAmountPaid: {
      type: Number, // Actual amount paid after fees
    },

    // Accounting classification
    costCenter: {
      type: String,
      default: "commissions", // For accounting categorization
    },
    accountingCategory: {
      type: String,
      default: "revenue_share", // For accounting categorization
    },

    // Reconciliation
    isReconciled: {
      type: Boolean,
      default: false,
    },
    reconciledBy: {
      type: String,
    },
    reconciledDate: {
      type: Date,
    },

    // External accounting system reference
    externalReferenceId: {
      type: String, // For linking to external accounting systems
    },
  },
  { timestamps: true }
);

// Index for efficient queries
commissionSchema.index({ userId: 1 });
commissionSchema.index({ eventId: 1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ fiscalYear: 1, fiscalQuarter: 1 });
commissionSchema.index({ paidToUser: 1 });
commissionSchema.index({ settlementBatchId: 1 });
commissionSchema.index({ orderId: 1 });

module.exports = mongoose.model("Commission", commissionSchema);
