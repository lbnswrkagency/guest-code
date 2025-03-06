const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CodeSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    codeSettingId: { type: Schema.Types.ObjectId, ref: "CodeSettings" }, // Reference to the code setting
    type: {
      type: String,
      enum: ["guest", "friends", "ticket", "table", "backstage", "custom"],
      required: true,
    },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    qrCode: { type: String, required: true },
    securityToken: { type: String }, // Added for secure validation
    condition: { type: String, default: "" },
    maxPax: { type: Number, default: 1 },
    limit: { type: Number, default: 0 }, // 0 means unlimited
    paxChecked: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "used", "expired", "revoked"],
      default: "active",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Guest code specific fields
    guestName: { type: String }, // Name of the guest for guest codes
    guestEmail: { type: String }, // Email of the guest for guest codes
    // Additional fields for specific code types
    price: { type: Number }, // For ticket codes
    tableNumber: { type: String }, // For table codes

    // New fields for dynamic code generation
    isDynamic: { type: Boolean, default: false }, // Flag to indicate dynamic codes
    expiryDate: { type: Date }, // Optional expiry date for dynamic codes
    validationRules: { type: Map, of: String }, // Flexible validation rules
    usage: [
      {
        timestamp: { type: Date, default: Date.now },
        paxUsed: { type: Number, default: 0 },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        location: { type: String },
        deviceInfo: { type: String },
      },
    ], // Track detailed usage information
    metadata: { type: Map, of: Schema.Types.Mixed }, // Additional flexible metadata
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
CodeSchema.index({ eventId: 1, type: 1 });
CodeSchema.index({ code: 1 }, { unique: true });
CodeSchema.index({ securityToken: 1 }); // Add index for security token lookups
CodeSchema.index({ expiryDate: 1 }); // Add index for quickly finding expired codes
CodeSchema.index({ "usage.timestamp": 1 }); // Add index for usage analytics

// Virtual property to check if code is expired
CodeSchema.virtual("isExpired").get(function () {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual property to get remaining uses (if limit is set)
CodeSchema.virtual("remainingUses").get(function () {
  if (this.limit === 0) return Infinity; // Unlimited
  return Math.max(0, this.limit - this.usageCount);
});

// Static method to find active codes
CodeSchema.statics.findActive = function (query = {}) {
  return this.find({
    ...query,
    status: "active",
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: new Date() } },
    ],
  });
};

const Code = mongoose.model("Code", CodeSchema);

module.exports = Code;
