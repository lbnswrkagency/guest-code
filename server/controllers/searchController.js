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

          console.log("[SearchController] Events search using date filter:", {
            currentDateTime: now.toISOString(),
          });

          // Find events that are not in the past, considering endDate and endTime
          results = await Event.find({
            $or: [
              { title: searchRegex },
              { subTitle: searchRegex },
              { description: searchRegex },
              { location: searchRegex },
            ],
            // Only include events that are live or where isLive is not set (backward compatibility)
            $or: [{ isLive: true }, { isLive: { $exists: false } }],
          })
            .select(
              "title subTitle description date startDate endDate startTime endTime location flyer link brand"
            )
            .populate("brand", "name username")
            .sort({ date: 1 })
            .limit(25)
            .lean();

          // Post-processing to filter events that have already ended
          results = results.filter((event) => {
            // Determine the end date/time of the event
            let eventEndDate;

            // If event has an explicit endDate, use that
            if (event.endDate) {
              eventEndDate = new Date(event.endDate);

              // If it also has endTime, add that to the date
              if (event.endTime) {
                const [hours, minutes] = event.endTime.split(":").map(Number);
                eventEndDate.setHours(hours || 23);
                eventEndDate.setMinutes(minutes || 59);
              } else {
                // No end time specified, default to end of day
                eventEndDate.setHours(23, 59, 59);
              }
            }
            // No explicit endDate, use date/startDate as the event date
            else {
              const eventDate = event.startDate || event.date;
              if (!eventDate) return false; // No date information at all

              eventEndDate = new Date(eventDate);

              // If it has endTime, add that to the date, otherwise default to end of day
              if (event.endTime) {
                const [hours, minutes] = event.endTime.split(":").map(Number);
                eventEndDate.setHours(hours || 23);
                eventEndDate.setMinutes(minutes || 59);
              } else {
                // No end time specified, default to end of day
                eventEndDate.setHours(23, 59, 59);
              }
            }

            // Debug the date comparison
            console.log(
              `[SearchController] Event ${
                event.title
              } - end date: ${eventEndDate.toISOString()}, now: ${now.toISOString()}, is future: ${
                eventEndDate > now
              }`
            );

            // Keep the event if end date/time is in the future
            return eventEndDate > now;
          });

          // Sort by closest upcoming date
          results.sort((a, b) => {
            const dateA = a.startDate || a.date;
            const dateB = b.startDate || b.date;
            return new Date(dateA) - new Date(dateB);
          });

          // Limit to 10 after filtering
          results = results.slice(0, 10);

          // Add debug info about found events
          console.log(
            "[SearchController] Events found after filtering:",
            results.map((event) => ({
              id: event._id,
              title: event.title,
              date: event.date,
              startDate: event.startDate,
              endDate: event.endDate,
              startTime: event.startTime,
              endTime: event.endTime,
            }))
          );

          results = results.map((event) => ({
            _id: event._id,
            name: event.title,
            date: event.date,
            startDate: event.startDate,
            endDate: event.endDate,
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

          console.log("[SearchController] All search using date filter:", {
            currentDateTime: now.toISOString(),
          });

          const [brands, allEvents] = await Promise.all([
            // Brand search remains the same
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

            // Event search now gets more results and filters later
            Event.find({
              $or: [
                { title: searchRegex },
                { subTitle: searchRegex },
                { description: searchRegex },
                { location: searchRegex },
              ],
              // Only include events that are live or where isLive is not set (backward compatibility)
              $or: [{ isLive: true }, { isLive: { $exists: false } }],
            })
              .select(
                "title subTitle description date startDate endDate startTime endTime location flyer link brand"
              )
              .populate("brand", "name username")
              .sort({ date: 1 })
              .limit(25)
              .lean()
              .catch((err) => {
                console.error(
                  "[SearchController] Event search error in all:",
                  err
                );
                return [];
              }),
          ]);

          // Filter events using the same logic as above
          const events = allEvents
            .filter((event) => {
              // Determine the end date/time of the event
              let eventEndDate;

              // If event has an explicit endDate, use that
              if (event.endDate) {
                eventEndDate = new Date(event.endDate);

                // If it also has endTime, add that to the date
                if (event.endTime) {
                  const [hours, minutes] = event.endTime.split(":").map(Number);
                  eventEndDate.setHours(hours || 23);
                  eventEndDate.setMinutes(minutes || 59);
                } else {
                  // No end time specified, default to end of day
                  eventEndDate.setHours(23, 59, 59);
                }
              }
              // No explicit endDate, use date/startDate as the event date
              else {
                const eventDate = event.startDate || event.date;
                if (!eventDate) return false; // No date information at all

                eventEndDate = new Date(eventDate);

                // If it has endTime, add that to the date, otherwise default to end of day
                if (event.endTime) {
                  const [hours, minutes] = event.endTime.split(":").map(Number);
                  eventEndDate.setHours(hours || 23);
                  eventEndDate.setMinutes(minutes || 59);
                } else {
                  // No end time specified, default to end of day
                  eventEndDate.setHours(23, 59, 59);
                }
              }

              // Keep the event if end date/time is in the future
              return eventEndDate > now;
            })
            // Sort by date and limit to 5
            .sort((a, b) => {
              const dateA = a.startDate || a.date;
              const dateB = b.startDate || b.date;
              return new Date(dateA) - new Date(dateB);
            })
            .slice(0, 5);

          results = [
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
              startDate: event.startDate,
              endDate: event.endDate,
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

          // Debug info about found events
          console.log(
            "[SearchController] Events found after filtering in 'all' search:",
            events.map((event) => ({
              id: event._id,
              title: event.title,
              date: event.date,
              endDate: event.endDate,
              endTime: event.endTime,
            }))
          );
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
        startDate: r.startDate ? new Date(r.startDate).toISOString() : null,
        endDate: r.endDate ? new Date(r.endDate).toISOString() : null,
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
