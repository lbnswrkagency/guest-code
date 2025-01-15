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
    console.log("Login attempt with body:", req.body);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log("User not found:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Invalid password for:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    console.log("[Auth:Login] Using secrets:", {
      access: process.env.JWT_ACCESS_SECRET?.substring(0, 10) + "...",
      refresh: process.env.JWT_REFRESH_SECRET?.substring(0, 10) + "...",
    });

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

    console.log("[Auth:Login] Tokens generated for user:", user._id);
    console.log("[Auth:Login] Token structure:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    // Set cookies and send response
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
      domain:
        process.env.NODE_ENV === "production" ? ".afrospiti.com" : "localhost",
    });

    console.log("[Auth:Login] Cookie being set:", {
      name: "refreshToken",
      value: refreshToken.substring(0, 20) + "...",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    });

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
    });
  } catch (error) {
    console.error("[Auth:Login] Error:", error.message);
    res.status(500).json({ message: "Server error during login" });
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
    const refreshToken = req.cookies.refreshToken;
    console.log("[Auth:Refresh] Request cookies:", {
      allCookies: req.cookies,
      cookieNames: Object.keys(req.cookies),
      refreshTokenExists: !!refreshToken,
    });

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    // Log the token before verification
    console.log(
      "[Auth:Refresh] Token before verify:",
      refreshToken.substring(0, 20) + "..."
    );

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    console.log("[Auth:Refresh] Decoded token payload:", decoded);

    const userId = decoded._id;
    if (!userId) {
      console.log("[Auth:Refresh] No userId in decoded token");
      return res.status(403).json({ message: "Invalid token structure" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.log("[Auth:Refresh] User not found for id:", userId);
      return res.status(403).json({ message: "User not found" });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { _id: user._id, email: user.email, username: user.username },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    console.log("[Auth:Refresh] New token generated for user:", userId);
    res.json({ token: accessToken });
  } catch (error) {
    console.log("[Auth:Refresh] Error details:", {
      name: error.name,
      message: error.message,
    });
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out successfully" });
};
