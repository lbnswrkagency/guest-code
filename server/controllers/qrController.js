const FriendsCode = require("../models/FriendsCode");
const BackstageCode = require("../models/BackstageCode");
const GuestCode = require("../models/GuestCode");
const TableCode = require("../models/TableCode");
const User = require("../models/User");
const Code = require("../models/codesModel");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");
const InvitationCode = require("../models/InvitationModel"); // Ensure this path is correct
const mongoose = require("mongoose");

const validateTicket = async (req, res) => {
  try {
    const ticketId = req.body.ticketId;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket code" });
    }

    let ticket;
    let typeOfTicket;

    const friendsCodeTicket = await FriendsCode.findById(ticketId);
    if (friendsCodeTicket) {
      ticket = friendsCodeTicket;
      typeOfTicket = "Friends-Code";
    } else {
      const guestCodeTicket = await GuestCode.findById(ticketId);
      if (guestCodeTicket) {
        ticket = guestCodeTicket;
        typeOfTicket = "Guest-Code";
      } else {
        const backstageCodeTicket = await BackstageCode.findById(ticketId);
        if (backstageCodeTicket) {
          ticket = backstageCodeTicket;
          typeOfTicket = "Backstage-Code";
        } else {
          const tableCodeTicket = await TableCode.findById(ticketId);
          if (tableCodeTicket) {
            ticket = tableCodeTicket;
            typeOfTicket = "Table-Code";
          } else {
            const invitationCodeTicket = await InvitationCode.findById(
              ticketId
            );
            if (invitationCodeTicket) {
              ticket = invitationCodeTicket;
              typeOfTicket = "Invitation-Code";
            } else {
              const newCodeTicket = await Code.findById(ticketId);
              if (newCodeTicket) {
                ticket = newCodeTicket;
                const type =
                  newCodeTicket.type.charAt(0).toUpperCase() +
                  newCodeTicket.type.slice(1);
                typeOfTicket = `${type}-Code`;
              }
            }
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticketData = ticket.toObject ? ticket.toObject() : ticket;
    res.json({ ...ticketData, typeOfTicket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const increasePax = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    let ticket = await FriendsCode.findByIdAndUpdate(
      ticketId,
      { $inc: { paxChecked: 1 } },
      { new: true }
    );

    if (!ticket) {
      ticket = await GuestCode.findByIdAndUpdate(
        ticketId,
        { $inc: { paxChecked: 1 } },
        { new: true }
      );
    }

    if (!ticket) {
      ticket = await BackstageCode.findByIdAndUpdate(
        ticketId,
        { $inc: { paxChecked: 1 } },
        { new: true }
      );
    }

    if (!ticket) {
      ticket = await TableCode.findByIdAndUpdate(
        ticketId,
        { $inc: { paxChecked: 1 } },
        { new: true }
      );
    }

    if (!ticket) {
      ticket = await InvitationCode.findByIdAndUpdate(
        ticketId,
        { $inc: { paxChecked: 1 } },
        { new: true }
      );
    }

    if (!ticket) {
      const newCodeTicket = await Code.findById(ticketId);

      if (newCodeTicket) {
        if (newCodeTicket.paxChecked < newCodeTicket.maxPax) {
          ticket = await Code.findByIdAndUpdate(
            ticketId,
            {
              $inc: { paxChecked: 1, usageCount: 1 },
              $push: {
                usage: {
                  timestamp: new Date(),
                  paxUsed: 1,
                  userId: req.user._id,
                  location: "Scanner App",
                  deviceInfo: req.headers["user-agent"] || "Unknown Device",
                },
              },
            },
            { new: true }
          );
        } else {
          return res.status(400).json({
            message: "Maximum allowed pax reached",
            paxChecked: newCodeTicket.paxChecked,
            maxPax: newCodeTicket.maxPax,
          });
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const decreasePax = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    let ticket = await FriendsCode.findByIdAndUpdate(
      ticketId,
      { $inc: { paxChecked: -1 } },
      { new: true }
    );

    if (!ticket) {
      ticket = await GuestCode.findByIdAndUpdate(
        ticketId,
        { $inc: { paxChecked: -1 } },
        { new: true }
      );
    }

    if (!ticket) {
      ticket = await BackstageCode.findByIdAndUpdate(
        ticketId,
        { $inc: { paxChecked: -1 } },
        { new: true }
      );
    }

    if (!ticket) {
      ticket = await TableCode.findByIdAndUpdate(
        ticketId,
        { $inc: { paxChecked: -1 } },
        { new: true }
      );
    }

    if (!ticket) {
      ticket = await InvitationCode.findByIdAndUpdate(
        ticketId,
        { $inc: { paxChecked: -1 } },
        { new: true }
      );
    }

    if (!ticket) {
      const newCodeTicket = await Code.findById(ticketId);

      if (newCodeTicket) {
        if (newCodeTicket.paxChecked > 0) {
          ticket = await Code.findByIdAndUpdate(
            ticketId,
            {
              $inc: { paxChecked: -1 },
              $push: {
                usage: {
                  timestamp: new Date(),
                  paxUsed: -1,
                  userId: req.user._id,
                  location: "Scanner App",
                  deviceInfo: req.headers["user-agent"] || "Unknown Device",
                },
              },
            },
            { new: true }
          );
        } else {
          return res.status(400).json({
            message: "Pax checked is already at minimum",
            paxChecked: newCodeTicket.paxChecked,
          });
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCounts = async (req, res) => {
  try {
    const { startDate, endDate, userId, eventId } = req.query;
    const matchCondition = {};

    if (userId) {
      matchCondition.userId = mongoose.Types.ObjectId(userId);
    }

    if (eventId) {
      matchCondition.eventId = mongoose.Types.ObjectId(eventId);
    }

    if (startDate) {
      matchCondition.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      matchCondition.createdAt = matchCondition.createdAt || {};
      matchCondition.createdAt.$lte = new Date(endDate);
    }

    const invitationCounts = await InvitationCode.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$name",
          totalPax: { $sum: "$pax" },
          totalPaxChecked: { $sum: "$paxChecked" },
        },
      },
      {
        $project: {
          name: "$_id",
          total: "$totalPax",
          used: "$totalPaxChecked",
          _id: 0,
        },
      },
    ]);

    const friendsCounts = await FriendsCode.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$hostId",
          total: { $sum: 1 },
          used: { $sum: "$paxChecked" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      { $unwind: "$user_info" },
      {
        $project: {
          name: "$user_info.firstName",
          avatar: "$user_info.avatar",
          total: 1,
          used: 1,
        },
      },
    ]);

    const backstageCounts = await BackstageCode.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$hostId",
          total: { $sum: 1 },
          used: { $sum: "$paxChecked" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      { $unwind: "$user_info" },
      {
        $project: {
          name: "$user_info.firstName",
          avatar: "$user_info.avatar",
          total: 1,
          used: 1,
        },
      },
    ]);

    const guestCounts = await GuestCode.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$name",
          totalPax: { $sum: "$pax" },
          totalPaxChecked: { $sum: "$paxChecked" },
        },
      },
      {
        $project: {
          name: "$_id",
          total: "$totalPax",
          used: "$totalPaxChecked",
          _id: 0,
        },
      },
    ]);

    const tableCounts = await TableCode.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "users",
          localField: "hostId",
          foreignField: "_id",
          as: "user_info",
        },
      },
      { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          host: "$user_info.firstName",
          avatar: "$user_info.avatar",
          total: "$pax",
          used: "$paxChecked",
          table: "$tableNumber",
          status: 1,
          createdAt: 1,
        },
      },
    ]);

    let newCodeCounts = [];
    if (eventId) {
      newCodeCounts = await Code.aggregate([
        {
          $match: {
            ...matchCondition,
            eventId: mongoose.Types.ObjectId(eventId),
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            totalPax: { $sum: "$maxPax" },
            usedPax: { $sum: "$paxChecked" },
          },
        },
        {
          $project: {
            type: "$_id",
            name: {
              $concat: [
                { $toUpper: { $substrCP: ["$_id", 0, 1] } },
                { $substrCP: ["$_id", 1, { $strLenCP: "$_id" }] },
                " Code",
              ],
            },
            count: 1,
            total: "$totalPax",
            used: "$usedPax",
            _id: 0,
          },
        },
      ]);
    }

    res.json({
      friendsCounts,
      guestCounts,
      backstageCounts,
      tableCounts,
      invitationCounts,
      newCodeCounts,
    });
  } catch (error) {
    console.error("Error fetching counts", error);
    res.status(500).json({ message: error.message });
  }
};

const getUserSpecificCounts = async (req, res) => {
  const userId = req.query.userId;
  const eventId = req.query.eventId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const objectId = new mongoose.Types.ObjectId(userId);
    const aggregateQuery = [
      { $match: { hostId: objectId } },
      {
        $group: {
          _id: null,
          totalGenerated: { $sum: { $ifNull: ["$pax", 0] } },
          totalChecked: { $sum: { $ifNull: ["$paxChecked", 0] } },
        },
      },
    ];

    const friendsCounts = await FriendsCode.aggregate(aggregateQuery);
    const backstageCounts = await BackstageCode.aggregate(aggregateQuery);
    const tableCounts = await TableCode.aggregate(aggregateQuery);

    const totalGenerated =
      (friendsCounts[0]?.totalGenerated || 0) +
      (backstageCounts[0]?.totalGenerated || 0) +
      (tableCounts[0]?.totalGenerated || 0);

    const totalChecked =
      (friendsCounts[0]?.totalChecked || 0) +
      (backstageCounts[0]?.totalChecked || 0) +
      (tableCounts[0]?.totalChecked || 0);

    let newCodeGenerated = 0;
    let newCodeChecked = 0;

    if (eventId) {
      const newCodeMatch = {
        createdBy: objectId,
        eventId: mongoose.Types.ObjectId(eventId),
      };

      const newCodeCounts = await Code.aggregate([
        { $match: newCodeMatch },
        {
          $group: {
            _id: null,
            totalGenerated: { $sum: "$maxPax" },
            totalChecked: { $sum: "$paxChecked" },
          },
        },
      ]);

      if (newCodeCounts.length > 0) {
        newCodeGenerated = newCodeCounts[0].totalGenerated || 0;
        newCodeChecked = newCodeCounts[0].totalChecked || 0;
      }
    } else {
      const newCodeMatch = { createdBy: objectId };

      const newCodeCounts = await Code.aggregate([
        { $match: newCodeMatch },
        {
          $group: {
            _id: null,
            totalGenerated: { $sum: "$maxPax" },
            totalChecked: { $sum: "$paxChecked" },
          },
        },
      ]);

      if (newCodeCounts.length > 0) {
        newCodeGenerated = newCodeCounts[0].totalGenerated || 0;
        newCodeChecked = newCodeCounts[0].totalChecked || 0;
      }
    }

    const combinedGenerated = totalGenerated + newCodeGenerated;
    const combinedChecked = totalChecked + newCodeChecked;

    res.json({
      legacyGenerated: totalGenerated,
      legacyChecked: totalChecked,
      newGenerated: newCodeGenerated,
      newChecked: newCodeChecked,
      totalGenerated: combinedGenerated,
      totalChecked: combinedChecked,
    });
  } catch (error) {
    console.error("Error fetching user-specific counts", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  validateTicket,
  increasePax,
  decreasePax,
  getCounts,
  getUserSpecificCounts,
};
