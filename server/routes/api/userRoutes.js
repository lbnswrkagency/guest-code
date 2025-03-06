const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/authMiddleware");
const usersController = require("../../controllers/usersController");

// ... rest of your routes ...

module.exports = router;
