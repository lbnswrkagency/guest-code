const FriendsCode = require("../models/FriendsCode");
const BackstageCode = require("../models/BackstageCode");
const GuestCode = require("../models/GuestCode");
const TableCode = require("../models/TableCode");
const User = require("../models/User");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");

const validateTicket = async (req, res) => {
  try {
    const ticketId = req.body.ticketId;
    let ticket;
    let typeOfTicket;

    // Checking for FriendsCode
    const friendsCodeTicket = await FriendsCode.findById(ticketId);
    if (friendsCodeTicket) {
      ticket = friendsCodeTicket;
      typeOfTicket = "Friends-Code";
    } else {
      // Checking for GuestCode
      const guestCodeTicket = await GuestCode.findById(ticketId);
      if (guestCodeTicket) {
        ticket = guestCodeTicket;
        typeOfTicket = "Guest-Code";
      } else {
        // Checking for BackstageCode
        const backstageCodeTicket = await BackstageCode.findById(ticketId);
        if (backstageCodeTicket) {
          ticket = backstageCodeTicket;
          typeOfTicket = "Backstage-Code";
        } else {
          // Checking for TableCode - adding this check
          const tableCodeTicket = await TableCode.findById(ticketId);
          if (tableCodeTicket) {
            ticket = tableCodeTicket;
            typeOfTicket = "Table-Code";
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Ensure ticket data is correctly formatted before sending
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
      // Check for TableCode
      ticket = await TableCode.findByIdAndUpdate(
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
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCounts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchCondition = {};

    if (startDate) {
      matchCondition.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      matchCondition.createdAt = matchCondition.createdAt || {};
      matchCondition.createdAt.$lte = new Date(endDate);
    }

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
          _id: null,
          total: { $sum: 1 },
          used: { $sum: "$paxChecked" },
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

    res.json({ friendsCounts, guestCounts, backstageCounts, tableCounts });
  } catch (error) {
    console.error("Error fetching counts", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  validateTicket,
  increasePax,
  decreasePax,
  getCounts,
};
