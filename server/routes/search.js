const express = require("express");
const router = express.Router();
const { searchUsers } = require("../controllers/searchController");
const { authenticateToken } = require("../middleware/auth");

router.get("/users", authenticateToken, searchUsers);

module.exports = router;
