const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define a schema for code settings
const CodeSettingsSchema = new Schema(
  {
    name: { type: String, required: true }, // Custom name for the code
    type: {
      type: String,
      enum: ["guest", "friends", "ticket", "table", "backstage", "custom"],
      required: true,
    },
    condition: { type: String, default: "" },
    maxPax: { type: Number, default: 1 },
    limit: { type: Number, default: 0 }, // 0 means unlimited
    isEnabled: { type: Boolean, default: true },
    isEditable: { type: Boolean, default: false }, // Whether name can be edited
    // Additional fields for specific code types
    price: { type: Number }, // For ticket codes
    tableNumber: { type: String }, // For table codes
  },
  { _id: false }
);

// Create a separate schema for embedded code settings that doesn't have required fields
const EmbeddedCodeSettingsSchema = new Schema(
  {
    name: { type: String }, // Not required when embedded
    type: {
      type: String,
      enum: ["guest", "friends", "ticket", "table", "backstage", "custom"],
    },
    condition: { type: String, default: "" },
    maxPax: { type: Number, default: 1 },
    limit: { type: Number, default: 0 }, // 0 means unlimited
    isEnabled: { type: Boolean, default: true },
    isEditable: { type: Boolean, default: false }, // Whether name can be edited
    // Additional fields for specific code types
    price: { type: Number }, // For ticket codes
    tableNumber: { type: String }, // For table codes
  },
  { _id: false }
);

const EventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    title: { type: String, required: true },
    subTitle: { type: String },
    description: { type: String },
    date: { type: Date, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String, required: true },
    street: { type: String },
    postalCode: { type: String },
    city: { type: String },
    music: { type: String },
    genres: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
    isWeekly: { type: Boolean, default: false },
    parentEventId: { type: Schema.Types.ObjectId, ref: "Event" },
    weekNumber: { type: Number, default: 0 },
    isLive: { type: Boolean, default: false },
    lineups: [{ type: Schema.Types.ObjectId, ref: "LineUp" }],
    slug: { type: String }, // URL-friendly slug for the event
    flyer: {
      landscape: {
        thumbnail: String,
        medium: String,
        full: String,
      },
      portrait: {
        thumbnail: String,
        medium: String,
        full: String,
      },
      square: {
        thumbnail: String,
        medium: String,
        full: String,
      },
    },

    // New approach: Array of code settings
    codeSettings: {
      type: [CodeSettingsSchema],
      default: function () {
        return [
          // Default code types with predefined settings
          {
            name: "Guest Code",
            type: "guest",
            condition: "",
            maxPax: 1,
            limit: 0,
            isEnabled: false,
            isEditable: false,
          },
          {
            name: "Ticket Code",
            type: "ticket",
            condition: "",
            maxPax: 1,
            limit: 0,
            isEnabled: false,
            isEditable: false,
          },
          {
            name: "Friends Code",
            type: "friends",
            condition: "",
            maxPax: 1,
            limit: 0,
            isEnabled: false,
            isEditable: true,
          },
          {
            name: "Backstage Code",
            type: "backstage",
            condition: "",
            maxPax: 1,
            limit: 0,
            isEnabled: false,
            isEditable: true,
          },
        ];
      },
    },

    // Keep these for backward compatibility
    guestCode: { type: Boolean, default: false },
    friendsCode: { type: Boolean, default: false },
    ticketCode: { type: Boolean, default: false },
    tableCode: { type: Boolean, default: false },
    backstageCode: { type: Boolean, default: false },
    guestCodeSettings: {
      type: EmbeddedCodeSettingsSchema,
      default: () => ({}),
    },
    friendsCodeSettings: {
      type: EmbeddedCodeSettingsSchema,
      default: () => ({}),
    },
    ticketCodeSettings: {
      type: EmbeddedCodeSettingsSchema,
      default: () => ({}),
    },
    tableCodeSettings: {
      type: EmbeddedCodeSettingsSchema,
      default: () => ({}),
    },
    backstageCodeSettings: {
      type: EmbeddedCodeSettingsSchema,
      default: () => ({}),
    },

    // Table layout configuration
    tableLayout: {
      type: String,
      enum: ["", "studio", "bolivar", "venti"],
      default: "",
    },

    // Battle configuration - completely separate from main event functionality
    battleConfig: {
      isEnabled: { type: Boolean, default: false },
      title: { type: String, default: "Dance Battle" },
      subtitle: { type: String, default: "1 vs 1 Dance Battles - The crowd picks the winner!" },
      description: { type: String, default: "" },
      prizeMoney: { type: Number, default: 0 }, // Prize amount per category
      currency: { type: String, default: "€" },
      maxParticipantsPerCategory: { type: Number, default: 16 },
      categories: [{
        name: { type: String, required: true },
        displayName: { type: String, required: true },
        prizeMoney: { type: Number, default: 0 }, // Override global prize per category
        maxParticipants: { type: Number, default: 16 }, // Override global max per category
        participantsPerSignup: { type: Number, default: 1 }, // How many people per registration (e.g., 2 for 2vs2)
      }],
      // Battle-specific event details that can override main event details
      battleDate: { type: Date }, // If different from main event
      battleStartTime: { type: String }, // If different from main event  
      battleEndTime: { type: String }, // If different from main event
      battleLocation: { type: String }, // If different from main event
      // Additional battle settings
      registrationDeadline: { type: Date },
      isRegistrationOpen: { type: Boolean, default: true },
      battleRules: { type: String, default: "" },
      additionalInfo: { type: String, default: "" },
    },

    link: { type: String, required: true, unique: true },
    isPublic: { type: Boolean, default: true },
    favoritedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

// Add compound index for uniqueness
EventSchema.index({ brand: 1, title: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Event", EventSchema);
