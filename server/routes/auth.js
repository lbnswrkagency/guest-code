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
} = require("../controllers/authController");

router.use((req, res, next) => {
  next();
});

// Refresh token route
router.post("/refresh-token", refreshAccessToken);

// Sync token from localStorage to cookies
router.post("/sync-token", syncToken);

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

// Get user data route (protected)
router.get("/user", authenticate, getUserData);

// Logout route
router.post("/logout", logout);

module.exports = router;
