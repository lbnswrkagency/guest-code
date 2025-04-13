const Genre = require("../models/genreModel");
const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");
const mongoose = require("mongoose");

// Controller functions
exports.createGenre = async (req, res) => {
  try {
    const { brandId, name, icon, sortOrder } = req.body;

    // Validate brand ownership
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Check if user has permission
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user.userId;

    // Check permissions
    const isOwner = brand.owner.toString() === userId.toString();
    const isAdmin =
      Array.isArray(brand.admins) &&
      brand.admins.some((adminId) => adminId.toString() === userId.toString());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to add genres to this brand",
      });
    }

    // Check if genre already exists for this brand
    const existingGenre = await Genre.findOne({
      brandId,
      name: { $regex: new RegExp(`^${name}$`, "i") }, // Case insensitive match
      isActive: true,
    });

    if (existingGenre) {
      return res.status(400).json({
        success: false,
        message: "A genre with this name already exists for this brand",
      });
    }

    // Create new genre entry
    const genre = new Genre({
      brandId,
      name,
      icon: icon || "music",
      sortOrder: sortOrder || 0,
      events: [],
    });

    await genre.save();

    return res.status(201).json(genre);
  } catch (error) {
    console.error("Error creating genre entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create genre entry",
      error: error.message,
    });
  }
};

exports.getGenresByBrand = async (req, res) => {
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

    // Get genre entries, ordered by sortOrder and then by name
    const genres = await Genre.find({
      brandId,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    return res.status(200).json(genres);
  } catch (error) {
    console.error("Error fetching genre entries:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch genre entries",
      error: error.message,
    });
  }
};

exports.updateGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, sortOrder } = req.body;

    // Find the genre entry
    const genre = await Genre.findById(id);
    if (!genre) {
      return res.status(404).json({
        success: false,
        message: "Genre not found",
      });
    }

    // Verify permissions (brand owner or admin)
    const brand = await Brand.findById(genre.brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Associated brand not found",
      });
    }

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
        message: "You don't have permission to update this genre",
      });
    }

    // Update fields if provided
    if (name) genre.name = name;
    if (icon) genre.icon = icon;
    if (sortOrder !== undefined) genre.sortOrder = sortOrder;

    await genre.save();

    return res.status(200).json({
      success: true,
      genre,
      message: "Genre updated successfully",
    });
  } catch (error) {
    console.error("Error updating genre entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update genre entry",
      error: error.message,
    });
  }
};

exports.deleteGenre = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the genre entry
    const genre = await Genre.findById(id);
    if (!genre) {
      return res.status(404).json({
        success: false,
        message: "Genre not found",
      });
    }

    // Verify permissions (brand owner or admin)
    const brand = await Brand.findById(genre.brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Associated brand not found",
      });
    }

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
        message: "You don't have permission to delete this genre",
      });
    }

    // Soft delete by marking as inactive rather than removing from database
    genre.isActive = false;
    await genre.save();

    return res.status(200).json({
      success: true,
      message: "Genre deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting genre entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete genre entry",
      error: error.message,
    });
  }
};

exports.getGenresByEvent = async (req, res) => {
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

    // Find all genres associated with this event
    const genres = await Genre.find({
      events: eventId,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    return res.status(200).json(genres);
  } catch (error) {
    console.error("Error fetching event genres:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch event genres",
      error: error.message,
    });
  }
};
