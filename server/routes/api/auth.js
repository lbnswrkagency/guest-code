const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { authenticate } = require("../../middleware/authMiddleware");

const {
  register,
  login,
  verifyEmail,
  getUserData,
  refreshAccessToken,
  logout,
} = require("../../controllers/authController");

// Middleware to log incoming requests
router.use((req, res, next) => {
  console.log(`Incoming request to ${req.path}`);
  console.log("Cookies:", req.cookies);
  next();
});

// Refresh token route
router.post("/refresh_token", refreshAccessToken);

// Register route
router.post(
  "/register",
  [
    check("email", "Email is required").isEmail(),
    check(
      "password",
      "Password is required and should be at least 6 characters long"
    ).isLength({ min: 6 }),
  ],
  register
);

// Email verification route
router.get("/verify/:token", verifyEmail);

// Login route
router.post(
  "/login",
  [
    check("identifier", "Identifier is required").notEmpty(),
    check("password", "Password is required").notEmpty(),
  ],
  (req, res, next) => {
    console.log("Login route request:", req.cookies);
    next();
  },
  login,
  (req, res, next) => {
    console.log("Login route response:", res.headers);
    next();
  }
);

// User data route
router.get("/user", authenticate, getUserData);

// Logout route
router.post("/logout", logout);

module.exports = router;
