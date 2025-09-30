const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const mongoose = require("mongoose");

// Get upcoming public events
exports.getPublicEvents = async (req, res) => {
  try {
    const { limit = 20, offset = 0, category = null, location = null } = req.query;
    
    // Get current date
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Build query
    const query = {
      isPublic: { $ne: false }, // Events are public by default unless explicitly set to false
      isLive: true, // Only show live events
      parentEventId: { $exists: false }, // Only parent events, not weekly occurrences
      $or: [
        { startDate: { $gte: currentDate } },
        { date: { $gte: currentDate } }
      ]
    };

    // Add category filter if provided
    if (category && category !== 'all') {
      query['genres.name'] = category;
    }

    // Add location filter if provided
    if (location) {
      query.city = new RegExp(location, 'i');
    }

    // Fetch events with populated data
    const events = await Event.find(query)
      .populate({
        path: 'brand',
        select: 'name username logo colors description',
        match: { isActive: { $ne: false } } // Only include active brands
      })
      .populate({
        path: 'genres',
        select: 'name color'
      })
      .populate({
        path: 'lineups',
        select: 'name avatar category',
        options: { limit: 5 } // Limit lineups to reduce data size
      })
      .sort({ startDate: 1, date: 1 }) // Sort by start date ascending
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean(); // Use lean() for better performance

    // Filter out events without brands (in case brand was deleted)
    const validEvents = events.filter(event => event.brand !== null);

    // Get total count for pagination
    const totalCount = await Event.countDocuments(query);

    res.status(200).json({
      success: true,
      events: validEvents,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + validEvents.length
      }
    });
  } catch (error) {
    console.error("Error fetching public events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching events",
      error: error.message
    });
  }
};

// Get featured events (events from verified/featured brands)
exports.getFeaturedEvents = async (req, res) => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // First get featured/verified brands
    const featuredBrands = await Brand.find({
      $or: [
        { isVerified: true },
        { isFeatured: true }
      ],
      isActive: { $ne: false }
    }).select('_id');

    const featuredBrandIds = featuredBrands.map(brand => brand._id);

    // Get events from featured brands
    const featuredEvents = await Event.find({
      brand: { $in: featuredBrandIds },
      isPublic: { $ne: false },
      isLive: true,
      parentEventId: { $exists: false },
      $or: [
        { startDate: { $gte: currentDate } },
        { date: { $gte: currentDate } }
      ]
    })
    .populate({
      path: 'brand',
      select: 'name username logo colors isVerified isFeatured'
    })
    .populate({
      path: 'genres',
      select: 'name color'
    })
    .populate({
      path: 'lineups',
      select: 'name avatar category',
      options: { limit: 3 }
    })
    .sort({ startDate: 1, date: 1 })
    .limit(10)
    .lean();

    res.status(200).json({
      success: true,
      events: featuredEvents
    });
  } catch (error) {
    console.error("Error fetching featured events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching featured events",
      error: error.message
    });
  }
};

// Get events by city
exports.getEventsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const events = await Event.find({
      city: new RegExp(city, 'i'),
      isPublic: { $ne: false },
      isLive: true,
      parentEventId: { $exists: false },
      $or: [
        { startDate: { $gte: currentDate } },
        { date: { $gte: currentDate } }
      ]
    })
    .populate({
      path: 'brand',
      select: 'name username logo',
      match: { isActive: { $ne: false } }
    })
    .populate('genres', 'name')
    .sort({ startDate: 1, date: 1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .lean();

    const validEvents = events.filter(event => event.brand !== null);

    res.status(200).json({
      success: true,
      city,
      events: validEvents
    });
  } catch (error) {
    console.error("Error fetching events by city:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching events by city",
      error: error.message
    });
  }
};

// Get event categories (genres)
exports.getEventCategories = async (req, res) => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Get all unique genres from upcoming events
    const upcomingEvents = await Event.find({
      isPublic: { $ne: false },
      isLive: true,
      parentEventId: { $exists: false },
      $or: [
        { startDate: { $gte: currentDate } },
        { date: { $gte: currentDate } }
      ]
    })
    .populate('genres', 'name color')
    .select('genres')
    .lean();

    // Extract unique genres
    const genresMap = new Map();
    upcomingEvents.forEach(event => {
      if (event.genres && Array.isArray(event.genres)) {
        event.genres.forEach(genre => {
          if (genre && genre._id && genre.name) {
            genresMap.set(genre._id.toString(), {
              _id: genre._id,
              name: genre.name,
              color: genre.color
            });
          }
        });
      }
    });

    const categories = Array.from(genresMap.values());

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error("Error fetching event categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event categories",
      error: error.message
    });
  }
};

// Get cities with upcoming events
exports.getCitiesWithEvents = async (req, res) => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Aggregate to get unique cities with event counts
    const cities = await Event.aggregate([
      {
        $match: {
          isPublic: { $ne: false },
          isLive: true,
          parentEventId: { $exists: false },
          city: { $exists: true, $ne: "" },
          $or: [
            { startDate: { $gte: currentDate } },
            { date: { $gte: currentDate } }
          ]
        }
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          city: "$_id",
          eventCount: "$count",
          _id: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      cities
    });
  } catch (error) {
    console.error("Error fetching cities with events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cities",
      error: error.message
    });
  }
};