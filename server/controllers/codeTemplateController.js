const CodeTemplate = require("../models/codeTemplateModel");
const CodeBrandAttachment = require("../models/codeBrandAttachmentModel");
const EventCodeActivation = require("../models/eventCodeActivationModel");
const CodeSettings = require("../models/codeSettingsModel");
const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");

/**
 * Sync CodeTemplate to CodeSettings for an event
 * This bridges the new CodeTemplate system with the existing CodeGenerator flow
 *
 * Migration strategy:
 * 1. First look for CodeSettings with matching codeTemplateId
 * 2. If not found, look for legacy CodeSettings with matching name (no codeTemplateId)
 * 3. If found by name, update it to add codeTemplateId (migration)
 * 4. If nothing found, create new CodeSettings
 */
async function syncCodeTemplateToCodeSettings(codeTemplateId, eventId) {
  try {
    const template = await CodeTemplate.findById(codeTemplateId);
    if (!template) {
      console.log(`[syncCodeTemplateToCodeSettings] Template ${codeTemplateId} not found`);
      return null;
    }

    console.log(`[syncCodeTemplateToCodeSettings] Syncing template "${template.name}" to event ${eventId}`);

    // First, try to find existing CodeSettings linked to this codeTemplateId
    let codeSetting = await CodeSettings.findOne({
      eventId: eventId,
      codeTemplateId: codeTemplateId,
    });

    if (codeSetting) {
      // Update existing CodeSettings that already has codeTemplateId
      codeSetting.name = template.name;
      codeSetting.condition = template.condition || "";
      codeSetting.note = template.note || "";
      codeSetting.maxPax = template.maxPax || 1;
      codeSetting.limit = template.defaultLimit || 0;
      codeSetting.color = template.color || "#2196F3";
      codeSetting.icon = template.icon || "RiCodeLine";
      codeSetting.requireEmail = template.requireEmail !== false;
      codeSetting.requirePhone = template.requirePhone || false;
      codeSetting.isEnabled = true;
      codeSetting.isEditable = true;
      await codeSetting.save();
      console.log(`[syncCodeTemplateToCodeSettings] Updated existing CodeSettings (by codeTemplateId) for "${template.name}"`);
      return codeSetting;
    }

    // Not found by codeTemplateId - try to find legacy CodeSettings by name (migration)
    codeSetting = await CodeSettings.findOne({
      eventId: eventId,
      name: template.name,
      codeTemplateId: { $exists: false }, // Legacy code without codeTemplateId
    });

    if (!codeSetting) {
      // Also check for codeTemplateId: null
      codeSetting = await CodeSettings.findOne({
        eventId: eventId,
        name: template.name,
        codeTemplateId: null,
      });
    }

    if (codeSetting) {
      // Found legacy CodeSettings by name - migrate it by adding codeTemplateId
      codeSetting.codeTemplateId = codeTemplateId;
      codeSetting.condition = template.condition || codeSetting.condition || "";
      codeSetting.note = template.note || codeSetting.note || "";
      codeSetting.maxPax = template.maxPax || codeSetting.maxPax || 1;
      codeSetting.limit = template.defaultLimit || codeSetting.limit || 0;
      codeSetting.color = template.color || codeSetting.color || "#2196F3";
      codeSetting.icon = template.icon || codeSetting.icon || "RiCodeLine";
      codeSetting.requireEmail = template.requireEmail !== false;
      codeSetting.requirePhone = template.requirePhone || false;
      codeSetting.isEnabled = true;
      codeSetting.isEditable = true;
      await codeSetting.save();
      console.log(`[syncCodeTemplateToCodeSettings] MIGRATED legacy CodeSettings "${template.name}" - added codeTemplateId`);
      return codeSetting;
    }

    // No existing CodeSettings found - create new one
    codeSetting = new CodeSettings({
      eventId: eventId,
      name: template.name,
      type: "custom",
      condition: template.condition || "",
      note: template.note || "",
      maxPax: template.maxPax || 1,
      limit: template.defaultLimit || 0,
      color: template.color || "#2196F3",
      icon: template.icon || "RiCodeLine",
      requireEmail: template.requireEmail !== false,
      requirePhone: template.requirePhone || false,
      isEditable: true,
      isEnabled: true,
      codeTemplateId: codeTemplateId,
    });
    await codeSetting.save();
    console.log(`[syncCodeTemplateToCodeSettings] Created NEW CodeSettings for "${template.name}"`);

    return codeSetting;
  } catch (error) {
    console.error("[syncCodeTemplateToCodeSettings] Error:", error);
    return null;
  }
}

/**
 * Remove CodeSettings for a CodeTemplate/Event combination
 */
async function removeCodeSettingsForTemplate(codeTemplateId, eventId) {
  try {
    await CodeSettings.deleteOne({
      eventId: eventId,
      codeTemplateId: codeTemplateId,
    });
  } catch (error) {
    console.error("[removeCodeSettingsForTemplate] Error:", error);
  }
}

/**
 * Get all code templates for the authenticated user
 * GET /api/codes
 */
const getCodeTemplates = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    // Get all code templates for this user
    const templates = await CodeTemplate.find({ userId }).sort({
      sortOrder: 1,
      createdAt: 1,
    });

    // For each template, get its brand attachments
    const templatesWithAttachments = await Promise.all(
      templates.map(async (template) => {
        const attachments = await CodeBrandAttachment.find({
          codeTemplateId: template._id,
        }).populate("brandId", "name username logo");

        return {
          ...template.toObject(),
          attachments: attachments.map((a) => ({
            brandId: a.brandId._id,
            brandName: a.brandId.name,
            brandUsername: a.brandId.username,
            brandLogo: a.brandId.logo,
            isGlobalForBrand: a.isGlobalForBrand,
          })),
        };
      })
    );

    return res.status(200).json({ templates: templatesWithAttachments });
  } catch (error) {
    console.error("[codeTemplateController] getCodeTemplates error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get a single code template with full attachment details
 * GET /api/codes/:codeId
 */
const getCodeTemplate = async (req, res) => {
  try {
    const { codeId } = req.params;
    const userId = req.user.userId || req.user._id;

    const template = await CodeTemplate.findOne({ _id: codeId, userId });

    if (!template) {
      return res.status(404).json({ message: "Code template not found" });
    }

    // Get brand attachments with event activations
    const attachments = await CodeBrandAttachment.find({
      codeTemplateId: codeId,
    }).populate("brandId", "name username logo");

    // For each attachment, get event activations if not global
    const attachmentsWithEvents = await Promise.all(
      attachments.map(async (attachment) => {
        let enabledEvents = [];

        if (!attachment.isGlobalForBrand) {
          // Get specific event activations
          const events = await Event.find({
            brand: attachment.brandId._id,
            parentEventId: { $exists: false }, // Only parent events
          }).select("_id title isWeekly startDate");

          const activations = await EventCodeActivation.find({
            codeTemplateId: codeId,
            eventId: { $in: events.map((e) => e._id) },
            isEnabled: true,
          });

          enabledEvents = activations.map((a) => ({
            eventId: a.eventId,
            applyToChildren: a.applyToChildren,
          }));
        }

        return {
          brandId: attachment.brandId._id,
          brandName: attachment.brandId.name,
          brandUsername: attachment.brandId.username,
          brandLogo: attachment.brandId.logo,
          isGlobalForBrand: attachment.isGlobalForBrand,
          enabledEvents,
        };
      })
    );

    return res.status(200).json({
      template: {
        ...template.toObject(),
        attachments: attachmentsWithEvents,
      },
    });
  } catch (error) {
    console.error("[codeTemplateController] getCodeTemplate error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Create a new code template
 * POST /api/codes
 */
const createCodeTemplate = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const {
      name,
      condition,
      note,
      maxPax,
      defaultLimit,
      color,
      icon,
      requireEmail,
      requirePhone,
      attachments, // Array of { brandId, isGlobalForBrand, enabledEvents }
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check if name already exists for this user
    const existingByName = await CodeTemplate.findOne({
      userId,
      name: name.trim(),
    });
    if (existingByName) {
      return res.status(400).json({
        message: `A code template with name "${name}" already exists`,
      });
    }

    // Get the highest sortOrder
    const lastTemplate = await CodeTemplate.findOne({ userId }).sort({
      sortOrder: -1,
    });
    const newSortOrder = lastTemplate ? lastTemplate.sortOrder + 1 : 0;

    // Create the template
    const template = new CodeTemplate({
      userId,
      name: name.trim(),
      type: "custom", // All codes are custom now
      condition: condition || "",
      note: note || "",
      maxPax: maxPax || 1,
      defaultLimit: defaultLimit || 0,
      color: color || "#2196F3",
      icon: icon || "RiCodeLine",
      requireEmail: requireEmail !== undefined ? requireEmail : true,
      requirePhone: requirePhone !== undefined ? requirePhone : false,
      sortOrder: newSortOrder,
    });

    await template.save();

    // Process attachments if provided
    if (attachments && Array.isArray(attachments)) {
      await processAttachments(template._id, attachments, userId);
    }

    // Return template with attachments
    const fullAttachments = await CodeBrandAttachment.find({
      codeTemplateId: template._id,
    }).populate("brandId", "name username logo");

    return res.status(201).json({
      message: "Code template created successfully",
      template: {
        ...template.toObject(),
        attachments: fullAttachments.map((a) => ({
          brandId: a.brandId._id,
          brandName: a.brandId.name,
          brandUsername: a.brandId.username,
          brandLogo: a.brandId.logo,
          isGlobalForBrand: a.isGlobalForBrand,
        })),
      },
    });
  } catch (error) {
    console.error("[codeTemplateController] createCodeTemplate error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "A code template with this name already exists",
      });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update a code template
 * PUT /api/codes/:codeId
 */
const updateCodeTemplate = async (req, res) => {
  try {
    const { codeId } = req.params;
    const userId = req.user.userId || req.user._id;
    const {
      name,
      condition,
      note,
      maxPax,
      defaultLimit,
      color,
      icon,
      requireEmail,
      requirePhone,
      attachments, // Array of { brandId, isGlobalForBrand, enabledEvents }
    } = req.body;

    // Find the template
    const template = await CodeTemplate.findOne({ _id: codeId, userId });

    if (!template) {
      return res.status(404).json({ message: "Code template not found" });
    }

    // Check if new name conflicts
    if (name && name.trim() !== template.name) {
      const existingByName = await CodeTemplate.findOne({
        userId,
        name: name.trim(),
        _id: { $ne: codeId },
      });
      if (existingByName) {
        return res.status(400).json({
          message: `A code template with name "${name}" already exists`,
        });
      }
    }

    // Update fields
    if (name !== undefined) template.name = name.trim();
    if (condition !== undefined) template.condition = condition;
    if (note !== undefined) template.note = note;
    if (maxPax !== undefined) template.maxPax = maxPax;
    if (defaultLimit !== undefined) template.defaultLimit = defaultLimit;
    if (color !== undefined) template.color = color;
    if (icon !== undefined) template.icon = icon;
    if (requireEmail !== undefined) template.requireEmail = requireEmail;
    if (requirePhone !== undefined) template.requirePhone = requirePhone;

    await template.save();

    // Process attachments if provided
    if (attachments !== undefined) {
      await processAttachments(codeId, attachments || [], userId);
    }

    // Return template with attachments
    const fullAttachments = await CodeBrandAttachment.find({
      codeTemplateId: codeId,
    }).populate("brandId", "name username logo");

    return res.status(200).json({
      message: "Code template updated successfully",
      template: {
        ...template.toObject(),
        attachments: fullAttachments.map((a) => ({
          brandId: a.brandId._id,
          brandName: a.brandId.name,
          brandUsername: a.brandId.username,
          brandLogo: a.brandId.logo,
          isGlobalForBrand: a.isGlobalForBrand,
        })),
      },
    });
  } catch (error) {
    console.error("[codeTemplateController] updateCodeTemplate error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "A code template with this name already exists",
      });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete a code template
 * DELETE /api/codes/:codeId
 */
const deleteCodeTemplate = async (req, res) => {
  try {
    const { codeId } = req.params;
    const userId = req.user.userId || req.user._id;

    // Find the template
    const template = await CodeTemplate.findOne({ _id: codeId, userId });

    if (!template) {
      return res.status(404).json({ message: "Code template not found" });
    }

    // Delete all brand attachments
    await CodeBrandAttachment.deleteMany({ codeTemplateId: codeId });

    // Delete all event activations
    await EventCodeActivation.deleteMany({ codeTemplateId: codeId });

    // Delete all CodeSettings entries created through the sync bridge
    await CodeSettings.deleteMany({ codeTemplateId: codeId });

    // Delete the template
    await CodeTemplate.findByIdAndDelete(codeId);

    return res.status(200).json({
      message: "Code template deleted successfully",
    });
  } catch (error) {
    console.error("[codeTemplateController] deleteCodeTemplate error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Reorder code templates
 * PUT /api/codes/reorder
 */
const reorderCodeTemplates = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { templateIds } = req.body;

    if (!Array.isArray(templateIds)) {
      return res.status(400).json({ message: "templateIds must be an array" });
    }

    // Update sort order for each template
    const updatePromises = templateIds.map((id, index) =>
      CodeTemplate.findOneAndUpdate({ _id: id, userId }, { sortOrder: index })
    );

    await Promise.all(updatePromises);

    // Return updated templates
    const templates = await CodeTemplate.find({ userId }).sort({ sortOrder: 1 });

    return res.status(200).json({
      message: "Templates reordered successfully",
      templates,
    });
  } catch (error) {
    console.error("[codeTemplateController] reorderCodeTemplates error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Helper function to process attachments
 * Syncs the attachment state based on the provided array
 * Also syncs to CodeSettings for compatibility with CodeGenerator
 */
async function processAttachments(codeTemplateId, attachments, userId) {
  console.log(`[processAttachments] Processing ${attachments.length} attachments for template ${codeTemplateId}`);
  console.log(`[processAttachments] Attachments:`, JSON.stringify(attachments, null, 2));

  // Get current attachments
  const currentAttachments = await CodeBrandAttachment.find({ codeTemplateId });
  const currentBrandIds = currentAttachments.map((a) => a.brandId.toString());
  const newBrandIds = attachments.map((a) => a.brandId.toString());

  // Get user's brands to verify they have permission
  const userBrands = await Brand.find({
    $or: [{ owner: userId }, { "team.user": userId }],
  }).select("_id");
  const userBrandIds = userBrands.map((b) => b._id.toString());

  // Remove attachments that are no longer in the list
  const toRemove = currentBrandIds.filter((id) => !newBrandIds.includes(id));
  if (toRemove.length > 0) {
    await CodeBrandAttachment.deleteMany({
      codeTemplateId,
      brandId: { $in: toRemove },
    });

    // Also remove event activations for these brands' events
    const eventsToClean = await Event.find({
      brand: { $in: toRemove },
    }).select("_id");
    await EventCodeActivation.deleteMany({
      codeTemplateId,
      eventId: { $in: eventsToClean.map((e) => e._id) },
    });

    // Remove CodeSettings for these brands' events (sync bridge)
    for (const eventToClean of eventsToClean) {
      await removeCodeSettingsForTemplate(codeTemplateId, eventToClean._id);
    }
  }

  // Process each attachment
  for (const attachment of attachments) {
    const { brandId, isGlobalForBrand, enabledEvents } = attachment;

    // Verify user has permission for this brand
    if (!userBrandIds.includes(brandId.toString())) {
      continue; // Skip brands user doesn't have access to
    }

    // Upsert the brand attachment
    await CodeBrandAttachment.findOneAndUpdate(
      { codeTemplateId, brandId },
      { isGlobalForBrand: isGlobalForBrand !== false },
      { upsert: true }
    );

    // Handle event activations and CodeSettings sync
    if (isGlobalForBrand) {
      // Global = applies to all events in this brand
      // Get all parent events for this brand (not child events - they inherit from parent)
      const brandEvents = await Event.find({
        brand: brandId,
        parentEventId: { $exists: false },
      }).select("_id");

      console.log(`[processAttachments] Brand ${brandId} is GLOBAL, found ${brandEvents.length} parent events to sync`);

      // Remove specific EventCodeActivation entries (not needed for global)
      await EventCodeActivation.deleteMany({
        codeTemplateId,
        eventId: { $in: brandEvents.map((e) => e._id) },
      });

      // Sync CodeSettings for all parent events (for CodeGenerator compatibility)
      for (const event of brandEvents) {
        console.log(`[processAttachments] Syncing to event ${event._id}`);
        await syncCodeTemplateToCodeSettings(codeTemplateId, event._id);
      }
    } else if (enabledEvents && Array.isArray(enabledEvents)) {
      // Not global = manage specific event activations
      const brandEvents = await Event.find({
        brand: brandId,
        parentEventId: { $exists: false },
      }).select("_id");
      const brandEventIds = brandEvents.map((e) => e._id.toString());

      // Get currently enabled events
      const currentActivations = await EventCodeActivation.find({
        codeTemplateId,
        eventId: { $in: brandEvents.map((e) => e._id) },
      });
      const currentEnabledIds = currentActivations.map((a) =>
        a.eventId.toString()
      );

      const newEnabledIds = enabledEvents.map((e) => e.eventId.toString());

      // Remove activations for events no longer enabled
      const toDeactivate = currentEnabledIds.filter(
        (id) => !newEnabledIds.includes(id)
      );
      if (toDeactivate.length > 0) {
        await EventCodeActivation.deleteMany({
          codeTemplateId,
          eventId: { $in: toDeactivate },
        });

        // Remove CodeSettings for deactivated events (sync bridge)
        for (const eventId of toDeactivate) {
          await removeCodeSettingsForTemplate(codeTemplateId, eventId);
        }
      }

      // Add/update activations for enabled events
      for (const enabledEvent of enabledEvents) {
        const { eventId, applyToChildren } = enabledEvent;

        // Verify this event belongs to the brand
        if (!brandEventIds.includes(eventId.toString())) {
          continue;
        }

        await EventCodeActivation.findOneAndUpdate(
          { codeTemplateId, eventId },
          {
            isEnabled: true,
            applyToChildren: applyToChildren !== false,
          },
          { upsert: true }
        );

        // Sync CodeSettings for this event (for CodeGenerator compatibility)
        await syncCodeTemplateToCodeSettings(codeTemplateId, eventId);
      }
    } else {
      // No specific events enabled but not global - remove all CodeSettings for this brand
      const brandEvents = await Event.find({
        brand: brandId,
        parentEventId: { $exists: false },
      }).select("_id");

      for (const event of brandEvents) {
        await removeCodeSettingsForTemplate(codeTemplateId, event._id);
      }
    }
  }
}

/**
 * Get all code templates attached to a specific brand
 * Used by RoleSetting.js to show codes for role permissions
 * GET /api/code-templates/brand/:brandId
 */
const getCodeTemplatesForBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.userId || req.user._id;

    // Verify user has access to this brand
    const brand = await Brand.findOne({
      _id: brandId,
      $or: [{ owner: userId }, { "team.user": userId }],
    });

    if (!brand) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find all CodeTemplates attached to this brand
    const attachments = await CodeBrandAttachment.find({ brandId }).populate(
      "codeTemplateId"
    );

    const templates = attachments
      .filter((a) => a.codeTemplateId) // Filter out nulls (in case template was deleted)
      .map((a) => ({
        ...a.codeTemplateId.toObject(),
        isGlobalForBrand: a.isGlobalForBrand,
        // Use name as permissionKey for backward compatibility with role system
        permissionKey: a.codeTemplateId.name,
      }));

    return res.status(200).json({ templates });
  } catch (error) {
    console.error(
      "[codeTemplateController] getCodeTemplatesForBrand error:",
      error
    );
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get codes for a specific event (used by EventSettings, public event page, etc.)
 * GET /api/codes/event/:eventId
 */
const getCodesForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const brandId = event.brand;

    // Find all codes attached to this brand
    const brandAttachments = await CodeBrandAttachment.find({ brandId }).populate(
      "codeTemplateId"
    );

    const enabledCodes = [];

    for (const attachment of brandAttachments) {
      const code = attachment.codeTemplateId;
      if (!code) continue;

      if (attachment.isGlobalForBrand) {
        // Global for brand = enabled for all events
        enabledCodes.push(code);
      } else {
        // Check specific event activation
        const activation = await EventCodeActivation.findOne({
          codeTemplateId: code._id,
          isEnabled: true,
          $or: [
            { eventId: eventId },
            // If event has parent and parent has activation with applyToChildren
            ...(event.parentEventId
              ? [{ eventId: event.parentEventId, applyToChildren: true }]
              : []),
          ],
        });

        if (activation) {
          enabledCodes.push(code);
        }
      }
    }

    return res.status(200).json({ codes: enabledCodes });
  } catch (error) {
    console.error("[codeTemplateController] getCodesForEvent error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Migrate existing CodeSettings by linking them to CodeTemplates
 * POST /api/code-templates/migrate-event/:eventId
 *
 * This is useful when:
 * - CodeTemplates were created but the sync didn't run for existing events
 * - Legacy CodeSettings exist without codeTemplateId references
 */
const migrateEventCodeSettings = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId || req.user._id;

    // Get the event and its brand
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Verify user has access to this brand
    const brand = await Brand.findOne({
      _id: event.brand,
      $or: [{ owner: userId }, { "team.user": userId }],
    });

    if (!brand) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Resolve to parent event for child events
    const parentEventId = event.parentEventId || event._id;

    // Find all CodeTemplates attached to this brand (global)
    const attachments = await CodeBrandAttachment.find({
      brandId: event.brand,
      isGlobalForBrand: true,
    }).populate("codeTemplateId");

    // Get existing CodeSettings for this event
    const existingSettings = await CodeSettings.find({ eventId: parentEventId });

    console.log(`[migrateEventCodeSettings] Event: ${event.title} (${eventId})`);
    console.log(`[migrateEventCodeSettings] Parent event ID: ${parentEventId}`);
    console.log(`[migrateEventCodeSettings] Found ${attachments.length} global brand attachments`);
    console.log(`[migrateEventCodeSettings] Found ${existingSettings.length} existing CodeSettings`);

    let migrated = 0;
    let created = 0;
    let skipped = 0;

    for (const attachment of attachments) {
      const template = attachment.codeTemplateId;
      if (!template) continue;

      // Find matching CodeSettings by name (without codeTemplateId)
      const matchingSetting = existingSettings.find(
        (cs) => cs.name === template.name && !cs.codeTemplateId
      );

      if (matchingSetting) {
        // Migrate: add codeTemplateId
        matchingSetting.codeTemplateId = template._id;
        matchingSetting.isEditable = true;
        await matchingSetting.save();
        console.log(`[migrateEventCodeSettings] MIGRATED: "${template.name}" -> ${template._id}`);
        migrated++;
      } else {
        // Check if already linked
        const alreadyLinked = existingSettings.find(
          (cs) => cs.codeTemplateId?.toString() === template._id.toString()
        );

        if (alreadyLinked) {
          console.log(`[migrateEventCodeSettings] SKIPPED (already linked): "${template.name}"`);
          skipped++;
        } else {
          // Create new CodeSettings for this template
          const newSetting = new CodeSettings({
            eventId: parentEventId,
            codeTemplateId: template._id,
            name: template.name,
            type: template.type || "custom",
            condition: template.condition || "",
            note: template.note || "",
            maxPax: template.maxPax || 1,
            limit: template.defaultLimit || 0,
            color: template.color || "#2196F3",
            icon: template.icon || "RiCodeLine",
            requireEmail: template.requireEmail !== false,
            requirePhone: template.requirePhone || false,
            isEnabled: true,
            isEditable: true,
          });
          await newSetting.save();
          console.log(`[migrateEventCodeSettings] CREATED: "${template.name}" -> ${template._id}`);
          created++;
        }
      }
    }

    return res.status(200).json({
      message: `Migration complete: ${migrated} migrated, ${created} created, ${skipped} already linked`,
      migrated,
      created,
      skipped,
    });
  } catch (error) {
    console.error("[codeTemplateController] migrateEventCodeSettings error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCodeTemplates,
  getCodeTemplate,
  createCodeTemplate,
  updateCodeTemplate,
  deleteCodeTemplate,
  reorderCodeTemplates,
  getCodesForEvent,
  getCodeTemplatesForBrand,
  migrateEventCodeSettings,
};
