const path = require("path");
const User = require("../models/User");
const { uploadToS3 } = require("../utils/s3Uploader");
const { optimizeImage } = require("../utils/imageOptimizer");
const chalk = require("chalk");

const addAvatar = async (req, res) => {
  try {
    console.log("[AvatarController:addAvatar] Starting avatar update:", {
      userId: req.body.userId,
      timestamp: new Date().toISOString(),
    });

    const user = await User.findByIdAndUpdate(
      req.body.userId,
      { $set: { avatar: req.body.avatar } },
      { new: true }
    );

    if (!user) {
      console.warn("[AvatarController:addAvatar] User not found:", {
        userId: req.body.userId,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ error: "User not found" });
    }

    console.log("[AvatarController:addAvatar] Avatar updated successfully:", {
      userId: user._id,
      avatar: user.avatar,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json(user.avatar);
  } catch (err) {
    console.error(chalk.red("[AvatarController:addAvatar] Error:"), {
      error: err.message,
      stack: err.stack,
      userId: req.body?.userId,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Server error" });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    console.log("[AvatarController:uploadAvatar] Starting upload process:", {
      hasFile: !!req.file?.buffer,
      userId: req.body?.userId || req.user?._id,
      fileSize: req.file?.size,
      timestamp: new Date().toISOString(),
    });

    if (!req.file?.buffer) {
      console.warn("[AvatarController:uploadAvatar] No file provided");
      return res.status(400).json({ error: "No file provided" });
    }

    // Use the authenticated user's ID if userId is not provided in the body
    const userId = req.body.userId || req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      console.warn("[AvatarController:uploadAvatar] User not found:", {
        userId,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ error: "User not found" });
    }

    console.log("[AvatarController:uploadAvatar] Optimizing image");
    const optimizedBuffer = await optimizeImage(req.file.buffer, {
      maxWidth: 500,
      maxHeight: 500,
      quality: 80,
      maxSizeKB: 200,
    });

    const timestamp = Date.now();
    const key = `avatars/${user._id}/${timestamp}`;
    const urls = {};
    const qualities = ["thumbnail", "medium", "full"];

    console.log("[AvatarController:uploadAvatar] Uploading to S3:", {
      userId: user._id,
      key,
      qualities,
      timestamp: new Date().toISOString(),
    });

    try {
      for (const quality of qualities) {
        const qualityKey = `${key}/${quality}`;
        const url = await uploadToS3(
          optimizedBuffer,
          qualityKey,
          "image/jpeg",
          quality
        );
        urls[quality] = url;
      }
    } catch (uploadError) {
      console.error("[AvatarController:uploadAvatar] S3 upload error:", {
        error: uploadError.message,
        stack: uploadError.stack,
        userId: user._id,
        timestamp: new Date().toISOString(),
      });
      throw new Error("Failed to upload image to storage");
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            avatar: {
              thumbnail: urls.thumbnail,
              medium: urls.medium,
              full: urls.full,
              timestamp,
            },
          },
        },
        { new: true }
      );

      console.log(
        "[AvatarController:uploadAvatar] Upload completed successfully:",
        {
          userId: updatedUser._id,
          newAvatarUrls: urls,
          timestamp: new Date().toISOString(),
        }
      );

      res.status(200).json({
        success: true,
        imageUrl: updatedUser.avatar,
      });
    } catch (dbError) {
      console.error("[AvatarController:uploadAvatar] Database update error:", {
        error: dbError.message,
        stack: dbError.stack,
        userId: user._id,
        timestamp: new Date().toISOString(),
      });
      throw new Error("Failed to update user avatar in database");
    }
  } catch (error) {
    console.error(chalk.red("[AvatarController:uploadAvatar] Error:"), {
      error: error.message,
      stack: error.stack,
      userId: req.body?.userId || req.user?._id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      error: "Upload failed",
      details: error.message,
    });
  }
};

module.exports = {
  addAvatar,
  uploadAvatar,
};
