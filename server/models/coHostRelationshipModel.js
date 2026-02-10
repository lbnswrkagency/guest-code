const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * CoHostRelationship Model
 *
 * Stores the relationship between a host brand and a co-host brand,
 * along with the permissions granted to each role in the co-host brand.
 *
 * This is a global setting - permissions apply to ALL events where
 * the co-host is added.
 */
const CoHostRelationshipSchema = new Schema(
  {
    // The brand that hosts the events
    hostBrand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    // The brand that co-hosts the events
    coHostBrand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    // Permissions for each role in the co-host brand
    rolePermissions: [
      {
        roleId: {
          type: Schema.Types.ObjectId,
          ref: "Role",
          required: true,
        },
        permissions: {
          analytics: {
            view: { type: Boolean, default: false },
          },
          codes: {
            type: Schema.Types.Mixed,
            default: {},
          },
          scanner: {
            use: { type: Boolean, default: false },
          },
          tables: {
            access: { type: Boolean, default: false },
            manage: { type: Boolean, default: false },
            summary: { type: Boolean, default: false },
          },
          battles: {
            view: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
          },
        },
      },
    ],
    // Whether this relationship is active
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups and uniqueness
// Each (hostBrand, coHostBrand) pair should be unique
CoHostRelationshipSchema.index(
  { hostBrand: 1, coHostBrand: 1 },
  { unique: true }
);

// Index for finding all relationships for a host brand
CoHostRelationshipSchema.index({ hostBrand: 1 });

// Index for finding all relationships for a co-host brand
CoHostRelationshipSchema.index({ coHostBrand: 1 });

module.exports = mongoose.model("CoHostRelationship", CoHostRelationshipSchema);
