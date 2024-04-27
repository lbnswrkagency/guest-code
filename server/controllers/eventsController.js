const Event = require("../models/eventsModel");
const User = require("../models/User");
const GuestCode = require("../models/GuestCode");
const InvitationCode = require("../models/InvitationModel");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const { sendQRCodeEmail } = require("../utils/email");
const { sendQRCodeInvitation } = require("../utils/email");

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

const generateUniqueLink = async () => {
  const link = Math.random().toString(36).substr(2, 8);
  const eventExists = await Event.findOne({ link });
  if (eventExists) {
    return generateUniqueLink();
  }
  return link;
};

exports.createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      user: req.user._id, // Add the user ID from the request
      guestCode: onToBoolean(req.body.guestCode),
      friendsCode: onToBoolean(req.body.friendsCode),
      ticketCode: onToBoolean(req.body.ticketCode),
      tableCode: onToBoolean(req.body.tableCode),

      link: await generateUniqueLink(),
    };

    const event = new Event(eventData);
    await event.save();

    // Add the event to the user's events array
    const user = await User.findById(req.body.user);

    user.events.push(event._id);
    await user.save();

    res.status(201).json({ event });
  } catch (error) {
    console.warn(error);
    res.status(400).json({ message: "Error creating event", error });
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

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({ user: req.user._id }); // Get events only created by the user
    res.status(200).json({ success: true, events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.editEvent = async (req, res) => {
  const eventId = req.params.eventId;
  const updatedEventData = req.body;

  try {
    const event = await Event.findByIdAndUpdate(eventId, updatedEventData, {
      new: true,
    });

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

exports.deleteEvent = async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const event = await Event.findByIdAndRemove(eventId);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    // Remove the event from the user's events array
    const user = await User.findById(req.user.userId);
    user.events.pull(eventId);
    await user.save();

    res.status(200).json({ success: true, message: "Event deleted." });
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
    ); // Adjust to your week start (Saturday or Monday)

    if (existingGuestCode && existingGuestCode.createdAt >= startOfWeek) {
      return res.status(400).json({
        error: "You still have a usable Guest Code for this Saturday.",
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
// Connect to MongoDB
async function connectToDatabase() {
  const dbUri = process.env.MONGODB_URI; // Make sure your MongoDB URI is correctly configured in your environment variables
  try {
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
}
exports.generateInvitationCode = async (req, res) => {
  console.log("Processing Invitation Code Generation");
  console.log("Request Body", req.body);

  try {
    // Ensure database is connected
    await connectToDatabase();

    const { name, email, condition, pax, style } = req.body;

    // Format name to have each word capitalized
    const formattedName = name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    // Create an InvitationCode instance
    const invitationCode = new InvitationCode({
      name: formattedName,
      email: email.toLowerCase(),
      condition,
      event: new mongoose.Types.ObjectId("654d4bf7b3cceeb4f02c13b5"),
      pax,
      paxChecked: 0,
      style,
    });

    // Save the InvitationCode to the database
    await invitationCode.save();
    console.log("Invitation code saved successfully");

    // Generate a QR code data URL for the invitation
    const qrCodeDataURL = await QRCode.toDataURL(`${invitationCode._id}`, {
      errorCorrectionLevel: "L",
    });

    // Send an invitation email with the QR code
    await sendQRCodeInvitation(
      formattedName,
      email,
      condition,
      pax,
      qrCodeDataURL,
      { _id: "654d4bf7b3cceeb4f02c13b5" } // Dummy event object with only _id for the purpose of the email function
    );

    res
      .status(201)
      .json({ message: "Check your email (including Spam). Thank you 🤝" });
  } catch (error) {
    console.error("Error generating invitation code:", error);
    res.status(500).json({ error: "Error generating invitation code." });
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
