const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
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
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Role", roleSchema);
