const jwt = require("jsonwebtoken");

exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

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
