const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const friendsController = require("../../controllers/friendsController");

// POST route to add a friend's code
router.post("/add", authenticate, friendsController.addFriendsCode);

module.exports = router;
