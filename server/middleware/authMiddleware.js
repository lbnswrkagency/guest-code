const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    // Return 401 for any token verification error
    res.status(401).json({ msg: "Token is not valid" });
  }
};

module.exports = { authenticate };
