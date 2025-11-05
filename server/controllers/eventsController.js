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

const { generateDropboxPath } = require("../utils/dropboxUtils");

const fsPromises = require("fs").promises;
const fs = require("fs");

const onToBoolean = (value) => {
  return value === "on";
};

const generateUniqueLink = () => {
  return Math.random().toString(36).substr(2, 8);
};

// Generate a URL-friendly slug from a string
const generateSlug = (text) => {
  if (!text) return "";

  return text
    .toString()
    .normalize("NFD") // Normalize to decomposed form for handling accents
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, "") // Remove non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with a single hyphen
    .replace(/^-+/, "") // Remove leading hyphens
    .replace(/-+$/, ""); // Remove trailing hyphens
};

// Helper function to generate weekly occurrences
const generateWeeklyOccurrences = async (parentEvent, weekNumber) => {
  try {
    // Find the highest existing week number <= weekNumber to inherit from (sequential inheritance)
    const templateEvent = await findSequentialTemplateEvent(parentEvent, weekNumber);

    // Calculate the date for this occurrence using the parent's original start/end dates for timing consistency
    const parentStartDateObj = new Date(parentEvent.startDate); // Use parent's actual startDate for date calculation
    const parentEndDateObj = new Date(parentEvent.endDate); // Use parent's actual endDate for date calculation

    // Calculate child's actual start date and time
    let childStartDate = new Date(parentStartDateObj);
    childStartDate.setDate(parentStartDateObj.getDate() + weekNumber * 7); // Moves to the correct week, preserving original time

    // Calculate duration
    const duration = parentEndDateObj.getTime() - parentStartDateObj.getTime();

    // Calculate child's actual end date and time
    let childEndDate = new Date(childStartDate.getTime() + duration);

    // Create a unique link for this occurrence
    const link = `${parentEvent.link}-w${weekNumber}`;

    // Create a unique slug for this occurrence
    let weeklySlug;
    if (parentEvent.slug) {
      weeklySlug = `${parentEvent.slug}-w${weekNumber}`;
    } else {
      // If parent doesn't have a slug (legacy event), generate one
      weeklySlug = `${generateSlug(parentEvent.title)}-w${weekNumber}`;
    }

    // Create the weekly occurrence - inherit most data from templateEvent, but preserve timing from parent
    const weeklyEvent = new Event({
      user: templateEvent.user,
      brand: templateEvent.brand,
      title: templateEvent.title,
      subTitle: templateEvent.subTitle,
      description: templateEvent.description,
      // Don't set legacy date field anymore
      startDate: childStartDate, // Store full Date object (calculated from parent timing)
      endDate: childEndDate, // Store full Date object (calculated from parent timing)
      startTime: templateEvent.startTime, // Inherit from sequential template event
      endTime: templateEvent.endTime, // Inherit from sequential template event
      location: templateEvent.location,
      isWeekly: true,
      parentEventId: parentEvent._id,
      weekNumber: weekNumber,
      isLive: false, // Default to not live
      flyer: templateEvent.flyer, // Inherit from sequential template event
      // Copy the genres array from sequential template event (extract IDs if populated)
      genres: templateEvent.genres ? templateEvent.genres.map(g => g._id || g) : [],
      // Copy the lineups array from sequential template event (extract IDs if populated)
      lineups: templateEvent.lineups ? templateEvent.lineups.map(l => l._id || l) : [],
      // Copy co-host data from sequential template event (extract IDs if populated, filter nulls)
      coHosts: templateEvent.coHosts ? templateEvent.coHosts
        .filter(c => c != null) // Filter out null/undefined co-hosts
        .map(c => c._id || c)
        .filter(id => id != null) : [], // Filter out any remaining null/undefined IDs
      coHostRolePermissions: templateEvent.coHostRolePermissions || [],
      // Copy legacy code settings for backward compatibility from sequential template event
      guestCode: templateEvent.guestCode,
      friendsCode: templateEvent.friendsCode,
      ticketCode: templateEvent.ticketCode,
      tableCode: templateEvent.tableCode,
      backstageCode: templateEvent.backstageCode,
      // Use empty objects for embedded code settings to avoid validation errors
      guestCodeSettings: {},
      friendsCodeSettings: {},
      ticketCodeSettings: {},
      tableCodeSettings: {},
      backstageCodeSettings: {},
      link: link,
      slug: weeklySlug,
    });

    await weeklyEvent.save();

    // Initialize default code settings for the weekly event
    try {
      const { initializeDefaultSettings } = require("./codeSettingsController");
      await initializeDefaultSettings(weeklyEvent._id);

      // Copy code settings from sequential template event to child event
      const templateCodeSettings = await CodeSettings.find({
        eventId: templateEvent._id,
      });
      if (templateCodeSettings && templateCodeSettings.length > 0) {
        // For each template code setting, create a corresponding child code setting
        await Promise.all(
          templateCodeSettings.map(async (templateSetting) => {
            // Check if a setting of this type already exists for the child
            const existingChildSetting = await CodeSettings.findOne({
              eventId: weeklyEvent._id,
              type: templateSetting.type,
            });

            if (existingChildSetting) {
              // Update existing setting with template data
              existingChildSetting.name = templateSetting.name;
              existingChildSetting.condition = templateSetting.condition;
              existingChildSetting.maxPax = templateSetting.maxPax;
              existingChildSetting.limit = templateSetting.limit;
              existingChildSetting.isEnabled = templateSetting.isEnabled;
              existingChildSetting.isEditable = templateSetting.isEditable;
              existingChildSetting.price = templateSetting.price;
              existingChildSetting.tableNumber = templateSetting.tableNumber;

              await existingChildSetting.save();
            } else {
              // Create new setting with template data
              const newChildSetting = new CodeSettings({
                eventId: weeklyEvent._id,
                name: templateSetting.name,
                type: templateSetting.type,
                condition: templateSetting.condition,
                maxPax: templateSetting.maxPax,
                limit: templateSetting.limit,
                isEnabled: templateSetting.isEnabled,
                isEditable: templateSetting.isEditable,
                price: templateSetting.price,
                tableNumber: templateSetting.tableNumber,
              });

              await newChildSetting.save();
            }
          })
        );
      }
    } catch (settingsError) {
      // Continue even if code settings initialization fails
    }

    return weeklyEvent;
  } catch (error) {
    throw error;
  }
};

// Helper function to find the highest existing week <= weekNumber to inherit from (sequential inheritance)
const findSequentialTemplateEvent = async (parentEvent, weekNumber) => {
  try {
    // Find all existing events in the weekly series with weekNumber <= target week
    const existingEvents = await Event.find({
      $or: [
        { _id: parentEvent._id, weekNumber: { $lte: weekNumber } }, // Include parent (week 0) if it qualifies
        { parentEventId: parentEvent._id, weekNumber: { $lte: weekNumber } } // Include qualifying child events
      ]
    })
    .populate('coHosts', 'name username logo') // Populate co-host data for inheritance
    .populate('genres') // Populate genres for inheritance
    .populate('lineups') // Populate lineups for inheritance
    .sort({ weekNumber: -1 }); // Sort by highest week number first

    // Use the event with the highest week number <= target week as template
    return existingEvents[0] || parentEvent;
  } catch (error) {
    return parentEvent; // Fallback to parent if query fails
  }
};

// Find or create a weekly occurrence
const findOrCreateWeeklyOccurrence = async (parentEvent, weekNumber) => {
  try {
    // First try to find an existing occurrence for this week
    const existingOccurrence = await Event.findOne({
      parentEventId: parentEvent._id,
      weekNumber: weekNumber,
    })
    .populate("coHosts", "name username logo")
    .populate("genres")
    .populate("lineups");

    if (existingOccurrence) {
      return existingOccurrence;
    }

    // If not found, create a new one using the most recent event as template
    const newChildEvent = await generateWeeklyOccurrences(parentEvent, weekNumber);
    
    // Populate the newly created child event before returning
    return await Event.findById(newChildEvent._id)
      .populate("coHosts", "name username logo")
      .populate("genres")
      .populate("lineups");
  } catch (error) {
    throw error;
  }
};

exports.createEvent = async (req, res) => {
  try {
    // Validate brand exists and user has permission
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Generate a slug from the event title
    const baseSlug = generateSlug(req.body.title);

    // Check for existing event with same title and date
    const existingEvent = await Event.findOne({
      brand: req.params.brandId,
      title: req.body.title,
      startDate: req.body.startDate || req.body.date,
    });

    if (existingEvent) {
      return res.status(200).json(existingEvent);
    }

    // Check if the slug already exists for the brand on the same date
    // If it does, append a number to make it unique
    const eventDate = new Date(req.body.startDate || req.body.date);
    const startOfDay = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
      23,
      59,
      59
    );

    const eventsWithSameSlug = await Event.find({
      brand: req.params.brandId,
      startDate: { $gte: startOfDay, $lte: endOfDay },
      slug: new RegExp(`^${baseSlug}(-[0-9]+)?$`), // Match baseSlug or baseSlug-number
    }).sort({ slug: -1 });

    // Determine the final slug
    let finalSlug = baseSlug;
    if (eventsWithSameSlug.length > 0) {
      // If there are existing events with the same base slug, increment the number
      const lastSlug = eventsWithSameSlug[0].slug;
      const match = lastSlug.match(/-([0-9]+)$/);
      if (match) {
        const num = parseInt(match[1]) + 1;
        finalSlug = `${baseSlug}-${num}`;
      } else {
        finalSlug = `${baseSlug}-1`;
      }
    }

    // Parse lineups if they exist
    let lineups = [];
    if (req.body.lineups) {
      try {
        lineups = JSON.parse(req.body.lineups);
      } catch (e) {
        // Error parsing lineups
      }
    }

    // Parse genres if they exist
    let genres = [];
    if (req.body.genres) {
      try {
        genres = JSON.parse(req.body.genres);
      } catch (e) {
        // Error parsing genres
      }
    }

    // Parse coHosts if they exist
    let coHosts = [];
    if (req.body.coHosts) {
      try {
        coHosts = JSON.parse(req.body.coHosts);
      } catch (e) {
        // Error parsing coHosts
      }
    }

    // Extract event data from request body
    const {
      title,
      subTitle,
      description,
      date,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      street,
      postalCode,
      city,
      music,
      isWeekly,
      guestCode,
      friendsCode,
      ticketCode,
      tableCode,
      dropboxFolderPath,
    } = req.body;

    // Create event object
    const eventData = {
      user: req.user.userId,
      brand: req.params.brandId,
      title,
      subTitle,
      description,
      // Remove date field - use startDate/endDate instead
      startDate: startDate || date, // Use startDate if provided, otherwise fall back to date
      endDate: endDate || date, // Use endDate if provided, otherwise fall back to date
      startTime,
      endTime,
      location,
      street,
      postalCode,
      city,
      music,
      isWeekly: onToBoolean(isWeekly),
      link: generateUniqueLink(),
      slug: finalSlug,
      flyer: {},
      lineups: lineups,
      genres: genres,
      coHosts: coHosts,
      guestCode: guestCode,
      friendsCode: friendsCode,
      ticketCode: ticketCode,
      tableCode: tableCode,
      dropboxFolderPath: dropboxFolderPath || generateDropboxPath(brand.dropboxBaseFolder, startDate || date, brand.dropboxPathStructure),
    };

    // Calculate final startDate and endDate considering startTime and endTime for overnight events
    let finalStartDate = eventData.startDate
      ? new Date(eventData.startDate)
      : new Date(eventData.date);
    // Initialize finalEndDate based on finalStartDate initially for calculation
    let finalEndDate = new Date(finalStartDate);

    if (eventData.startTime) {
      const [sh, sm] = eventData.startTime.split(":").map(Number);
      finalStartDate.setHours(sh, sm, 0, 0);
    }
    // Use the date part of finalStartDate for endDate calculation before applying endTime
    finalEndDate = new Date(finalStartDate);
    if (eventData.endTime) {
      const [eh, em] = eventData.endTime.split(":").map(Number);
      finalEndDate.setHours(eh, em, 0, 0);
    }

    // If finalEndDate is on or before finalStartDate after times are applied, it means it's the next day
    if (finalEndDate.getTime() <= finalStartDate.getTime()) {
      finalEndDate.setDate(finalEndDate.getDate() + 1);
    }

    eventData.startDate = finalStartDate;
    eventData.endDate = finalEndDate;
    // Don't set legacy date field anymore

    // Create and save the event
    const event = new Event(eventData);
    await event.save();

    // Initialize default code settings for the event
    try {
      const { initializeDefaultSettings } = require("./codeSettingsController");
      await initializeDefaultSettings(event._id);
    } catch (settingsError) {
      // Continue with event creation even if code settings initialization fails
    }

    // Handle file uploads if they exist
    if (req.files) {
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
          }

          event.flyer[format] = {
            thumbnail: urls.thumbnail,
            medium: urls.medium,
            full: urls.full,
            timestamp,
          };
        } catch (error) {
          // Error processing flyer
        }
      }

      await event.save();
    }

    res.status(201).json(event);
  } catch (error) {
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

    // Check if brand exists without team check
    const brandExists = await Brand.findById(brandId);
    if (!brandExists) {
      return res.status(404).json({
        message: "Brand not found",
      });
    }

    // Get only parent events (events with no parentEventId)
    // We don't want to include child events in the main list
    const events = await Event.find({
      brand: brandId,
      parentEventId: { $exists: false }, // Only get parent events
    })
      .sort({ startDate: -1 })
      .populate("user", "username firstName lastName avatar")
      .populate("lineups")
      .populate("genres")
      .populate("coHosts", "name username logo");

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching brand events",
      error: error.message,
    });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    // Get user's favorite brands
    const user = await User.findById(req.user.userId).select('favoriteBrands');
    const favoriteBrandIds = user.favoriteBrands || [];

    // Get all brands where user is a team member or owner
    const brands = await Brand.find({ 
      $or: [
        { "team.user": req.user.userId },
        { owner: req.user.userId }
      ]
    });

    // Sort brands by priority: owner first, then favorites, then alphabetical
    const sortedBrands = brands.sort((a, b) => {
      const aIsOwner = a.owner.toString() === req.user.userId.toString();
      const bIsOwner = b.owner.toString() === req.user.userId.toString();
      const aIsFavorite = favoriteBrandIds.some(fav => fav.toString() === a._id.toString());
      const bIsFavorite = favoriteBrandIds.some(fav => fav.toString() === b._id.toString());

      // Owner brands first
      if (aIsOwner && !bIsOwner) return -1;
      if (!aIsOwner && bIsOwner) return 1;

      // Among non-owner brands, favorites first
      if (!aIsOwner && !bIsOwner) {
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
      }

      // Alphabetical order for same priority
      return a.name.localeCompare(b.name);
    });

    const brandIds = sortedBrands.map((brand) => brand._id);

    // Get events from all these brands and also events where user's brands are co-hosts
    const events = await Event.find({ 
      $or: [
        { brand: { $in: brandIds } },
        { coHosts: { $in: brandIds } }
      ]
    })
      .sort({ startDate: -1 })
      .populate("brand", "name username logo")
      .populate("user", "username firstName lastName avatar")
      .populate("genres")
      .populate("coHosts", "name username logo");

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Error fetching events" });
  }
};

exports.editEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const weekNumber = parseInt(req.query.weekNumber) || 0;

    // Extract event data from request body
    const {
      title,
      subTitle,
      description,
      date,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      street,
      postalCode,
      city,
      music,
      isWeekly,
      lineups,
      guestCode,
      friendsCode,
      ticketCode,
      tableCode,
      genres,
      dropboxFolderPath,
    } = req.body;

    // Handle lineups if they exist
    if (lineups) {
      // If lineups is a string (from FormData), parse it
      if (typeof lineups === "string") {
        try {
          req.body.lineups = JSON.parse(lineups);
        } catch (e) {
          delete req.body.lineups;
        }
      }
    }

    // Handle genres if they exist
    if (genres) {
      // If genres is a string (from FormData), parse it
      if (typeof genres === "string") {
        try {
          req.body.genres = JSON.parse(genres);
        } catch (e) {
          delete req.body.genres;
        }
      }
    }

    // Handle coHosts if they exist
    console.log("🔍 [Backend] Raw coHosts from request:", req.body.coHosts, typeof req.body.coHosts);
    if (req.body.coHosts) {
      // If coHosts is a string (from FormData), parse it
      if (typeof req.body.coHosts === "string") {
        try {
          req.body.coHosts = JSON.parse(req.body.coHosts);
          console.log("✅ [Backend] Parsed coHosts successfully:", req.body.coHosts);
        } catch (e) {
          console.error("❌ [Backend] Failed to parse coHosts:", e.message);
          delete req.body.coHosts;
        }
      } else if (Array.isArray(req.body.coHosts)) {
        console.log("✅ [Backend] coHosts already an array:", req.body.coHosts);
      }
    } else {
      console.log("ℹ️ [Backend] No coHosts field in request body");
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

    // Update fields
    if (title) event.title = title;
    if (subTitle !== undefined) event.subTitle = subTitle;
    if (description !== undefined) event.description = description;
    // Don't update from legacy date field anymore
    if (startDate) event.startDate = new Date(startDate);
    if (endDate) event.endDate = new Date(endDate);
    if (startTime) event.startTime = startTime;
    if (endTime) event.endTime = endTime;
    if (location) event.location = location;
    if (street !== undefined) event.street = street;
    if (postalCode !== undefined) event.postalCode = postalCode;
    if (city !== undefined) event.city = city;
    if (music !== undefined) event.music = music;
    if (isWeekly !== undefined) event.isWeekly = onToBoolean(isWeekly);
    if (dropboxFolderPath !== undefined) event.dropboxFolderPath = dropboxFolderPath;

    // Update the genres field if provided
    if (req.body.genres) {
      // We already parsed genres if it was a string
      event.genres = req.body.genres;
    }

    // Update lineups if provided
    if (req.body.lineups) {
      event.lineups = req.body.lineups;
    }

    // Update co-hosts if provided
    if (req.body.coHosts !== undefined) {
      // Ensure we store ObjectIds, not populated objects, and filter out null/undefined values
      const coHostIds = Array.isArray(req.body.coHosts) 
        ? req.body.coHosts
            .filter(coHost => coHost != null) // Filter out null/undefined
            .map(coHost => typeof coHost === 'object' && coHost._id ? coHost._id : coHost)
            .filter(id => id != null) // Filter out any remaining null/undefined IDs
        : [];
      event.coHosts = coHostIds;
      console.log('✅ [Backend] Updated parent event co-hosts:', coHostIds);
    }
    if (req.body.coHostRolePermissions !== undefined) {
      event.coHostRolePermissions = req.body.coHostRolePermissions || [];
      console.log('✅ [Backend] Updated parent event co-host permissions:', req.body.coHostRolePermissions);
    }

    // Check if this is a child event being edited directly
    if (event.parentEventId) {
      // Update the child event with the new data
      // Make sure we don't change certain fields that should remain consistent
      const updatedChildData = {
        ...req.body,
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
          // Handle special fields that might need parsing
          if (key === "genres" && typeof updatedChildData[key] === "string") {
            try {
              event[key] = JSON.parse(updatedChildData[key]);
            } catch (e) {
              // Error parsing genres for child event
            }
          } else if (key === "coHosts" && Array.isArray(updatedChildData[key])) {
            // Ensure co-hosts are stored as ObjectIds and filter out null/undefined values
            event[key] = updatedChildData[key]
              .filter(coHost => coHost != null) // Filter out null/undefined
              .map(coHost => typeof coHost === 'object' && coHost._id ? coHost._id : coHost)
              .filter(id => id != null); // Filter out any remaining null/undefined IDs
            console.log('✅ [Backend] Updated direct child event co-hosts:', event[key]);
          } else {
            event[key] = updatedChildData[key];
          }
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

        // Check if we need to update code settings for this child event
        if (
          req.body.codeSettings ||
          req.body.guestCode !== undefined ||
          req.body.friendsCode !== undefined ||
          req.body.ticketCode !== undefined ||
          req.body.tableCode !== undefined ||
          req.body.backstageCode !== undefined
        ) {
          // Import the CodeSettings controller
          const { configureCodeSettings } = require("./codeSettingsController");

          // Initialize default settings if they don't exist
          const {
            initializeDefaultSettings,
          } = require("./codeSettingsController");
          await initializeDefaultSettings(event._id);

          // Update the legacy boolean fields if they were changed
          if (req.body.guestCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "guest" },
              { isEnabled: req.body.guestCode },
              { new: true }
            );
          }

          if (req.body.friendsCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "friends" },
              { isEnabled: req.body.friendsCode },
              { new: true }
            );
          }

          if (req.body.ticketCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "ticket" },
              { isEnabled: req.body.ticketCode },
              { new: true }
            );
          }

          if (req.body.tableCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "table" },
              { isEnabled: req.body.tableCode },
              { new: true }
            );
          }

          if (req.body.backstageCode !== undefined) {
            await CodeSettings.findOneAndUpdate(
              { eventId: event._id, type: "backstage" },
              { isEnabled: req.body.backstageCode },
              { new: true }
            );
          }
        }

        // Populate the child event before returning to ensure co-hosts are populated
        const populatedEvent = await Event.findById(event._id)
          .populate("coHosts", "name username logo")
          .populate("genres")
          .populate("lineups");

        // Filter out any null co-hosts that might have been populated as null
        if (populatedEvent.coHosts) {
          populatedEvent.coHosts = populatedEvent.coHosts.filter(coHost => coHost != null);
        }

        return res.status(200).json(populatedEvent);
      } catch (error) {
        return res.status(500).json({
          message: "Error updating child event",
          error: error.message,
        });
      }
    }

    // Check if this is a weekly event and we're editing a future occurrence
    if (event.isWeekly && weekNumber > 0) {
      // This is a request to edit a future occurrence of a weekly event
      try {
        // Find or create the child event for this week
        const childEvent = await findOrCreateWeeklyOccurrence(
          event,
          weekNumber
        );

        // Update the child event with the new data
        // Make sure we don't change certain fields that should remain consistent
        const {
          startTime,
          endTime,
          title,
          subTitle,
          description,
          isLive: isLiveBody,
          genres: genresBody,
          lineups: lineupsBody,
        } = req.body;

        // Preserve the date part of the childEvent's startDate (it's fixed for the week)
        let calculatedStartDate = new Date(childEvent.startDate);

        if (startTime) {
          const [startHours, startMinutes] = startTime.split(":").map(Number);
          calculatedStartDate.setHours(startHours, startMinutes, 0, 0);
          childEvent.startTime = startTime; // Update the string field
        }
        childEvent.startDate = calculatedStartDate; // Update the Date field

        let calculatedEndDate = new Date(calculatedStartDate); // Start with the new start date/time

        if (endTime) {
          const [endHours, endMinutes] = endTime.split(":").map(Number);
          calculatedEndDate.setHours(endHours, endMinutes, 0, 0);
          childEvent.endTime = endTime; // Update the string field
        }

        // Check if it spans midnight
        if (calculatedEndDate.getTime() <= calculatedStartDate.getTime()) {
          calculatedEndDate.setDate(calculatedEndDate.getDate() + 1);
        }
        childEvent.endDate = calculatedEndDate;

        // Update other editable fields from req.body specifically for child events
        if (title !== undefined) childEvent.title = title;
        if (subTitle !== undefined) childEvent.subTitle = subTitle;
        if (description !== undefined) childEvent.description = description;
        if (isLiveBody !== undefined)
          childEvent.isLive = onToBoolean(isLiveBody);

        // Handle genres and lineups if provided in the request body
        if (genresBody) {
          childEvent.genres =
            typeof genresBody === "string"
              ? JSON.parse(genresBody)
              : genresBody.map((g) => g._id || g);
        }
        if (lineupsBody) {
          childEvent.lineups =
            typeof lineupsBody === "string"
              ? JSON.parse(lineupsBody)
              : lineupsBody.map((l) => l._id || l);
        }

        // Handle co-hosts if provided in the request body
        if (req.body.coHosts !== undefined) {
          // Ensure we store ObjectIds, not populated objects, and filter out null/undefined values
          const coHostIds = Array.isArray(req.body.coHosts) 
            ? req.body.coHosts
                .filter(coHost => coHost != null) // Filter out null/undefined
                .map(coHost => typeof coHost === 'object' && coHost._id ? coHost._id : coHost)
                .filter(id => id != null) // Filter out any remaining null/undefined IDs
            : [];
          childEvent.coHosts = coHostIds;
          console.log('✅ [Backend] Updated child event co-hosts:', coHostIds);
        }
        if (req.body.coHostRolePermissions !== undefined) {
          childEvent.coHostRolePermissions = req.body.coHostRolePermissions || [];
          console.log('✅ [Backend] Updated child event co-host permissions:', req.body.coHostRolePermissions);
        }

        // Don't set legacy date field anymore

        // These fields should not be changed for a child event from req.body directly
        // childEvent.isWeekly = true; // Already set by findOrCreateWeeklyOccurrence
        // childEvent.parentEventId = event._id; // Already set
        // childEvent.weekNumber = weekNumber; // Already set

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
            req.body.codeSettings ||
            req.body.guestCode !== undefined ||
            req.body.friendsCode !== undefined ||
            req.body.ticketCode !== undefined ||
            req.body.tableCode !== undefined ||
            req.body.backstageCode !== undefined
          ) {
            // Initialize default settings if they don't exist
            const {
              initializeDefaultSettings,
            } = require("./codeSettingsController");
            await initializeDefaultSettings(childEvent._id);

            // Update the legacy boolean fields if they were changed
            if (req.body.guestCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "guest" },
                { isEnabled: req.body.guestCode },
                { new: true }
              );
            }

            if (req.body.friendsCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "friends" },
                { isEnabled: req.body.friendsCode },
                { new: true }
              );
            }

            if (req.body.ticketCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "ticket" },
                { isEnabled: req.body.ticketCode },
                { new: true }
              );
            }

            if (req.body.tableCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "table" },
                { isEnabled: req.body.tableCode },
                { new: true }
              );
            }

            if (req.body.backstageCode !== undefined) {
              await CodeSettings.findOneAndUpdate(
                { eventId: childEvent._id, type: "backstage" },
                { isEnabled: req.body.backstageCode },
                { new: true }
              );
            }
          }

          // Populate the child event before returning to ensure co-hosts are populated
          const populatedChildEvent = await Event.findById(childEvent._id)
            .populate("coHosts", "name username logo")
            .populate("genres")
            .populate("lineups");

          // Filter out any null co-hosts that might have been populated as null
          if (populatedChildEvent.coHosts) {
            populatedChildEvent.coHosts = populatedChildEvent.coHosts.filter(coHost => coHost != null);
          }

          return res.status(200).json(populatedChildEvent);
        } catch (error) {
          return res.status(500).json({
            message: "Error updating child event",
            error: error.message,
          });
        }
      } catch (error) {
        return res.status(500).json({
          message: "Error updating child event",
          error: error.message,
        });
      }
    }

    // If this is a parent event, calculate its endDate properly if startTime/endTime suggest it spans midnight
    if (!event.parentEventId && weekNumber === 0) {
      const { startTime, endTime } = req.body;
      let eventStartDate = event.startDate
        ? new Date(event.startDate)
        : new Date(event.date);
      let eventEndDate = event.endDate
        ? new Date(event.endDate)
        : new Date(event.date);

      if (req.body.startDate) eventStartDate = new Date(req.body.startDate);
      if (req.body.endDate) eventEndDate = new Date(req.body.endDate); // Initial endDate from body or event

      if (startTime) {
        const [startHours, startMinutes] = startTime.split(":").map(Number);
        eventStartDate.setHours(startHours, startMinutes, 0, 0);
        req.body.startTime = startTime; // ensure it's in req.body if only event.startTime was used
      }
      req.body.startDate = eventStartDate; // update req.body to reflect changes

      if (endTime) {
        const [endHours, endMinutes] = endTime.split(":").map(Number);
        // Important: Apply endTime to the date part of eventStartDate to correctly calculate if it spans midnight
        let tempEndDateForCalc = new Date(eventStartDate);
        tempEndDateForCalc.setHours(endHours, endMinutes, 0, 0);

        if (tempEndDateForCalc.getTime() <= eventStartDate.getTime()) {
          tempEndDateForCalc.setDate(tempEndDateForCalc.getDate() + 1);
        }
        eventEndDate = tempEndDateForCalc;
        req.body.endTime = endTime; // ensure it's in req.body
      }
      req.body.endDate = eventEndDate; // update req.body to reflect changes
      // Don't set legacy date field anymore
    }

    // For regular events or the parent weekly event (week 0)
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: req.body },
      { new: true, runValidators: true }
    ).catch((err) => {
      if (err.name === "CastError" && err.path.includes("genres")) {
        throw new Error(
          "Invalid genre format. Please ensure genres are valid IDs."
        );
      }
      throw err;
    });

    // Check if we need to update code settings for this event
    if (
      req.body.codeSettings ||
      req.body.guestCode !== undefined ||
      req.body.friendsCode !== undefined ||
      req.body.ticketCode !== undefined ||
      req.body.tableCode !== undefined ||
      req.body.backstageCode !== undefined
    ) {
      // Initialize default settings if they don't exist
      const { initializeDefaultSettings } = require("./codeSettingsController");
      await initializeDefaultSettings(eventId);

      // Update the legacy boolean fields if they were changed
      if (req.body.guestCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "guest" },
          { isEnabled: req.body.guestCode },
          { new: true }
        );
      }

      if (req.body.friendsCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "friends" },
          { isEnabled: req.body.friendsCode },
          { new: true }
        );
      }

      if (req.body.ticketCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "ticket" },
          { isEnabled: req.body.ticketCode },
          { new: true }
        );
      }

      if (req.body.tableCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "table" },
          { isEnabled: req.body.tableCode },
          { new: true }
        );
      }

      if (req.body.backstageCode !== undefined) {
        await CodeSettings.findOneAndUpdate(
          { eventId: eventId, type: "backstage" },
          { isEnabled: req.body.backstageCode },
          { new: true }
        );
      }
    }

    res.status(200).json(updatedEvent);
  } catch (error) {
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
    res.status(200).json(event);
  } catch (error) {
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
    res.status(200).json(event);
  } catch (error) {
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
    res.status(200).json(event);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating flyer", error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { deleteRelated } = req.query;

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
      const deletedChildren = await Event.deleteMany({
        parentEventId: eventId,
      });
    }

    // If deleteRelated is true, delete related data
    if (deleteRelated === "true") {
      try {
        // Delete code settings related to this event
        const deletedCodeSettings = await CodeSettings.deleteMany({
          event: eventId,
        });

        // Delete codes related to this event
        const Code = require("../models/codeModel");
        const deletedCodes = await Code.deleteMany({ event: eventId });

        // Delete media files from storage (if using cloud storage)
        if (event.flyer) {
          // This would depend on your storage implementation
        }
      } catch (relatedError) {
        // Continue with event deletion even if related data deletion fails
      }
    }

    // Delete the event
    await Event.findByIdAndDelete(eventId);

    res
      .status(200)
      .json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting event" });
  }
};

exports.getEventByLink = async (req, res) => {
  try {
    const eventData = await Event.findOne({
      link: req.params.eventLink,
    })
      .populate("lineups")
      .populate("genres");
    if (!eventData) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }
    res.status(200).json({ success: true, event: eventData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const eventData = await Event.findById(req.params.eventId)
      .populate("lineups")
      .populate("brand") // Populate the brand to get brand data including colors
      .populate("genres")
      .populate("coHosts", "name username logo");

    if (!eventData) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    // Make sure all necessary fields are included in the response
    const responseData = {
      ...eventData._doc,
      name: eventData.title, // Ensure name is set (using title as fallback)
      primaryColor: eventData.brand?.colors?.primary || "#ffc807", // Include primary color from brand
    };

    // Filter out any null co-hosts that might have been populated as null
    if (eventData.coHosts) {
      eventData.coHosts = eventData.coHosts.filter(coHost => coHost != null);
      responseData.coHosts = eventData.coHosts;
    }

    // Log for debugging child events
    if (eventData.parentEventId) {
      console.log(`🔍 [Backend] Fetched child event (week ${eventData.weekNumber}) with co-hosts:`, 
        eventData.coHosts?.map(c => c.name || c) || []);
    }

    res.status(200).json({ success: true, event: responseData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getEventPage = async (req, res) => {
  try {
    const eventData = await Event.findById(req.params.eventId)
      .populate("lineups")
      .populate("genres")
      .populate("coHosts", "name username logo");
    if (!eventData) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }
    res.status(200).json({ success: true, event: eventData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// New function to get comprehensive event data for the EventProfile component
exports.getEventProfile = async (req, res) => {
  try {
    let event;

    // Check if we're using the new slug-based route or the traditional ID-based route
    if (req.params.brandUsername && req.params.dateSlug) {
      const hasEventSlug = !!req.params.eventSlug;

      // First, find the brand by username
      const brand = await Brand.findOne({ username: req.params.brandUsername });
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found.",
        });
      }

      // Parse the date from the dateSlug (format: MMDDYY)
      const month = parseInt(req.params.dateSlug.substring(0, 2)) - 1; // JS months are 0-indexed
      const day = parseInt(req.params.dateSlug.substring(2, 4));
      const year = parseInt("20" + req.params.dateSlug.substring(4, 6)); // Assuming 20xx years

      // Check if the dateSlug includes a suffix for multiple events (e.g., 032225-2)
      let eventNumber = 1;
      const dateSlugParts = req.params.dateSlug.split("-");
      if (dateSlugParts.length > 1) {
        eventNumber = parseInt(dateSlugParts[1]) || 1;
      }

      // Create date range with timezone consideration - use UTC
      const startDate = new Date(Date.UTC(year, month, day, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, day, 23, 59, 59));

      // For dateSlug queries, we need to search both date and startDate fields

      // Create a query that searches in both date and startDate fields
      // We'll try to be more flexible with the date matching to catch timezone edge cases
      const query = {
        brand: brand._id,
        $or: [
          // Match on date field - convert to string date for comparison to avoid timezone issues
          {
            $expr: {
              $eq: [
                { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                { $dateToString: { format: "%Y-%m-%d", date: startDate } },
              ],
            },
          },
          // Match on startDate field
          {
            $expr: {
              $eq: [
                { $dateToString: { format: "%Y-%m-%d", date: "$startDate" } },
                { $dateToString: { format: "%Y-%m-%d", date: startDate } },
              ],
            },
          },
        ],
      };

      // Find events matching our query
      let eventsOnDate = await Event.find(query)
        .populate({
          path: "brand",
          select: "name username logo description",
        })
        .populate({
          path: "user",
          select: "username firstName lastName avatar",
        })
        .populate("genres")
        .populate("lineups");

      // If no events found, try a broader query without the date expressions
      if (eventsOnDate.length === 0) {
        // Create a broader query that looks for events in a wider date range
        const dateStr = startDate.toISOString().split("T")[0]; // YYYY-MM-DD

        const broadQuery = {
          brand: brand._id,
          $or: [
            // Check date as string prefix match
            { date: { $regex: `^${dateStr}` } },
            { startDate: { $regex: `^${dateStr}` } },
          ],
        };

        eventsOnDate = await Event.find(broadQuery)
          .populate({
            path: "brand",
            select: "name username logo description",
          })
          .populate({
            path: "user",
            select: "username firstName lastName avatar",
          })
          .populate("genres")
          .populate("lineups");
      }

      // If still no events found, try one final approach - querying by day number
      if (eventsOnDate.length === 0) {
        // Final fallback: query directly looking for the day number
        const monthQuery = {
          brand: brand._id,
          $or: [
            // Try to match based on the day of month
            { $expr: { $eq: [{ $dayOfMonth: "$date" }, day] } },
            { $expr: { $eq: [{ $dayOfMonth: "$startDate" }, day] } },
            { $expr: { $eq: [{ $month: "$date" }, month + 1] } },
            { $expr: { $eq: [{ $month: "$startDate" }, month + 1] } },
          ],
        };

        eventsOnDate = await Event.find(monthQuery)
          .populate({
            path: "brand",
            select: "name username logo description",
          })
          .populate({
            path: "user",
            select: "username firstName lastName avatar",
          })
          .populate("genres")
          .populate("lineups");

        // Filter the results to keep only events that match our specific date
        if (eventsOnDate.length > 0) {
          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;

          // Manual filtering to check event dates
          eventsOnDate = eventsOnDate.filter((event) => {
            const eventDateStr = event.date
              ? new Date(event.date).toISOString().substring(0, 10)
              : null;
            const eventStartDateStr = event.startDate
              ? new Date(event.startDate).toISOString().substring(0, 10)
              : null;

            return eventDateStr === dateStr || eventStartDateStr === dateStr;
          });
        }
      }

      if (eventsOnDate.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No events found on this date.",
        });
      }

      // Function to process events once we've found them (by either date or startDate)
      function processEventsForResponse(events) {
        // For the original format with eventSlug
        if (hasEventSlug) {
          // Try to find the event with the closest matching title
          // First, check if any event's slug field matches exactly (for backward compatibility)
          event = events.find((e) => e.slug === req.params.eventSlug);

          // If no match by slug, try to find by title
          if (!event) {
            // Create a normalized version of each event title to compare with the slug
            const eventWithSlugMatch = events.map((e) => {
              // Create a slug from the event title
              const titleSlug = e.title
                .toString()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^\w\-]+/g, "")
                .replace(/\-\-+/g, "-")
                .replace(/^-+/, "")
                .replace(/-+$/, "");

              return {
                event: e,
                titleSlug,
                // Calculate a simple similarity score
                similarity: titleSlug === req.params.eventSlug ? 1 : 0,
              };
            });

            // Find the event with the highest similarity score
            const bestMatch = eventWithSlugMatch.reduce(
              (best, current) => {
                return current.similarity > best.similarity ? current : best;
              },
              { similarity: -1 }
            );

            if (bestMatch.similarity > 0) {
              event = bestMatch.event;
            } else if (events.length === 1) {
              // If there's only one event on this date, use it
              event = events[0];
            } else {
              // Otherwise, try to find a partial match
              for (const e of events) {
                const titleSlug = e.title
                  .toString()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^\w\-]+/g, "")
                  .replace(/\-\-+/g, "-")
                  .replace(/^-+/, "")
                  .replace(/-+$/, "");

                if (
                  titleSlug.includes(req.params.eventSlug) ||
                  req.params.eventSlug.includes(titleSlug)
                ) {
                  event = e;
                  break;
                }
              }

              // If still no match, just use the first event
              if (!event) {
                event = events[0];
              }
            }
          }
        } else {
          // Sort events to ensure consistent order
          events.sort((a, b) => {
            // Sort by start time if available
            if (a.startTime && b.startTime) {
              return a.startTime.localeCompare(b.startTime);
            }
            // Fallback to created date
            return new Date(a.createdAt) - new Date(b.createdAt);
          });

          // If we have a specific event number in the URL (e.g., 032225-2 for the second event)
          if (eventNumber > 1) {
            // Subtract 1 since arrays are 0-indexed
            const index = eventNumber - 1;
            if (index < events.length) {
              event = events[index];
            } else {
              // If the specified index doesn't exist, use the first event
              event = events[0];
            }
          } else {
            // Default to the first event if no specific number is provided
            event = events[0];
          }
        }

        return !!event; // Return true if event was set, false otherwise
      }

      // Process events found with our query
      const eventFound = processEventsForResponse(eventsOnDate);

      // If no event was found, return 404
      if (!eventFound) {
        return res.status(404).json({
          success: false,
          message: "No event could be selected from the results.",
        });
      }
    } else {
      // Find the event by ID (original approach)
      event = await Event.findById(req.params.eventId)
        .populate({
          path: "brand",
          select: "name username logo description",
        })
        .populate({
          path: "user",
          select: "username firstName lastName avatar",
        })
        .populate("genres")
        .populate("lineups");
    }

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Get lineup data using the lineup IDs stored in the event
    try {
      // Ensure we use the event's _id consistently
      const eventId = event._id.toString();

      // Fetch lineups using their IDs from the event
      const lineups =
        event.lineups && event.lineups.length > 0
          ? await LineUp.find({
              _id: { $in: event.lineups },
              isActive: true,
            }).sort({ sortOrder: 1 })
          : await LineUp.find({
              events: eventId,
              isActive: true,
            }).sort({ sortOrder: 1 });

      // Get ticket settings
      const ticketSettings = await TicketSettings.find({
        eventId: eventId,
      }).sort({ price: 1 });

      // Get code settings
      const codeSettings = await CodeSettings.find({
        eventId: eventId,
      });

      // After finding the event and related data, prepare the response
      // Check if user is authenticated
      let userRelatedData = {};

      // Extract brand from event if not already defined
      const brand = req.params.brandUsername
        ? await Brand.findOne({ username: req.params.brandUsername })
        : event.brand;

      if (req.user) {
        // Include user-specific data if authenticated
        userRelatedData = {
          isFollowing: event.followers?.includes(req.user._id),
          isFavorited: event.favorites?.includes(req.user._id),
          isMember: brand?.team?.some(
            (member) => member.user.toString() === req.user._id.toString()
          ),
          joinRequestStatus: null, // You may need to fetch this from JoinRequest model if needed
        };
      }

      // Return the full response
      return res.status(200).json({
        success: true,
        event,
        lineups,
        ticketSettings,
        codeSettings,
        ...userRelatedData,
      });
    } catch (innerError) {
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

    // Validate required fields
    if (!name || !email || !eventId || !condition || !pax) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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
    res.status(500).json({ error: "Error generating guest code." });
  }
};

exports.generateInvitationCode = async (guestCode) => {
  if (!guestCode) {
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

    return pdfBuffer; // Optionally return buffer if you need to use it immediately after
  } catch (error) {
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
      // Error deleting file
    } else {
      // File deleted
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
    res.status(500).json({ error: "Failed to delete file" });
  }
};

exports.getSignedUrlForDownload = async (req, res) => {
  const { fileName } = req.params;
  try {
    const url = await generateSignedUrl("dropped", fileName);
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate download URL" });
  }
};

// Add the Go Live toggle route with weekly event handling
exports.toggleEventLive = async (req, res) => {
  try {
    const { eventId } = req.params;
    const weekNumber = parseInt(req.query.weekNumber || "0");

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // If this is a weekly event and we're toggling a future occurrence
    if (event.isWeekly && weekNumber > 0) {
      // First, check if this child event already exists
      let childEvent = await Event.findOne({
        parentEventId: eventId,
        weekNumber: weekNumber,
      });

      // If it doesn't exist, we need to create it first
      if (!childEvent) {
        childEvent = await generateWeeklyOccurrences(event, weekNumber);
      }

      // Toggle the isLive status
      childEvent.isLive = !childEvent.isLive;
      await childEvent.save();

      return res.status(200).json({
        message: `Event is now ${childEvent.isLive ? "live" : "not live"}`,
        isLive: childEvent.isLive,
        childEvent: childEvent, // Return the child event so frontend can update state
      });
    }

    // For regular events or the parent weekly event (week 0)
    event.isLive = !event.isLive;
    await event.save();

    res.status(200).json({
      message: `Event is now ${event.isLive ? "live" : "not live"}`,
      isLive: event.isLive,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error toggling live status",
      error: error.message,
    });
  }
};

// Event favoriting functionality
exports.favoriteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id || req.user.userId;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Add event to both user's favorite events and event's favoritedBy
    await Promise.all([
      User.findByIdAndUpdate(
        userId,
        { $addToSet: { favoriteEvents: eventId } },
        { new: true }
      ),
      Event.findByIdAndUpdate(
        eventId,
        { $addToSet: { favoritedBy: userId } },
        { new: true }
      )
    ]);

    res.status(200).json({
      message: "Event added to favorites",
      isFavorited: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Error favoriting event" });
  }
};

exports.unfavoriteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id || req.user.userId;

    // Remove event from both user's favorite events and event's favoritedBy
    await Promise.all([
      User.findByIdAndUpdate(
        userId,
        { $pull: { favoriteEvents: eventId } },
        { new: true }
      ),
      Event.findByIdAndUpdate(
        eventId,
        { $pull: { favoritedBy: userId } },
        { new: true }
      )
    ]);

    res.status(200).json({
      message: "Event removed from favorites",
      isFavorited: false,
    });
  } catch (error) {
    res.status(500).json({ message: "Error unfavoriting event" });
  }
};

exports.getUserFavoriteEvents = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;

    if (!userId) {
      return res.status(200).json({
        message: "User ID not found",
        favoriteEvents: []
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).json({ 
        message: "User not found",
        favoriteEvents: [] 
      });
    }

    // Check if user has favoriteEvents field and if it's not empty
    if (!user.favoriteEvents || user.favoriteEvents.length === 0) {
      return res.status(200).json({
        favoriteEvents: []
      });
    }

    // Only populate if there are favorite events
    const populatedUser = await User.findById(userId).populate({
      path: "favoriteEvents",
      populate: [
        { path: "brand", select: "name username logo" },
        { path: "genres", select: "name" },
        { path: "lineups", select: "name" }
      ]
    });

    // Sort favorite events by date (newest first)
    const sortedFavoriteEvents = (populatedUser.favoriteEvents || []).sort((a, b) => 
      new Date(b.startDate || b.date) - new Date(a.startDate || a.date)
    );

    res.status(200).json({
      favoriteEvents: sortedFavoriteEvents,
    });
  } catch (error) {
    console.error("Error fetching favorite events:", error);
    res.status(200).json({ 
      message: "Error fetching favorite events",
      favoriteEvents: [] 
    });
  }
};
