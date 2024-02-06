const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const { upload, uploadSingle } = require("../../utils/multerConfig");
const {
  createEvent,
  getAllEvents,
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
router.get("/listDroppedFiles", authenticate, listDroppedFiles);
router.post("/", authenticate, createEvent);
router.get("/", authenticate, getAllEvents);
router.put("/:eventId", authenticate, editEvent);
router.delete("/:eventId", authenticate, deleteEvent);
router.get("/:eventId", authenticate, getEvent);
router.get("/page/:eventId", authenticate, getEventPage);
router.get("/link/:eventLink", getEventByLink);
router.post("/generateGuestCode", generateGuestCode);
router.patch(
  "/updateGuestCodeCondition/:eventId",
  authenticate,
  updateGuestCodeCondition
);
router.post(
  "/compressAndOptimizeFiles",
  authenticate,
  upload,
  compressAndOptimizeFiles
);

router.post("/uploadVideoToS3", authenticate, uploadSingle, uploadVideoToS3);

router.delete("/deleteDroppedFile/:fileName", authenticate, deleteDroppedFile);
router.get(
  "/getSignedUrlForDownload/:fileName",
  authenticate,
  getSignedUrlForDownload
);
module.exports = router;
