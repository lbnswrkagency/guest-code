const FriendsCode = require("../models/FriendsCode");
const BackstageCode = require("../models/BackstageCode");
const GuestCode = require("../models/GuestCode");
const User = require("../models/User");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");
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
        // Add the check for BackstageCode here
        const backstageCodeTicket = await BackstageCode.findById(ticketId);
        if (backstageCodeTicket) {
          ticket = backstageCodeTicket;
          typeOfTicket = "Backstage-Code";
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Add the typeOfTicket to the ticket object before sending it
    res.json({ ...ticket.toObject(), typeOfTicket });
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

    res.json({ friendsCounts, guestCounts, backstageCounts });
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
