const EventCodeActivation = require("../models/eventCodeActivationModel");
const CodeTemplate = require("../models/codeTemplateModel");
const CodeBrandAttachment = require("../models/codeBrandAttachmentModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");

// Helper to get parent event ID if this is a child event
const getParentEventId = async (eventId) => {
  const event = await Event.findById(eventId);
  if (event && event.parentEventId) {
    return event.parentEventId;
  }
  return eventId;
};

// Get all activated codes for an event
const getEventCodes = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId).populate("brand");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get the parent event ID if this is a child event
    const parentEventId = await getParentEventId(eventId);

    // Get all code templates attached to this brand via CodeBrandAttachment
    const brandId = event.brand._id || event.brand;
    const attachments = await CodeBrandAttachment.find({ brandId }).populate("codeTemplateId");
    const allTemplates = attachments
      .map(a => a.codeTemplateId)
      .filter(Boolean) // Filter out null/undefined
      .map(template => ({
        ...template.toObject(),
        isGlobal: attachments.find(a => a.codeTemplateId?._id?.toString() === template._id.toString())?.isGlobalForBrand || false
      }));

    // Get all activations for this event
    const activations = await EventCodeActivation.find({
      eventId: parentEventId,
    }).populate("codeTemplateId");

    // Build the response with template data and activation status
    const codes = allTemplates.map((template) => {
      const activation = activations.find(
        (a) => a.codeTemplateId?._id?.toString() === template._id.toString()
      );

      // Determine if code is enabled
      // Global codes are enabled by default unless explicitly disabled
      let isEnabled = template.isGlobal;
      if (activation) {
        isEnabled = activation.isEnabled;
      }

      return {
        _id: template._id,
        templateId: template._id,
        name: template.name,
        type: template.type,
        condition: activation?.conditionOverride || template.condition,
        note: activation?.noteOverride || template.note,
        maxPax: activation?.maxPaxOverride || template.maxPax,
        limit: activation?.limitOverride ?? template.defaultLimit,
        color: template.color,
        icon: template.icon,
        requireEmail: template.requireEmail,
        requirePhone: template.requirePhone,
        isGlobal: template.isGlobal,
        isEnabled,
        hasOverrides: !!(
          activation?.conditionOverride ||
          activation?.noteOverride ||
          activation?.maxPaxOverride ||
          activation?.limitOverride !== undefined
        ),
        activationId: activation?._id,
      };
    });

    // Include brand primary color
    const primaryColor = event.brand?.colors?.primary || "#ffc807";

    return res.status(200).json({
      codes,
      eventName: event.title,
      eventFlyer: event.flyer,
      primaryColor,
    });
  } catch (error) {
    console.error("[eventCodeActivationController] getEventCodes error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Toggle a code template on/off for an event
const toggleEventCode = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { codeTemplateId, isEnabled, overrides } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.userId || req.user._id;
    const brand = await Brand.findOne({
      _id: event.brand,
      $or: [{ owner: userId }, { "team.user": userId }],
    });

    if (!brand && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Not authorized to modify this event's codes",
      });
    }

    // Get the parent event ID if this is a child event
    const parentEventId = await getParentEventId(eventId);

    // Verify the code template exists and is attached to the brand
    const attachment = await CodeBrandAttachment.findOne({
      codeTemplateId,
      brandId: event.brand,
    });
    const template = attachment ? await CodeTemplate.findById(codeTemplateId) : null;

    if (!template) {
      return res.status(404).json({ message: "Code template not found or not attached to this brand" });
    }

    // Find or create the activation record
    const updateData = {
      isEnabled: isEnabled !== undefined ? isEnabled : true,
    };

    // Apply overrides if provided
    if (overrides) {
      if (overrides.condition !== undefined) {
        updateData.conditionOverride = overrides.condition;
      }
      if (overrides.note !== undefined) {
        updateData.noteOverride = overrides.note;
      }
      if (overrides.maxPax !== undefined) {
        updateData.maxPaxOverride = overrides.maxPax;
      }
      if (overrides.limit !== undefined) {
        updateData.limitOverride = overrides.limit;
      }
    }

    const activation = await EventCodeActivation.findOneAndUpdate(
      { eventId: parentEventId, codeTemplateId },
      updateData,
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: `Code ${isEnabled ? "enabled" : "disabled"} successfully`,
      activation,
    });
  } catch (error) {
    console.error("[eventCodeActivationController] toggleEventCode error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Bulk activate multiple code templates for an event
const bulkActivateEventCodes = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { codeTemplateIds, isEnabled } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.userId || req.user._id;
    const brand = await Brand.findOne({
      _id: event.brand,
      $or: [{ owner: userId }, { "team.user": userId }],
    });

    if (!brand && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Not authorized to modify this event's codes",
      });
    }

    // Get the parent event ID if this is a child event
    const parentEventId = await getParentEventId(eventId);

    // Update or create activation records for each template
    const updatePromises = codeTemplateIds.map((templateId) =>
      EventCodeActivation.findOneAndUpdate(
        { eventId: parentEventId, codeTemplateId: templateId },
        { isEnabled: isEnabled !== undefined ? isEnabled : true },
        { upsert: true, new: true }
      )
    );

    await Promise.all(updatePromises);

    // Return updated codes
    const activations = await EventCodeActivation.find({
      eventId: parentEventId,
    }).populate("codeTemplateId");

    return res.status(200).json({
      message: "Codes updated successfully",
      activations,
    });
  } catch (error) {
    console.error("[eventCodeActivationController] bulkActivateEventCodes error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update event-specific overrides for a code
const updateCodeOverrides = async (req, res) => {
  try {
    const { eventId, activationId } = req.params;
    const { condition, note, maxPax, limit } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.userId || req.user._id;
    const brand = await Brand.findOne({
      _id: event.brand,
      $or: [{ owner: userId }, { "team.user": userId }],
    });

    if (!brand && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Not authorized to modify this event's codes",
      });
    }

    // Find the activation
    const activation = await EventCodeActivation.findById(activationId);
    if (!activation) {
      return res.status(404).json({ message: "Code activation not found" });
    }

    // Update overrides
    if (condition !== undefined) activation.conditionOverride = condition;
    if (note !== undefined) activation.noteOverride = note;
    if (maxPax !== undefined) activation.maxPaxOverride = maxPax;
    if (limit !== undefined) activation.limitOverride = limit;

    await activation.save();

    return res.status(200).json({
      message: "Overrides updated successfully",
      activation,
    });
  } catch (error) {
    console.error("[eventCodeActivationController] updateCodeOverrides error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Clear all overrides for a code (revert to template defaults)
const clearCodeOverrides = async (req, res) => {
  try {
    const { eventId, activationId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.userId || req.user._id;
    const brand = await Brand.findOne({
      _id: event.brand,
      $or: [{ owner: userId }, { "team.user": userId }],
    });

    if (!brand && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Not authorized to modify this event's codes",
      });
    }

    // Find and update the activation
    const activation = await EventCodeActivation.findByIdAndUpdate(
      activationId,
      {
        $unset: {
          conditionOverride: 1,
          noteOverride: 1,
          maxPaxOverride: 1,
          limitOverride: 1,
        },
      },
      { new: true }
    );

    if (!activation) {
      return res.status(404).json({ message: "Code activation not found" });
    }

    return res.status(200).json({
      message: "Overrides cleared successfully",
      activation,
    });
  } catch (error) {
    console.error("[eventCodeActivationController] clearCodeOverrides error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Auto-activate global codes when a new event is created
const activateGlobalCodesForEvent = async (eventId, brandId) => {
  try {
    // Get all global templates for this brand via CodeBrandAttachment
    const attachments = await CodeBrandAttachment.find({
      brandId,
      isGlobalForBrand: true,
    }).populate("codeTemplateId");

    const globalTemplates = attachments
      .map(a => a.codeTemplateId)
      .filter(Boolean); // Filter out null/undefined

    // Create activation records for each global template
    const activationPromises = globalTemplates.map((template) =>
      EventCodeActivation.findOneAndUpdate(
        { eventId, codeTemplateId: template._id },
        { isEnabled: true },
        { upsert: true, new: true }
      )
    );

    await Promise.all(activationPromises);
    return true;
  } catch (error) {
    console.error("[eventCodeActivationController] activateGlobalCodesForEvent error:", error);
    return false;
  }
};

module.exports = {
  getEventCodes,
  toggleEventCode,
  bulkActivateEventCodes,
  updateCodeOverrides,
  clearCodeOverrides,
  activateGlobalCodesForEvent,
};
