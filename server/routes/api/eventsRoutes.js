const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const multer = require("multer");
const sharp = require("sharp");
const { uploadToS3 } = require("../../utils/s3Uploader");
const Event = require("../../models/eventsModel");

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
  toggleEventLive,
  getEventProfile,
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
router.get("/profile/:eventId", getEventProfile);
router.get("/slug/:brandUsername/:dateSlug/:eventSlug", getEventProfile);
// Route for both simplified formats: /@brandUsername/e/MMDDYY and /@brandUsername/MMDDYY
// The dateSlug can include an optional suffix (e.g., 032225-2) to get the Nth event on that day
router.get("/date/:brandUsername/:dateSlug", getEventProfile);
router.get("/:eventId", authenticate, getEvent);
router.put("/:eventId", authenticate, editEvent);
router.delete("/:eventId", authenticate, deleteEvent);
router.get("/page/:eventId", authenticate, getEventPage);
router.get("/link/:eventLink", getEventByLink);

// Get a specific weekly occurrence of an event
router.get("/:eventId/weekly/:weekNumber", authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const week = parseInt(req.params.weekNumber);

    console.log(`[Weekly Events] Fetching week ${week} for event ${eventId}`);

    // First, find the parent event
    const parentEvent = await Event.findById(eventId).populate("lineups");
    if (!parentEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Then find the child event for this week
    const childEvent = await Event.findOne({
      parentEventId: eventId,
      weekNumber: week,
    }).populate("lineups");

    if (!childEvent) {
      // Instead of just returning a 404, include the parent event in the response
      // This allows the frontend to create a temporary event object
      return res.status(404).json({
        message: "Weekly occurrence not found",
        parentEvent: parentEvent,
      });
    }

    res.status(200).json(childEvent);
  } catch (error) {
    console.error("[Weekly Events] Error:", error);
    res.status(500).json({ message: "Error fetching weekly event" });
  }
});

// Add the flyer update route
router.put(
  "/:eventId/flyer/:format",
  authenticate,
  upload.single("flyer"),
  async (req, res) => {
    try {
      const { eventId, format } = req.params;
      const file = req.file;

      console.log("[Flyer Update] Processing request:", {
        eventId,
        format,
        fileInfo: file
          ? {
              size: file.size,
              mimetype: file.mimetype,
            }
          : "No file",
      });

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Find event and check permissions
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const timestamp = Date.now();
      const key = `events/${event._id}/flyers/${format}/${timestamp}`;
      const qualities = ["thumbnail", "medium", "full"];
      const urls = {};

      // Process and upload each quality
      for (const quality of qualities) {
        let processedBuffer = file.buffer;

        if (quality === "thumbnail") {
          processedBuffer = await sharp(file.buffer)
            .resize(300)
            .jpeg({ quality: 80 })
            .toBuffer();
        } else if (quality === "medium") {
          processedBuffer = await sharp(file.buffer)
            .resize(800)
            .jpeg({ quality: 85 })
            .toBuffer();
        }

        const qualityKey = `${key}/${quality}`;
        const url = await uploadToS3(
          processedBuffer,
          qualityKey,
          file.mimetype
        );
        urls[quality] = url;

        console.log(`[Flyer Update] Uploaded ${format}/${quality}:`, {
          size: processedBuffer.length,
          url,
        });
      }

      // Update event with the flyer URLs
      if (!event.flyer) event.flyer = {};
      event.flyer[format] = {
        thumbnail: urls.thumbnail,
        medium: urls.medium,
        full: urls.full,
        timestamp,
      };

      await event.save();
      console.log(`[Flyer Update] Updated ${format} flyer successfully`);

      res.status(200).json(event);
    } catch (error) {
      console.error("[Flyer Update Error]", {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        message: "Error updating flyer",
        error: error.message,
      });
    }
  }
);

// Add the Go Live toggle route
router.patch("/:eventId/toggle-live", authenticate, toggleEventLive);

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
