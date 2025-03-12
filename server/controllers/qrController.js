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

    console.log("QR Controller - Validating ticket:", ticketId);

    if (!ticketId) {
      return res.status(400).json({ message: "Ticket ID is required" });
    }

    let ticket;
    let typeOfTicket;
    let event = null;
    let hostName = null;

    // First check if this is a security token in the Code model
    const codeBySecurityToken = await Code.findOne({ securityToken: ticketId });

    if (codeBySecurityToken) {
      console.log(
        "Found code by security token in Code model:",
        codeBySecurityToken.code
      );
      ticket = codeBySecurityToken;
      typeOfTicket = `${
        ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)
      }-Code`;

      // Get the event details for this code
      if (ticket.eventId) {
        const Event = require("../models/eventsModel");
        event = await Event.findById(ticket.eventId);
        console.log("Found event:", event ? event.title : "No event found");
      }

      // Get host name if available
      if (ticket.createdBy) {
        const user = await User.findById(ticket.createdBy);
        if (user) {
          hostName = user.firstName || user.username || user.email;
        }
      }

      // Check if metadata has hostName
      if (ticket.metadata && ticket.metadata.hostName) {
        hostName = ticket.metadata.hostName;
      }
    }
    // Check if this is a security token in the Ticket model
    else {
      const Ticket = require("../models/ticketModel");
      const ticketBySecurityToken = await Ticket.findOne({
        securityToken: ticketId,
      });

      if (ticketBySecurityToken) {
        console.log(
          "Found ticket by security token in Ticket model:",
          ticketBySecurityToken._id
        );
        ticket = ticketBySecurityToken;
        typeOfTicket = "Ticket-Code";

        // Get the event details for this ticket
        if (ticket.eventId) {
          const Event = require("../models/eventsModel");
          event = await Event.findById(ticket.eventId);
          console.log(
            "Found event for ticket:",
            event ? event.title : "No event found"
          );
        }

        // Get user info if available
        if (ticket.userId) {
          const user = await User.findById(ticket.userId);
          if (user) {
            hostName = user.firstName || user.username || user.email;
          }
        }
      }
      // If not a security token, try to find by ID or code
      else if (mongoose.Types.ObjectId.isValid(ticketId)) {
        // Try to find by ID
        const friendsCodeTicket = await FriendsCode.findById(ticketId);
        if (friendsCodeTicket) {
          ticket = friendsCodeTicket;
          typeOfTicket = "Friends-Code";

          // Get host name
          if (ticket.hostId) {
            const user = await User.findById(ticket.hostId);
            if (user) {
              hostName = user.firstName || user.username || user.email;
            }
          }
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

              // Get host name
              if (ticket.hostId) {
                const user = await User.findById(ticket.hostId);
                if (user) {
                  hostName = user.firstName || user.username || user.email;
                }
              }
            } else {
              const tableCodeTicket = await TableCode.findById(ticketId);
              if (tableCodeTicket) {
                ticket = tableCodeTicket;
                typeOfTicket = "Table-Code";

                // Get host name
                if (ticket.hostId) {
                  const user = await User.findById(ticket.hostId);
                  if (user) {
                    hostName = user.firstName || user.username || user.email;
                  }
                }
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

                    // Get the event details for this code
                    if (newCodeTicket.eventId) {
                      const Event = require("../models/eventsModel");
                      event = await Event.findById(newCodeTicket.eventId);
                    }

                    // Get host name if available
                    if (newCodeTicket.createdBy) {
                      const user = await User.findById(newCodeTicket.createdBy);
                      if (user) {
                        hostName =
                          user.firstName || user.username || user.email;
                      }
                    }

                    // Check if metadata has hostName
                    if (
                      newCodeTicket.metadata &&
                      newCodeTicket.metadata.hostName
                    ) {
                      hostName = newCodeTicket.metadata.hostName;
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        // Try to find by code value
        const codeByValue = await Code.findOne({ code: ticketId });
        if (codeByValue) {
          ticket = codeByValue;
          typeOfTicket = `${
            ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)
          }-Code`;

          // Get the event details for this code
          if (codeByValue.eventId) {
            const Event = require("../models/eventsModel");
            event = await Event.findById(codeByValue.eventId);
          }

          // Get host name if available
          if (codeByValue.createdBy) {
            const user = await User.findById(codeByValue.createdBy);
            if (user) {
              hostName = user.firstName || user.username || user.email;
            }
          }

          // Check if metadata has hostName
          if (codeByValue.metadata && codeByValue.metadata.hostName) {
            hostName = codeByValue.metadata.hostName;
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if code is active (for new code model)
    if (
      ticket.status &&
      ticket.status !== "active" &&
      ticket.status !== "valid"
    ) {
      return res.status(400).json({
        message: `Code is ${ticket.status}`,
        status: ticket.status,
      });
    }

    // Get event details if we haven't already and the ticket has an eventId
    if (!event && ticket.eventId) {
      const Event = require("../models/eventsModel");
      event = await Event.findById(ticket.eventId);
    }

    // Format the event details for the response
    const eventDetails = event
      ? {
          _id: event._id,
          title: event.title,
          date: event.date,
        }
      : null;

    const ticketData = ticket.toObject ? ticket.toObject() : ticket;

    // Add event details and type to the response
    res.json({
      ...ticketData,
      typeOfTicket,
      eventDetails,
      // Make sure condition is included
      condition: ticketData.condition || "",
      // Make sure we have event name in a consistent place
      eventName: event ? event.title : "Unknown Event",
      // Include host name
      hostName:
        hostName || (ticketData.metadata && ticketData.metadata.hostName) || "",
      // Include metadata if available
      metadata: {
        ...(ticketData.metadata || {}),
        hostName:
          hostName ||
          (ticketData.metadata && ticketData.metadata.hostName) ||
          "",
      },
    });
  } catch (error) {
    console.error("Error in validateTicket:", error);
    res.status(500).json({ message: error.message });
  }
};

const increasePax = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    console.log("Increasing pax for ticket:", ticketId);

    // First check if this is a security token
    let ticket = await Code.findOne({ securityToken: ticketId });

    if (ticket) {
      console.log("Found code by security token:", ticket.code);
      // Update pax for the code
      ticket = await Code.findByIdAndUpdate(
        ticket._id,
        { $inc: { paxChecked: 1, usageCount: 1 } },
        { new: true }
      );
    } else {
      // Try legacy code types
      ticket = await FriendsCode.findByIdAndUpdate(
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
        // Try to find by code value
        const codeByValue = await Code.findOne({ code: ticketId });
        if (codeByValue) {
          if (codeByValue.paxChecked < codeByValue.maxPax) {
            ticket = await Code.findByIdAndUpdate(
              codeByValue._id,
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
              paxChecked: codeByValue.paxChecked,
              maxPax: codeByValue.maxPax,
            });
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Error in increasePax:", error);
    res.status(500).json({ message: error.message });
  }
};

const decreasePax = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    console.log("Decreasing pax for ticket:", ticketId);

    // First check if this is a security token
    let ticket = await Code.findOne({ securityToken: ticketId });

    if (ticket) {
      console.log("Found code by security token:", ticket.code);
      // Update pax for the code
      if (ticket.paxChecked > 0) {
        ticket = await Code.findByIdAndUpdate(
          ticket._id,
          { $inc: { paxChecked: -1 } },
          { new: true }
        );
      } else {
        return res.status(400).json({
          message: "Pax checked is already at minimum",
          paxChecked: ticket.paxChecked,
        });
      }
    } else {
      // Try legacy code types
      ticket = await FriendsCode.findByIdAndUpdate(
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
        // Try to find by code value
        const codeByValue = await Code.findOne({ code: ticketId });
        if (codeByValue) {
          if (codeByValue.paxChecked > 0) {
            ticket = await Code.findByIdAndUpdate(
              codeByValue._id,
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
              paxChecked: codeByValue.paxChecked,
            });
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Error in decreasePax:", error);
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
