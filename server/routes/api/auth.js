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
  login
);

// Add the new route for fetching user data
// authRoutes.js
router.get(
  "/user",
  (req, res, next) => {
    next();
  },
  authenticate,
  getUserData
);

router.post("/logout", logout);

module.exports = router;
