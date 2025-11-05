const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware"); // Assuming you have auth middleware
const memberController = require("../../controllers/memberController");

// Lookup a member
router.get(
  "/lookup/:memberNumber",
  authenticate,
  memberController.lookupMember
);

// Register a new member
router.post("/register", authenticate, memberController.registerMember);

// Update member PAX (check-in/out)
router.put(
  "/pax/:memberNumber",
  authenticate,
  memberController.updateMemberPax
);

module.exports = router;
