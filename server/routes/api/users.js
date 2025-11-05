const express = require("express");
const router = express.Router();
const { getUser } = require("../../controllers/usersController");

// Get user route
router.get("/:id", getUser);

module.exports = router;
