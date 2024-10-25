const path = require("path");
const User = require("../models/User");
const { uploadToS3, deleteExistingAvatar } = require("../utils/s3Uploader");
const { optimizeImage } = require("../utils/imageOptimizer");
const chalk = require("chalk");

const addAvatar = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.body.userId,
      { $set: { avatar: req.body.avatar } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.avatar);
  } catch (err) {
    console.error(chalk.red("Avatar update error:"), err);
    res.status(500).json({ error: "Server error" });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file?.buffer || !req.body.userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const optimizedBuffer = await optimizeImage(req.file.buffer, {
      maxWidth: 500,
      maxHeight: 500,
      quality: 80,
      maxSizeKB: 200,
    });

    let oldAvatarKey = null;
    if (user.avatar) {
      const avatarUrl = new URL(user.avatar);
      oldAvatarKey = avatarUrl.pathname.substring(1);
    }

    const fileName = `avatar-${user._id}.jpg`;
    const imageUrl = await uploadToS3(
      optimizedBuffer,
      "avatars",
      fileName,
      "image/jpeg"
    );

    if (oldAvatarKey) {
      await deleteExistingAvatar("avatars", oldAvatarKey).catch(() => {});
    }

    await User.findByIdAndUpdate(
      user._id,
      { $set: { avatar: imageUrl } },
      { new: true, runValidators: false }
    );

    res.status(200).json({ success: true, imageUrl });
  } catch (error) {
    console.error(chalk.red("Upload error:"), error);
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
