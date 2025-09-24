const FriendsCode = require("../models/FriendsCode");
const BackstageCode = require("../models/BackstageCode");
const GuestCode = require("../models/GuestCode");
const TableCode = require("../models/TableCode");
const BattleCode = require("../models/battleModel");
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

    // Special handling for 8-character alphanumeric codes like "402A0264" which are TableCode codes
    if (/^[A-Z0-9]{8}$/.test(ticketId)) {
      console.log("Detected 8-character alphanumeric code format:", ticketId);

      // Try to find in TableCode directly by code field
      const tableCodeByShortCode = await TableCode.findOne({
        code: ticketId,
      });

      if (tableCodeByShortCode) {
        console.log(
          "Found TableCode by short code format:",
          tableCodeByShortCode._id,
          "with status:",
          tableCodeByShortCode.status
        );

        ticket = tableCodeByShortCode;
        typeOfTicket = "Table-Code";

        // Get event information
        if (ticket.event) {
          eventId = ticket.event;
          const Event = require("../models/eventsModel");
          event = await Event.findById(ticket.event);
        }

        // Get host name
        hostName = ticket.host || "Unknown Host";
      }
    }

    // Handle URL format tickets
    if (ticketId.includes("/validate/")) {
      try {
        // First check if it's a full URL
        let urlToProcess = ticketId;

        // For URLs, extract just the path part
        if (ticketId.includes("http")) {
          const url = new URL(ticketId);
          urlToProcess = url.pathname;
          console.log("Extracted path from URL:", urlToProcess);
        }

        // Extract the security token (last part after /)
        const urlParts = urlToProcess.split("/").filter((part) => part.trim());
        if (urlParts.length > 0) {
          const securityToken = urlParts[urlParts.length - 1];

          // Validate that it looks like a security token (alphanumeric, reasonable length)
          if (securityToken && securityToken.length >= 8) {
            securityTokenToCheck = securityToken;
            console.log(
              "Extracted security token from URL:",
              securityTokenToCheck
            );
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

    console.log(`[QR Validate] Checking token: ${securityTokenToCheck}`);

    // First check if this is a security token in the Code model
    let codeBySecurityToken = await Code.findOne({
      securityToken: securityTokenToCheck,
    });
    console.log(
      `[QR Validate] Result from Code model (by securityToken): ${
        codeBySecurityToken ? codeBySecurityToken._id : "null"
      }`
    );

    // If not found by securityToken, try by code field (for manual entries)
    if (!codeBySecurityToken) {
      console.log(
        "[QR Validate] Trying to find code by 'code' field:",
        securityTokenToCheck
      );
      codeBySecurityToken = await Code.findOne({ code: securityTokenToCheck });
      console.log(
        `[QR Validate] Result from Code model (by code): ${
          codeBySecurityToken ? codeBySecurityToken._id : "null"
        }`
      );
    }

    if (codeBySecurityToken) {
      console.log("[QR Validate] Found match in Code model, using it.");
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
    
    // If not found in Code model, check BattleCode model
    if (!ticket && securityTokenToCheck) {
      console.log(
        "[QR Validate] Checking BattleCode by securityToken:",
        securityTokenToCheck
      );
      
      // Try by security token first
      let battleCodeBySecurityToken = await BattleCode.findOne({
        securityToken: securityTokenToCheck,
      });
      console.log(
        `[QR Validate] Result from BattleCode (by securityToken): ${
          battleCodeBySecurityToken ? battleCodeBySecurityToken._id : "null"
        }`
      );

      // If not found by securityToken, try by code field
      if (!battleCodeBySecurityToken) {
        console.log(
          "[QR Validate] Trying to find BattleCode by code field:",
          securityTokenToCheck
        );
        battleCodeBySecurityToken = await BattleCode.findOne({ 
          code: securityTokenToCheck 
        });
        console.log(
          `[QR Validate] Result from BattleCode (by code): ${
            battleCodeBySecurityToken ? battleCodeBySecurityToken._id : "null"
          }`
        );
      }

      if (battleCodeBySecurityToken) {
        console.log(
          "[QR Validate] Found match in BattleCode model, using it."
        );
        ticket = battleCodeBySecurityToken;
        typeOfTicket = "Battle-Code";

        // Get event information if available
        if (ticket.event) {
          eventId = ticket.event;
          const Event = require("../models/eventsModel");
          event = await Event.findById(ticket.event);
          console.log(
            "Found event for BattleCode:",
            event ? event.title : "No event found"
          );

          // Check for event mismatch
          if (
            requestEventId &&
            eventId &&
            requestEventId !== eventId.toString()
          ) {
            console.log("Event mismatch detected for BattleCode");
            wrongEventError = true;
          }
        }

        // Get participant name as host name
        hostName = ticket.name || "Battle Participant";
        
        // Add battle-specific info to the ticket for response
        ticket.battleCategories = ticket.categories;
        ticket.battleParticipants = ticket.participants;
        ticket.battleStatus = ticket.status;
      }
    }
    
    // If not found in Code or BattleCode models, check TableCode
    if (!ticket && securityTokenToCheck) {
      console.log(
        "[QR Validate] Checking TableCode by securityToken:",
        securityTokenToCheck
      );
      const tableCodeBySecurityToken = await TableCode.findOne({
        securityToken: securityTokenToCheck,
      });
      console.log(
        `[QR Validate] Result from TableCode (by securityToken): ${
          tableCodeBySecurityToken ? tableCodeBySecurityToken._id : "null"
        }`
      );

      if (tableCodeBySecurityToken) {
        console.log(
          "[QR Validate] Found match in TableCode (by securityToken), using it."
        );
        ticket = tableCodeBySecurityToken;
        typeOfTicket = "Table-Code";

        // Get event information if available
        if (ticket.event) {
          eventId = ticket.event;
          const Event = require("../models/eventsModel");
          event = await Event.findById(ticket.event);
          console.log(
            "Found event for TableCode:",
            event ? event.title : "No event found"
          );

          // Check for event mismatch
          if (
            requestEventId &&
            eventId &&
            requestEventId !== eventId.toString()
          ) {
            console.log("Event mismatch detected for TableCode");
            wrongEventError = true;
          }
        }

        // Get host name
        hostName = ticket.host || "Unknown Host";
      } else {
        // Try by code field directly
        console.log(
          "[QR Validate] Trying to find TableCode by code field:",
          ticketId
        );
        const tableCodeByCode = await TableCode.findOne({
          code: ticketId,
        });
        console.log(
          `[QR Validate] Result from TableCode (by code): ${
            tableCodeByCode ? tableCodeByCode._id : "null"
          }`
        );

        if (tableCodeByCode) {
          console.log(
            "[QR Validate] Found match in TableCode (by code), using it."
          );
          ticket = tableCodeByCode;
          typeOfTicket = "Table-Code";

          // Get event information if available
          if (ticket.event) {
            eventId = ticket.event;
            const Event = require("../models/eventsModel");
            event = await Event.findById(ticket.event);
          }

          // Get host name
          hostName = ticket.host || "Unknown Host";
        }
      }
    }
    
    // If not found in Code or TableCode models, check Ticket model
    if (!ticket) {
      const Ticket = require("../models/ticketModel");
      console.log(
        "[QR Validate] Checking Ticket model by securityToken:",
        securityTokenToCheck
      );
      console.log("[QR Validate] Original ticketId:", ticketId);

      // Try by security token first
      let ticketBySecurityToken = await Ticket.findOne({
        securityToken: securityTokenToCheck,
      });
      console.log(
        `[QR Validate] Result from Ticket model (by securityToken): ${
          ticketBySecurityToken ? ticketBySecurityToken._id : "null"
        }`
      );
      
      // If not found by security token, also try by _id if it's a valid ObjectId
      if (!ticketBySecurityToken && mongoose.Types.ObjectId.isValid(ticketId)) {
        console.log("[QR Validate] Trying Ticket model by ID:", ticketId);
        ticketBySecurityToken = await Ticket.findById(ticketId);
        console.log(
          `[QR Validate] Result from Ticket model (by ID): ${
            ticketBySecurityToken ? ticketBySecurityToken._id : "null"
          }`
        );
      }
      
      // If still not found, try by original ticketId in case it's different
      if (!ticketBySecurityToken && ticketId !== securityTokenToCheck) {
        console.log("[QR Validate] Trying Ticket model with original ticketId:", ticketId);
        if (mongoose.Types.ObjectId.isValid(ticketId)) {
          ticketBySecurityToken = await Ticket.findById(ticketId);
        } else {
          ticketBySecurityToken = await Ticket.findOne({ securityToken: ticketId });
        }
        console.log(
          `[QR Validate] Result from Ticket model (original ticketId): ${
            ticketBySecurityToken ? ticketBySecurityToken._id : "null"
          }`
        );
      }

      if (ticketBySecurityToken) {
        console.log("[QR Validate] Found match in Ticket model, using it.");
        console.log("[QR Validate] Ticket data:", {
          _id: ticketBySecurityToken._id,
          eventId: ticketBySecurityToken.eventId,
          securityToken: ticketBySecurityToken.securityToken,
          status: ticketBySecurityToken.status,
          pax: ticketBySecurityToken.pax,
          paxChecked: ticketBySecurityToken.paxChecked
        });
        
        ticket = ticketBySecurityToken;
        typeOfTicket = "Ticket-Code";

        // Get the event details for this ticket
        if (ticket.eventId) {
          eventId = ticket.eventId;
          const Event = require("../models/eventsModel");
          event = await Event.findById(ticket.eventId);
          console.log(
            "Found event for ticket:",
            event ? event.title : "No event found"
          );
          
          // Check for event mismatch
          if (
            requestEventId &&
            eventId &&
            requestEventId !== eventId.toString()
          ) {
            console.log("Event mismatch detected for Ticket");
            wrongEventError = true;
          }
        }

        // Get user info if available
        if (ticket.userId) {
          const user = await User.findById(ticket.userId);
          if (user) {
            hostName = user.firstName || user.username || user.email;
          }
        }
        
        // Also check for customer name from ticket
        if (!hostName && (ticket.firstName || ticket.lastName)) {
          hostName = `${ticket.firstName || ''} ${ticket.lastName || ''}`.trim();
        }
        if (!hostName && ticket.customerEmail) {
          hostName = ticket.customerEmail;
        }
      }
      // If still not found after checking Ticket model, log the failure
      if (!ticketBySecurityToken) {
        console.log("[QR Validate] No ticket found in Ticket model for:", securityTokenToCheck);
        console.log("[QR Validate] Original ticketId:", ticketId);
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
      console.log("Request eventId:", requestEventId);
      console.log("Ticket eventId:", ticket.eventId.toString());
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
      console.log("[QR Validate] No ticket found for:", securityTokenToCheck);
      console.log("[QR Validate] Original input:", ticketId);
      return res.status(404).json({ message: "Ticket not found" });
    }
    
    console.log("[QR Validate] Final ticket found:", {
      _id: ticket._id,
      typeOfTicket: typeOfTicket,
      eventId: eventId || ticket.eventId,
      status: ticket.status
    });

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
          date: event.startDate,
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

    // Prepare the response with all necessary fields
    const response = {
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
    };

    // Add battle-specific fields for Battle-Code types
    if (typeOfTicket === "Battle-Code") {
      response.battleInfo = {
        categories: ticketData.categories || [],
        participants: ticketData.participants || [],
        status: ticketData.status || "pending",
        email: ticketData.email,
        phone: ticketData.phone,
        instagram: ticketData.instagram,
        message: ticketData.message
      };
      // Set a battle-specific color if no code setting color is found
      if (!codeSetting?.color) {
        response.codeColor = "#e91e63"; // Pink color for battle codes
        response.metadata.codeColor = "#e91e63";
      }
    }
    
    // For tickets from ticketModel.js, ensure we don't include a 'type' field
    // as this is used by frontend to distinguish between Code model and Ticket model
    if (typeOfTicket === "Ticket-Code" && !ticket.type) {
      // Remove any 'type' field that might have been included
      delete response.type;
      console.log("[QR Validate] Ticket model response prepared (no type field)");
    }
    
    console.log("[QR Validate] Final response:", {
      _id: response._id,
      typeOfTicket: response.typeOfTicket,
      type: response.type,
      hasTypeField: !!response.type
    });
    
    res.json(response);
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
              } else {
                ticket = await BattleCode.findById(ticketId);
                if (ticket) {
                  model = BattleCode;
                }
              }
            }
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Special handling for BattleCode
    if (model === BattleCode) {
      // For BattleCode, we don't use traditional pax system
      // Instead we can use the participants count as max capacity
      const maxPax = 1 + (ticket.participants ? ticket.participants.length : 0);
      const currentPaxChecked = ticket.paxChecked || 0;
      
      if (currentPaxChecked >= maxPax) {
        return res.status(400).json({
          message: "All battle participants already checked in",
        });
      }

      // Increment paxChecked for battle code
      ticket.paxChecked = currentPaxChecked + 1;
      await ticket.save();

      return res.json({
        _id: ticket._id,
        paxChecked: ticket.paxChecked,
        maxPax: maxPax,
        message: "Battle participant checked in successfully",
        battleInfo: {
          categories: ticket.categories,
          status: ticket.status,
          totalParticipants: maxPax
        }
      });
    }

    // Check if max capacity reached for regular tickets
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
              } else {
                ticket = await BattleCode.findById(ticketId);
                if (ticket) {
                  model = BattleCode;
                }
              }
            }
          }
        }
      }
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Special handling for BattleCode
    if (model === BattleCode) {
      // Check if paxChecked is already 0
      if (ticket.paxChecked <= 0) {
        return res.status(400).json({
          message: "No battle participants are checked in",
        });
      }

      // Decrement paxChecked for battle code
      ticket.paxChecked = Math.max(0, (ticket.paxChecked || 0) - 1);
      await ticket.save();

      const maxPax = 1 + (ticket.participants ? ticket.participants.length : 0);
      
      return res.json({
        _id: ticket._id,
        paxChecked: ticket.paxChecked,
        maxPax: maxPax,
        message: "Battle participant check-in reduced successfully",
        battleInfo: {
          categories: ticket.categories,
          status: ticket.status,
          totalParticipants: maxPax
        }
      });
    }

    // Check if paxChecked is already 0 for regular tickets
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

// New controller function to handle ticket model pax updates
const updateTicketPax = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const { increment } = req.body;

    console.log(`[QR Update] Updating pax for ticket ${ticketId}, increment: ${increment}`);
    console.log(`[QR Update] Request body:`, req.body);

    // Load the Ticket model and find the ticket
    const Ticket = require("../models/ticketModel");

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      console.log(`[QR Update] Invalid ticket ID format: ${ticketId}`);
      return res.status(400).json({ message: "Invalid ticket ID format" });
    }

    const ticket = await Ticket.findById(ticketId);
    console.log(`[QR Update] Found ticket:`, ticket ? {
      _id: ticket._id,
      pax: ticket.pax,
      paxChecked: ticket.paxChecked,
      status: ticket.status
    } : 'null');

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // If increasing pax
    if (increment) {
      // Check if max capacity reached for the ticket
      const maxPax = ticket.pax || 1;
      if (ticket.paxChecked >= maxPax) {
        return res.status(400).json({
          message: "Maximum capacity reached for this ticket",
        });
      }

      // Increment paxChecked
      ticket.paxChecked = (ticket.paxChecked || 0) + 1;
    }
    // If decreasing pax
    else {
      // Check if paxChecked is already 0
      if (ticket.paxChecked <= 0) {
        return res.status(400).json({
          message: "Pax count is already 0 for this ticket",
        });
      }

      // Decrement paxChecked
      ticket.paxChecked = Math.max(0, (ticket.paxChecked || 0) - 1);
    }

    // If this is the first check-in, mark the ticket as used
    if (increment && ticket.paxChecked === 1 && ticket.status === "valid") {
      ticket.status = "used";
      ticket.usedAt = new Date();
    }

    // If this is a check-out that removes all guests, consider reverting to valid
    if (!increment && ticket.paxChecked === 0 && ticket.status === "used") {
      ticket.status = "valid";
      ticket.usedAt = null;
    }

    await ticket.save();

    return res.json({
      _id: ticket._id,
      paxChecked: ticket.paxChecked,
      maxPax: ticket.pax || 1,
      status: ticket.status,
      message: increment
        ? "Checked in successfully"
        : "Checked out successfully",
    });
  } catch (error) {
    console.error("Error updating ticket pax:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// Function to update pax for TableCode model
const updateTableCodePax = async (req, res) => {
  try {
    const tableCodeId = req.params.ticketId;
    const { increment } = req.body;

    console.log(
      `Updating pax for TableCode ${tableCodeId}, increment: ${increment}`
    );

    if (!mongoose.Types.ObjectId.isValid(tableCodeId)) {
      return res.status(400).json({ message: "Invalid TableCode ID format" });
    }

    // Find the TableCode
    const tableCode = await TableCode.findById(tableCodeId);

    if (!tableCode) {
      return res.status(404).json({ message: "TableCode not found" });
    }

    // If increasing pax
    if (increment) {
      // Check if max capacity reached for the table code
      const maxPax = tableCode.pax || 1;
      if (tableCode.paxChecked >= maxPax) {
        return res.status(400).json({
          message: "Maximum capacity reached for this table reservation",
        });
      }

      // Increment paxChecked
      tableCode.paxChecked = (tableCode.paxChecked || 0) + 1;
    }
    // If decreasing pax
    else {
      // Check if paxChecked is already 0
      if (tableCode.paxChecked <= 0) {
        return res.status(400).json({
          message: "Pax count is already 0 for this table reservation",
        });
      }

      // Decrement paxChecked
      tableCode.paxChecked = Math.max(0, (tableCode.paxChecked || 0) - 1);
    }

    // Save the updated TableCode
    await tableCode.save();

    return res.json({
      _id: tableCode._id,
      paxChecked: tableCode.paxChecked,
      maxPax: tableCode.pax || 1,
      status: tableCode.status,
      message: increment
        ? "Checked in successfully to table " + tableCode.tableNumber
        : "Checked out successfully from table " + tableCode.tableNumber,
    });
  } catch (error) {
    console.error("Error updating TableCode pax:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// New controller function to handle unified code model pax updates
const updateCodePax = async (req, res) => {
  try {
    const codeId = req.params.ticketId;
    const { increment } = req.body;

    console.log(`Updating pax for code ${codeId}, increment: ${increment}`);

    if (!mongoose.Types.ObjectId.isValid(codeId)) {
      return res.status(400).json({ message: "Invalid code ID format" });
    }

    const code = await Code.findById(codeId);

    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // If increasing pax
    if (increment) {
      // Check if max capacity reached for the code
      const maxPax = code.maxPax || 1;
      if (code.paxChecked >= maxPax) {
        return res.status(400).json({
          message: "Maximum capacity reached for this code",
        });
      }

      // Increment paxChecked
      code.paxChecked = (code.paxChecked || 0) + 1;

      // Record usage information if it doesn't exceed the limit
      if (code.limit === 0 || code.usageCount < code.limit) {
        code.usageCount = (code.usageCount || 0) + 1;

        // If this is the first check-in and the code is active, add usage record
        if (code.status === "active") {
          // Record usage information
          const usage = {
            timestamp: new Date(),
            paxUsed: 1,
            userId: req.user ? req.user._id : null,
            location: req.body.location || "",
            deviceInfo: req.body.deviceInfo || "",
          };

          // Add to usage array if it exists, otherwise create it
          if (code.usage && Array.isArray(code.usage)) {
            code.usage.push(usage);
          } else {
            code.usage = [usage];
          }
        }
      }
    }
    // If decreasing pax
    else {
      // Check if paxChecked is already 0
      if (code.paxChecked <= 0) {
        return res.status(400).json({
          message: "Pax count is already 0 for this code",
        });
      }

      // Decrement paxChecked
      code.paxChecked = Math.max(0, (code.paxChecked || 0) - 1);
    }

    // If all checks passed, save the updated code
    await code.save();

    return res.json({
      _id: code._id,
      paxChecked: code.paxChecked,
      maxPax: code.maxPax || 1,
      status: code.status,
      message: increment
        ? "Checked in successfully"
        : "Checked out successfully",
    });
  } catch (error) {
    console.error("Error updating code pax:", error);
    return res.status(500).json({ message: error.message || "Server error" });
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
  updateTicketPax,
  updateTableCodePax,
  updateCodePax,
  getCounts,
  getUserSpecificCounts,
};
