const Settings = require("../models/settingsModel");
const User = require("../models/User");
const Brand = require("../models/brandModel");
const bcrypt = require("bcryptjs");

// Placeholder for getting user settings - Can be expanded later if needed
exports.getUserSettings = async (req, res) => {
  try {
    // Currently, user settings are directly on the User model
    const user = await User.findById(req.user._id).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user }); // Return user data as settings
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user settings", error: error.message });
  }
};

// Update user profile info (Name, Username, Email, Birthday)
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { firstName, lastName, username, email, birthday } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Basic validation
    if (!firstName || !lastName || !username || !email || !birthday) {
      return res
        .status(400)
        .json({ message: "All profile fields are required." });
    }

    // Check if username or email is being changed and if they are already taken
    if (username.toLowerCase() !== user.username.toLowerCase()) {
      // Check 14-day username change restriction
      if (user.lastUsernameChange) {
        const fourteenDaysInMillis = 14 * 24 * 60 * 60 * 1000;
        const timeSinceLastChange =
          Date.now() - user.lastUsernameChange.getTime();
        if (timeSinceLastChange < fourteenDaysInMillis) {
          const daysRemaining = Math.ceil(
            (fourteenDaysInMillis - timeSinceLastChange) / (24 * 60 * 60 * 1000)
          );
          return res.status(400).json({
            message: `Username can only be changed once every 14 days. Try again in ${daysRemaining} day(s).`,
          });
        }
      }

      const existingUserByUsername = await User.findOne({
        username: username.toLowerCase(),
      });
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already taken." });
      }
      user.username = username.toLowerCase();
      user.lastUsernameChange = Date.now(); // Update timestamp on successful change
    }

    if (email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUserByEmail = await User.findOne({
        email: email.toLowerCase(),
      });
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already registered." });
      }
      // Consider if email change requires re-verification
      user.email = email.toLowerCase();
      // user.isVerified = false; // Optional: require re-verification
    }

    // Update other fields
    user.firstName = firstName;
    user.lastName = lastName;
    user.birthday = birthday; // Assuming birthday comes in correct format

    const updatedUser = await user.save();

    // Return updated user data, excluding password and sensitive tokens
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;
    delete userResponse.verificationToken;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res
      .status(200)
      .json({ message: "Profile updated successfully!", user: userResponse });
  } catch (error) {
    console.error("[SettingsController:updateUserProfile] Error:", error);
    res
      .status(500)
      .json({ message: "Error updating user profile", error: error.message });
  }
};

// Change user password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "All password fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    console.error("[SettingsController:changePassword] Error:", error);
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
