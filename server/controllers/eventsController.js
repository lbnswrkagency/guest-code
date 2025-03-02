const Event = require("../models/eventsModel");
const User = require("../models/User");
const Brand = require("../models/brandModel");
const GuestCode = require("../models/GuestCode");
const InvitationCode = require("../models/InvitationModel");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const { sendQRCodeEmail } = require("../utils/email");
const { sendQRCodeInvitation } = require("../utils/email");
const { createTicketPDF } = require("../utils/pdf-invite");
const CodeSettings = require("../models/codeSettingsModel");
const LineUp = require("../models/lineupModel");
const TicketSettings = require("../models/ticketSettingsModel");

const {
  uploadToS3,
  listFilesFromS3,
  deleteFileFromS3,
  generateSignedUrl,
} = require("../utils/s3Uploader");

const fsPromises = require("fs").promises;
const fs = require("fs");

const onToBoolean = (value) => {
  return value === "on";
};

const generateUniqueLink = () => {
  return Math.random().toString(36).substr(2, 8);
};

// Helper function to generate weekly occurrences
const generateWeeklyOccurrences = async (parentEvent, weekNumber) => {
  try {
    console.log(
      `[Weekly Events] Generating occurrence for week ${weekNumber} for event: ${parentEvent._id}`
    );

    // Calculate the date for this occurrence
    const occurrenceDate = new Date(parentEvent.date);
    occurrenceDate.setDate(occurrenceDate.getDate() + weekNumber * 7);

    // Create a unique link for this occurrence
    const link = `${parentEvent.link}-w${weekNumber}`;

    // Create the weekly occurrence
    const weeklyEvent = new Event({
      user: parentEvent.user,
      brand: parentEvent.brand,
      title: parentEvent.title,
      subTitle: parentEvent.subTitle,
      description: parentEvent.description,
      date: occurrenceDate,
      startTime: parentEvent.startTime,
      endTime: parentEvent.endTime,
      location: parentEvent.location,
      isWeekly: true,
      parentEventId: parentEvent._id,
      weekNumber: weekNumber,
      isLive: false, // Default to not live
      flyer: parentEvent.flyer,
      // Copy legacy code settings for backward compatibility
      guestCode: parentEvent.guestCode,
      friendsCode: parentEvent.friendsCode,
      ticketCode: parentEvent.ticketCode,
      tableCode: parentEvent.tableCode,
      backstageCode: parentEvent.backstageCode,
      // Use empty objects for embedded code settings to avoid validation errors
      guestCodeSettings: {},
      friendsCodeSettings: {},
      ticketCodeSettings: {},
      tableCodeSettings: {},
      backstageCodeSettings: {},
      link: link,
    });

    await weeklyEvent.save();
    console.log(
      `[Weekly Events] Created week ${weekNumber} occurrence: ${weeklyEvent._id}`
    );

    // Initialize default code settings for the weekly event
    try {
      const { initializeDefaultSettings } = require("./codeSettingsController");
      await initializeDefaultSettings(weeklyEvent._id);
      console.log(
        `[Weekly Events] Initialized default code settings for week ${weekNumber}`
      );

      // Copy code settings from parent event to child event
      const parentCodeSettings = await CodeSettings.find({
        eventId: parentEvent._id,
      });
      if (parentCodeSettings && parentCodeSettings.length > 0) {
        console.log(
          `[Weekly Events] Copying ${parentCodeSettings.length} code settings from parent event`
        );

        // For each parent code setting, create a corresponding child code setting
        await Promise.all(
          parentCodeSettings.map(async (parentSetting) => {
            // Check if a setting of this type already exists for the child
            const existingChildSetting = await CodeSettings.findOne({
              eventId: weeklyEvent._id,
              type: parentSetting.type,
            });

            if (existingChildSetting) {
              // Update existing setting
              existingChildSetting.name = parentSetting.name;
              existingChildSetting.condition = parentSetting.condition;
              existingChildSetting.maxPax = parentSetting.maxPax;
              existingChildSetting.limit = parentSetting.limit;
              existingChildSetting.isEnabled = parentSetting.isEnabled;
              existingChildSetting.isEditable = parentSetting.isEditable;
              existingChildSetting.price = parentSetting.price;
              existingChildSetting.tableNumber = parentSetting.tableNumber;

              await existingChildSetting.save();
            } else {
              // Create new setting
              const newChildSetting = new CodeSettings({
                eventId: weeklyEvent._id,
                name: parentSetting.name,
                type: parentSetting.type,
                condition: parentSetting.condition,
                maxPax: parentSetting.maxPax,
                limit: parentSetting.limit,
                isEnabled: parentSetting.isEnabled,
                isEditable: parentSetting.isEditable,
                price: parentSetting.price,
                tableNumber: parentSetting.tableNumber,
              });

              await newChildSetting.save();
            }
          })
        );

        console.log(
          `[Weekly Events] Successfully copied code settings to child event`
        );
      }
    } catch (settingsError) {
      console.error(
        `[Weekly Events] Error handling code settings for week ${weekNumber}:`,
        settingsError
      );
      // Continue even if code settings initialization fails
    }

    return weeklyEvent;
  } catch (error) {
    console.error(
      `[Weekly Events] Error generating weekly occurrence for week ${weekNumber}:`,
      error
    );
    throw error;
  }
};

// Find or create a weekly occurrence
const findOrCreateWeeklyOccurrence = async (parentEvent, weekNumber) => {
  try {
    console.log(
      `[Weekly Events] Looking for child event with parentEventId: ${parentEvent._id}, weekNumber: ${weekNumber}`
    );

    // First try to find an existing occurrence for this week
    const existingOccurrence = await Event.findOne({
      parentEventId: parentEvent._id,
      weekNumber: weekNumber,
    });

    if (existingOccurrence) {
      console.log(
        `[Weekly Events] Found existing occurrence for week ${weekNumber}: ${existingOccurrence._id}`
      );
      return existingOccurrence;
    }

    // If not found, create a new one
    console.log(
      `[Weekly Events] No existing occurrence found for week ${weekNumber}, creating new one`
    );
    return await generateWeeklyOccurrences(parentEvent, weekNumber);
  } catch (error) {
    console.error(
      `[Weekly Events] Error in findOrCreateWeeklyOccurrence:`,
      error
    );
    throw error;
  }
};

exports.createEvent = async (req, res) => {
  try {
    console.log("[Event Creation] Received request:", {
      body: req.body,
      brandId: req.params.brandId,
      userId: req.user.userId,
      files: req.files ? Object.keys(req.files) : "No files",
    });

    // Validate brand exists and user has permission
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) {
      console.log("[Event Creation] Brand not found:", req.params.brandId);
      return res.status(404).json({ message: "Brand not found" });
    }

    console.log("[Event Creation] Found brand:", {
      brandId: brand._id,
      brandName: brand.name,
    });

    // Parse lineups if they exist
    let lineups = [];
    if (req.body.lineups) {
      try {
        lineups = JSON.parse(req.body.lineups);
        console.log("[Event Creation] Parsed lineups:", lineups);
      } catch (e) {
        console.error("[Event Creation] Error parsing lineups:", e);
      }
    }

    // Create event object without explicit _id
    const eventData = {
      ...req.body,
      user: req.user.userId,
      brand: req.params.brandId,
      link: generateUniqueLink(),
      flyer: {},
      lineups: lineups,
    };

    // Create and save the event
    const event = new Event(eventData);
    await event.save();

    console.log("[Event Creation] Event created successfully:", {
      eventId: event._id,
      title: event.title,
    });

    // Initialize default code settings for the event
    try {
      const { initializeDefaultSettings } = require("./codeSettingsController");
      await initializeDefaultSettings(event._id);
      console.log("[Event Creation] Default code settings initialized");
    } catch (settingsError) {
      console.error(
        "[Event Creation] Error initializing code settings:",
        settingsError
      );
      // Continue with event creation even if code settings initialization fails
    }

    // Handle file uploads if they exist
    if (req.files) {
      console.log("[Event Creation] Processing flyer uploads:", {
        fileFields: Object.keys(req.files),
        fileDetails: Object.entries(req.files).map(([field, files]) => ({
          field,
          size: files[0].size,
          mimetype: files[0].mimetype,
        })),
      });

      const timestamp = Date.now();

      for (const [fieldName, files] of Object.entries(req.files)) {
        if (!fieldName.startsWith("flyer.")) continue;

        const format = fieldName.split(".")[1];
        const file = files[0];

        try {
          const key = `events/${event._id}/flyers/${format}/${timestamp}`;
          const qualities = ["thumbnail", "medium", "full"];
          const urls = {};

          for (const quality of qualities) {
            let processedBuffer = file.buffer;

            if (quality === "thumbnail") {
              processedBuffer = await sharp(file.buffer)
                .resize(300)
                .jpeg({ quality: 80 })
                .toBuffer();
            } else if (quality === "medium") {
              processedBuffer = await sharp(file.buffer)
                .resize(800)
                .jpeg({ quality: 85 })
                .toBuffer();
            }

            const qualityKey = `${key}/${quality}`;
            const url = await uploadToS3(
              processedBuffer,
              qualityKey,
              file.mimetype
            );
            urls[quality] = url;

            console.log(
              `[Event Creation] Uploaded ${format}/${quality} flyer:`,
              {
                size: processedBuffer.length,
                url,
              }
            );
          }

          event.flyer[format] = {
            thumbnail: urls.thumbnail,
            medium: urls.medium,
            full: urls.full,
            timestamp,
          };
        } catch (error) {
          console.error(
            `[Event Creation] Error processing ${format} flyer:`,
            error
          );
        }
      }

      await event.save();
      console.log("[Event Creation] Saved event with flyer URLs");
    }

    res.status(201).json(event);
  } catch (error) {
    console.error("[Event Creation Error]", {
      error: error.message,
      stack: error.stack,
    });

    // Check if it's truly a duplicate key error
    if (error.code === 11000) {
      const existingEvent = await Event.findById(error.keyValue._id);
      if (existingEvent) {
        return res.status(200).json(existingEvent);
      }
    }

    res.status(500).json({
      message: "Failed to create event",
      error: error.message,
    });
  }
};

exports.getBrandEvents = async (req, res) => {
  try {
    const { brandId } = req.params;
    console.log(`[Events] Fetching events for brand: ${brandId}`);

    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      console.log("[Events] User is not authenticated:", { user: req.user });
      return res.status(401).json({
        message: "User not authenticated",
        debug: { user: req.user },
      });
    }

    const userId = req.user.userId; // Get the correct user ID
    console.log(`[Events] Current user ID: ${userId}`);
    console.log(`[Events] Full user object:`, req.user);

    // First find the brand without team check to debug
    const brandExists = await Brand.findById(brandId);
    if (!brandExists) {
      console.log(`[Events] Brand does not exist with ID: ${brandId}`);
      return res.status(404).json({
        message: "Brand not found",
      });
    }

    console.log(`[Events] Brand found:`, {
      name: brandExists.name,
      owner: brandExists.owner,
      teamCount: brandExists.team.length,
      teamMembers: brandExists.team.map((t) => ({
        user: t.user,
        role: t.role,
      })),
    });

    // Now check if user has permission
    const brand = await Brand.findOne({
      _id: brandId,
      $or: [{ owner: userId }, { "team.user": userId }],
    });

    if (!brand) {
      console.log(
        `[Events] User ${userId} is not owner or team member for brand: ${brandId}`
      );
      return res.status(403).json({
        message: "You don't have permission to view this brand's events",
      });
    }

    console.log(`[Events] Found brand: ${brand.name}`);

    // Get only parent events (events with no parentEventId)
    // We don't want to include child events in the main list
    const events = await Event.find({
      brand: brandId,
      parentEventId: { $exists: false }, // Only get parent events
    })
      .sort({ date: -1 })
      .populate("user", "username firstName lastName avatar")
      .populate("lineups");

    console.log(
      `[Events] Found ${events.length} parent events for brand: ${brand.name}`
    );

    // Log the first event's lineups for debugging
    if (events.length > 0) {
      console.log(`[Events] First event lineups:`, {
        eventId: events[0]._id,
        title: events[0].title,
        hasLineups: !!events[0].lineups,
        lineupCount: events[0].lineups?.length,
        lineups: events[0].lineups?.map((l) => ({ id: l._id, name: l.name })),
      });
    }

    res.status(200).json(events);
  } catch (error) {
    console.error("[Events] Error in getBrandEvents:", error);
    res.status(500).json({
      message: "Error fetching brand events",
      error: error.message,
    });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    // Get all brands where user is a team member
    const brands = await Brand.find({ "team.user": req.user.userId });
    const brandIds = brands.map((brand) => brand._id);

    // Get events from all these brands
    const events = await Event.find({ brand: { $in: brandIds } })
      .sort({ date: -1 })
      .populate("brand", "name username logo")
      .populate("user", "username firstName lastName avatar");

    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching events" });
  }
};

exports.editEvent = async (req, res) => {
  try {
    console.log("[Event Edit] === DEBUG AUTH START ===");
    console.log("[Event Edit] Request headers:", {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    console.log("[Event Edit] Request cookies:", req.cookies);
    console.log("[Event Edit] Request user:", req.user);
    console.log("[Event Edit] Request user ID:", req.user?.userId);
    console.log("[Event Edit] Request params:", req.params);
    console.log("[Event Edit] === DEBUG AUTH END ===");

    const { eventId } = req.params;
    const updatedEventData = req.body;
    const weekNumber = parseInt(req.query.weekNumber || "0");

    console.log("[Event Update] Received request:", {
      eventId,
      body: req.body,
      userId: req.user.userId,
      weekNumber,
    });

    // Handle lineups if they exist
    if (updatedEventData.lineups) {
      // If lineups is a string (from FormData), parse it
      if (typeof updatedEventData.lineups === "string") {
        try {
          updatedEventData.lineups = JSON.parse(updatedEventData.lineups);
        } catch (e) {
          console.error("[Event Update] Error parsing lineups:", e);
          delete updatedEventData.lineups;
        }
      }
      console.log("[Event Update] Lineups:", updatedEventData.lineups);
    }

    // Find event and check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to edit this event
    const brand = await Brand.findOne({
      _id: event.brand,
      $or: [{ owner: req.user.userId }, { "team.user": req.user.userId }],
    });

    if (!brand) {
      return res.status(403).json({
        message: "You don't have permission to edit this event",
      });
    }

    // Convert date string to Date object if it exists
    if (updatedEventData.date) {
      updatedEventData.date = new Date(updatedEventData.date);
    }

    // Check if this is a child event being edited directly
    if (event.parentEventId) {
      console.log(`[Event Update] Editing child event directly: ${event._id}`);

      // Update the child event with the new data
      // Make sure we don't change certain fields that should remain consistent
      const updatedChildData = {
        ...updatedEventData,
        isWeekly: true, // Keep it marked as weekly
        parentEventId: event.parentEventId, // Keep the parent reference
        weekNumber: event.weekNumber, // Keep the week number
      };

      // Apply updates to the child event
      Object.keys(updatedChildData).forEach((key) => {
        if (
          key !== "parentEventId" &&
          key !== "weekNumber" &&
          key !== "isWeekly"
        ) {
          event[key] = updatedChildData[key];
        }
      });

      try {
        // Remove validation for embedded code settings to prevent errors
        // These fields are now handled by the CodeSettings model
        event.guestCodeSettings = {};
        event.friendsCodeSettings = {};
        event.ticketCodeSettings = {};
        event.tableCodeSettings = {};
        event.backstageCodeSettings = {};

        await event.save();
        console.log(
          `[Event Update] Updated child event directly: ${event._id}`
        );

        // Check if we need to update code settings for this child event
        if (
          updatedEventData.codeSettings ||
          updatedEventData.guestCode !== undefined ||
          updatedEventData.friendsCode !== undefined ||
          updatedEventData.ticketCode !== undefined ||
          updatedEventData.tableCode !== undefined ||
          updatedEventData.backstageCode !== undefined
        ) {
          console.log(
            `[Event Update] Updating code settings for child event: ${event._id}`
          );

          // Import the CodeSettings controller
          const { configureCodeSettings } = require("./codeSettingsController");

          // Initialize default settings if they don't exist
          const {
            initializeDefaultSettings,
          } = require("./codeSettingsController");
          await initializeDefaultSettings(event._id);

          // Update the legacy boolean fields if they were changed
          if (updatedEventData.guestCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "guest" },
              { isEnabled: updatedEventData.guestCode },
              { new: true }
            );
          }

          if (updatedEventData.friendsCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "friends" },
              { isEnabled: updatedEventData.friendsCode },
              { new: true }
            );
          }

          if (updatedEventData.ticketCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "ticket" },
              { isEnabled: updatedEventData.ticketCode },
              { new: true }
            );
          }

          if (updatedEventData.tableCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "table" },
              { isEnabled: updatedEventData.tableCode },
              { new: true }
            );
          }

          if (updatedEventData.backstageCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "backstage" },
              { isEnabled: updatedEventData.backstageCode },
              { new: true }
            );
          }
        }

        return res.status(200).json(event);
      } catch (error) {
        console.error("[Event Update] Error saving child event:", error);
        return res.status(500).json({
          message: "Error updating child event",
          error: error.message,
        });
      }
    }

    // Check if this is a weekly event and we're editing a future occurrence
    if (event.isWeekly && weekNumber > 0) {
      // This is a request to edit a future occurrence of a weekly event
      console.log(
        `[Event Update] Editing weekly occurrence for week ${weekNumber}`
      );

      try {
        // Find or create the child event for this week
        const childEvent = await findOrCreateWeeklyOccurrence(
          event,
          weekNumber
        );

        // Update the child event with the new data
        // Make sure we don't change certain fields that should remain consistent
        const updatedChildData = {
          ...updatedEventData,
          isWeekly: true, // Keep it marked as weekly
          parentEventId: event._id, // Keep the parent reference
          weekNumber: weekNumber, // Keep the week number
        };

        // Apply updates to the child event
        Object.keys(updatedChildData).forEach((key) => {
          if (
            key !== "parentEventId" &&
            key !== "weekNumber" &&
            key !== "isWeekly"
          ) {
            childEvent[key] = updatedChildData[key];
          }
        });

        // Remove validation for embedded code settings to prevent errors
        // These fields are now handled by the CodeSettings model
        childEvent.guestCodeSettings = {};
        childEvent.friendsCodeSettings = {};
        childEvent.ticketCodeSettings = {};
        childEvent.tableCodeSettings = {};
        childEvent.backstageCodeSettings = {};

        try {
          await childEvent.save();

          // Check if we need to update code settings for this child event
          if (
            updatedEventData.codeSettings ||
            updatedEventData.guestCode !== undefined ||
            updatedEventData.friendsCode !== undefined ||
            updatedEventData.ticketCode !== undefined ||
            updatedEventData.tableCode !== undefined ||
            updatedEventData.backstageCode !== undefined
          ) {
            console.log(
              `[Event Update] Updating code settings for weekly child event: ${childEvent._id}`
            );

            // Initialize default settings if they don't exist
            const {
              initializeDefaultSettings,
            } = require("./codeSettingsController");
            await initializeDefaultSettings(childEvent._id);

            // Update the legacy boolean fields if they were changed
            if (updatedEventData.guestCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "guest" },
                { isEnabled: updatedEventData.guestCode },
                { new: true }
              );
            }

            if (updatedEventData.friendsCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "friends" },
                { isEnabled: updatedEventData.friendsCode },
                { new: true }
              );
            }

            if (updatedEventData.ticketCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "ticket" },
                { isEnabled: updatedEventData.ticketCode },
                { new: true }
              );
            }

            if (updatedEventData.tableCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "table" },
                { isEnabled: updatedEventData.tableCode },
                { new: true }
              );
            }

            if (updatedEventData.backstageCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "backstage" },
                { isEnabled: updatedEventData.backstageCode },
                { new: true }
              );
            }
          }

          console.log(
            `[Event Update] Updated child event for week ${weekNumber}`
          );
          return res.status(200).json(childEvent);
        } catch (error) {
          console.error("[Event Update] Error saving child event:", error);
          return res.status(500).json({
            message: "Error updating child event",
            error: error.message,
          });
        }
      } catch (error) {
        console.error("[Event Update] Error updating child event:", error);
        return res.status(500).json({
          message: "Error updating child event",
          error: error.message,
        });
      }
    }

    // For regular events or the parent weekly event (week 0)
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updatedEventData },
      { new: true, runValidators: true }
    );

    // Check if we need to update code settings for this event
    if (
      updatedEventData.codeSettings ||
      updatedEventData.guestCode !== undefined ||
      updatedEventData.friendsCode !== undefined ||
      updatedEventData.ticketCode !== undefined ||
      updatedEventData.tableCode !== undefined ||
      updatedEventData.backstageCode !== undefined
    ) {
      console.log(
        `[Event Update] Updating code settings for event: ${eventId}`
      );

      // Initialize default settings if they don't exist
      const { initializeDefaultSettings } = require("./codeSettingsController");
      await initializeDefaultSettings(eventId);

      // Update the legacy boolean fields if they were changed
      if (updatedEventData.guestCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "guest" },
          { isEnabled: updatedEventData.guestCode },
          { new: true }
        );
      }

      if (updatedEventData.friendsCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "friends" },
          { isEnabled: updatedEventData.friendsCode },
          { new: true }
        );
      }

      if (updatedEventData.ticketCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "ticket" },
          { isEnabled: updatedEventData.ticketCode },
          { new: true }
        );
      }

      if (updatedEventData.tableCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "table" },
          { isEnabled: updatedEventData.tableCode },
          { new: true }
        );
      }

      if (updatedEventData.backstageCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "backstage" },
          { isEnabled: updatedEventData.backstageCode },
          { new: true }
        );
      }
    }

    console.log("[Event Update] Event updated successfully:", {
      eventId,
      updatedFields: Object.keys(updatedEventData),
    });

    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error("[Event Update Error]", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error updating event",
      error: error.message,
    });
  }
};

// New flyer update handlers
exports.updateLandscapeFlyer = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { eventId } = req.params;
    const file = req.file;

    console.log("[Landscape Flyer Update] Processing upload:", {
      eventId,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    // Find event and check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission
    const brand = await Brand.findOne({
      _id: event.brand,
      "team.user": req.user.userId,
    });

    if (!brand) {
      return res.status(403).json({
        message: "You don't have permission to update this event",
      });
    }

    const timestamp = Date.now();
    const key = `events/${event._id}/flyers/landscape/${timestamp}`;
    const qualities = ["thumbnail", "medium", "full"];
    const urls = {};

    // Process and upload each quality
    for (const quality of qualities) {
      let processedBuffer = file.buffer;

      // Resize based on quality
      if (quality === "thumbnail") {
        processedBuffer = await sharp(file.buffer)
          .resize(300)
          .jpeg({ quality: 80 })
          .toBuffer();
      } else if (quality === "medium") {
        processedBuffer = await sharp(file.buffer)
          .resize(800)
          .jpeg({ quality: 85 })
          .toBuffer();
      }

      const qualityKey = `${key}/${quality}`;
      const url = await uploadToS3(processedBuffer, qualityKey, file.mimetype);
      urls[quality] = url;

      console.log(`[Landscape Flyer Update] Uploaded ${quality}:`, {
        size: processedBuffer.length,
        url,
      });
    }

    // Update event with the flyer URLs
    if (!event.flyer) event.flyer = {};
    event.flyer.landscape = {
      thumbnail: urls.thumbnail,
      medium: urls.medium,
      full: urls.full,
      timestamp,
    };

    await event.save();
    console.log("[Landscape Flyer Update] Event updated successfully");

    res.status(200).json(event);
  } catch (error) {
    console.error("[Landscape Flyer Update Error]", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Error updating flyer", error: error.message });
  }
};

exports.updatePortraitFlyer = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { eventId } = req.params;
    const file = req.file;

    console.log("[Portrait Flyer Update] Processing upload:", {
      eventId,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    // Find event and check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission
    const brand = await Brand.findOne({
      _id: event.brand,
      "team.user": req.user.userId,
    });

    if (!brand) {
      return res.status(403).json({
        message: "You don't have permission to update this event",
      });
    }

    const timestamp = Date.now();
    const key = `events/${event._id}/flyers/portrait/${timestamp}`;
    const qualities = ["thumbnail", "medium", "full"];
    const urls = {};

    // Process and upload each quality
    for (const quality of qualities) {
      let processedBuffer = file.buffer;

      // Resize based on quality
      if (quality === "thumbnail") {
        processedBuffer = await sharp(file.buffer)
          .resize(300)
          .jpeg({ quality: 80 })
          .toBuffer();
      } else if (quality === "medium") {
        processedBuffer = await sharp(file.buffer)
          .resize(800)
          .jpeg({ quality: 85 })
          .toBuffer();
      }

      const qualityKey = `${key}/${quality}`;
      const url = await uploadToS3(processedBuffer, qualityKey, file.mimetype);
      urls[quality] = url;

      console.log(`[Portrait Flyer Update] Uploaded ${quality}:`, {
        size: processedBuffer.length,
        url,
      });
    }

    // Update event with the flyer URLs
    if (!event.flyer) event.flyer = {};
    event.flyer.portrait = {
      thumbnail: urls.thumbnail,
      medium: urls.medium,
      full: urls.full,
      timestamp,
    };

    await event.save();
    console.log("[Portrait Flyer Update] Event updated successfully");

    res.status(200).json(event);
  } catch (error) {
    console.error("[Portrait Flyer Update Error]", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Error updating flyer", error: error.message });
  }
};

exports.updateSquareFlyer = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { eventId } = req.params;
    const file = req.file;

    console.log("[Square Flyer Update] Processing upload:", {
      eventId,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    // Find event and check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission
    const brand = await Brand.findOne({
      _id: event.brand,
      "team.user": req.user.userId,
    });

    if (!brand) {
      return res.status(403).json({
        message: "You don't have permission to update this event",
      });
    }

    const timestamp = Date.now();
    const key = `events/${event._id}/flyers/square/${timestamp}`;
    const qualities = ["thumbnail", "medium", "full"];
    const urls = {};

    // Process and upload each quality
    for (const quality of qualities) {
      let processedBuffer = file.buffer;

      // Resize based on quality
      if (quality === "thumbnail") {
        processedBuffer = await sharp(file.buffer)
          .resize(300)
          .jpeg({ quality: 80 })
          .toBuffer();
      } else if (quality === "medium") {
        processedBuffer = await sharp(file.buffer)
          .resize(800)
          .jpeg({ quality: 85 })
          .toBuffer();
      }

      const qualityKey = `${key}/${quality}`;
      const url = await uploadToS3(processedBuffer, qualityKey, file.mimetype);
      urls[quality] = url;

      console.log(`[Square Flyer Update] Uploaded ${quality}:`, {
        size: processedBuffer.length,
        url,
      });
    }

    // Update event with the flyer URLs
    if (!event.flyer) event.flyer = {};
    event.flyer.square = {
      thumbnail: urls.thumbnail,
      medium: urls.medium,
      full: urls.full,
      timestamp,
    };

    await event.save();
    console.log("[Square Flyer Update] Event updated successfully");

    res.status(200).json(event);
  } catch (error) {
    console.error("[Square Flyer Update Error]", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Error updating flyer", error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { deleteRelated } = req.query;
    console.log(
      `[Event Delete] Deleting event: ${eventId}, deleteRelated: ${deleteRelated}`
    );

    // Find event and check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to delete this event
    const brand = await Brand.findOne({
      _id: event.brand,
      "team.user": req.user.userId,
    });

    if (!brand) {
      return res.status(403).json({
        message: "You don't have permission to delete this event",
      });
    }

    // If this is a weekly event, delete all child events
    if (event.isWeekly) {
      console.log(
        `[Event Delete] Deleting child events for weekly event: ${eventId}`
      );
      const deletedChildren = await Event.deleteMany({
        parentEventId: eventId,
      });
      console.log(
        `[Event Delete] Deleted ${deletedChildren.deletedCount} child events`
      );
    }

    // If deleteRelated is true, delete related data
    if (deleteRelated === "true") {
      try {
        // Delete code settings related to this event
        const CodeSettings = require("../models/codeSettingsModel");
        const deletedCodeSettings = await CodeSettings.deleteMany({
          event: eventId,
        });
        console.log(
          `[Event Delete] Deleted ${deletedCodeSettings.deletedCount} code settings`
        );

        // Delete codes related to this event
        const Code = require("../models/codeModel");
        const deletedCodes = await Code.deleteMany({ event: eventId });
        console.log(
          `[Event Delete] Deleted ${deletedCodes.deletedCount} codes`
        );

        // Delete media files from storage (if using cloud storage)
        if (event.flyer) {
          // This would depend on your storage implementation
          console.log(
            `[Event Delete] Deleted media files for event: ${eventId}`
          );
        }
      } catch (relatedError) {
        console.error(
          "[Event Delete] Error deleting related data:",
          relatedError
        );
        // Continue with event deletion even if related data deletion fails
      }
    }

    // Delete the event
    await Event.findByIdAndDelete(eventId);
    console.log(`[Event Delete] Successfully deleted event: ${eventId}`);

    res
      .status(200)
      .json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error("[Event Delete] Error:", error);
    res.status(500).json({ success: false, message: "Error deleting event" });
  }
};

exports.getEventByLink = async (req, res) => {
  try {
    const eventData = await Event.findOne({
      link: req.params.eventLink,
    }).populate("lineups");
    if (!eventData) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }
    res.status(200).json({ success: true, event: eventData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const eventData = await Event.findById(req.params.eventId).populate(
      "lineups"
    );
    if (!eventData) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }
    res.status(200).json({ success: true, event: eventData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getEventPage = async (req, res) => {
  try {
    const eventData = await Event.findById(req.params.eventId).populate(
      "lineups"
    );
    if (!eventData) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }
    res.status(200).json({ success: true, event: eventData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// New function to get comprehensive event data for the EventProfile component
exports.getEventProfile = async (req, res) => {
  try {
    console.log(
      `[EventProfile] Fetching event profile data for event ID: ${req.params.eventId}`
    );

    // Find the event and populate brand information
    const event = await Event.findById(req.params.eventId)
      .populate({
        path: "brand",
        select: "name username logo description",
      })
      .populate({
        path: "user",
        select: "username firstName lastName avatar",
      });

    if (!event) {
      console.log(
        `[EventProfile] Event not found with ID: ${req.params.eventId}`
      );
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    console.log(`[EventProfile] Found event:`, {
      id: event._id,
      title: event.title,
      brand: event.brand ? event.brand.name : "No brand",
    });

    // Get lineup data using the lineup IDs stored in the event
    console.log(
      `[EventProfile] Fetching lineups using lineup IDs stored in event`
    );
    try {
      // Check if the event has lineup IDs
      if (event.lineups && event.lineups.length > 0) {
        console.log(
          `[EventProfile] Event has ${event.lineups.length} lineup IDs:`,
          event.lineups
        );

        // Fetch lineups using their IDs from the event
        const lineups = await LineUp.find({
          _id: { $in: event.lineups },
          isActive: true,
        }).sort({ sortOrder: 1 });

        console.log(`[EventProfile] Found ${lineups.length} lineups for event`);
      } else {
        console.log(`[EventProfile] Event has no lineup IDs stored`);

        // Try the old method as a fallback
        const fallbackLineups = await LineUp.find({
          events: req.params.eventId,
          isActive: true,
        }).sort({ sortOrder: 1 });

        console.log(
          `[EventProfile] Fallback method found ${fallbackLineups.length} lineups`
        );

        if (fallbackLineups.length === 0) {
          // Log all lineups to see if we can match manually
          const allLineups = await LineUp.find({}).limit(5);
          console.log(
            `[EventProfile] Sample of all lineups in DB:`,
            allLineups.map((l) => ({
              id: l._id,
              name: l.name,
              events: l.events ? l.events.map((e) => e.toString()) : [],
              brandId: l.brandId ? l.brandId.toString() : "none",
            }))
          );
        }
      }

      // Fetch lineups using their IDs from the event
      const lineups =
        event.lineups && event.lineups.length > 0
          ? await LineUp.find({
              _id: { $in: event.lineups },
              isActive: true,
            }).sort({ sortOrder: 1 })
          : await LineUp.find({
              events: req.params.eventId,
              isActive: true,
            }).sort({ sortOrder: 1 });

      // Get ticket settings
      console.log(
        `[EventProfile] Fetching ticket settings for event ID: ${req.params.eventId}`
      );
      const ticketSettings = await TicketSettings.find({
        eventId: req.params.eventId,
      }).sort({ price: 1 });

      console.log(
        `[EventProfile] Found ${ticketSettings.length} ticket settings for event`
      );
      console.log(`[EventProfile] Ticket settings search criteria:`, {
        eventId: req.params.eventId,
      });

      if (ticketSettings.length === 0) {
        // Log a sample of ticket settings to see if we can match manually
        const allTickets = await TicketSettings.find({}).limit(5);
        console.log(
          `[EventProfile] Sample of all ticket settings in DB:`,
          allTickets.map((t) => ({
            id: t._id,
            name: t.name,
            eventId: t.eventId ? t.eventId.toString() : "none",
          }))
        );
      }

      // Get code settings
      console.log(
        `[EventProfile] Fetching code settings for event ID: ${req.params.eventId}`
      );
      const codeSettings = await CodeSettings.find({
        eventId: req.params.eventId,
      });

      console.log(
        `[EventProfile] Found ${codeSettings.length} code settings for event`
      );

      console.log(`[EventProfile] Successfully fetched event profile data:`, {
        eventId: event._id,
        title: event.title,
        lineupCount: lineups.length,
        ticketSettingsCount: ticketSettings.length,
        codeSettingsCount: codeSettings.length,
        hasFlyer: !!event.flyer,
      });

      // Return all data in a structured format
      res.status(200).json({
        success: true,
        event,
        lineups,
        ticketSettings,
        codeSettings,
      });
    } catch (innerError) {
      console.error("[EventProfile] Error fetching related data:", innerError);
      // Still return the event data even if related data fetching fails
      res.status(200).json({
        success: true,
        event,
        lineups: [],
        ticketSettings: [],
        codeSettings: [],
        error: innerError.message,
      });
    }
  } catch (error) {
    console.error("[EventProfile] Error fetching event profile data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

exports.generateGuestCode = async (req, res) => {
  try {
    const { name, email, condition, eventId, pax } = req.body;

    // Capitalize names
    const formattedName = name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check for existing guest code with remaining scans
    const existingGuestCode = await GuestCode.findOne({
      email: email.toLowerCase(),
      event: eventId,
      $expr: { $ne: ["$pax", "$paxChecked"] }, // Ensure pax does not equal paxChecked
    });

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(
      startOfWeek.getDate() -
        startOfWeek.getDay() +
        (startOfWeek.getDay() === 0 ? -6 : 1)
    ); // Adjust to your week start (Sunday or Monday)

    if (existingGuestCode && existingGuestCode.createdAt >= startOfWeek) {
      return res.status(400).json({
        error: "You still have a usable Guest Code for this Sunday.",
      });
    }

    const guestCode = new GuestCode({
      name: formattedName,
      email: email.toLowerCase(),
      condition,
      event: eventId,
      pax,
      paxChecked: 0,
    });

    await guestCode.save();

    // Generate the QR code
    const qrCodeDataURL = await QRCode.toDataURL(`${guestCode._id}`, {
      errorCorrectionLevel: "L",
    });

    // Send the QR code via email
    await sendQRCodeEmail(
      formattedName,
      email,
      condition,
      pax,
      qrCodeDataURL,
      event
    );

    res.status(201).json({ message: "Check your Mails (+Spam). Thank you 🤝" });
  } catch (error) {
    console.error("Error generating guest code:", error);
    res.status(500).json({ error: "Error generating guest code." });
  }
};

exports.generateInvitationCode = async (guestCode) => {
  console.log("Processing Invitation Code Generation for:", guestCode.email);

  if (!guestCode) {
    console.error("No guestCode provided to generateInvitationCode function");
    return;
  }

  try {
    // Formatting the name
    const formattedName = guestCode.name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    // Create an InvitationCode instance if needed
    const invitationCode = new InvitationCode({
      name: formattedName,
      email: guestCode.email.toLowerCase(),
      condition: guestCode.condition,
      event: guestCode.event,
      pax: guestCode.pax,
      paxChecked: 0,
    });

    // Save the InvitationCode to the database
    await invitationCode.save();
    console.log("Invitation code saved successfully");

    // Assuming you don't need a QR code URL for PDF creation, proceed directly to PDF generation
    const pdfBuffer = await createTicketPDF(
      guestCode.event, // Directly passing event ID
      formattedName,
      guestCode.email,
      guestCode.condition,
      guestCode.pax
    );

    // Mark the guest code as invite created
    guestCode.inviteCreated = true;
    await guestCode.save();
    console.log("Guest code updated with invite created.");

    return pdfBuffer; // Optionally return buffer if you need to use it immediately after
  } catch (error) {
    console.error("Error during invitation code generation:", error);
    throw error; // Rethrow to handle upstream
  }
};

exports.updateGuestCodeCondition = async (req, res) => {
  const eventId = req.params.eventId;
  const updatedGuestCodeCondition = req.body.guestCodeCondition;

  // Validate the received data
  if (!eventId || !updatedGuestCodeCondition) {
    return res.status(400).json({
      success: false,
      message: "Event ID and guest code condition are required.",
    });
  }

  try {
    const event = await Event.findByIdAndUpdate(
      eventId,
      { guestCodeCondition: updatedGuestCodeCondition },
      { new: true }
    );

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const compressAndOptimizeImage = async (image) => {
  const optimizedImageBuffer = await sharp(image.path)
    .resize({ width: 1080 }) // Adjust the resize value based on your requirements
    .jpeg({ quality: 80 }) // Adjust the quality value based on your requirements
    .toBuffer();

  return {
    ...image,
    buffer: optimizedImageBuffer,
  };
};

const compressVideo = async (video) => {
  return new Promise((resolve, reject) => {
    const outputPath = `${video.path}_compressed.mp4`;
    ffmpeg(video.path)
      .outputOptions([
        "-codec:v libx264", // Use the H.264 video codec
        "-profile:v main",
        "-preset:v medium",
        "-b:v 800k", // Adjust the video bitrate based on your requirements
        "-maxrate 800k",
        "-bufsize 1600k",
        "-vf scale='trunc(oh*a/2)*2:720'", // Adjust the video scale based on your requirements
        "-codec:a aac",
        "-b:a 128k", // Adjust the audio bitrate based on your requirements
      ])
      .output(outputPath)
      .on("end", () => {
        resolve({
          ...video,
          path: outputPath,
        });
      })
      .on("error", (err) => {
        reject(err);
      })
      .run();
  });
};

exports.compressAndOptimizeFiles = async (req, res) => {
  try {
    // Add these two lines to filter the files by their fieldname prefix
    const flyerFiles = filterFilesByFieldnamePrefix(req.files, "flyer.");
    const videoFiles = filterFilesByFieldnamePrefix(req.files, "video.");

    const optimizedEventData = JSON.parse(req.body.eventData);

    for (const file of flyerFiles) {
      const format = file.fieldname.split(".")[1];
      const optimizedImage = await compressAndOptimizeImage(file);

      const uploadedImageUrl = await uploadToS3(
        optimizedImage.buffer, // Pass the buffer instead of an object
        "flyers",
        `${optimizedEventData.title}_${format}.jpeg`,
        optimizedImage.mimetype // Pass the mimetype
      );

      optimizedEventData.flyer[format] = uploadedImageUrl;

      deleteFile(file.path);
    }
    for (const file of videoFiles) {
      const format = file.fieldname.split(".")[1];
      const compressedVideo = await compressVideo(file);

      // Read the compressed video file into a buffer
      const compressedVideoBuffer = await fsPromises.readFile(
        compressedVideo.path
      );

      const uploadedVideoUrl = await uploadToS3(
        compressedVideoBuffer, // Pass the buffer instead of an object
        "videos",
        `${optimizedEventData.title}_${format}.mp4`,
        file.mimetype
      );
      optimizedEventData.video[format] = uploadedVideoUrl;
      deleteFile(compressedVideo.path);
      deleteFile(file.path);
    }

    res.status(200).json(optimizedEventData);
  } catch (error) {
    console.warn(error);
    res
      .status(400)
      .json({ message: "Error compressing and optimizing files", error });
  }
};

const filterFilesByFieldnamePrefix = (files, prefix) => {
  const allFiles = Object.values(files).flat();
  return allFiles.filter(
    (file) => file.fieldname && file.fieldname.startsWith(prefix)
  );
};

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file: ${filePath}`, err);
    } else {
      console.log(`File deleted: ${filePath}`);
    }
  });
};

exports.uploadVideoToS3 = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    const filePath = req.file.path; // Assuming disk storage
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const folderName = "dropped";

    // Use the uploadToS3 function from your s3Uploader utility
    const uploadedUrl = await uploadToS3(
      filePath,
      folderName,
      fileName,
      mimeType
    );

    // Delete the local file after successful upload if using disk storage
    await fsPromises.unlink(filePath);

    res.json({ success: true, url: uploadedUrl });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to upload video", details: error.message });
  }
};

exports.listDroppedFiles = async (req, res) => {
  try {
    const fileList = await listFilesFromS3("dropped");
    res.json({ success: true, files: fileList });
  } catch (error) {
    console.error("Error listing files:", error);
    res
      .status(500)
      .json({ error: "Failed to list files", details: error.message });
  }
};
exports.deleteDroppedFile = async (req, res) => {
  const { fileName } = req.params;
  try {
    await deleteFileFromS3("dropped", fileName);
    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

exports.getSignedUrlForDownload = async (req, res) => {
  const { fileName } = req.params;
  try {
    const url = await generateSignedUrl("dropped", fileName);
    res.json({ success: true, url });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
};

// Add the Go Live toggle route with weekly event handling
exports.toggleEventLive = async (req, res) => {
  try {
    const { eventId } = req.params;
    const weekNumber = parseInt(req.query.weekNumber || "0");

    console.log("[Toggle Live] Processing request:", {
      eventId,
      weekNumber,
    });

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // If this is a weekly event and we're toggling a future occurrence
    if (event.isWeekly && weekNumber > 0) {
      try {
        // Find or create the child event for this week
        const childEvent = await findOrCreateWeeklyOccurrence(
          event,
          weekNumber
        );

        // Toggle the isLive status
        childEvent.isLive = !childEvent.isLive;
        await childEvent.save();

        console.log(
          `[Toggle Live] Updated live status for week ${weekNumber} to ${childEvent.isLive}`
        );
        return res.status(200).json({
          message: `Event is now ${childEvent.isLive ? "live" : "not live"}`,
          isLive: childEvent.isLive,
          childEvent: childEvent, // Return the child event so frontend can update state
        });
      } catch (error) {
        console.error("[Toggle Live] Error updating child event:", error);
        return res.status(500).json({
          message: "Error toggling live status for weekly occurrence",
          error: error.message,
        });
      }
    }

    // For regular events or the parent weekly event (week 0)
    event.isLive = !event.isLive;
    await event.save();

    res.status(200).json({
      message: `Event is now ${event.isLive ? "live" : "not live"}`,
      isLive: event.isLive,
    });
  } catch (error) {
    console.error("[Toggle Live Status Error]", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error toggling live status",
      error: error.message,
    });
  }
};
