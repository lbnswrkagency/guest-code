const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const {
  getCommissionBalance,
  getCommissionHistory,
  getAdminCommissionReport,
} = require("../controllers/commissionController");

// User commission routes
router.get("/balance", isAuthenticated, getCommissionBalance);
router.get("/history", isAuthenticated, getCommissionHistory);

// Admin-only commission routes
router.get("/admin/report", isAuthenticated, isAdmin, getAdminCommissionReport);

module.exports = router;
