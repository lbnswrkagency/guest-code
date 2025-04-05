const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Commission = require("../models/commissionModel");
const TransactionLedger = require("../models/transactionLedgerModel");

/**
 * Get financial dashboard data with summary metrics
 */
exports.getFinancialDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Create date filters
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get revenue metrics
    const revenueMetrics = await Order.aggregate([
      { $match: { ...dateFilter, status: "completed" } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          totalOriginalAmount: { $sum: "$originalAmount" },
          avgOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]);

    // Get commission metrics
    const commissionMetrics = await Commission.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$commissionAmount" },
        },
      },
    ]);

    // Format commission data
    const commissionData = {
      pending: 0,
      paid: 0,
      cancelled: 0,
      pendingCount: 0,
      paidCount: 0,
      cancelledCount: 0,
      total: 0,
      totalCount: 0,
    };

    commissionMetrics.forEach((metric) => {
      if (metric._id) {
        commissionData[metric._id] = metric.amount;
        commissionData[`${metric._id}Count`] = metric.count;
        commissionData.total += metric.amount;
        commissionData.totalCount += metric.count;
      }
    });

    // Get fiscal quarter breakdown
    const quarterlyData = await TransactionLedger.aggregate([
      {
        $match: {
          ...dateFilter,
          transactionType: "sale",
        },
      },
      {
        $group: {
          _id: {
            year: "$fiscalYear",
            quarter: "$fiscalQuarter",
          },
          totalRevenue: { $sum: "$amount" },
          taxAmount: { $sum: "$taxAmount" },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.quarter": -1 } },
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        revenue: revenueMetrics[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          totalOriginalAmount: 0,
          avgOrderValue: 0,
        },
        commissions: commissionData,
        quarterlyBreakdown: quarterlyData,
      },
    });
  } catch (error) {
    console.error(
      "[AdminFinanceController] Error getting financial dashboard:",
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve financial dashboard",
      error: error.message,
    });
  }
};

/**
 * Get ledger entries with pagination and filtering
 */
exports.getLedgerEntries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      transactionType,
      fiscalYear,
      fiscalQuarter,
    } = req.query;

    const skip = (page - 1) * limit;

    // Build filter criteria
    const filterCriteria = {};

    if (startDate && endDate) {
      filterCriteria.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (transactionType) {
      filterCriteria.transactionType = transactionType;
    }

    if (fiscalYear) {
      filterCriteria.fiscalYear = parseInt(fiscalYear);
    }

    if (fiscalQuarter) {
      filterCriteria.fiscalQuarter = parseInt(fiscalQuarter);
    }

    // Get total count
    const totalCount = await TransactionLedger.countDocuments(filterCriteria);

    // Get ledger entries
    const ledgerEntries = await TransactionLedger.find(filterCriteria)
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate([
        {
          path: "orderId",
          select: "invoiceNumber originalAmount originalCurrency totalAmount",
        },
        {
          path: "commissionId",
          select: "status commissionAmount commissionRate paidToUser",
        },
        { path: "eventId", select: "title startDate" },
        { path: "userId", select: "firstName lastName email" },
      ]);

    return res.status(200).json({
      status: "success",
      data: {
        ledgerEntries,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error(
      "[AdminFinanceController] Error getting ledger entries:",
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve ledger entries",
      error: error.message,
    });
  }
};

/**
 * Process a batch of commission payments
 */
exports.processCommissionBatch = async (req, res) => {
  try {
    const { commissionIds, paymentMethod, notes } = req.body;

    if (
      !commissionIds ||
      !Array.isArray(commissionIds) ||
      commissionIds.length === 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Commission IDs are required",
      });
    }

    // Generate a batch ID
    const batchId = `BATCH-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 5)}`;
    const paidDate = new Date();

    // Update all commissions in the batch
    const updateResult = await Commission.updateMany(
      {
        _id: { $in: commissionIds.map((id) => mongoose.Types.ObjectId(id)) },
        status: "pending",
        paidToUser: false,
      },
      {
        $set: {
          status: "paid",
          paidToUser: true,
          paidDate,
          settlementBatchId: batchId,
          settlementDate: paidDate,
          paymentMethod: paymentMethod || "manual",
          paymentReference: batchId,
          notes:
            notes || `Batch payment processed on ${paidDate.toISOString()}`,
          isReconciled: true,
          reconciledBy: req.user.username || req.user.email,
          reconciledDate: paidDate,
        },
      }
    );

    // Create ledger entries for the payments
    const commissions = await Commission.find({
      _id: { $in: commissionIds.map((id) => mongoose.Types.ObjectId(id)) },
    });

    // Process each paid commission
    for (const commission of commissions) {
      await TransactionLedger.create({
        transactionDate: paidDate,
        transactionType: "payout",
        description: `Commission payment for event ${commission.eventId}`,
        debitAccount: "accounts_payable", // Reduce what we owe
        creditAccount: "cash", // Reduce our cash
        amount: commission.commissionAmount,
        currency: "USD",
        commissionId: commission._id,
        orderId: commission.orderId,
        eventId: commission.eventId,
        userId: commission.userId,
        fiscalYear: new Date(paidDate).getFullYear(),
        fiscalQuarter: Math.floor(new Date(paidDate).getMonth() / 3) + 1,
        fiscalMonth: new Date(paidDate).getMonth() + 1,
        notes: `Batch payment: ${batchId}`,
        createdBy: req.user.username || req.user.email,
        isReconciled: true,
      });
    }

    return res.status(200).json({
      status: "success",
      message: `Processed ${updateResult.nModified} commission payments in batch ${batchId}`,
      data: {
        batchId,
        processed: updateResult.nModified,
        total: commissionIds.length,
      },
    });
  } catch (error) {
    console.error(
      "[AdminFinanceController] Error processing commission batch:",
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to process commission batch",
      error: error.message,
    });
  }
};

/**
 * Generate tax reports
 */
exports.generateTaxReport = async (req, res) => {
  try {
    const { year, quarter, month } = req.query;

    if (!year) {
      return res.status(400).json({
        status: "error",
        message: "Year is required for tax report",
      });
    }

    const filterCriteria = { fiscalYear: parseInt(year) };

    if (quarter) {
      filterCriteria.fiscalQuarter = parseInt(quarter);
    }

    if (month) {
      filterCriteria.fiscalMonth = parseInt(month);
    }

    // Get sales tax data
    const salesTaxData = await TransactionLedger.aggregate([
      {
        $match: {
          ...filterCriteria,
          transactionType: "sale",
          taxAmount: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$taxJurisdiction",
          totalTax: { $sum: "$taxAmount" },
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { totalTax: -1 } },
    ]);

    // Get income data
    const incomeData = await TransactionLedger.aggregate([
      {
        $match: {
          ...filterCriteria,
          $or: [{ transactionType: "sale" }, { transactionType: "commission" }],
        },
      },
      {
        $group: {
          _id: "$transactionType",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate net income
    const netIncome = {};
    incomeData.forEach((item) => {
      netIncome[item._id] = item.totalAmount;
    });

    const taxReport = {
      period: {
        year: parseInt(year),
        quarter: quarter ? parseInt(quarter) : null,
        month: month ? parseInt(month) : null,
      },
      salesTax: {
        byJurisdiction: salesTaxData,
        total: salesTaxData.reduce((sum, item) => sum + item.totalTax, 0),
      },
      income: {
        gross: netIncome.sale || 0,
        commissions: netIncome.commission || 0,
        net: (netIncome.sale || 0) - (netIncome.commission || 0),
      },
      estimatedTaxLiability: {
        federal: ((netIncome.sale || 0) - (netIncome.commission || 0)) * 0.21, // 21% estimated US corporate tax
        state: ((netIncome.sale || 0) - (netIncome.commission || 0)) * 0.05, // 5% estimated state tax
      },
    };

    return res.status(200).json({
      status: "success",
      data: taxReport,
    });
  } catch (error) {
    console.error(
      "[AdminFinanceController] Error generating tax report:",
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to generate tax report",
      error: error.message,
    });
  }
};

/**
 * Export financial data
 */
exports.exportFinancialData = async (req, res) => {
  try {
    const { format, startDate, endDate, type } = req.query;

    if (!format || !["csv", "json"].includes(format)) {
      return res.status(400).json({
        status: "error",
        message: "Valid format (csv or json) is required",
      });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    let data;

    switch (type) {
      case "orders":
        data = await Order.find({ ...dateFilter, status: "completed" })
          .populate("eventId", "title startDate")
          .sort({ createdAt: -1 });
        break;

      case "commissions":
        data = await Commission.find(dateFilter)
          .populate("eventId", "title startDate")
          .populate("userId", "firstName lastName email")
          .populate("orderId", "invoiceNumber totalAmount")
          .sort({ createdAt: -1 });
        break;

      case "ledger":
        data = await TransactionLedger.find(dateFilter).sort({
          transactionDate: -1,
        });
        break;

      default:
        data = await TransactionLedger.find(dateFilter).sort({
          transactionDate: -1,
        });
    }

    if (format === "json") {
      return res.status(200).json({
        status: "success",
        data,
      });
    } else if (format === "csv") {
      // This would handle CSV export but requires further implementation
      // For now, just return JSON data for CSV format too
      return res.status(200).json({
        status: "success",
        message: "CSV export not yet implemented, returning JSON",
        data,
      });
    }
  } catch (error) {
    console.error(
      "[AdminFinanceController] Error exporting financial data:",
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to export financial data",
      error: error.message,
    });
  }
};
