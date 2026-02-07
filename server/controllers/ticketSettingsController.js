const TicketSettings = require("../models/ticketSettingsModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");

// Note: Tickets are now bound to each specific event (parent or child)
// Each event maintains its own independent ticket settings

// Get all ticket settings for an event
const getTicketSettings = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event to verify it exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if this is a public route (no authentication required)
    const isPublicRoute = req.path.includes("/public/");

    // Check if user has permission to view this event
    if (!isPublicRoute && req.user) {
      const userId = req.user.userId || req.user._id;
      const isDirectOwner = event.user.toString() === userId.toString();
      let isBrandTeamMember = false;

      if (!isDirectOwner && !req.user.isAdmin) {
        const brand = await Brand.findOne({
          _id: event.brand,
          $or: [{ owner: userId }, { "team.user": userId }],
        });
        isBrandTeamMember = !!brand;

        if (!isBrandTeamMember) {
          return res
            .status(403)
            .json({ message: "Not authorized to view this event" });
        }
      }
    }

    // Define the query criteria - use the actual event ID
    let queryCriteria = { eventId: eventId };

    // If it's a public route, only fetch visible tickets
    if (isPublicRoute) {
      queryCriteria.isVisible = true;
    }

    // Get ticket settings based on criteria, sorted by sortOrder
    const ticketSettings = await TicketSettings.find(queryCriteria).sort({
      sortOrder: 1,
    });

    return res.status(200).json({ ticketSettings });
  } catch (error) {
    console.error("[TicketSettings] Error fetching ticket settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create a new ticket setting
const createTicketSetting = async (req, res) => {
  try {
    const { eventId } = req.params;
    const ticketData = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check authorization
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.userId || req.user._id;
    const isDirectOwner = event.user.toString() === userId.toString();
    let isBrandTeamMember = false;

    if (!isDirectOwner && !req.user.isAdmin) {
      const brand = await Brand.findOne({
        _id: event.brand,
        $or: [{ owner: userId }, { "team.user": userId }],
      });
      isBrandTeamMember = !!brand;

      if (!isBrandTeamMember) {
        return res
          .status(403)
          .json({ message: "Not authorized to modify this event" });
      }
    }

    // Make sure doorPrice is set if not provided
    if (ticketData.paymentMethod === "atEntrance" && !ticketData.doorPrice) {
      // If door price not specified but payment at entrance, use ticket price as door price
      ticketData.doorPrice = ticketData.price;
    }

    // Create new ticket setting
    const ticketSetting = new TicketSettings({
      ...ticketData,
      eventId: eventId,
      brandId: event.brand, // Include brandId for event-level tickets
      createdBy: userId,
    });

    await ticketSetting.save();

    // Get updated list of ticket settings
    const ticketSettings = await TicketSettings.find({
      eventId: eventId,
    });

    return res.status(201).json({
      message: "Ticket setting created successfully",
      ticketSettings,
    });
  } catch (error) {
    console.error("[TicketSettings] Error creating ticket setting:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update a ticket setting
const updateTicketSetting = async (req, res) => {
  try {
    const { eventId, ticketId } = req.params;
    const updateData = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check authorization
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.userId || req.user._id;
    const isDirectOwner = event.user.toString() === userId.toString();
    let isBrandTeamMember = false;

    if (!isDirectOwner && !req.user.isAdmin) {
      const brand = await Brand.findOne({
        _id: event.brand,
        $or: [{ owner: userId }, { "team.user": userId }],
      });
      isBrandTeamMember = !!brand;

      if (!isBrandTeamMember) {
        return res
          .status(403)
          .json({ message: "Not authorized to modify this event" });
      }
    }

    // Update ticket setting
    const ticketSetting = await TicketSettings.findByIdAndUpdate(
      ticketId,
      updateData,
      { new: true }
    );

    if (!ticketSetting) {
      return res.status(404).json({ message: "Ticket setting not found" });
    }

    // Get updated list of ticket settings
    const ticketSettings = await TicketSettings.find({
      eventId: eventId,
    });

    return res.status(200).json({
      message: "Ticket setting updated successfully",
      ticketSettings,
    });
  } catch (error) {
    console.error("[TicketSettings] Error updating ticket setting:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a ticket setting
const deleteTicketSetting = async (req, res) => {
  try {
    const { eventId, ticketId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check authorization
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.userId || req.user._id;
    const isDirectOwner = event.user.toString() === userId.toString();
    let isBrandTeamMember = false;

    if (!isDirectOwner && !req.user.isAdmin) {
      const brand = await Brand.findOne({
        _id: event.brand,
        $or: [{ owner: userId }, { "team.user": userId }],
      });
      isBrandTeamMember = !!brand;

      if (!isBrandTeamMember) {
        return res
          .status(403)
          .json({ message: "Not authorized to modify this event" });
      }
    }

    // Delete ticket setting
    const ticketSetting = await TicketSettings.findByIdAndDelete(ticketId);

    if (!ticketSetting) {
      return res.status(404).json({ message: "Ticket setting not found" });
    }

    // Get remaining ticket settings
    const ticketSettings = await TicketSettings.find({
      eventId: eventId,
    });

    return res.status(200).json({
      message: "Ticket setting deleted successfully",
      ticketSettings,
    });
  } catch (error) {
    console.error("[TicketSettings] Error deleting ticket setting:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Reorder tickets for an event
const reorderTickets = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { tickets } = req.body;

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ message: "No ticket order provided" });
    }

    // Verify all tickets belong to this event
    const ticketIds = tickets.map((t) => t._id);
    const existingTickets = await TicketSettings.find({
      _id: { $in: ticketIds },
      eventId: eventId,
    });

    if (existingTickets.length !== tickets.length) {
      return res.status(400).json({
        message: "Some tickets do not exist or do not belong to this event",
      });
    }

    // Update the sort order for each ticket
    const updateOperations = tickets.map((ticket) => ({
      updateOne: {
        filter: { _id: ticket._id },
        update: { $set: { sortOrder: ticket.sortOrder } },
      },
    }));

    await TicketSettings.bulkWrite(updateOperations);

    // Return the updated list of tickets
    const updatedTickets = await TicketSettings.find({
      eventId: eventId,
    }).sort({
      sortOrder: 1,
    });

    res.json({
      success: true,
      message: "Ticket order updated successfully",
      ticketSettings: updatedTickets,
    });
  } catch (error) {
    console.error("Error reordering tickets:", error);
    res.status(500).json({
      success: false,
      message: "Error reordering tickets",
    });
  }
};

// Toggle ticket visibility
const toggleTicketVisibility = async (req, res) => {
  console.log(
    `[TicketSettings] Received request to toggle visibility for Ticket ID: ${req.params.ticketId} in Event ID: ${req.params.eventId}`
  );
  try {
    const { eventId, ticketId } = req.params;

    // Find the event to check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check authorization (similar to update/delete)
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const userId = req.user.userId || req.user._id;
    const isDirectOwner = event.user.toString() === userId.toString();
    let isBrandTeamMember = false;
    if (!isDirectOwner && !req.user.isAdmin) {
      const brand = await Brand.findOne({
        _id: event.brand,
        $or: [{ owner: userId }, { "team.user": userId }],
      });
      isBrandTeamMember = !!brand;
      if (!isBrandTeamMember) {
        return res
          .status(403)
          .json({ message: "Not authorized to modify this event" });
      }
    }

    // Find the ticket setting
    const ticketSetting = await TicketSettings.findById(ticketId);
    if (!ticketSetting) {
      return res.status(404).json({ message: "Ticket setting not found" });
    }

    // Toggle the isVisible status
    ticketSetting.isVisible = !ticketSetting.isVisible;
    await ticketSetting.save();

    // Return the updated ticket and a success message
    res.status(200).json({
      message: `Ticket visibility ${
        ticketSetting.isVisible ? "enabled" : "disabled"
      }`,
      ticketSetting,
    });
  } catch (error) {
    console.error("[TicketSettings] Error toggling ticket visibility:", error);
    res.status(500).json({ message: "Server error while toggling visibility" });
  }
};

// =====================================================
// Brand-level ticket CRUD functions
// =====================================================

// Get all brand-level tickets
const getBrandTickets = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Verify brand exists and user has permission
    const brand = await Brand.findOne({
      _id: brandId,
      $or: [{ owner: req.user.userId }, { "team.user": req.user.userId }],
    });

    if (!brand) {
      return res.status(403).json({ message: "Not authorized to access this brand" });
    }

    const tickets = await TicketSettings.find({
      brandId,
      eventId: null, // Brand-level only
    }).sort({ sortOrder: 1 });

    res.json({ tickets });
  } catch (error) {
    console.error("[TicketSettings] Error fetching brand tickets:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create brand-level ticket
const createBrandTicket = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Verify brand exists and user has permission
    const brand = await Brand.findOne({
      _id: brandId,
      $or: [{ owner: req.user.userId }, { "team.user": req.user.userId }],
    });

    if (!brand) {
      return res.status(403).json({ message: "Not authorized to access this brand" });
    }

    const ticket = new TicketSettings({
      ...req.body,
      brandId,
      eventId: null, // Brand-level
      createdBy: req.user.userId,
      isGlobalForBrand: req.body.isGlobalForBrand ?? true,
    });

    await ticket.save();
    res.status(201).json({ ticket });
  } catch (error) {
    console.error("[TicketSettings] Error creating brand ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update brand-level ticket
const updateBrandTicket = async (req, res) => {
  try {
    const { brandId, ticketId } = req.params;

    // Verify brand exists and user has permission
    const brand = await Brand.findOne({
      _id: brandId,
      $or: [{ owner: req.user.userId }, { "team.user": req.user.userId }],
    });

    if (!brand) {
      return res.status(403).json({ message: "Not authorized to access this brand" });
    }

    const ticket = await TicketSettings.findOneAndUpdate(
      { _id: ticketId, brandId, eventId: null },
      req.body,
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ ticket });
  } catch (error) {
    console.error("[TicketSettings] Error updating brand ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete brand-level ticket
const deleteBrandTicket = async (req, res) => {
  try {
    const { brandId, ticketId } = req.params;

    // Verify brand exists and user has permission
    const brand = await Brand.findOne({
      _id: brandId,
      $or: [{ owner: req.user.userId }, { "team.user": req.user.userId }],
    });

    if (!brand) {
      return res.status(403).json({ message: "Not authorized to access this brand" });
    }

    const ticket = await TicketSettings.findOneAndDelete({
      _id: ticketId,
      brandId,
      eventId: null,
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ message: "Ticket deleted" });
  } catch (error) {
    console.error("[TicketSettings] Error deleting brand ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getTicketSettings,
  createTicketSetting,
  updateTicketSetting,
  deleteTicketSetting,
  reorderTickets,
  toggleTicketVisibility,
  // Brand-level functions
  getBrandTickets,
  createBrandTicket,
  updateBrandTicket,
  deleteBrandTicket,
};
