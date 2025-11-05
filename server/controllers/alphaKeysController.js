const AlphaKey = require("../models/alphaKeysModel");
const User = require("../models/User");

// Verify an alpha key and update user status
const verifyAlphaKey = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;

    if (!code || code.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Invalid code format. Alpha code must be 4 digits.",
      });
    }

    // Check if user is already an alpha user
    const user = await User.findById(userId);
    if (user.isAlpha) {
      return res.status(400).json({
        success: false,
        message: "You already have alpha access.",
      });
    }

    // Find the alpha key
    const alphaKey = await AlphaKey.findOne({ code });

    if (!alphaKey) {
      return res.status(404).json({
        success: false,
        message: "Invalid alpha code.",
      });
    }

    if (alphaKey.isUsed) {
      return res.status(400).json({
        success: false,
        message: "This alpha code has already been used.",
      });
    }

    // Update the alpha key
    alphaKey.isUsed = true;
    alphaKey.usedBy = userId;
    alphaKey.usedAt = new Date();
    await alphaKey.save();

    // Update the user
    user.isAlpha = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Alpha access granted successfully!",
    });
  } catch (error) {
    console.error("Error verifying alpha key:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while verifying alpha key.",
    });
  }
};

module.exports = {
  verifyAlphaKey,
};
