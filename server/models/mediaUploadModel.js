const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MediaUploadSchema = new Schema(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
    },
    uploaderType: {
      type: String,
      enum: ["team", "guest"],
      required: true,
    },
    uploaderUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    uploaderName: {
      type: String,
      required: true,
    },
    uploaderEmail: {
      type: String,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    dropboxPath: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
MediaUploadSchema.index({ brandId: 1, createdAt: -1 });
MediaUploadSchema.index({ eventId: 1, createdAt: -1 });
MediaUploadSchema.index({ uploaderType: 1, brandId: 1 });

module.exports = mongoose.model("MediaUpload", MediaUploadSchema);
