// utils/multerConfig.js
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, "..", "temp");

    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${getExtension(file.mimetype)}`);
  },
});

const getExtension = (mimetype) => {
  const extensionMap = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "video/mp4": ".mp4",
  };
  return extensionMap[mimetype];
};

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "video/mp4"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 10 MB
    fieldSize: 100 * 1024 * 1024, // 10 MB
  },
  fileFilter: fileFilter,
}).fields([
  { name: "flyer.instagramStory", maxCount: 1 },
  { name: "flyer.squareFormat", maxCount: 1 },
  { name: "flyer.landscape", maxCount: 1 },
  { name: "video.instagramStory", maxCount: 1 },
  { name: "video.squareFormat", maxCount: 1 },
  { name: "video.landscape", maxCount: 1 },
]);

module.exports = upload;
