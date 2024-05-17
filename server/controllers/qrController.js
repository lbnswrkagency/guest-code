const FriendsCode = require("../models/FriendsCode");
const BackstageCode = require("../models/BackstageCode");
const GuestCode = require("../models/GuestCode");
const TableCode = require("../models/TableCode");
const User = require("../models/User");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");
const InvitationCode = require("../models/InvitationModel"); // Ensure this path is correct
const mongoose = require("mongoose");

const validateTicket = async (req, res) => {
  try {
    const ticketId = req.body.ticketId;
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
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCounts = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const matchCondition = {};

    // Adding user filter if userId is provided
    if (userId) {
      matchCondition.userId = mongoose.Types.ObjectId(userId);
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
          _id: "$name", // Group by name to differentiate different invitations
          totalPax: { $sum: "$pax" }, // Sum of all pax for this invitation
          totalPaxChecked: { $sum: "$paxChecked" }, // Sum of all checked-in pax
        },
      },
      {
        $project: {
          name: "$_id",
          total: "$totalPax",
          used: "$totalPaxChecked",
          _id: 0, // Omit the _id in the output
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
          name: "$user_info.name",
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
          name: "$user_info.name",
          avatar: "$user_info.avatar",
          total: 1,
          used: 1,
        },
      },
    ]);

    // Aggregate GuestCodes with the match condition
    const guestCounts = await GuestCode.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$name", // Group by name to differentiate different guests
          totalPax: { $sum: "$pax" }, // Sum of all pax for this guest
          totalPaxChecked: { $sum: "$paxChecked" }, // Sum of all checked-in pax
        },
      },
      {
        $project: {
          name: "$_id",
          total: "$totalPax",
          used: "$totalPaxChecked",
          _id: 0, // Omit the _id in the output
        },
      },
    ]);

    const tableCounts = await TableCode.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "users", // Assuming "users" is your user collection name
          localField: "hostId",
          foreignField: "_id",
          as: "user_info",
        },
      },
      { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1, // Assuming this is the name of the event or table code
          host: "$user_info.name", // User's name from the joined user document
          avatar: "$user_info.avatar", // User's avatar from the joined user document
          total: "$pax",
          used: "$paxChecked",
          table: "$tableNumber",
          createdAt: 1, // Include the createdAt field from the TableCode schema
        },
      },
    ]);

    res.json({
      friendsCounts,
      guestCounts,
      backstageCounts,
      tableCounts,
      invitationCounts,
    });
  } catch (error) {
    console.error("Error fetching counts", error);
    res.status(500).json({ message: error.message });
  }
};

const getUserSpecificCounts = async (req, res) => {
  const userId = req.query.userId; // Ensure the userID is passed as a query parameter

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Correctly instantiate ObjectId
    const objectId = new mongoose.Types.ObjectId(userId);
    const aggregateQuery = [
      { $match: { hostId: objectId } },
      {
        $group: {
          _id: null,
          totalGenerated: { $sum: { $ifNull: ["$pax", 0] } }, // Using $ifNull to handle missing values
          totalChecked: { $sum: { $ifNull: ["$paxChecked", 0] } },
        },
      },
    ];

    const friendsCounts = await FriendsCode.aggregate(aggregateQuery);
    const backstageCounts = await BackstageCode.aggregate(aggregateQuery);
    const tableCounts = await TableCode.aggregate(aggregateQuery);

    // Calculate total generated and checked-in counts
    const totalGenerated =
      (friendsCounts[0]?.totalGenerated || 0) +
      (backstageCounts[0]?.totalGenerated || 0) +
      (tableCounts[0]?.totalGenerated || 0);

    const totalChecked =
      (friendsCounts[0]?.totalChecked || 0) +
      (backstageCounts[0]?.totalChecked || 0) +
      (tableCounts[0]?.totalChecked || 0);

    // console.log("TOTAL GENERATED", totalGenerated);
    // console.log("TOTAL CHECKED", totalChecked);

    res.json({
      totalGenerated,
      totalChecked,
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
