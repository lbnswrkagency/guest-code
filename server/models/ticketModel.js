const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ticketSchema = new mongoose.Schema(
  {
    // References
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // Ticket details
    ticketType: {
      type: String,
      required: true,
    },
    ticketName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },

    // Security and validation
    securityToken: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["valid", "used", "cancelled", "expired"],
      default: "valid",
    },

    // Additional info
    seat: String,
    table: String,
    backstageAccess: {
      type: Boolean,
      default: false,
    },

    // Validation timestamps
    usedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for faster lookups by securityToken
ticketSchema.index({ securityToken: 1 });

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
