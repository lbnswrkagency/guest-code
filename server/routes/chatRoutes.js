// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticate } = require("../middleware/authMiddleware"); // Note the destructuring here

router.post("/", authenticate, chatController.createChat);
router.get("/", authenticate, chatController.getChats);

module.exports = router;
