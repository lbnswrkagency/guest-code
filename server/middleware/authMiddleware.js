const jwt = require("jsonwebtoken");

exports.authenticate = async (req, res, next) => {
  try {
    console.log("[Auth Middleware] Request headers:", {
      authorization: req.headers.authorization,
      cookies: req.cookies,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    // Check for token in cookies first
    const accessToken = req.cookies.accessToken;

    // Also check for token in Authorization header as fallback
    const authHeader = req.headers.authorization;
    let headerToken = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      headerToken = authHeader.split(" ")[1];
      console.log(
        "[Auth Middleware] Found token in Authorization header:",
        headerToken.substring(0, 10) + "..."
      );
    }

    // Use cookie token first, then header token as fallback
    const tokenToUse = accessToken || headerToken;

    if (!tokenToUse) {
      console.log(
        "[Auth Middleware] No token found in cookies or Authorization header"
      );
      return res.status(401).json({ message: "No access token" });
    }

    console.log(
      "[Auth Middleware] Using token from:",
      accessToken ? "cookies" : "Authorization header"
    );

    try {
      const decoded = jwt.verify(tokenToUse, process.env.JWT_ACCESS_SECRET);
      console.log("[Auth Middleware] Token verified successfully:", {
        userId: decoded.userId,
        exp: decoded.exp,
        expiresIn: decoded.exp - Math.floor(Date.now() / 1000) + " seconds",
        decodedFull: decoded,
      });

      req.user = decoded;
      next();
    } catch (error) {
      console.log("[Auth Middleware] Token verification failed:", {
        error: error.name,
        message: error.message,
      });

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Optional: Middleware to verify refresh token
exports.verifyRefreshToken = async (req, res, next) => {
  try {
    console.log("[Refresh Token Middleware] Request cookies:", req.cookies);

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      console.log("[Refresh Token Middleware] No refresh token in cookies");
      return res.status(401).json({ message: "No refresh token" });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      console.log("[Refresh Token Middleware] Refresh token verified:", {
        userId: decoded.userId,
        exp: decoded.exp,
        expiresIn: decoded.exp - Math.floor(Date.now() / 1000) + " seconds",
      });

      req.user = decoded;
      next();
    } catch (error) {
      console.log(
        "[Refresh Token Middleware] Refresh token verification failed:",
        {
          error: error.name,
          message: error.message,
        }
      );

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  } catch (error) {
    console.error("[Refresh Token Middleware] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
