const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TicketSettingsSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    doorPrice: {
      type: Number,
      min: 0,
      description: "Price when paying at the entrance/door (Abendkasse)",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
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
    hasCountdown: {
      type: Boolean,
      default: false,
    },
    endDate: {
      type: Date,
    },
    maxPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    isLimited: {
      type: Boolean,
      default: false,
    },
    maxTickets: {
      type: Number,
      default: 100,
      min: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    minPurchase: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxPurchase: {
      type: Number,
      default: 10,
      min: 1,
      validate: {
        validator: function (v) {
          return v >= this.minPurchase;
        },
        message:
          "Maximum purchase must be greater than or equal to minimum purchase",
      },
    },
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paxPerTicket: {
      type: Number,
      default: 1,
      min: 1,
      description: "Number of people allowed per ticket (for group tickets)",
    },
    paymentMethod: {
      type: String,
      enum: ["online", "atEntrance"],
      default: "online",
      description:
        "Payment method for tickets - online payment or payment at entrance. Used in Analytics to determine if tickets are displayed as 'Sold' or 'Generated', and how revenue is calculated.",
    },
    sortOrder: {
      type: Number,
      default: 0,
      description: "Order for displaying tickets",
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for calculating if ticket is on sale
TicketSettingsSchema.virtual("isOnSale").get(function () {
  return this.originalPrice !== null && this.originalPrice > this.price;
});

// Virtual for calculating discount percentage
TicketSettingsSchema.virtual("discountPercentage").get(function () {
  if (!this.isOnSale) return null;
  return Math.round(
    ((this.originalPrice - this.price) / this.originalPrice) * 100
  );
});

// Virtual for calculating remaining tickets
TicketSettingsSchema.virtual("remainingTickets").get(function () {
  if (!this.isLimited) return null;
  return Math.max(0, this.maxTickets - this.soldCount);
});

// Virtual for calculating sold percentage
TicketSettingsSchema.virtual("soldPercentage").get(function () {
  if (!this.isLimited || this.maxTickets === 0) return null;
  return Math.min(100, Math.round((this.soldCount / this.maxTickets) * 100));
});

// Method to check if ticket is available
TicketSettingsSchema.methods.isAvailable = function () {
  if (!this.isVisible) return false;
  if (this.hasCountdown && this.endDate && new Date() > this.endDate)
    return false;
  if (this.isLimited && this.soldCount >= this.maxTickets) return false;
  return true;
};

const TicketSettings = mongoose.model("TicketSettings", TicketSettingsSchema);

module.exports = TicketSettings;
