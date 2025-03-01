const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticate } = require("../../middleware/authMiddleware");
const {
  createLineUp,
  updateLineUp,
  deleteLineUp,
  getLineUpsByEvent,
  getLineUpsByBrand,
  getLineUpById,
  addLineUpToEvent,
  removeLineUpFromEvent,
} = require("../../controllers/lineUpController");

// Configure multer storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Brand-specific lineups
router.get("/brand/:brandId", authenticate, getLineUpsByBrand);

// Event-specific lineups
router.get("/event/:eventId", authenticate, getLineUpsByEvent);

// Single lineup
router.get("/:id", authenticate, getLineUpById);

// Create, update, delete
router.post("/", authenticate, upload.single("avatar"), createLineUp);
router.put("/:id", authenticate, upload.single("avatar"), updateLineUp);
router.delete("/:id", authenticate, deleteLineUp);

// Event association routes
router.post("/:lineUpId/events/:eventId", authenticate, addLineUpToEvent);
router.delete(
  "/:lineUpId/events/:eventId",
  authenticate,
  removeLineUpFromEvent
);

module.exports = router;
