const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  birthday: { type: Date, required: true },
  avatar: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  brands: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
  followedBrands: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
  eventMemberships: [
    {
      event: { type: Schema.Types.ObjectId, ref: "Event" },
      roles: [String],
      permissions: [String],
    },
  ],
  isVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
