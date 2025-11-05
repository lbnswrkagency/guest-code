const express = require("express");
const router = express.Router();
const {
  createGenre,
  getGenresByBrand,
  updateGenre,
  deleteGenre,
  getGenresByEvent,
} = require("../controllers/genreController");
const { authenticateToken } = require("../middleware/auth");

// Protected routes (require authentication)
router.post("/", authenticateToken, createGenre);
router.put("/:id", authenticateToken, updateGenre);
router.delete("/:id", authenticateToken, deleteGenre);

// Get genres by brand
router.get("/brand/:brandId", getGenresByBrand);

// Get genres by event
router.get("/event/:eventId", getGenresByEvent);

module.exports = router;
