const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/auth");
const {
  createBrand,
  getAllBrands,
  getBrand,
  updateBrand,
  deleteBrand,
} = require("../../controllers/brandController");

// Brand CRUD routes
router.post("/", authenticateToken, createBrand);
router.get("/", authenticateToken, getAllBrands);
router.get("/:brandId", authenticateToken, getBrand);
router.put("/:brandId", authenticateToken, updateBrand);
router.delete("/:brandId", authenticateToken, deleteBrand);

module.exports = router;
