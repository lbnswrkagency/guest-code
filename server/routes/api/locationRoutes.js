const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const {
  createLocation,
  getAllLocations,
  getLocation,
  updateLocation,
  deleteLocation,
} = require("../../controllers/locationController");

// Location CRUD routes
router.post("/", authenticate, createLocation);
router.get("/", authenticate, getAllLocations);
router.get("/:locationId", authenticate, getLocation);
router.put("/:locationId", authenticate, updateLocation);
router.delete("/:locationId", authenticate, deleteLocation);

module.exports = router;
