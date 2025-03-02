const jwt = require("jsonwebtoken");

exports.authenticate = async (req, res, next) => {
  try {
    // Check for token in cookies first
    const accessToken = req.cookies.accessToken;

    // Also check for token in Authorization header as fallback
    const authHeader = req.headers.authorization;
    let headerToken = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      headerToken = authHeader.split(" ")[1];
    }

    // Use cookie token first, then header token as fallback
    const tokenToUse = accessToken || headerToken;

    if (!tokenToUse) {
      return res.status(401).json({ message: "No access token" });
    }

    try {
      const decoded = jwt.verify(tokenToUse, process.env.JWT_ACCESS_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Alias for authenticate middleware to maintain compatibility with existing code
exports.protect = exports.authenticate;

// Optional: Middleware to verify refresh token
exports.verifyRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
