const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LineUpSchema = new Schema(
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
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    avatar: {
      thumbnail: String,
      small: String,
      medium: String,
      large: String,
      full: String,
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
LineUpSchema.index({ brandId: 1, name: 1 });

const LineUp = mongoose.model("LineUp", LineUpSchema);

module.exports = LineUp;
