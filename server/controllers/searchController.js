const User = require("../models/User");

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json([]);
    }

    // Search users by username, email, firstName, or lastName
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
      ],
    })
      .select("username firstName lastName avatar email")
      .limit(10);

    return res.json(users);
  } catch (error) {
    console.error("[Search] User search error:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching users",
      error: error.message,
    });
  }
};
