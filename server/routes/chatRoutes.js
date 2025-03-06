// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticateToken } = require("../middleware/auth");

router.post("/", authenticateToken, chatController.createChat);
router.get("/", authenticateToken, chatController.getChats);

module.exports = router;
