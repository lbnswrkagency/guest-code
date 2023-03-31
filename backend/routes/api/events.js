const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const {
  createEvent,
  getAllEvents,
  editEvent,
  deleteEvent,
  getEvent,
  getEventPage,
  getEventByLink,
  generateGuestCode,
} = require("../../controllers/eventsController");

router.post("/", authenticate, createEvent);
router.get("/", authenticate, getAllEvents);
router.put("/:eventId", authenticate, editEvent);
router.delete("/:eventId", authenticate, deleteEvent);
router.get("/:eventId", authenticate, getEvent);
router.get("/page/:eventId", authenticate, getEventPage);
router.get("/link/:eventLink", getEventByLink);
router.post("/generateGuestCode", generateGuestCode);

module.exports = router;
