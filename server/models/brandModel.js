const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BrandSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    team: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: Schema.Types.ObjectId, ref: "Role" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    favorites: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // Brand Identity
    logo: {
      thumbnail: { type: String },
      medium: { type: String },
      full: { type: String },
    },
    coverImage: {
      thumbnail: { type: String },
      medium: { type: String },
      full: { type: String },
    },
    colors: {
      primary: { type: String, default: "#ffc807" },
      secondary: { type: String, default: "#ffffff" },
      accent: { type: String, default: "#000000" },
    },

    // Social & Contact
    social: {
      instagram: { type: String },
      tiktok: { type: String },
      facebook: { type: String },
      twitter: { type: String },
      youtube: { type: String },
      spotify: { type: String },
      soundcloud: { type: String },
      linkedin: { type: String },
      website: { type: String },
      whatsapp: { type: String },
      telegram: { type: String },
    },
    contact: {
      email: { type: String },
      phone: { type: String },
      address: { type: String },
    },

    // Content
    media: {
      photos: [{ type: String }],
      videos: [{ type: String }],
    },

    // Relationships
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    preferredLocations: [{ type: Schema.Types.ObjectId, ref: "Location" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // Settings
    settings: {
      isVerified: { type: Boolean, default: false },
      isPublic: { type: Boolean, default: true },
      allowsReviews: { type: Boolean, default: true },
      defaultRole: { type: String, default: "MEMBER" },
      autoJoinEnabled: { type: Boolean, default: false },
      defaultEventSettings: {
        guestCodeEnabled: { type: Boolean, default: true },
        friendsCodeEnabled: { type: Boolean, default: true },
        ticketCodeEnabled: { type: Boolean, default: false },
        tableCodeEnabled: { type: Boolean, default: false },
      },
    },

    // Analytics & Metrics
    metrics: {
      totalEvents: { type: Number, default: 0 },
      totalAttendees: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
    },

    bannedMembers: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        bannedAt: { type: Date },
        bannedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Brand", BrandSchema);
