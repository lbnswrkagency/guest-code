const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Not required as guests can buy tickets
    },
    commissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commission",
    },
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
    invoiceNumber: {
      type: String,
      default: function () {
        // Generate a default invoice number if not provided
        if (this.stripeSessionId) {
          const shortCode = this.stripeSessionId.slice(-4).toUpperCase();
          return `INV-${shortCode}`;
        }
        return `INV-${Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase()}`;
      },
    },
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
    originalCurrency: {
      type: String,
      default: "EUR",
      required: true,
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    conversionRate: {
      type: Number,
      default: 1.08, // Default fallback conversion rate if not available from Stripe
    },
    isEstimatedRate: {
      type: Boolean,
      default: false, // True if using fallback rate, false if using real-time rate
    },
    vatRate: {
      type: Number,
      default: 0, // Will be set based on customer's country
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
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
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "refunded"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
