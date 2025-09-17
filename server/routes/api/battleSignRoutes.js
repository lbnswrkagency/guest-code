const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const { optionalAuthenticateToken } = require("../../middleware/auth");
const battleSignController = require("../../controllers/battleSignController");

// Battle sign registration (public endpoint)
router.post("/add", battleSignController.addBattleSign);

// Admin endpoints for managing battle signs (require authentication)
router.get("/fetch", authenticate, battleSignController.fetchBattleSigns);
router.post(
  "/:action/:id",
  authenticate,
  battleSignController.updateBattleSignStatus
);

// Admin email notification endpoints (following table system pattern)
router.post("/battle/:battleId/confirm", authenticate, battleSignController.sendBattleConfirmationEmail);
router.post("/battle/:battleId/decline", authenticate, battleSignController.sendBattleDeclineEmail);
router.post("/battle/:battleId/cancel", authenticate, battleSignController.sendBattleCancellationEmail);
router.delete("/battle/:battleId", authenticate, battleSignController.deleteBattleSignup);

// ActionButtons compatible endpoints (for consistency with other components)
router.post("/confirm/:id", authenticate, (req, res) => {
  req.params.battleId = req.params.id;
  battleSignController.sendBattleConfirmationEmail(req, res);
});
router.post("/decline/:id", authenticate, (req, res) => {
  req.params.battleId = req.params.id;
  battleSignController.sendBattleDeclineEmail(req, res);
});
router.post("/reset/:id", authenticate, (req, res) => {
  // Reset is just setting status back to pending, use the existing updateBattleSignStatus
  req.body = { action: "reset" };
  battleSignController.updateBattleSignStatus(req, res);
});

// Event-specific battle endpoints
router.get("/stats/:eventId", authenticate, battleSignController.getBattleStats);
router.get("/config/:eventId", optionalAuthenticateToken, battleSignController.getBattleConfig);

module.exports = router;
