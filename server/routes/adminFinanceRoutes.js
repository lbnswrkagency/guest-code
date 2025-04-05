const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const adminFinanceController = require("../controllers/adminFinanceController");

// Ensure all routes are protected and only accessible by admins
router.use(isAuthenticated, isAdmin);

// Financial dashboard data
router.get("/dashboard", adminFinanceController.getFinancialDashboard);

// Ledger entries with pagination and filtering
router.get("/ledger", adminFinanceController.getLedgerEntries);

// Process commission payments in batch
router.post(
  "/commissions/process-batch",
  adminFinanceController.processCommissionBatch
);

// Generate tax reports
router.get("/reports/tax", adminFinanceController.generateTaxReport);

// Export financial data (orders, commissions, ledger)
router.get("/export", adminFinanceController.exportFinancialData);

module.exports = router;
