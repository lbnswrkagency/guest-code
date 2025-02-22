const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const eventsController = require("../controllers/eventsController");
const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
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

// Logging middleware for event routes
const eventRouteLogger = (req, res, next) => {
  console.log("[Event Route]", {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    userId: req.user?._id,
  });
  next();
};

router.use(eventRouteLogger);

// Event CRUD routes
router.post(
  "/events/brand/:brandId",
  auth,
  upload.fields([
    { name: "flyer.landscape", maxCount: 1 },
    { name: "flyer.portrait", maxCount: 1 },
    { name: "flyer.square", maxCount: 1 },
  ]),
  eventsController.createEvent
);

router.get("/events", auth, eventsController.getAllEvents);
router.get("/events/:eventId", auth, eventsController.getEvent);
router.put("/events/:eventId", auth, eventsController.editEvent);
router.delete("/events/:eventId", auth, eventsController.deleteEvent);

// Separate flyer upload routes - match the frontend URL pattern
router.put(
  "/events/:eventId/flyer/:format",
  auth,
  upload.single("flyer"),
  async (req, res) => {
    const { format } = req.params;
    switch (format) {
      case "landscape":
        return eventsController.updateLandscapeFlyer(req, res);
      case "portrait":
        return eventsController.updatePortraitFlyer(req, res);
      case "square":
        return eventsController.updateSquareFlyer(req, res);
      default:
        return res.status(400).json({ message: "Invalid flyer format" });
    }
  }
);

module.exports = router;
