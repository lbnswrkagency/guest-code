const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utils/email");
const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");
const CodeSetting = require("../models/codeSettingsModel");
const Role = require("../models/roleModel");
const LineUp = require("../models/lineupModel");

// Token generation with different expiration times
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "24h", // Extended from 15m to 24h for better persistence
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d", // Extended from 7d to 30d for longer persistence
  });
};

// Cookie options for security
const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000, // 24 hours (matching token expiry)
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (matching token expiry)
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

    // Send verification email without event details
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

    // Find user by email or username using case-insensitive regex for better matching
    const user = await User.findOne({
      $or: [
        { email: new RegExp("^" + email + "$", "i") }, // Case-insensitive email match
        { username: new RegExp("^" + email + "$", "i") }, // Case-insensitive username match
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({
        message: "Please verify your email before logging in",
        isVerificationError: true,
      });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token hash in user document
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    // Set cookies
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    // STEP 1: Fetch user's brands
    const userBrands = await Brand.find({
      $or: [{ owner: user._id }, { "team.user": user._id }],
    })
      .select("-bannedMembers")
      .lean();

    // Prepare collections for our flat data structure
    const allRoles = [];
    const userRoles = {};
    const allEvents = [];
    const allCodeSettings = [];
    const allLineUps = [];

    // Process each brand to get roles, events, and code settings
    await Promise.all(
      userBrands.map(async (brand) => {
        try {
          // STEP 2: Fetch roles for this brand
          const roles = await Role.find({ brandId: brand._id }).lean();

          // Find user's role in this brand
          let userRole = null;
          // Check if user is the owner
          if (brand.owner && brand.owner.toString() === user._id.toString()) {
            // Find the founder role
            userRole = roles.find((r) => r.isFounder) || roles[0];
          } else if (brand.team && Array.isArray(brand.team)) {
            // Find user in team
            const teamMember = brand.team.find(
              (m) => m.user && m.user.toString() === user._id.toString()
            );
            if (teamMember && teamMember.role) {
              userRole = roles.find(
                (r) => r._id.toString() === teamMember.role.toString()
              );
            }
          }

          // Store user's role for this brand
          if (userRole) {
            userRoles[brand._id.toString()] = userRole._id.toString();

            // Add all roles to the collection if not already there
            roles.forEach((role) => {
              if (
                !allRoles.some((r) => r._id.toString() === role._id.toString())
              ) {
                allRoles.push(role);
              }
            });
          }

          // STEP 3: Fetch events for this brand
          const parentEvents = await Event.find({
            brand: brand._id,
            parentEventId: null,
          })
            .select("-__v")
            .lean();

          // Get child events for weekly events
          const weeklyEventIds = parentEvents
            .filter((e) => e.isWeekly)
            .map((e) => e._id);

          let childEvents = [];
          if (weeklyEventIds.length > 0) {
            childEvents = await Event.find({
              parentEventId: { $in: weeklyEventIds },
            })
              .select("-__v")
              .lean();
          }

          // Combine all events
          const allBrandEvents = [...parentEvents, ...childEvents];

          // STEP 4: Fetch code settings for each event
          await Promise.all(
            allBrandEvents.map(async (event) => {
              try {
                // For child events, use parent event ID for code settings
                const effectiveEventId = event.parentEventId || event._id;

                // Fetch code settings from the CodeSettings collection
                const codeSettings = await CodeSetting.find({
                  eventId: effectiveEventId,
                }).lean();

                // Add event to collection with brand reference
                allEvents.push({
                  ...event,
                  brand: brand._id.toString(),
                });

                // Add code settings to collection with event reference
                codeSettings.forEach((setting) => {
                  allCodeSettings.push({
                    ...setting,
                    eventId: event._id.toString(),
                  });
                });
              } catch (error) {
                // Still add the event even if code settings failed
                allEvents.push({
                  ...event,
                  brand: brand._id.toString(),
                });
              }
            })
          );

          // STEP 5: Fetch lineup data for this brand
          const lineups = await LineUp.find({ brandId: brand._id }).lean();

          // Add lineups to collection with brand reference
          lineups.forEach((lineup) => {
            allLineUps.push({
              ...lineup,
              brandId: brand._id.toString(),
            });
          });
        } catch (error) {
          // Error handling for individual brand processing
        }
      })
    );

    // Return user data and tokens
    const userData = {
      _id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isVerified: user.isVerified,
      isAlpha: user.isAlpha,
      isAdmin: user.isAdmin,
      isDeveloper: user.isDeveloper,
      isScanner: user.isScanner,
      isPromoter: user.isPromoter,
      isStaff: user.isStaff,
      isBackstage: user.isBackstage,
      isSpitixBattle: user.isSpitixBattle,
      isTable: user.isTable,
      brands: userBrands,
      roles: {
        allRoles: allRoles,
        userRoles: userRoles,
      },
      events: allEvents,
      codeSettings: allCodeSettings,
      lineups: allLineUps,
    };

    res.json({
      user: userData,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
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

// Add a lightweight ping endpoint for session refresh
exports.pingSession = async (req, res) => {
  try {
    // This endpoint just checks if the token is valid
    // The authentication middleware already validates the token

    // We can extend the user's session by refreshing the token
    if (req.user && req.user.userId) {
      // Generate new access token with the same user ID
      const newAccessToken = generateAccessToken(req.user.userId);

      // Set the token in the response
      res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);

      // Return minimal information to keep the payload small
      return res.status(200).json({
        status: "active",
        tokenRefreshed: true,
      });
    }

    // If no user in request (middleware didn't populate it)
    return res.status(200).json({
      status: "active",
      tokenRefreshed: false,
    });
  } catch (error) {
    // Even if there's an error, return 200 to prevent error handling on client
    return res.status(200).json({
      status: "error",
      message: "Session ping failed",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find the user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // If no user is found, still return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If your email is registered, you will receive reset instructions.",
      });
    }

    // Generate a reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Store the token hash in the user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset password email
    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      success: true,
      message: "Password reset instructions sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process request",
    });
  }
};

exports.validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET
      );
    } catch (error) {
      console.error("JWT verification error:", error);
      return res.status(400).json({
        message: "Password reset token is invalid or has expired",
      });
    }

    // Find the user by ID and check if resetPasswordExpires is greater than now
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Password reset token is invalid or has expired",
      });
    }

    res.status(200).json({
      success: true,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(500).json({
      message: "Failed to validate token",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and password are required" });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET
      );
    } catch (error) {
      console.error("JWT verification error:", error);
      return res.status(400).json({
        message: "Password reset token is invalid or has expired",
      });
    }

    // Find the user by ID and check if resetPasswordExpires is greater than now
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Password reset token is invalid or has expired",
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear the reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      message: "Failed to reset password",
    });
  }
};
