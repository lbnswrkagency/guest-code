// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const messageController = require("../controllers/messageController");

router.get("/global", authenticateToken, messageController.getGlobalMessages);
router.get("/:chatId", authenticateToken, messageController.getMessages);
router.post("/send", authenticateToken, messageController.sendMessage);

module.exports = router;
