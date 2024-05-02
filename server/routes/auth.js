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
} = require("../controllers/authController");
router.use((req, res, next) => {
  next();
});

// Refresh token route
router.post("/refresh_token", refreshAccessToken);

// Register route (no validations here)
router.post("/register", register);

// Email verification route
router.get("/verify/:token", verifyEmail);

// Login route
router.post("/login", login);

// User data route
router.get("/user", authenticate, getUserData);

// Logout route
router.post("/logout", logout);

module.exports = router;
