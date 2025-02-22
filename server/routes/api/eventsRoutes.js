const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const { upload, uploadSingle } = require("../../utils/multerConfig");
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
router.post("/brand/:brandId", authenticate, createEvent);

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
  upload,
  compressAndOptimizeFiles
);
router.post("/uploadVideo", uploadSingle, uploadVideoToS3);
router.get("/files", authenticate, listDroppedFiles);
router.delete("/files/:fileName", authenticate, deleteDroppedFile);
router.get("/files/:fileName/download", authenticate, getSignedUrlForDownload);

module.exports = router;
