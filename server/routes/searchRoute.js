const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { search } = require("../controllers/searchController");

// Unified search endpoint that handles users, brands, and events
router.get("/search", authenticateToken, search);

module.exports = router;
