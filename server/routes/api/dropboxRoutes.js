const express = require("express");
const router = express.Router();
const dropboxController = require("../../controllers/dropboxController");

router.get("/folder", dropboxController.getFolderContents);
router.get("/download/:path", dropboxController.getDownloadLink);

router.post("/upload", dropboxController.uploadFile);

module.exports = router;
