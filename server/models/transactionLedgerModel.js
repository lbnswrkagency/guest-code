const mongoose = require("mongoose");

/**
 * TransactionLedger Model - Tracks all financial transactions in double-entry format
 * Used for formal LLC accounting compliance and financial reporting
 */
const transactionLedgerSchema = new mongoose.Schema(
  {
    // Core transaction data
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    transactionType: {
      type: String,
      required: true,
      enum: [
        "sale", // Customer purchase
        "commission", // Commission earned
        "payout", // Payment to event creator
        "refund", // Refund to customer
        "adjustment", // Manual adjustment
        "tax", // Tax payment
        "fee", // Platform/processing fee
      ],
    },
    description: {
      type: String,
      required: true,
    },

    // Double-entry accounting fields
    debitAccount: {
      type: String,
      required: true,
      enum: [
        "cash", // Bank account
        "accounts_receivable", // Money owed to us
        "accounts_payable", // Money we owe
        "sales_tax_payable", // Sales tax we need to pay
        "income_tax_payable", // Income tax we need to pay
        "revenue", // Money we earned
        "commission_expense", // Money paid to event creators
        "processing_fees", // Stripe/payment processor fees
        "other_expense", // Any other expenses
      ],
    },
    creditAccount: {
      type: String,
      required: true,
      enum: [
        "cash",
        "accounts_receivable",
        "accounts_payable",
        "sales_tax_payable",
        "income_tax_payable",
        "revenue",
        "commission_expense",
        "processing_fees",
        "other_expense",
      ],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
    },
    originalAmount: {
      type: Number,
      min: 0,
    },
    originalCurrency: {
      type: String,
    },
    conversionRate: {
      type: Number,
      min: 0,
    },

    // Related entity references
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    commissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commission",
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Fiscal period tracking
    fiscalYear: {
      type: Number,
      required: true,
      default: function () {
        return new Date(this.transactionDate).getFullYear();
      },
    },
    fiscalQuarter: {
      type: Number,
      required: true,
      default: function () {
        const month = new Date(this.transactionDate).getMonth();
        return Math.floor(month / 3) + 1; // 1-4 for quarters
      },
    },
    fiscalMonth: {
      type: Number,
      required: true,
      default: function () {
        return new Date(this.transactionDate).getMonth() + 1; // 1-12 for months
      },
    },

    // Tax information
    taxJurisdiction: {
      type: String, // Country or state code
    },
    taxRate: {
      type: Number,
      min: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
    },

    // Additional metadata
    notes: {
      type: String,
    },
    createdBy: {
      type: String,
      default: "system",
    },
    isReconciled: {
      type: Boolean,
      default: false,
    },
    externalReference: {
      type: String, // For external accounting system references
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
transactionLedgerSchema.index({ fiscalYear: 1, fiscalQuarter: 1 });
transactionLedgerSchema.index({ transactionDate: 1 });
transactionLedgerSchema.index({ orderId: 1 });
transactionLedgerSchema.index({ commissionId: 1 });
transactionLedgerSchema.index({ transactionType: 1 });

module.exports = mongoose.model("TransactionLedger", transactionLedgerSchema);
