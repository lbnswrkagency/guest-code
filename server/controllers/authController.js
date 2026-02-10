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
const CoHostRelationship = require("../models/coHostRelationshipModel");
const { resolvePermissions, normalizePermissions } = require("../utils/permissionResolver");

const DEBUG_LOGIN = process.env.NODE_ENV !== 'production';

// Token generation with different expiration times
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "2h", // Extended access token for better UX
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
  sameSite: "lax",
  maxAge: 2 * 60 * 60 * 1000, // 2 hours
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

exports.register = async (req, res) => {
  // Check for validation errors first
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
      details: errors
        .array()
        .map((err) => err.msg)
        .join(", "),
    });
  }

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

    // Send verification email with user details
    await sendVerificationEmail(user.email, token, user);

    res.json({
      success: true,
      message: "Registration successful",
      details: "Please check your email for verification.",
    });
  } catch (error) {
    // Check if it's a mongoose validation error
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
        validationErrors: error.errors,
      });
    }

    // Check if it's a duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Registration failed",
        details: "Email or username already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed",
      details: "An unexpected error occurred. Please try again later.",
      errorType: error.name,
      errorMessage: error.message,
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

    // Store refresh token hash in user document and increment login count
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date();
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
          // Get parent events AND non-weekly child events (exclude weekly child events)
          const events = await Event.find({
            brand: brand._id,
            $or: [
              { parentEventId: { $exists: false } },  // Parent events
              { parentEventId: { $exists: true }, isWeekly: { $ne: true } }  // Non-weekly child events
            ]
          })
            .select("-__v")
            .populate("genres")
            .populate("coHosts", "name username logo")
            .populate("lineups")
            .lean();

          // Get weekly child events separately (for backward compatibility with existing logic)
          const weeklyEventIds = events
            .filter((e) => e.isWeekly && !e.parentEventId) // Only weekly parent events
            .map((e) => e._id);

          let weeklyChildEvents = [];
          if (weeklyEventIds.length > 0) {
            weeklyChildEvents = await Event.find({
              parentEventId: { $in: weeklyEventIds },
              isWeekly: true
            })
              .select("-__v")
              .populate("genres")
              .populate("coHosts", "name username logo")
              .populate("lineups")
              .lean();
          }

          // Combine all events (main events + weekly child events)
          const allBrandEvents = [...events, ...weeklyChildEvents];

          // STEP 4: Fetch code settings for each event
          // This now includes brand-level codes (eventId: null, isGlobalForBrand: true)
          await Promise.all(
            allBrandEvents.map(async (event) => {
              try {
                // For child events, use parent event ID for code settings
                const effectiveEventId = event.parentEventId || event._id;

                // Fetch code settings: both brand-level global codes AND event-specific codes
                // IMPORTANT: Only fetch NEW codes (have brandId AND createdBy set)
                const codeSettings = await CodeSetting.find({
                  brandId: brand._id,  // Required for all codes
                  createdBy: { $type: "objectId" },  // Only NEW codes (filters out legacy)
                  $or: [
                    // Brand-level global codes (apply to all events in brand)
                    { eventId: null, isGlobalForBrand: true },
                    // Event-specific codes
                    { eventId: effectiveEventId },
                  ],
                }).lean();

                // Merge codes: event-level overrides brand-level by name
                const codesByName = new Map();
                for (const code of codeSettings) {
                  const name = code.name;
                  const existingCode = codesByName.get(name);
                  // If no existing code, or this is event-level (overrides brand-level)
                  if (!existingCode || code.eventId) {
                    codesByName.set(name, code);
                  }
                }
                const mergedCodeSettings = Array.from(codesByName.values());

                // Add event to collection with brand reference
                allEvents.push({
                  ...event,
                  brand: brand._id.toString(),
                });

                // Add code settings to collection with event reference
                mergedCodeSettings.forEach((setting) => {
                  allCodeSettings.push({
                    ...setting,
                    eventId: event._id.toString(),
                    // Flag to indicate if inherited from brand
                    isInherited: setting.eventId === null,
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

    // STEP 6: Fetch co-hosted events for all user's brands
    const allCoHostedEvents = [];
    await Promise.all(
      userBrands.map(async (brand) => {
        try {
          // Find user's role in this brand (same logic as in co-host controller)
          let userRoleInBrand = null;

          // Check if user is the owner
          if (brand.owner && brand.owner.toString() === user._id.toString()) {
            const founderRole = await Role.findOne({
              brandId: brand._id,
              isFounder: true,
            }).lean();
            userRoleInBrand = founderRole;
          } else if (brand.team && Array.isArray(brand.team)) {
            // Find user in team
            const teamMember = brand.team.find(
              (m) => m.user && m.user.toString() === user._id.toString()
            );
            if (teamMember && teamMember.role) {
              userRoleInBrand = allRoles.find(
                (r) => r._id.toString() === teamMember.role.toString()
              );
            }
          }

          if (!userRoleInBrand) return;

          // Find ALL events where this brand is a co-host (parent AND child)
          const coHostedEvents = await Event.find({
            coHosts: brand._id,
          })
            .populate("brand", "name username logo colors")
            .populate("coHosts", "name username logo")
            .populate("user", "username firstName lastName avatar")
            .populate("lineups")
            .populate("genres")
            .lean();

          // Group events by host brand to get global permissions ONCE per relationship
          const eventsByHostBrand = new Map();

          for (const event of coHostedEvents) {
            const hostBrandId = (event.brand._id || event.brand).toString();

            if (!eventsByHostBrand.has(hostBrandId)) {
              // First event for this host brand - fetch global permissions from CoHostRelationship
              const relationship = await CoHostRelationship.findOne({
                hostBrand: hostBrandId,
                coHostBrand: brand._id,
                isActive: true
              }).lean();

              // Find permissions for user's role
              let effectivePermissions = null;
              if (relationship) {
                const userRoleIdStr = userRoleInBrand._id.toString();
                const rolePermission = relationship.rolePermissions?.find(
                  (rp) => {
                    const rpRoleIdStr = rp.roleId?.toString?.() || String(rp.roleId);
                    return rpRoleIdStr === userRoleIdStr;
                  }
                );

                if (rolePermission?.permissions) {
                  effectivePermissions = rolePermission.permissions;
                }
              }

              // Get host brand's code settings (brand-level codes)
              const hostBrandCodes = await CodeSetting.find({
                isEnabled: true,
                createdBy: { $type: "objectId" },
                brandId: hostBrandId,
                eventId: null,
                isGlobalForBrand: true,
              }).lean();

              const codeSettings = hostBrandCodes.map(cs => ({
                _id: cs._id.toString(),
                name: cs.name,
                type: cs.type || 'custom',
                condition: cs.condition || '',
                note: cs.note || '',
                maxPax: cs.maxPax || 1,
                limit: cs.limit || 0,
                isEnabled: cs.isEnabled,
                color: cs.color || '#2196F3',
                icon: cs.icon || 'RiCodeLine',
                brandId: hostBrandId,
              }));

              // Normalize permissions with code settings for key remapping
              const normalizedPerms = effectivePermissions
                ? normalizePermissions(effectivePermissions, codeSettings)
                : null;

              eventsByHostBrand.set(hostBrandId, {
                hostBrand: {
                  _id: hostBrandId,
                  name: event.brand.name,
                  username: event.brand.username,
                  logo: event.brand.logo,
                  colors: event.brand.colors,
                },
                coHostBrand: {
                  _id: brand._id.toString(),
                  name: brand.name,
                },
                userRole: {
                  _id: userRoleInBrand._id,
                  name: userRoleInBrand.name,
                  isFounder: userRoleInBrand.isFounder,
                  permissions: userRoleInBrand.permissions,
                },
                permissions: normalizedPerms,
                codeSettings: codeSettings,
                events: [],
              });
            }

            // Add event to this host brand's list (without duplicating permissions)
            const relationship = eventsByHostBrand.get(hostBrandId);

            // Ensure required fields exist on event
            event.flyer = event.flyer || {};
            event.lineups = event.lineups || [];
            event.genres = event.genres || [];
            event.coHosts = event.coHosts || [];
            event.title = event.title || "";
            event.description = event.description || "";
            event.location = event.location || "";

            // Add minimal co-host reference (permissions come from relationship, not event)
            event.coHostBrand = relationship.coHostBrand;
            event.hostBrandId = hostBrandId;

            relationship.events.push(event);
          }

          // Add all relationships to the global list
          eventsByHostBrand.forEach((relationship) => {
            allCoHostedEvents.push(relationship);
          });
        } catch (error) {
          // Skip this brand if processing fails
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
      isDeveloper: user.isDeveloper,
      loginCount: user.loginCount,
      lastLogin: user.lastLogin,
      brands: userBrands,
      roles: {
        allRoles: allRoles,
        userRoles: userRoles,
      },
      events: allEvents,
      codeSettings: allCodeSettings,
      lineups: allLineUps,
      coHostedEvents: allCoHostedEvents,
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // LOGIN SUMMARY - Grouped console logs for debugging
    // ═══════════════════════════════════════════════════════════════════════════
    if (DEBUG_LOGIN) {
      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║                    LOGIN SUMMARY                              ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log(`👤 User: ${user.username} (${user.email})`);

      // GROUP 1: Own Brands
      console.log('\n📦 MY BRANDS:');
      userBrands.forEach(brand => {
        const roleId = userRoles[brand._id.toString()];
        const role = allRoles.find(r => r._id.toString() === roleId);
        const brandEvents = allEvents.filter(e => e.brand === brand._id.toString());

        console.log(`\n  ┌─ ${brand.name}`);
        console.log(`  │  Role: ${role?.name || 'None'} ${role?.isFounder ? '👑' : ''}`);
        console.log(`  │  Events: ${brandEvents.length}`);

        // Code settings for this brand (unique names)
        const brandCodes = allCodeSettings.filter(cs =>
          brandEvents.some(e => e._id.toString() === cs.eventId)
        );
        const uniqueCodes = [...new Set(brandCodes.map(c => c.name))];
        console.log(`  │  Codes: ${uniqueCodes.join(', ') || 'None'}`);

        // Permissions from role
        if (role?.permissions?.codes) {
          const codePerms = Object.entries(role.permissions.codes || {});
          if (codePerms.length > 0) {
            console.log(`  │  Code Permissions:`);
            codePerms.forEach(([codeName, perm]) => {
              if (perm) {
                const status = perm.generate ? '✅' : '❌';
                const limit = perm.unlimited ? '∞' : (perm.limit || 0);
                console.log(`  │    ${status} ${codeName}: limit ${limit}`);
              }
            });
          }
        }
        console.log(`  └─`);
      });

      // GROUP 2: Co-Host Relationships (one entry per host brand with global permissions)
      if (allCoHostedEvents.length > 0) {
        console.log('\n🤝 CO-HOST RELATIONSHIPS (Global Permissions):');

        // allCoHostedEvents is now an array of relationships, not individual events
        allCoHostedEvents.forEach((relationship) => {
          const hostBrandName = relationship.hostBrand?.name || 'Unknown Host';
          const coHostBrandName = relationship.coHostBrand?.name || 'Unknown';
          const myRole = relationship.userRole?.name || 'None';
          const perms = relationship.permissions;
          const eventCount = relationship.events?.length || 0;

          console.log(`\n  ┌─ ${hostBrandName} (${eventCount} event${eventCount > 1 ? 's' : ''})`);
          console.log(`  │  As: ${coHostBrandName} → Role: ${myRole}`);
          console.log(`  │  Host Codes: ${relationship.codeSettings?.map(c => c.name).join(', ') || 'None'}`);

          if (perms?.codes && Object.keys(perms.codes).length > 0) {
            console.log(`  │  My Permissions (Global):`);
            Object.entries(perms.codes).forEach(([codeId, perm]) => {
              const codeName = relationship.codeSettings?.find(c => (c._id?.toString?.() || c._id) === codeId)?.name || codeId;
              const status = perm.generate ? '✅' : '❌';
              const limit = perm.unlimited ? '∞' : (perm.limit || 0);
              console.log(`  │    ${status} ${codeName}: limit ${limit}`);
            });
          } else {
            console.log(`  │  My Permissions: None set`);
          }
          console.log(`  └─`);
        });
      }

      console.log('\n════════════════════════════════════════════════════════════════\n');
    }

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
    if (!user.refreshToken) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "No stored refresh token" });
    }

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

// Check username availability
exports.checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.params;

    // Validate username format
    if (!username || username.length < 3) {
      return res.status(400).json({
        available: false,
        message: "Username must be at least 3 characters long",
      });
    }

    // Check for invalid characters (only allow alphanumeric and underscore)
    const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validUsernameRegex.test(username)) {
      return res.status(400).json({
        available: false,
        message: "Username can only contain letters, numbers, and underscores",
      });
    }

    // Check if username exists (case-insensitive)
    const existingUser = await User.findOne({
      username: new RegExp(`^${username}$`, "i"),
    });

    if (existingUser) {
      return res.status(200).json({
        available: false,
        message: "Username is already taken",
      });
    }

    res.status(200).json({
      available: true,
      message: "Username is available",
    });
  } catch (error) {
    console.error("Username check error:", error);
    res.status(500).json({
      available: false,
      message: "Failed to check username availability",
    });
  }
};

// Resend verification email
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({
      email: new RegExp(`^${email}$`, "i"),
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message:
          "If your email is registered and unverified, you will receive a new verification email.",
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please login.",
      });
    }

    // Generate new verification token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, token, user);

      res.status(200).json({
        success: true,
        message: "Verification email has been sent. Please check your inbox.",
      });
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
};

// Update email for unverified users
exports.updateUnverifiedEmail = async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;

    if (!oldEmail || !newEmail) {
      return res.status(400).json({
        success: false,
        message: "Both old and new email addresses are required",
      });
    }

    // Validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Find user by old email
    const user = await User.findOne({
      email: new RegExp(`^${oldEmail}$`, "i"),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No unverified account found with this email",
      });
    }

    // Only allow email update for unverified users
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot update email for verified accounts. Please use account settings instead.",
      });
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({
      email: new RegExp(`^${newEmail}$`, "i"),
      _id: { $ne: user._id }, // Exclude current user
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
      });
    }

    // Update the email
    user.email = newEmail.toLowerCase();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email updated successfully",
      newEmail: user.email,
    });
  } catch (error) {
    console.error("Update email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update email. Please try again.",
    });
  }
};
