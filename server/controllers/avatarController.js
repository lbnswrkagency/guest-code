const path = require("path");
const url = require("url");
const User = require("../models/User");
const aws = require("aws-sdk");
const { uploadToS3, deleteExistingAvatar } = require("../utils/s3Uploader");

// AWS S3 Configuration
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new aws.S3({
  Bucket: process.env.AWS_S3_BUCKET_NAME,
});

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

// Existing addAvatar function
const addAvatar = async (req, res) => {
  const data = req.body;

  User.findByIdAndUpdate(
    data.userId,
    { $set: { avatar: data.avatar } },
    { new: true },
    (err, user) => {
      if (err) {
        res.sendStatus(404);
      } else {
        res.status(200).json(user.avatar);
      }
    }
  );
};

const uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const userId = req.body.userId;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Correctly extract file extension and construct the new filename
  const originalName = req.file.originalname;
  const fileExtension = originalName.substring(originalName.lastIndexOf("."));
  const fileName = `avatar-${userId}${fileExtension}`; // Correct format for filename

  const folder = "server"; // Your S3 folder
  const mimetype = req.file.mimetype;

  try {
    // First, try deleting any existing avatar for the user
    await deleteExistingAvatar(folder, fileName);

    // Then, upload the new avatar
    const imageUrl = await uploadToS3(
      req.file.buffer,
      folder,
      fileName,
      mimetype
    );
    user.avatar = imageUrl;
    await user.save();
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
};

module.exports = {
  addAvatar,
  uploadAvatar,
};
