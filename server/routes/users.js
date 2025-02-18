const express = require("express");
const router = express.Router();
const { getUser, searchUsers } = require("../controllers/usersController");
const { authenticateToken } = require("../middleware/auth");

router.get("/search", authenticateToken, searchUsers);
router.get("/:id", authenticateToken, getUser);

module.exports = router;
