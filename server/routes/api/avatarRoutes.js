const express = require("express");
const multer = require("multer");
const avatarController = require("../../controllers/avatarController");
const router = express.Router();

// Configure multer for file storage
const storage = multer.memoryStorage(); // Adjust as needed
const upload = multer({ storage: storage });

router.post("/add/avatar", avatarController.addAvatar);
router.post(
  "/profile-img-upload",
  upload.single("profileImage"),
  avatarController.uploadAvatar
);

module.exports = router;
