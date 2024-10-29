const jwt = require("jsonwebtoken");
const chalk = require("chalk");

const authenticate = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Support both old and new token structures
    req.user = {
      _id: decoded._id || decoded.userId,
      email: decoded.email,
      username: decoded.username,
    };

    next();
  } catch (error) {
    console.error(chalk.red("Auth error:"), error.message);
    res.status(401).json({ msg: "Token is not valid" });
  }
};

module.exports = { authenticate };
