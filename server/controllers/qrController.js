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
    const requestEventId = req.body.eventId; // Get eventId from request
    const requestBrandId = req.body.brandId; // Get brandId from request

    console.log("QR Controller - Validating ticket:", ticketId);
    if (requestEventId) console.log("For specific event ID:", requestEventId);
    if (requestBrandId) console.log("For specific brand ID:", requestBrandId);

    if (!ticketId) {
      return res.status(400).json({ message: "Ticket ID is required" });
    }

    // Check if ticketId is a URL and extract the securityToken if it is
    let securityTokenToCheck = ticketId;
    if (ticketId.includes("/validate/")) {
      try {
        // First check if it's a full URL
        let urlToProcess = ticketId;

        // For URLs, extract just the path part
        if (ticketId.includes("http")) {
          try {
            const url = new URL(ticketId);
            urlToProcess = url.pathname;
            console.log("Extracted path from URL:", urlToProcess);
          } catch (urlError) {
            console.log(
              "Error parsing full URL, treating as path:",
              urlError.message
            );
          }
        }

        // Extract the security token (last part after /)
        const urlParts = urlToProcess.split("/").filter((part) => part.trim());
        if (urlParts.length > 0) {
          const securityToken = urlParts[urlParts.length - 1];
          console.log("Extracted security token from URL:", securityToken);

          // Validate that it looks like a security token (alphanumeric, reasonable length)
          if (securityToken && securityToken.length >= 8) {
            securityTokenToCheck = securityToken;
          }
        }
      } catch (error) {
        console.log(
          "Error extracting security token, using fallback method:",
          error.message
        );
        // Fallback to simple split
        const urlParts = ticketId.split("/");
        if (urlParts.length >= 2) {
          securityTokenToCheck = urlParts[urlParts.length - 1];
          console.log(
            "Fallback: Extracted security token from URL:",
            securityTokenToCheck
          );
        }
      }
    }

    // Direct token format check (if not URL but matches token pattern)
    if (
      securityTokenToCheck === ticketId &&
      /^[a-zA-Z0-9]{32}$/.test(ticketId)
    ) {
      console.log("Input appears to be a direct security token");
    }

    let ticket;
    let typeOfTicket;
    let event = null;
    let hostName = null;
    let eventId = null;
    let codeSetting = null; // Store codeSetting for later use
    let wrongEventError = false; // Flag to track if the event ID doesn't match

    // First check if this is a security token in the Code model
    let codeBySecurityToken = await Code.findOne({
      securityToken: securityTokenToCheck,
    });

    // If not found by securityToken, try by code field (for manual entries)
    if (!codeBySecurityToken) {
      console.log("Trying to find code by 'code' field:", securityTokenToCheck);
      codeBySecurityToken = await Code.findOne({ code: securityTokenToCheck });
    }

    if (codeBySecurityToken) {
      console.log("Found code in Code model:", codeBySecurityToken.code);
      ticket = codeBySecurityToken;

      // If the code has a codeSettingId, fetch it to get the proper name
      if (ticket.codeSettingId) {
        const CodeSettings = require("../models/codeSettingsModel");
        codeSetting = await CodeSettings.findById(ticket.codeSettingId);

        if (codeSetting && codeSetting.name) {
          typeOfTicket = codeSetting.name;
        } else {
          // Fallback to default type naming
          typeOfTicket = `${
            ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)
          }-Code`;
        }
      } else {
        // Fallback to default type naming
        typeOfTicket = `${
          ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)
        }-Code`;
      }

      // Get the event details for this code
      if (ticket.eventId) {
        eventId = ticket.eventId;
        const Event = require("../models/eventsModel");
        event = await Event.findById(ticket.eventId);
        console.log("Found event:", event ? event.title : "No event found");
      }

      // Check if the code belongs to the specified event (set flag, don't return yet)
      if (requestEventId && eventId && requestEventId !== eventId.toString()) {
        console.log("Event mismatch detected in first check");
        wrongEventError = true;
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

      // First try by security token
      let ticketBySecurityToken = await Ticket.findOne({
        securityToken: securityTokenToCheck,
      });

      // If not found, try by code field
      if (!ticketBySecurityToken) {
        console.log(
          "Trying to find ticket by 'code' field:",
          securityTokenToCheck
        );
        ticketBySecurityToken = await Ticket.findOne({
          code: securityTokenToCheck,
        });
      }

      if (ticketBySecurityToken) {
        console.log("Found ticket in Ticket model:", ticketBySecurityToken._id);
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
          // Try GuestCode
          const guestCodeTicket = await GuestCode.findById(ticketId);
          if (guestCodeTicket) {
            ticket = guestCodeTicket;
            typeOfTicket = "Guest-Code";
          } else {
            // Try BackstageCode
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
              // Try TableCode
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
                // Try InvitationCode
                const invitationCodeTicket = await InvitationCode.findById(
                  ticketId
                );
                if (invitationCodeTicket) {
                  ticket = invitationCodeTicket;
                  typeOfTicket = "Invitation-Code";
                } else {
                  // Try Code (new unified model)
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
      }
      // Try to find by code field if it's not a valid ObjectId
      else {
        console.log("Checking legacy models by code field:", ticketId);

        // Check each model for a matching code field
        const friendsCodeByCode = await FriendsCode.findOne({ code: ticketId });
        if (friendsCodeByCode) {
          ticket = friendsCodeByCode;
          typeOfTicket = "Friends-Code";

          // Get host name
          if (ticket.hostId) {
            const user = await User.findById(ticket.hostId);
            if (user) {
              hostName = user.firstName || user.username || user.email;
            }
          }
        } else {
          // Try GuestCode
          const guestCodeByCode = await GuestCode.findOne({ code: ticketId });
          if (guestCodeByCode) {
            ticket = guestCodeByCode;
            typeOfTicket = "Guest-Code";
          } else {
            // Try BackstageCode
            const backstageCodeByCode = await BackstageCode.findOne({
              code: ticketId,
            });
            if (backstageCodeByCode) {
              ticket = backstageCodeByCode;
              typeOfTicket = "Backstage-Code";

              // Get host name
              if (ticket.hostId) {
                const user = await User.findById(ticket.hostId);
                if (user) {
                  hostName = user.firstName || user.username || user.email;
                }
              }
            } else {
              // Try TableCode
              const tableCodeByCode = await TableCode.findOne({
                code: ticketId,
              });
              if (tableCodeByCode) {
                ticket = tableCodeByCode;
                typeOfTicket = "Table-Code";

                // Get host name
                if (ticket.hostId) {
                  const user = await User.findById(ticket.hostId);
                  if (user) {
                    hostName = user.firstName || user.username || user.email;
                  }
                }
              } else {
                // Try InvitationCode
                const invitationCodeByCode = await InvitationCode.findOne({
                  code: ticketId,
                });
                if (invitationCodeByCode) {
                  ticket = invitationCodeByCode;
                  typeOfTicket = "Invitation-Code";
                } else {
                  // Try Code (new unified model)
                  const newCodeByCode = await Code.findOne({ code: ticketId });
                  if (newCodeByCode) {
                    ticket = newCodeByCode;
                    const type =
                      newCodeByCode.type.charAt(0).toUpperCase() +
                      newCodeByCode.type.slice(1);
                    typeOfTicket = `${type}-Code`;

                    // Get the event details for this code
                    if (newCodeByCode.eventId) {
                      const Event = require("../models/eventsModel");
                      event = await Event.findById(newCodeByCode.eventId);
                    }

                    // Get host name if available
                    if (newCodeByCode.createdBy) {
                      const user = await User.findById(newCodeByCode.createdBy);
                      if (user) {
                        hostName =
                          user.firstName || user.username || user.email;
                      }
                    }

                    // Check if metadata has hostName
                    if (
                      newCodeByCode.metadata &&
                      newCodeByCode.metadata.hostName
                    ) {
                      hostName = newCodeByCode.metadata.hostName;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Once we have the ticket (no matter which model), check for event mismatch
    if (
      ticket &&
      requestEventId &&
      ticket.eventId &&
      requestEventId !== ticket.eventId.toString()
    ) {
      console.log("Event mismatch detected in second check");
      wrongEventError = true;
    }

    // Return an error if the event check failed
    if (wrongEventError) {
      return res.status(400).json({
        message: "That code is from a different event.",
        codeEventId: (eventId || ticket?.eventId)?.toString(),
        requestedEventId: requestEventId,
      });
    }

    // If no ticket was found, return an error
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

    // If we haven't found a codeSetting yet and it's a legacy model, try to find it
    if (!codeSetting && ticket) {
      // Try to find associated code setting based on the event and type
      try {
        const CodeSettings = require("../models/codeSettingsModel");

        // Determine the type for legacy models
        let legacyType = "";
        if (typeOfTicket === "Guest-Code") legacyType = "guest";
        else if (typeOfTicket === "Friends-Code") legacyType = "friends";
        else if (typeOfTicket === "Backstage-Code") legacyType = "backstage";
        else if (typeOfTicket === "Table-Code") legacyType = "table";
        else if (typeOfTicket === "Ticket-Code") legacyType = "ticket";
        else if (typeOfTicket.includes("Custom")) legacyType = "custom";
        else if (ticket.type) legacyType = ticket.type.toLowerCase();

        if (legacyType && ticket.eventId) {
          codeSetting = await CodeSettings.findOne({
            eventId: ticket.eventId,
            type: legacyType,
          });

          console.log(
            "Found code setting for legacy model:",
            codeSetting?.name || "Not found",
            "with color:",
            codeSetting?.color || "No color"
          );
        }
      } catch (error) {
        console.log(
          "Error looking for code settings for legacy model:",
          error.message
        );
      }
    }

    // Check if the code belongs to the specified event
    if (
      requestEventId &&
      ticket.eventId &&
      requestEventId !== ticket.eventId.toString()
    ) {
      return res.status(400).json({
        message:
          "This code belongs to a different event than the one selected.",
        codeEventId: ticket.eventId.toString(),
        requestedEventId: requestEventId,
      });
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

    // Determine the best condition value to use
    let conditionToUse = ticketData.condition || "";

    // If condition is empty and we have a codeSetting with a condition, use that
    if (!conditionToUse && codeSetting && codeSetting.condition) {
      conditionToUse = codeSetting.condition;
    }

    // Get color information from code settings if available
    const codeColor = codeSetting?.color || "#ffc107"; // Default to yellow if no color found

    console.log(
      "Using color for response:",
      codeColor,
      "for type:",
      typeOfTicket
    );

    // Add event details and type to the response
    res.json({
      ...ticketData,
      typeOfTicket,
      eventDetails,
      // Use determined condition value
      condition: conditionToUse,
      // Add color information from code settings
      codeColor: codeColor,
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
        // Also include color in metadata
        codeColor: codeColor,
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

    let ticket;
    let model;

    // First check in the Code model - our unified model for all codes
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await Code.findById(ticketId);
      if (ticket) {
        model = Code;
        console.log("Found ticket in Code model");
      }
    }

    // If not found in Code model, check in legacy models
    if (!ticket) {
      // Legacy code, check each model
      if (mongoose.Types.ObjectId.isValid(ticketId)) {
        ticket = await FriendsCode.findById(ticketId);
        if (ticket) {
          model = FriendsCode;
        } else {
          ticket = await GuestCode.findById(ticketId);
          if (ticket) {
            model = GuestCode;
          } else {
            ticket = await BackstageCode.findById(ticketId);
            if (ticket) {
              model = BackstageCode;
            } else {
              ticket = await TableCode.findById(ticketId);
              if (ticket) {
                model = TableCode;
              }
            }
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if max capacity reached for the ticket
    const maxPax = ticket.maxPax || ticket.pax || 1;
    if (ticket.paxChecked >= maxPax) {
      return res.status(400).json({
        message: "Maximum capacity reached for this ticket",
      });
    }

    // Increment paxChecked
    ticket.paxChecked = (ticket.paxChecked || 0) + 1;
    await ticket.save();

    return res.json({
      _id: ticket._id,
      paxChecked: ticket.paxChecked,
      maxPax: maxPax,
      message: "Pax increased successfully",
    });
  } catch (error) {
    console.error("Error increasing pax:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const decreasePax = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    console.log("Decreasing pax for ticket:", ticketId);

    let ticket;
    let model;

    // First check in the Code model - our unified model for all codes
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await Code.findById(ticketId);
      if (ticket) {
        model = Code;
        console.log("Found ticket in Code model");
      }
    }

    // If not found in Code model, check in legacy models
    if (!ticket) {
      // Legacy code, check each model
      if (mongoose.Types.ObjectId.isValid(ticketId)) {
        ticket = await FriendsCode.findById(ticketId);
        if (ticket) {
          model = FriendsCode;
        } else {
          ticket = await GuestCode.findById(ticketId);
          if (ticket) {
            model = GuestCode;
          } else {
            ticket = await BackstageCode.findById(ticketId);
            if (ticket) {
              model = BackstageCode;
            } else {
              ticket = await TableCode.findById(ticketId);
              if (ticket) {
                model = TableCode;
              }
            }
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if paxChecked is already 0
    if (ticket.paxChecked <= 0) {
      return res.status(400).json({
        message: "Pax count is already 0 for this ticket",
      });
    }

    // Decrement paxChecked
    ticket.paxChecked = Math.max(0, (ticket.paxChecked || 0) - 1);
    await ticket.save();

    return res.json({
      _id: ticket._id,
      paxChecked: ticket.paxChecked,
      maxPax: ticket.maxPax || ticket.pax || 1,
      message: "Pax decreased successfully",
    });
  } catch (error) {
    console.error("Error decreasing pax:", error);
    return res.status(500).json({ message: "Server error" });
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
