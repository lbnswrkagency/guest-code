const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const url = require("url");
const User = require("../models/User"); // Adjust the path as needed

// AWS S3 Configuration
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new aws.S3({
  Bucket: process.env.AWS_S3_BUCKET_NAME,
});

// Multer configuration for profile image upload
const profileImgUpload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "myleo-images", // Replace with your bucket name
    acl: "public-read",
    key: function (req, file, cb) {
      cb(
        null,
        path.basename(file.originalname, path.extname(file.originalname)) +
          "-" +
          Date.now() +
          path.extname(file.originalname)
      );
    },
  }),
  limits: { fileSize: 2000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).single("profileImage");

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

// New uploadAvatar function (from profile.js)
const uploadAvatar = (req, res) => {
  profileImgUpload(req, res, async (error) => {
    if (error) {
      res.json({ error: error });
    } else {
      if (req.file === undefined) {
        res.json("Error: No File Selected");
      } else {
        const imageName = req.file.key;
        const imageLocation = req.file.location;
        const userId = req.body.userId;

        try {
          const user = await User.findById(userId);
          if (user) {
            const oldAvatarUrl = user.avatar;
            if (oldAvatarUrl) {
              const oldAvatarKey = url
                .parse(oldAvatarUrl)
                .pathname.substring(1);
              const deleteParams = {
                Bucket: "myleo-images",
                Key: oldAvatarKey,
              };

              s3.deleteObject(deleteParams, (err, data) => {
                if (err) {
                  console.log(err, err.stack);
                } else {
                  // Log successful deletion or handle it as needed
                }
              });
            }

            user.avatar = imageLocation;
            await user.save();

            res.json({
              image: imageName,
              location: imageLocation,
              userId: userId,
            });
          } else {
            console.log(`User not found with id: ${userId}`);
          }
        } catch (err) {
          console.error(err);
          res
            .status(500)
            .json({ error: "An error occurred while updating the avatar" });
        }
      }
    }
  });
};

module.exports = {
  addAvatar,
  uploadAvatar,
};
