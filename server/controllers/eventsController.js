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

    // Create event object with a synchronously generated link
    const eventData = {
      ...req.body,
      user: req.user.userId,
      brand: req.params.brandId,
      link: generateUniqueLink(),
      flyer: {}, // Initialize empty flyer object
    };

    // Create and save the event first
    const event = new Event(eventData);
    await event.save();

    console.log("[Event Creation] Event created successfully:", {
      eventId: event._id,
      title: event.title,
    });

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

        const format = fieldName.split(".")[1]; // Get portrait/landscape/square
        const file = files[0]; // Get the first file from the array

        try {
          const key = `events/${event._id}/flyers/${format}/${timestamp}`;
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

          // Update event with the flyer URLs
          event.flyer[format] = {
            thumbnail: urls.thumbnail,
            medium: urls.medium,
            full: urls.full,
            timestamp,
          };

          console.log(
            `[Event Creation] Updated event with ${format} flyer URLs:`,
            urls
          );
        } catch (error) {
          console.error(
            `[Event Creation] Error processing ${format} flyer:`,
            error
          );
          throw error; // Re-throw to handle in outer catch block
        }
      }

      // Save the updated event with flyer URLs
      await event.save();
      console.log("[Event Creation] Saved event with flyer URLs");
    }

    res.status(201).json(event);
  } catch (error) {
    console.error("[Event Creation Error]", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Failed to create event", error: error.message });
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

    const events = await Event.find({ brand: brandId })
      .sort({ date: -1 })
      .populate("user", "username firstName lastName avatar");

    console.log(
      `[Events] Found ${events.length} events for brand: ${brand.name}`
    );

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
    const { eventId } = req.params;
    const updatedEventData = req.body;

    console.log("[Event Update] Received request:", {
      eventId,
      body: req.body,
    });

    // Find event and check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has permission to edit this event
    const brand = await Brand.findOne({
      _id: event.brand,
      "team.user": req.user.userId,
    });

    if (!brand) {
      return res.status(403).json({
        message: "You don't have permission to edit this event",
      });
    }

    // Update event data
    Object.assign(event, updatedEventData);
    await event.save();

    console.log("[Event Update] Event updated successfully");
    res.status(200).json(event);
  } catch (error) {
    console.error("[Event Update Error]", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Error updating event", error: error.message });
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

    // Remove event from brand's events array
    brand.events.pull(eventId);
    await brand.save();

    // Delete the event
    await Event.findByIdAndDelete(eventId);

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting event" });
  }
};

exports.getEventByLink = async (req, res) => {
  try {
    const event = await Event.findOne({ link: req.params.eventLink });
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

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
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

exports.getEventPage = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
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
