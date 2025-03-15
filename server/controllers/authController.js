const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { sendVerificationEmail } = require("../utils/email");
const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");
const CodeSetting = require("../models/codeSettingsModel");
const Role = require("../models/roleModel");
const LineUp = require("../models/lineupModel");

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
      identifier: email, // can be email or username
      hasPassword: !!password,
      timestamp: new Date().toISOString(),
    });

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() }, // Check if the provided email field matches a username
      ],
    });

    if (!user) {
      console.log("[AuthController:Login] User not found", {
        identifier: email,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      console.log("[AuthController:Login] User not verified", {
        userId: user._id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({
        message: "Please verify your email before logging in",
        isVerificationError: true,
      });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("[AuthController:Login] Invalid password", {
        userId: user._id,
        timestamp: new Date().toISOString(),
      });
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
    console.log(
      "[AuthController:Login] STEP 1: Fetching brands for user:",
      user._id
    );
    const userBrands = await Brand.find({
      $or: [{ owner: user._id }, { "team.user": user._id }],
    })
      .select("-bannedMembers")
      .lean();

    console.log("[AuthController:Login] Found brands:", {
      userId: user._id,
      brandsCount: userBrands.length,
      brandIds: userBrands.map((b) => b._id),
    });

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
          console.log(
            "[AuthController:Login] STEP 2: Fetching roles for brand:",
            brand._id
          );
          const roles = await Role.find({ brandId: brand._id }).lean();

          console.log("[AuthController:Login] Found roles for brand:", {
            brandId: brand._id,
            brandName: brand.name,
            rolesCount: roles.length,
            roleNames: roles.map((r) => r.name),
          });

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
          console.log(
            "[AuthController:Login] STEP 3: Fetching events for brand:",
            brand._id
          );
          const parentEvents = await Event.find({
            brand: brand._id,
            parentEventId: null,
          })
            .select("-__v")
            .lean();

          console.log("[AuthController:Login] Found parent events:", {
            brandId: brand._id,
            brandName: brand.name,
            count: parentEvents.length,
          });

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

            console.log("[AuthController:Login] Found child events:", {
              brandId: brand._id,
              brandName: brand.name,
              weeklyParentCount: weeklyEventIds.length,
              childCount: childEvents.length,
            });
          }

          // Combine all events
          const allBrandEvents = [...parentEvents, ...childEvents];

          // STEP 4: Fetch code settings for each event
          console.log(
            "[AuthController:Login] STEP 4: Fetching code settings for events"
          );

          await Promise.all(
            allBrandEvents.map(async (event) => {
              try {
                // For child events, use parent event ID for code settings
                const effectiveEventId = event.parentEventId || event._id;

                // Fetch code settings from the CodeSettings collection
                const codeSettings = await CodeSetting.find({
                  eventId: effectiveEventId,
                }).lean();

                console.log(
                  `[AuthController:Login] Found ${codeSettings.length} code settings for event ${event.title}`
                );

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
                console.error(
                  `[AuthController:Login] Error fetching code settings for event ${event._id}:`,
                  error.message
                );

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
          console.error("[AuthController:Login] Error processing brand:", {
            brandId: brand._id,
            brandName: brand.name,
            error: error.message,
          });
        }
      })
    );

    // Count totals for logging
    console.log("[AuthController:Login] Completed data fetch:", {
      userId: user._id,
      username: user.username,
      brandsCount: userBrands.length,
      eventsCount: allEvents.length,
      rolesCount: allRoles.length,
      codeSettingsCount: allCodeSettings.length,
      lineupsCount: allLineUps.length,
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

    console.log("[AuthController:Login] Login successful", {
      userId: user._id,
      username: user.username,
      brandsCount: userBrands.length,
      eventsCount: allEvents.length,
      rolesCount: allRoles.length,
      lineupsCount: allLineUps.length,
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
