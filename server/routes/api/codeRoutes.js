// codeRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const codeController = require("../../controllers/codeController");

// Existing routes...
router.get("/:type/codes", authenticate, codeController.fetchCodes);
router.delete("/:type/delete/:codeId", authenticate, codeController.deleteCode);
router.put("/:type/edit/:codeId", authenticate, codeController.editCode);
router.post("/:type/add", authenticate, codeController.addCode);
router.get(
  "/:type/code/:codeId",
  authenticate,
  codeController.generateCodeImage
);

// New route for updating status
router.put(
  "/:type/status/:codeId",
  authenticate,
  codeController.updateCodeStatus
);

// New route for generating and sending a code via email
router.post(
  "/:type/generate-and-send",
  authenticate,
  codeController.generateAndSendCode
);

module.exports = router;
