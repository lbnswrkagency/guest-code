const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    lastName: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    birthday: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
    isDeveloper: { type: Boolean, default: false },
    isAlpha: { type: Boolean, default: false },
    loginCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    avatar: {
      thumbnail: { type: String },
      medium: { type: String },
      full: { type: String },
      timestamp: { type: Number },
    },
    refreshToken: {
      type: String,
      default: null,
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    lastUsernameChange: { type: Date },
    favoriteBrands: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
    favoriteEvents: [{ type: Schema.Types.ObjectId, ref: "Event" }],
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Add index for email lookups
UserSchema.index({ email: 1 });

module.exports = mongoose.model("User", UserSchema);
