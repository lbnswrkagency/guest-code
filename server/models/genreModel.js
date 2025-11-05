const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GenreSchema = new Schema(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    icon: {
      type: String, // Optional icon name/code for the genre
      default: "music",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    events: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on brandId and name to make lookups faster
GenreSchema.index({ brandId: 1, name: 1 });

const Genre = mongoose.model("Genre", GenreSchema);

module.exports = Genre;
