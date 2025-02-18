const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RoleSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    name: { type: String, required: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    permissions: {
      events: {
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        view: { type: Boolean, default: true },
      },
      team: {
        manage: { type: Boolean, default: false },
        view: { type: Boolean, default: true },
      },
      analytics: {
        view: { type: Boolean, default: false },
      },
      codes: {
        friends: {
          generate: { type: Boolean, default: false },
          limit: { type: Number, default: 0 },
          unlimited: { type: Boolean, default: false },
        },
        backstage: {
          generate: { type: Boolean, default: false },
          limit: { type: Number, default: 0 },
          unlimited: { type: Boolean, default: false },
        },
        table: {
          generate: { type: Boolean, default: false },
        },
        ticket: {
          generate: { type: Boolean, default: false },
        },
      },
      scanner: {
        use: { type: Boolean, default: false },
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// Ensure unique role names per brand
RoleSchema.index({ brandId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Role", RoleSchema);
