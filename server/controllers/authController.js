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
      return res
        .status(400)
        .json({ success: false, message: "Username or email already exists." });
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
      events: ["654d4bf7b3cceeb4f02c13b5"], // Afro Spiti event ID
      isPromoter: true,
      friendsCodeLimit: 2,
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    await sendVerificationEmail(user.email, token);

    res.json({
      success: true,
      message:
        "User registered successfully. Please check your email for verification.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
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
      _id: user._id,
      email: user.email,
      username: user.username,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      success: true,
      message: "Email verified successfully.",
      accessToken,
      userId: user._id,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Invalid token or internal server error.",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Missing credentials",
        details: "Email and password are required",
      });
    }

    const user = await User.findOne({
      $or: [
        { email: new RegExp(`^${email.trim()}$`, "i") },
        { username: new RegExp(`^${email.trim()}$`, "i") },
      ],
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
        details: "No account found with this email or username",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Email not verified",
        details: "Please check your email for verification link",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
        details: "Incorrect password",
      });
    }

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

    res.json({
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
    res.status(500).json({
      message: "Server error during login",
      details: "Please try again later",
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
