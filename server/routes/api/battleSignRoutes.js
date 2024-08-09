const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const battleSignController = require("../../controllers/battleSignController");

router.post("/add", battleSignController.addBattleSign);
router.get("/fetch", authenticate, battleSignController.fetchBattleSigns);

module.exports = router;
