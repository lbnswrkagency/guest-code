const User = require("../models/User");
const Brand = require("../models/brandModel");
const Event = require("../models/eventsModel");

exports.search = async (req, res) => {
  try {
    const { q: query, type = "all" } = req.query;

    if (!query) {
      return res.json([]);
    }

    console.log("[SearchController] Searching:", {
      query,
      type,
      timestamp: new Date().toISOString(),
    });

    let results = [];
    const searchRegex = new RegExp(query, "i");

    switch (type) {
      // case "users":
      //   try {
      //     results = await User.find({
      //       $or: [
      //         { username: searchRegex },
      //         { email: searchRegex },
      //         { firstName: searchRegex },
      //         { lastName: searchRegex },
      //       ],
      //     })
      //       .select("username firstName lastName email avatar")
      //       .limit(10)
      //       .lean();

      //     results = results.map((user) => ({
      //       _id: user._id,
      //       name:
      //         user.firstName && user.lastName
      //           ? `${user.firstName} ${user.lastName}`
      //           : user.username,
      //       email: user.email,
      //       avatar: user.avatar,
      //       type: "user",
      //     }));
      //   } catch (error) {
      //     console.error("[SearchController] User search error:", error);
      //     results = [];
      //   }
      //   break;

      case "brands":
        try {
          results = await Brand.find({
            $or: [
              { name: searchRegex },
              { username: searchRegex },
              { description: searchRegex },
            ],
          })
            .select("name username description logo team")
            .limit(10)
            .lean();

          results = results.map((brand) => ({
            _id: brand._id,
            name: brand.name,
            username: brand.username,
            members: brand.team?.length || 0,
            avatar: brand.logo?.thumbnail,
            type: "brand",
          }));
        } catch (error) {
          console.error("[SearchController] Brand search error:", error);
          results = [];
        }
        break;

      case "events":
        try {
          results = await Event.find({
            $or: [{ name: searchRegex }, { description: searchRegex }],
            date: { $gte: new Date() },
          })
            .select("name description date coverImage location")
            .populate("location", "name")
            .sort({ date: 1 })
            .limit(10)
            .lean();

          results = results.map((event) => ({
            _id: event._id,
            name: event.name,
            date: event.date,
            avatar: event.coverImage?.thumbnail,
            location: event.location?.name || "No location",
            type: "event",
          }));
        } catch (error) {
          console.error("[SearchController] Event search error:", error);
          results = [];
        }
        break;

      case "all":
      default:
        try {
          const [brands, events] = await Promise.all([
            // User.find({
            //   $or: [
            //     { username: searchRegex },
            //     { email: searchRegex },
            //     { firstName: searchRegex },
            //     { lastName: searchRegex },
            //   ],
            // })
            //   .select("username firstName lastName email avatar")
            //   .limit(5)
            //   .lean()
            //   .catch((err) => {
            //     console.error("[SearchController] User search error in all:", err);
            //     return [];
            //   }),

            Brand.find({
              $or: [
                { name: searchRegex },
                { username: searchRegex },
                { description: searchRegex },
              ],
            })
              .select("name username description logo team")
              .limit(5)
              .lean()
              .catch((err) => {
                console.error(
                  "[SearchController] Brand search error in all:",
                  err
                );
                return [];
              }),

            Event.find({
              $or: [{ name: searchRegex }, { description: searchRegex }],
              date: { $gte: new Date() },
            })
              .select("name description date coverImage location")
              .populate("location", "name")
              .sort({ date: 1 })
              .limit(5)
              .lean()
              .catch((err) => {
                console.error(
                  "[SearchController] Event search error in all:",
                  err
                );
                return [];
              }),
          ]);

          results = [
            // ...users.map((user) => ({
            //   _id: user._id,
            //   name:
            //     user.firstName && user.lastName
            //       ? `${user.firstName} ${user.lastName}`
            //       : user.username,
            //   email: user.email,
            //   avatar: user.avatar,
            //   type: "user",
            // })),
            ...brands.map((brand) => ({
              _id: brand._id,
              name: brand.name,
              username: brand.username,
              members: brand.team?.length || 0,
              avatar: brand.logo?.thumbnail,
              type: "brand",
            })),
            ...events.map((event) => ({
              _id: event._id,
              name: event.name,
              date: event.date,
              avatar: event.coverImage?.thumbnail,
              location: event.location?.name || "No location",
              type: "event",
            })),
          ];
        } catch (error) {
          console.error("[SearchController] Combined search error:", error);
          results = [];
        }
        break;
    }

    console.log("[SearchController] Search results:", {
      count: results.length,
      type,
    });

    res.json(results);
  } catch (error) {
    console.error("[SearchController] Error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error performing search",
      error: error.message,
    });
  }
};
