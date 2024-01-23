const FriendsCode = require("../models/FriendsCode");
const BackstageCode = require("../models/BackstageCode");
const GuestCode = require("../models/GuestCode");
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
  const { startDate, endDate } = req.query;

  // Log the received start and end dates

  try {
    // Define the match condition based on the provided dates
    const matchCondition = {};
    if (startDate) {
      const start = moment(startDate)
        .tz("Europe/Athens")
        .set({ hour: 6, minute: 0, second: 0, millisecond: 0 })
        .toDate();
      matchCondition.createdAt = { $gte: start };
    }
    if (endDate) {
      const end = moment(endDate)
        .tz("Europe/Athens")
        .set({ hour: 6, minute: 0, second: 0, millisecond: 0 })
        .toDate();
      matchCondition.createdAt = matchCondition.createdAt || {};
      matchCondition.createdAt.$lte = end;
    }

    // Aggregate FriendsCodes with the match condition
    const friendsCounts = await FriendsCode.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$host",
          total: { $sum: 1 },
          used: { $sum: { $cond: [{ $gt: ["$paxChecked", 0] }, 1, 0] } },
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

    // Aggregate BackstageCodes with the match condition
    const backstageCounts = await BackstageCode.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$host",
          total: { $sum: 1 },
          used: { $sum: { $cond: [{ $gt: ["$paxChecked", 0] }, 1, 0] } },
        },
      },
    ]);

    // Return the aggregated counts
    res.json({
      friendsCounts,
      guestCounts: guestCounts[0] || { total: 0, used: 0 },
      backstageCounts,
    });
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
