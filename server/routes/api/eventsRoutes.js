const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF and WebP are allowed."
        ),
        false
      );
    }
  },
});

// Configure multer for video uploads
const videoStorage = multer.memoryStorage();
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["video/mp4", "video/quicktime"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP4 and MOV are allowed."), false);
    }
  },
});

const {
  createEvent,
  getAllEvents,
  getBrandEvents,
  editEvent,
  deleteEvent,
  getEvent,
  getEventPage,
  getEventByLink,
  generateGuestCode,
  updateGuestCodeCondition,
  compressAndOptimizeFiles,
  uploadVideoToS3,
  listDroppedFiles,
  deleteDroppedFile,
  getSignedUrlForDownload,
} = require("../../controllers/eventsController");

// Brand-specific event routes
router.get("/brand/:brandId", authenticate, getBrandEvents);
router.post(
  "/brand/:brandId",
  authenticate,
  upload.fields([
    { name: "flyer.portrait", maxCount: 1 },
    { name: "flyer.landscape", maxCount: 1 },
    { name: "flyer.square", maxCount: 1 },
  ]),
  createEvent
);

// Event-specific routes
router.get("/", authenticate, getAllEvents);
router.get("/:eventId", authenticate, getEvent);
router.put("/:eventId", authenticate, editEvent);
router.delete("/:eventId", authenticate, deleteEvent);
router.get("/page/:eventId", authenticate, getEventPage);
router.get("/link/:eventLink", getEventByLink);

// Guest code routes
router.post("/generateGuestCode", generateGuestCode);
router.patch(
  "/:eventId/guestCodeCondition",
  authenticate,
  updateGuestCodeCondition
);

// File handling routes
router.post(
  "/compressAndOptimizeFiles",
  authenticate,
  upload.array("files"),
  compressAndOptimizeFiles
);
router.post(
  "/uploadVideo",
  authenticate,
  uploadVideo.single("video"),
  uploadVideoToS3
);
router.get("/files", authenticate, listDroppedFiles);
router.delete("/files/:fileName", authenticate, deleteDroppedFile);
router.get("/files/:fileName/download", authenticate, getSignedUrlForDownload);

module.exports = router;
