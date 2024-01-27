const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: false, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isScanner: { type: Boolean, default: false },
  isPromoter: { type: Boolean, default: false },
  isStaff: { type: Boolean, default: false },
  isDeveloper: { type: Boolean, default: false },
  isBackstage: { type: Boolean, default: false },
  backstageCodeLimit: { type: Number, default: false },
  friendsCodeLimit: { type: Number, default: false },
  createdAt: { type: Date, default: Date.now },
  events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
  avatar: {
    type: String,
    default: "",
  },
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
