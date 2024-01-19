const path = require("path");
const url = require("url");
const User = require("../models/User");

const aws = require("aws-sdk");

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
  console.log("BODY", req.body);
  console.log("FILE", req.file);

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const imageName = req.file.key;
  const imageLocation = req.file.location;
  const userId = req.body.userId;

  try {
    console.log("USER ID CALL", userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found with id: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the old avatar if it exists

    console.log("USERR FOUND", user);

    if (user.avatar) {
      const oldAvatarKey = url.parse(user.avatar).pathname.substring(1);
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: oldAvatarKey,
      };

      try {
        await s3.deleteObject(deleteParams).promise();
      } catch (err) {
        console.log("Error deleting old avatar:", err);
      }
    }

    // Update the user's avatar URL in the database
    user.avatar = imageLocation;
    await user.save();

    res.json({
      image: imageName,
      location: imageLocation,
      userId: userId,
    });
  } catch (err) {
    console.error("Error in uploadAvatar:", err);
    res
      .status(500)
      .json({ error: "An error occurred while updating the avatar" });
  }
};
module.exports = {
  addAvatar,
  uploadAvatar,
};
