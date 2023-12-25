const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { sendVerificationEmail } = require("../utils/email");

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ message: "User with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
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
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
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

  const { identifier, password } = req.body;

  try {
    let user;
    if (identifier.includes("@")) {
      user = await User.findOne({ email: identifier });
    } else {
      user = await User.findOne({ name: identifier }); // Assuming 'name' is the username field in your User model
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
    };
    console.log("ENV ACCESS SECRET", process.env.JWT_ACCESS_SECRET);

    // Generate Access Token
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "1m", // short-lived access token
    });

    console.log("Access Token:", accessToken);
    console.log("ENV REFRESH SECRET", process.env.JWT_REFRESH_SECRET);

    // Generate Refresh Token
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d", // long-lived refresh token
    });

    console.log("Refresh Token:", refreshToken);

    console.log("NODE_ENV:", process.env.NODE_ENV);

    console.log("CLIENT_BASE_URL:", process.env.CLIENT_BASE_URL);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Use 'None' for production if cross-site, 'Lax' for development
      domain: `${process.env.CLIENT_BASE_URL}`,
    });
    console.log("Refresh token set in cookie:", refreshToken);

    // Return Access Token
    console.log("Sending response with access token");
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
  console.log("-------REFRESH TOKEN CALLED----------");
  console.log("REQ COOKIES --- ", req.cookies);

  if (!req.cookies || !req.cookies.refreshToken) {
    console.log("No refresh token found in cookies");
    return res.status(403).json({ message: "No refresh token" });
  }

  const refreshToken = req.cookies.refreshToken;
  console.log("Refresh Token from Cookie:", refreshToken);

  try {
    console.log("ENV REFRESH SECRET", process.env.JWT_REFRESH_SECRET);
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    console.log("Refresh token decoded:", decoded);
    const payload = { userId: decoded.userId, email: decoded.email };
    console.log("ENV ACCESS SECRET", process.env.JWT_ACCESS_SECRET);

    const newAccessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "1m",
    });

    console.log("New access token generated:", newAccessToken);
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
