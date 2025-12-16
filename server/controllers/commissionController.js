const Commission = require("../models/commissionModel");
const mongoose = require("mongoose");

/**
 * Get a user's commission balance summary
 */
const getCommissionBalance = async (req, res) => {
  try {
    const userId = req.user._id;

    // Aggregate commissions to get total, pending, and paid amounts
    const commissionSummary = await Commission.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$commissionAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Format result as an object with status as keys
    const summary = {
      total: 0,
      pending: 0,
      paid: 0,
      cancelled: 0,
    };

    // Process the aggregation results
    commissionSummary.forEach((group) => {
      if (group._id) {
        summary[group._id] = group.total;
      }
      summary.total += group.total;
    });

    return res.status(200).json({
      status: "success",
      data: summary,
    });
  } catch (error) {
    console.error(
      "[CommissionController] Error getting commission balance:",
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve commission balance",
      error: error.message,
    });
  }
};

/**
 * Get a user's commission history with pagination
 */
const getCommissionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status; // Optional filter by status

    // Build match criteria
    const matchCriteria = { userId: new mongoose.Types.ObjectId(userId) };
    if (status && ["pending", "paid", "cancelled"].includes(status)) {
      matchCriteria.status = status;
    }

    // Get total count for pagination
    const totalCount = await Commission.countDocuments(matchCriteria);

    // Get commission records with populated references
    const commissions = await Commission.find(matchCriteria)
      .populate({
        path: "eventId",
        select: "title startDate location",
      })
      .populate({
        path: "brandId",
        select: "name",
      })
      .populate({
        path: "orderId",
        select: "invoiceNumber totalAmount",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: "success",
      data: {
        commissions,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error(
      "[CommissionController] Error getting commission history:",
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve commission history",
      error: error.message,
    });
  }
};

/**
 * Get admin report on all commissions
 * This endpoint should be protected for admin access only
 */
const getAdminCommissionReport = async (req, res) => {
  try {
    // Verify admin status
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized access to admin reports",
      });
    }

    const { startDate, endDate, status, userId } = req.query;

    // Build filter criteria
    const filterCriteria = {};

    // Date range filter
    if (startDate && endDate) {
      filterCriteria.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Status filter
    if (status && ["pending", "paid", "cancelled"].includes(status)) {
      filterCriteria.status = status;
    }

    // User filter
    if (userId) {
      filterCriteria.userId = new mongoose.Types.ObjectId(userId);
    }

    // Aggregate commissions with grouping by user
    const report = await Commission.aggregate([
      { $match: filterCriteria },
      {
        $group: {
          _id: "$userId",
          totalCommission: { $sum: "$commissionAmount" },
          orderCount: { $sum: 1 },
          totalOrderValue: { $sum: "$orderAmount" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          userId: "$_id",
          userName: {
            $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"],
          },
          email: "$userDetails.email",
          totalCommission: 1,
          orderCount: 1,
          totalOrderValue: 1,
          averageCommission: { $divide: ["$totalCommission", "$orderCount"] },
        },
      },
      { $sort: { totalCommission: -1 } },
    ]);

    // Get overall totals
    const totals = await Commission.aggregate([
      { $match: filterCriteria },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$commissionAmount" },
          totalOrders: { $sum: 1 },
          totalOrderValue: { $sum: "$orderAmount" },
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        report,
        summary: totals[0] || {
          totalCommission: 0,
          totalOrders: 0,
          totalOrderValue: 0,
        },
      },
    });
  } catch (error) {
    console.error(
      "[CommissionController] Error getting admin commission report:",
      error
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to generate admin commission report",
      error: error.message,
    });
  }
};

module.exports = {
  getCommissionBalance,
  getCommissionHistory,
  getAdminCommissionReport,
};
