const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const {
  createBrand,
  getAllBrands,
  getBrand,
  updateBrand,
  deleteBrand,
} = require("../../controllers/brandController");

// Brand CRUD routes
router.post("/", authenticate, createBrand);
router.get("/", authenticate, getAllBrands);
router.get("/:brandId", authenticate, getBrand);
router.put("/:brandId", authenticate, updateBrand);
router.delete("/:brandId", authenticate, deleteBrand);

module.exports = router;
