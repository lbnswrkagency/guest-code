const LineUp = require("../models/lineupModel");
const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { uploadToS3 } = require("../utils/s3Uploader");

// Helper function to process and upload images to S3
const processAndUploadImage = async (file, folderPath) => {
  const imageId = uuidv4();
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const baseKey = `${folderPath}/${imageId}`;
  const mimeType = file.mimetype;

  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `${imageId}${fileExtension}`);
  fs.writeFileSync(tempFilePath, file.buffer);

  // Process and upload various sizes
  const sizes = {
    thumbnail: { width: 100, height: 100 },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 900, height: 900 },
    full: { width: 1200, height: 1200 },
  };

  const imageUrls = {};

  for (const [size, dimensions] of Object.entries(sizes)) {
    const resizedImageBuffer = await sharp(tempFilePath)
      .resize({
        width: dimensions.width,
        height: dimensions.height,
        fit: sharp.fit.cover,
        position: sharp.strategy.attention,
      })
      .toBuffer();

    const sizeKey = `${baseKey}-${size}${fileExtension}`;
    const url = await uploadToS3(resizedImageBuffer, sizeKey, mimeType);

    // Construct the URL
    imageUrls[size] = url;
  }

  // Upload original image too
  const originalKey = `${baseKey}-original${fileExtension}`;
  const originalBuffer = fs.readFileSync(tempFilePath);
  await uploadToS3(originalBuffer, originalKey, mimeType);

  // Clean up temp file
  fs.unlinkSync(tempFilePath);

  return imageUrls;
};

// Controller functions
exports.createLineUp = async (req, res) => {
  try {
    console.log("[createLineUp] Request user:", {
      user: req.user,
      body: req.body,
      hasFile: !!req.file,
    });

    const { brandId, name, category, subtitle, sortOrder } = req.body;

    // Validate brand ownership
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Check if req.user exists before accessing its properties
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Use req.user.userId instead of req.user._id
    const userId = req.user.userId;

    // Check permissions - owner, admin, or team member
    const isOwner = brand.owner.toString() === userId.toString();
    const isAdmin =
      Array.isArray(brand.admins) &&
      brand.admins.some((adminId) => adminId.toString() === userId.toString());
    const isTeamMember =
      Array.isArray(brand.team) &&
      brand.team.some((member) => member.user && member.user.toString() === userId.toString());

    if (!isOwner && !isAdmin && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to add line-up to this brand",
      });
    }

    let avatarUrls = null;

    // Process avatar image if present
    if (req.file) {
      avatarUrls = await processAndUploadImage(
        req.file,
        `brands/${brandId}/lineup`
      );
    }

    // Create new lineup entry
    const lineUp = new LineUp({
      brandId,
      name,
      category,
      subtitle,
      avatar: avatarUrls,
      sortOrder: sortOrder || 0,
      events: [],
    });

    await lineUp.save();

    return res.status(201).json(lineUp);
  } catch (error) {
    console.error("Error creating line-up entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create line-up entry",
      error: error.message,
    });
  }
};

exports.getLineUpsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Validate brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Get line-up entries, ordered by sortOrder and then by name
    const lineUps = await LineUp.find({
      brandId,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    // Filter out any null or invalid lineups
    const validLineUps = lineUps.filter(lineup => lineup && lineup._id);

    return res.status(200).json(validLineUps);
  } catch (error) {
    console.error("Error fetching line-up entries:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch line-up entries",
      error: error.message,
    });
  }
};

exports.getLineUpById = async (req, res) => {
  try {
    const { id } = req.params;

    const lineUp = await LineUp.findById(id);
    if (!lineUp) {
      return res.status(404).json({
        success: false,
        message: "Line-up entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      lineUp,
    });
  } catch (error) {
    console.error("Error fetching line-up entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch line-up entry",
      error: error.message,
    });
  }
};

exports.updateLineUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, subtitle, sortOrder } = req.body;

    // Find the lineup entry
    const lineUp = await LineUp.findById(id);
    if (!lineUp) {
      return res.status(404).json({
        success: false,
        message: "Line-up entry not found",
      });
    }

    // Verify permissions (brand owner or admin)
    const brand = await Brand.findById(lineUp.brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Associated brand not found",
      });
    }

    // Get the user ID from either req.user.userId or req.user._id
    const userId = req.user.userId || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user is brand owner or admin
    const isOwner = brand.owner.toString() === userId.toString();
    const isAdmin =
      Array.isArray(brand.admins) &&
      brand.admins.some((adminId) => adminId.toString() === userId.toString());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this line-up entry",
      });
    }

    // Update basic fields if provided
    if (name) lineUp.name = name;
    if (category) lineUp.category = category;
    if (subtitle !== undefined) lineUp.subtitle = subtitle;
    if (sortOrder !== undefined) lineUp.sortOrder = sortOrder;

    // Process new avatar if provided
    if (req.file) {
      const avatarUrls = await processAndUploadImage(
        req.file,
        `brands/${lineUp.brandId}/lineup`
      );
      lineUp.avatar = avatarUrls;
    }

    await lineUp.save();

    return res.status(200).json({
      success: true,
      lineUp,
      message: "Line-up entry updated successfully",
    });
  } catch (error) {
    console.error("Error updating line-up entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update line-up entry",
      error: error.message,
    });
  }
};

exports.deleteLineUp = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the lineup entry
    const lineUp = await LineUp.findById(id);
    if (!lineUp) {
      return res.status(404).json({
        success: false,
        message: "Line-up entry not found",
      });
    }

    // Verify permissions (brand owner or admin)
    const brand = await Brand.findById(lineUp.brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Associated brand not found",
      });
    }

    // Get the user ID from either req.user.userId or req.user._id
    const userId = req.user.userId || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user is brand owner or admin
    const isOwner = brand.owner.toString() === userId.toString();
    const isAdmin =
      Array.isArray(brand.admins) &&
      brand.admins.some((adminId) => adminId.toString() === userId.toString());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this line-up entry",
      });
    }

    // Soft delete by marking as inactive rather than removing from database
    lineUp.isActive = false;
    await lineUp.save();

    return res.status(200).json({
      success: true,
      message: "Line-up entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting line-up entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete line-up entry",
      error: error.message,
    });
  }
};

exports.addLineUpToEvent = async (req, res) => {
  try {
    const { lineUpId, eventId } = req.params;

    // Find the lineup entry
    const lineUp = await LineUp.findById(lineUpId);
    if (!lineUp) {
      return res.status(404).json({
        success: false,
        message: "Line-up entry not found",
      });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if brand matches
    if (event.brandId.toString() !== lineUp.brandId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Line-up entry must belong to the same brand as the event",
      });
    }

    // Get the user ID from either req.user.userId or req.user._id
    const userId = req.user.userId || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Verify permissions
    const brand = await Brand.findById(lineUp.brandId);

    // Check if user is brand owner or admin
    const isOwner = brand.owner.toString() === userId.toString();
    const isAdmin =
      Array.isArray(brand.admins) &&
      brand.admins.some((adminId) => adminId.toString() === userId.toString());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to add this line-up to this event",
      });
    }

    // Add event to lineup's events array if not already present
    if (!lineUp.events.includes(eventId)) {
      lineUp.events.push(eventId);
      await lineUp.save();
    }

    return res.status(200).json({
      success: true,
      lineUp,
      message: "Line-up added to event successfully",
    });
  } catch (error) {
    console.error("Error adding line-up to event:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add line-up to event",
      error: error.message,
    });
  }
};

exports.removeLineUpFromEvent = async (req, res) => {
  try {
    const { lineUpId, eventId } = req.params;

    // Find the lineup entry
    const lineUp = await LineUp.findById(lineUpId);
    if (!lineUp) {
      return res.status(404).json({
        success: false,
        message: "Line-up entry not found",
      });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Get the user ID from either req.user.userId or req.user._id
    const userId = req.user.userId || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Verify permissions
    const brand = await Brand.findById(lineUp.brandId);

    // Check if user is brand owner or admin
    const isOwner = brand.owner.toString() === userId.toString();
    const isAdmin =
      Array.isArray(brand.admins) &&
      brand.admins.some((adminId) => adminId.toString() === userId.toString());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to remove this line-up from this event",
      });
    }

    // Remove event from lineup's events array
    lineUp.events = lineUp.events.filter(
      (event) => event.toString() !== eventId
    );

    await lineUp.save();

    return res.status(200).json({
      success: true,
      lineUp,
      message: "Line-up removed from event successfully",
    });
  } catch (error) {
    console.error("Error removing line-up from event:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove line-up from event",
      error: error.message,
    });
  }
};

exports.getLineUpsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if this is a public route (no authentication required)
    const isPublicRoute = req.path.includes("/public/");

    // Check permissions only for non-public routes
    if (!isPublicRoute && req.user) {
      const userId = req.user.userId || req.user._id;
      const isDirectOwner =
        event.user && event.user.toString() === userId.toString();
      let isBrandTeamMember = false;

      if (!isDirectOwner && !req.user.isAdmin) {
        const brand = await Brand.findOne({
          _id: event.brand,
          $or: [{ owner: userId }, { "team.user": userId }],
        });
        isBrandTeamMember = !!brand;

        if (!isBrandTeamMember) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to view lineups for this event",
          });
        }
      }
    }

    // Find all lineup entries associated with this event
    const lineUps = await LineUp.find({
      events: eventId,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    // Filter out any null or invalid lineups
    const validLineUps = lineUps.filter(lineup => lineup && lineup._id);

    return res.status(200).json(validLineUps);
  } catch (error) {
    console.error("Error fetching event line-ups:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch event line-ups",
      error: error.message,
    });
  }
};

// New functions to handle category and subtitle management
exports.deleteCategory = async (req, res) => {
  try {
    const { brandId, category } = req.params;

    // Validate brand ownership
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Check if req.user exists before accessing its properties
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Use req.user.userId instead of req.user._id
    const userId = req.user.userId;

    // Check permissions
    const isOwner = brand.owner.toString() === userId.toString();
    const isAdmin =
      Array.isArray(brand.admins) &&
      brand.admins.some((adminId) => adminId.toString() === userId.toString());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to delete categories for this brand",
      });
    }

    // Find all lineups with this category and update them (set category to "Other")
    const result = await LineUp.updateMany(
      { brandId, category, isActive: true },
      { category: "Other" }
    );

    return res.status(200).json({
      success: true,
      message: `Category "${category}" deleted and replaced with "Other"`,
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

exports.deleteSubtitle = async (req, res) => {
  try {
    const { brandId, subtitle } = req.params;

    // Validate brand ownership
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Check if req.user exists before accessing its properties
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Use req.user.userId instead of req.user._id
    const userId = req.user.userId;

    // Check permissions
    const isOwner = brand.owner.toString() === userId.toString();
    const isAdmin =
      Array.isArray(brand.admins) &&
      brand.admins.some((adminId) => adminId.toString() === userId.toString());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete subtitles for this brand",
      });
    }

    // Find all lineups with this subtitle and clear the subtitle field
    const result = await LineUp.updateMany(
      { brandId, subtitle, isActive: true },
      { subtitle: "" }
    );

    return res.status(200).json({
      success: true,
      message: `Subtitle "${subtitle}" deleted`,
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error deleting subtitle:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete subtitle",
      error: error.message,
    });
  }
};
