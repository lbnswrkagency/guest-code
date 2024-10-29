// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const messageController = require("../controllers/messageController");

router.get("/global", authenticate, messageController.getGlobalMessages);
router.post("/", authenticate, messageController.sendMessage);

module.exports = router;
