const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { sendVerificationEmail } = require("../utils/email");

exports.register = async (req, res) => {
  const { username, email, password, firstName, lastName, birthday } = req.body;

  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      return res.status(400).json({
        success: false,
        message: "Registration failed",
        details:
          user.email === email
            ? "This email is already registered"
            : "This username is already taken",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      firstName,
      lastName,
      email,
      birthday,
      password: hashedPassword,
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    await sendVerificationEmail(user.email, token);

    res.json({
      success: true,
      message: "Registration successful",
      details: "Please check your email for verification.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      details: "An unexpected error occurred. Please try again later.",
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Verification failed",
        details: "User not found.",
      });
    }

    user.isVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully",
      details: "You can now log in to your account.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
      details: "Invalid or expired verification link.",
    });
  }
};

exports.login = async (req, res) => {
  console.log("🔐 Login request received", {
    email: req.body.email,
    hasPassword: !!req.body.password,
  });

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Missing credentials");
      return res.status(400).json({
        success: false,
        message: "Login failed",
        details: "Email/username and password are required",
      });
    }

    console.log("🔍 Searching for user...");
    // Try to find user by email or username
    const user = await User.findOne({
      $or: [
        { email: new RegExp(`^${email.trim()}$`, "i") },
        { username: new RegExp(`^${email.trim()}$`, "i") },
      ],
    });

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({
        success: false,
        message: "Login failed",
        details: "Invalid email/username or password",
      });
    }

    console.log("👤 User found, checking verification status...");
    if (!user.isVerified) {
      console.log("❌ User not verified");
      return res.status(403).json({
        success: false,
        message: "Login failed",
        details: "Please verify your email before logging in",
      });
    }

    console.log("🔑 Checking password...");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Invalid password");
      return res.status(401).json({
        success: false,
        message: "Login failed",
        details: "Invalid email/username or password",
      });
    }

    console.log("✅ Password valid, generating tokens...");
    const accessToken = jwt.sign(
      { _id: user._id, email: user.email, username: user.username },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { _id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    console.log("🎉 Login successful, sending response...");
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    console.error("❌ Server error during login:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      details: "An unexpected error occurred. Please try again later.",
    });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user data error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.headers.authorization?.split(" ")[1];

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const userId = decoded._id;
    if (!userId) {
      return res.status(403).json({ message: "Invalid token structure" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    const accessToken = jwt.sign(
      { _id: user._id, email: user.email, username: user.username },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ token: accessToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

exports.logout = (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};
