const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const dropboxController = require("../../controllers/dropboxController");

router.get("/authorize", dropboxController.authorize);
router.get("/oauth/callback", dropboxController.oauthCallback);
router.get("/folder", authenticate, dropboxController.getFolderContents);

module.exports = router;
