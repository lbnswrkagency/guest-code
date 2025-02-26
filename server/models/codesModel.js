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
    // Additional fields for specific code types
    price: { type: Number }, // For ticket codes
    tableNumber: { type: String }, // For table codes
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
CodeSchema.index({ eventId: 1, type: 1 });
CodeSchema.index({ code: 1 }, { unique: true });

const Code = mongoose.model("Code", CodeSchema);

module.exports = Code;
