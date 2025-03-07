const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  optionalAuthenticateToken,
} = require("../middleware/auth");
const { search } = require("../controllers/searchController");

// Unified search endpoint that handles users, brands, and events - accessible to public
router.get("/search", optionalAuthenticateToken, search);

module.exports = router;
