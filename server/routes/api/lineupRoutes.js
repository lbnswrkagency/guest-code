const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticate } = require("../../middleware/authMiddleware");
const {
  createLineUp,
  editLineUp,
  deleteLineUp,
  getLineUpsByEvent,
} = require("../../controllers/lineupController");

const upload = multer({ dest: "uploads/" }); // Update according to your storage config

router.post("/", authenticate, upload.single("avatar"), createLineUp);
router.put("/:id", authenticate, upload.single("avatar"), editLineUp);
router.delete("/:id", authenticate, deleteLineUp);
router.get("/event/:eventId", authenticate, getLineUpsByEvent);

module.exports = router;
