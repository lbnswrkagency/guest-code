// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/", authenticate, messageController.sendMessage);
router.get("/global", authenticate, messageController.getGlobalMessages);
router.get("/:chatId", authenticate, messageController.getMessages);

module.exports = router;
