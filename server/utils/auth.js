const jwt = require("jsonwebtoken");

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

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
