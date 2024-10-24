const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Handle both old and new token structures
    req.user = {
      _id: decoded._id || decoded.userId, // Accept either format
      email: decoded.email,
      username: decoded.username,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ msg: "Token is not valid" });
  }
};

module.exports = { authenticate };
