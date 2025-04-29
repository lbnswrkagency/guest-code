const Settings = require("../models/settingsModel");
const User = require("../models/User");
const Brand = require("../models/brandModel");
const bcrypt = require("bcryptjs");

// Placeholder for getting user settings
exports.getUserSettings = async (req, res) => {
  try {
    // Later, fetch user-specific settings from Settings model
    res.status(200).json({ message: "User settings endpoint placeholder" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user settings", error: error.message });
  }
};

// Placeholder for updating user profile info (Name, Username, Email, Birthday)
exports.updateUserProfile = async (req, res) => {
  try {
    // Implementation to update user details in User model
    res
      .status(200)
      .json({ message: "Update user profile endpoint placeholder" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating user profile", error: error.message });
  }
};

// Placeholder for changing user password
exports.changePassword = async (req, res) => {
  try {
    // Implementation for password change logic
    res.status(200).json({ message: "Change password endpoint placeholder" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error changing password", error: error.message });
  }
};

// Update Brand Meta Pixel ID - MOVED FROM HERE
/*
exports.updateBrandMetaPixel = async (req, res) => {
  try {
    const { brandId, metaPixelId } = req.body;
    const userId = req.user._id;

    if (!brandId) {
      return res.status(400).json({ message: "Brand ID is required." });
    }

    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }

    // Check if the current user is the owner of the brand
    if (brand.owner.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized. Only the brand owner can update the Meta Pixel ID." });
    }

    // Update the metaPixelId
    brand.metaPixelId = metaPixelId || null; // Set to null if empty string is provided
    await brand.save();

    res.status(200).json({ message: "Brand Meta Pixel ID updated successfully.", brand });
  } catch (error) {
    console.error("[SettingsController:updateBrandMetaPixel] Error:", error);
    res.status(500).json({ message: "Error updating Brand Meta Pixel ID", error: error.message });
  }
};
*/
