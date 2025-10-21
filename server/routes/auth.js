const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { authenticate } = require("../middleware/authMiddleware");

const {
  register,
  login,
  verifyEmail,
  getUserData,
  refreshAccessToken,
  logout,
  syncToken,
  pingSession,
  forgotPassword,
  validateResetToken,
  resetPassword,
  checkUsernameAvailability,
  resendVerificationEmail,
  updateUnverifiedEmail,
} = require("../controllers/authController");

router.use((req, res, next) => {
  next();
});

// Refresh token route
router.post("/refresh-token", refreshAccessToken);

// Sync token from localStorage to cookies
router.post("/sync-token", syncToken);

// Check username availability
router.get("/check-username/:username", checkUsernameAvailability);

// Register route with validation
router.post(
  "/register",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  register
);

// Login route
router.post("/login", login);

// Verify email route
router.get("/verify-email/:token", verifyEmail);

// Resend verification email route
router.post("/resend-verification", resendVerificationEmail);

// Update email for unverified users
router.post("/update-unverified-email", updateUnverifiedEmail);

// Get user data route (protected)
router.get("/user", authenticate, getUserData);

// Logout route
router.post("/logout", logout);

// Add the ping route - this should be authenticated
router.get("/ping", authenticate, pingSession);

// Forgot password route
router.post("/forgot-password", forgotPassword);

// Validate reset token route
router.get("/validate-reset-token/:token", validateResetToken);

// Reset password route
router.post("/reset-password/:token", resetPassword);

module.exports = router;
