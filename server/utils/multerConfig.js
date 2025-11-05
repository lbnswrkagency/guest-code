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
  return extensionMap[mimetype] || "";
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

// Adjusted limits for larger files, particularly videos
const limits = {
  fileSize: 200 * 1024 * 1024, // 200 MB
};

// Fields configuration
const fields = [
  { name: "flyer.instagramStory", maxCount: 1 },
  { name: "flyer.squareFormat", maxCount: 1 },
  { name: "flyer.landscape", maxCount: 1 },
  { name: "video.instagramStory", maxCount: 1 },
  { name: "video.squareFormat", maxCount: 1 },
  { name: "video.landscape", maxCount: 1 },
];

const upload = multer({ storage, fileFilter, limits }).fields(fields);

// Export a separate single upload configuration for the "video" field
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 300 * 1024 * 1024 },
}).single("video");

module.exports = { upload, uploadSingle };
