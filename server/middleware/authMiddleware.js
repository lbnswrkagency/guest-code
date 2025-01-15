const jwt = require("jsonwebtoken");

exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("[Auth:Middleware] Headers:", {
      hasAuthHeader: !!authHeader,
      headerValue: authHeader?.substring(0, 20) + "...",
    });

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log(
      "[Auth:Middleware] Using secret:",
      process.env.JWT_ACCESS_SECRET?.substring(0, 10) + "..."
    );

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    console.log("[Auth:Middleware] Token verified, payload:", {
      userId: decoded._id,
      email: decoded.email,
    });

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name !== "JsonWebTokenError") {
      console.error("[Auth:Middleware] Error:", {
        name: error.name,
        message: error.message,
      });
    }
    res.status(401).json({ message: "Authentication failed" });
  }
};
