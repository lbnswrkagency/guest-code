const express = require("express");
const avatarController = require("../../controllers/avatarController");

const router = express.Router();

// Existing route
router.post("/add/avatar", avatarController.addAvatar);

// New route for profile image upload
router.post("/profile-img-upload", avatarController.uploadAvatar);

module.exports = router;
