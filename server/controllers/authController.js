const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { sendVerificationEmail } = require("../utils/email");

// Token generation with different expiration times
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m", // Short-lived access token
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d", // Longer-lived refresh token
  });
};

// Cookie options for security
const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

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
    res.status(500).json({
      success: false,
      message: "Verification failed",
      details: "Invalid or expired verification link.",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("[AuthController:Login] Login attempt", {
      email,
      hasPassword: !!password,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    });

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: email },
        { username: email }, // Check if the provided email field matches a username
      ],
    });

    if (!user) {
      console.log("[AuthController:Login] User not found", {
        email,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("[AuthController:Login] User found", {
      userId: user._id,
      username: user.username,
      email: user.email,
      loginAttemptWith: email,
      matchedWith: email === user.email ? "email" : "username",
      isVerified: user.isVerified,
      hasRefreshToken: !!user.refreshToken,
      timestamp: new Date().toISOString(),
    });

    // Check if user is verified
    if (!user.isVerified) {
      console.log("[AuthController:Login] User not verified", {
        userId: user._id,
        email,
        timestamp: new Date().toISOString(),
      });
      return res
        .status(401)
        .json({ message: "Please verify your email before logging in" });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("[AuthController:Login] Invalid password", {
        userId: user._id,
        email,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("[AuthController:Login] Password validated successfully", {
      userId: user._id,
      timestamp: new Date().toISOString(),
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token hash in user document
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    console.log("[AuthController:Login] Refresh token stored", {
      userId: user._id,
      timestamp: new Date().toISOString(),
    });

    // Set cookies
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    console.log("[AuthController:Login] Cookies set", {
      userId: user._id,
      cookieOptions: {
        accessToken: { ...accessTokenCookieOptions },
        refreshToken: { ...refreshTokenCookieOptions },
      },
      timestamp: new Date().toISOString(),
    });

    // Return user data and tokens
    const userData = {
      _id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
    };

    console.log("[AuthController:Login] Login successful", {
      userId: user._id,
      username: user.username,
      timestamp: new Date().toISOString(),
    });

    res.json({
      user: userData,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    console.error("[AuthController:Login] Login error", {
      error: error.message,
      stack: error.stack,
      email: req.body?.email,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -refreshToken"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Verify stored refresh token hash
    const isValidRefreshToken = await bcrypt.compare(
      refreshToken,
      user.refreshToken
    );

    if (!isValidRefreshToken) {
      // Clear cookies and user's stored refresh token if invalid
      user.refreshToken = null;
      await user.save();
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update stored refresh token
    user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
    await user.save();

    // Set new cookies
    res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    // Return tokens in response body as well
    res.json({
      message: "Tokens refreshed successfully",
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Find user and clear their refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    // Clear cookies regardless of token validity
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    // Still clear cookies even if there's an error
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logged out successfully" });
  }
};

// Sync token from request body to cookies
exports.syncToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }

    try {
      // Verify the token is valid before setting it in cookies
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Set the token in cookies
      res.cookie("accessToken", token, accessTokenCookieOptions);

      return res
        .status(200)
        .json({ message: "Token synced to cookies successfully" });
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
