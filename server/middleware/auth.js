const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Fetch full user data from database
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Set both user and userId for backward compatibility
    req.user = user;
    req.user.userId = user._id;

    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
};

// New middleware for optional authentication
const optionalAuthenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Fetch full user data from database
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return next();
    }

    // Set both user and userId for backward compatibility
    req.user = user;
    req.user.userId = user._id;

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
};
