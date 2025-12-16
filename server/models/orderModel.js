const mongoose = require("mongoose");

/**
 * Order Model - Tracks customer ticket purchases
 * Includes embedded commission calculation for host payouts
 * All amounts in EUR
 */
const orderSchema = new mongoose.Schema(
  {
    // Core references
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Guests can buy tickets
    },

    // Customer info
    email: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },

    // Tickets purchased
    tickets: [
      {
        ticketId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TicketSetting",
          required: true,
        },
        name: String,
        quantity: Number,
        pricePerUnit: Number,
      },
    ],

    // Payment details (EUR only)
    originalCurrency: {
      type: String,
      default: "EUR",
      immutable: true,
    },
    originalAmount: {
      type: Number,
      required: true,
      description: "Total amount paid by customer in EUR",
    },
    stripeSessionId: {
      type: String,
      required: true,
    },
    billingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postal_code: String,
      country: String,
    },

    // Order status
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "refunded"],
      default: "unpaid",
    },

    // Platform fee / Host earnings (embedded commission)
    platformFeeRate: {
      type: Number,
      default: 0.039, // 3.9% from env
    },
    platformFee: {
      type: Number,
      description: "GuestCode's fee (3.9% of originalAmount)",
    },
    hostEarnings: {
      type: Number,
      description: "Amount owed to event host (96.1% of originalAmount)",
    },
    hostPayoutStatus: {
      type: String,
      enum: ["pending", "available", "paid"],
      default: "pending",
      description: "Status of payout to host",
    },

    // VAT (based on event country, not customer country)
    vatRate: {
      type: Number,
      default: 24, // Greek VAT as default
      description: "VAT rate based on event country",
    },

    // AADE Receipt (from Accounty)
    aadeReceipt: {
      accountyId: String,
      receiptNumber: String,
      mark: String,
      qrCode: String,
      status: {
        type: String,
        enum: ["pending", "transmitted", "failed"],
        default: "pending",
      },
      errors: [
        {
          code: String,
          message: String,
        },
      ],
      createdAt: Date,
    },
    receiptSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
orderSchema.index({ eventId: 1 });
orderSchema.index({ stripeSessionId: 1 }, { unique: true });
orderSchema.index({ hostPayoutStatus: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
