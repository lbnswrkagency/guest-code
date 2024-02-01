const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const codeController = require("../../controllers/codeController");

// Existing routes...
router.get("/:type/codes", authenticate, codeController.fetchCodes);
router.delete("/:type/delete/:codeId", authenticate, codeController.deleteCode);
router.put("/:type/edit/:codeId", authenticate, codeController.editCode);
router.post("/:type/add", authenticate, codeController.addCode);

// New route for on-demand QR code generation
router.get(
  "/:type/code/:codeId",
  authenticate,
  codeController.generateCodeImage
);

module.exports = router;
