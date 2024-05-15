const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { sendVerificationEmail } = require("../utils/email");

exports.register = async (req, res) => {
  const { username, email, password, firstName, lastName, birthday } = req.body;

  console.log("Received registration request with body:", req.body);
  try {
    console.log("Checking for existing user with email or username...");
    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      console.log("User found with same email or username:", {
        email: user.email,
        username: user.username,
      });
      return res
        .status(400)
        .json({ message: "Username or email already exists." });
    }

    console.log("No existing user found. Generating salt...");
    const salt = await bcrypt.genSalt(10);
    console.log("Salt generated. Hashing password...");
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("Password hashed. Creating user...");

    user = new User({
      username,
      firstName,
      lastName,
      email,
      birthday,
      password: hashedPassword,
    });

    console.log("Saving user...");
    await user.save();
    console.log("User saved successfully. Generating JWT...");

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log("JWT generated. Sending verification email...");

    await sendVerificationEmail(user.email, token);

    console.log("Verification email sent. Responding with success.");
    res.json({
      success: true,
      message:
        "User registered successfully. Please check your email for verification.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.isVerified = true;
    await user.save();

    const payload = {
      userId: user._id,
      email: user.email,
    };

    const newToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h", // Or your desired standard expiration time
    });

    res.json({
      success: true,
      message: "Email verified successfully.",
      email: user.email,
      token: newToken, // Send the new token to the client
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Invalid token or internal server error.",
    });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  console.log("REQ BODY", req.body);
  const { identifier, password } = req.body;

  try {
    let user;
    if (identifier.includes("@")) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    } else {
      user = await User.findOne({
        $or: [
          {
            username: {
              $regex: new RegExp("^" + identifier.toLowerCase() + "$", "i"),
            },
          },
          {
            name: {
              $regex: new RegExp("^" + identifier.toLowerCase() + "$", "i"),
            },
          },
        ],
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message:
          "Email not verified. Please check your email for verification.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password." });
    }

    // Payload for the tokens
    const payload = {
      userId: user._id,
      email: user.email,
      username: user.username, // Optionally add username to payload if needed
    };

    // Generate Access Token
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "15m", // short-lived access token
    });

    // Generate Refresh Token
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d", // long-lived refresh token
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Use 'None' for production if cross-site, 'Lax' for development
    });

    // Return Access Token
    res.json({ success: true, accessToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.refreshAccessToken = async (req, res) => {
  if (!req.cookies || !req.cookies.refreshToken) {
    console.log("No refresh token found in cookies");
    return res.status(403).json({ message: "No refresh token" });
  }

  const refreshToken = req.cookies.refreshToken;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const payload = { userId: decoded.userId, email: decoded.email };

    const newAccessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
    });

    res.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    console.error("Error in refreshing token:", error);
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("refreshToken"); // Clear the refresh token cookie
  res.json({ success: true, message: "Logged out successfully" });
};
