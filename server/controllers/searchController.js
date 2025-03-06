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
          // Get current date and time for proper comparison
          const now = new Date();
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);

          console.log("[SearchController] Events search using date filter:", {
            today: today.toISOString(),
            currentTime: now.toISOString(),
          });

          // Find events that are happening today or in the future
          results = await Event.find({
            $or: [
              { title: searchRegex },
              { subTitle: searchRegex },
              { description: searchRegex },
              { location: searchRegex },
            ],
            // Include events where date is today or in the future
            date: { $gte: today },
          })
            .select(
              "title subTitle description date startTime endTime location flyer link brand"
            )
            .populate("brand", "name username")
            .sort({ date: 1 })
            .limit(10)
            .lean();

          // Add debug info about found events
          console.log(
            "[SearchController] Events found:",
            results.map((event) => ({
              id: event._id,
              title: event.title,
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
            }))
          );

          results = results.map((event) => ({
            _id: event._id,
            name: event.title,
            date: event.date,
            avatar:
              event.flyer?.landscape?.thumbnail ||
              event.flyer?.portrait?.thumbnail ||
              event.flyer?.square?.thumbnail,
            location: event.location,
            startTime: event.startTime,
            endTime: event.endTime,
            username: event.link,
            brandUsername: event.brand?.username,
            brandName: event.brand?.name,
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
          // Get current date and time for proper comparison
          const now = new Date();
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);

          console.log("[SearchController] All search using date filter:", {
            today: today.toISOString(),
            currentTime: now.toISOString(),
          });

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
              $or: [
                { title: searchRegex },
                { subTitle: searchRegex },
                { description: searchRegex },
                { location: searchRegex },
              ],
              // Include events where date is today or in the future
              date: { $gte: today },
            })
              .select(
                "title subTitle description date startTime endTime location flyer link brand"
              )
              .populate("brand", "name username")
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
              name: event.title,
              date: event.date,
              avatar:
                event.flyer?.landscape?.thumbnail ||
                event.flyer?.portrait?.thumbnail ||
                event.flyer?.square?.thumbnail,
              location: event.location,
              startTime: event.startTime,
              endTime: event.endTime,
              username: event.link,
              brandUsername: event.brand?.username,
              brandName: event.brand?.name,
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
      results: results.map((r) => ({
        id: r._id,
        name: r.name,
        type: r.type,
        date: r.date ? new Date(r.date).toISOString() : null,
      })),
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
