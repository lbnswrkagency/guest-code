const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// NOTE: All code settings are now in the CodeSettings collection (server/models/codeSettingsModel.js)
// Legacy embedded code fields have been removed. See cleanEventCodeSettings.js script.

const EventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    coHosts: [{ type: Schema.Types.ObjectId, ref: "Brand" }], // Array of co-host brand IDs
    coHostRolePermissions: [
      {
        brandId: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
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
              codes: { type: Schema.Types.Mixed, default: {} },
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
      },
    ],
    title: { type: String, required: true },
    subTitle: { type: String },
    description: { type: String },
    // NOTE: Legacy 'date' field has been removed. Use startDate/endDate only.
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
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
    sourceEventId: { type: Schema.Types.ObjectId, ref: "Event" }, // For non-weekly series: tracks which event this was created from
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

    // NOTE: Code settings are now in CodeSettings collection (codeSettingsModel.js)
    // Legacy fields (codeSettings, guestCode, friendsCode, etc.) have been removed

    // Table layout configuration
    tableLayout: {
      type: String,
      enum: ["", "studio", "bolivar", "venti", "harlem", "amano"],
      default: "",
    },

    // Battle configuration - completely separate from main event functionality
    battleConfig: {
      isEnabled: { type: Boolean, default: false },
      title: { type: String, default: "Dance Battle" },
      subtitle: {
        type: String,
        default: "1 vs 1 Dance Battles - The crowd picks the winner!",
      },
      description: { type: String, default: "" },
      prizeMoney: { type: Number, default: 0 }, // Prize amount per category
      currency: { type: String, default: "€" },
      maxParticipantsPerCategory: { type: Number, default: 16 },
      categories: [
        {
          name: { type: String, required: true },
          displayName: { type: String, required: true },
          prizeMoney: { type: Number, default: 0 }, // Override global prize per category
          maxParticipants: { type: Number, default: 16 }, // Override global max per category
          participantsPerSignup: { type: Number, default: 1 }, // How many people per registration (e.g., 2 for 2vs2)
          signUpsDone: { type: Boolean, default: false }, // When true, no more signups allowed for this category
        },
      ],
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

    // Dropbox integration
    dropboxFolderPath: { type: String, default: "" }, // e.g., "/events/2024/december/party-name" for photos
    dropboxVideoFolderPath: { type: String, default: "" }, // e.g., "/events/2024/december/party-name/videos" for videos

    link: { type: String, required: true, unique: true },
    isPublic: { type: Boolean, default: true },
    favoritedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

// Add compound index for uniqueness
EventSchema.index({ brand: 1, title: 1, startDate: 1 }, { unique: true });

// Pre-save hook - legacy date sync removed, startDate/endDate are now required
EventSchema.pre("save", function (next) {
  // No more date field syncing - startDate and endDate are the source of truth
  next();
});

module.exports = mongoose.model("Event", EventSchema);
