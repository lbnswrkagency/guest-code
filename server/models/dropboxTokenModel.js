const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DropboxTokenSchema = new Schema(
  {
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    accountId: {
      type: String,
      required: true,
      unique: true, // One token per Dropbox account
    },
    email: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if token is expired
DropboxTokenSchema.methods.isExpired = function() {
  return new Date() >= this.expiresAt;
};

// Method to update tokens
DropboxTokenSchema.methods.updateTokens = function(accessToken, expiresIn) {
  this.accessToken = accessToken;
  this.expiresAt = new Date(Date.now() + expiresIn * 1000);
  return this.save();
};

module.exports = mongoose.model("DropboxToken", DropboxTokenSchema);