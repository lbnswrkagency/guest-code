const Code = require("../models/codesModel");
const Ticket = require("../models/ticketModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const CodeSetting = require("../models/codeSettingsModel");
const User = require("../models/userModel");
const TicketSettings = require("../models/ticketSettingsModel");

// Get analytics summary for a specific event
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const { eventId, brandId } = req.query;

    // Validate required parameters
    if (!eventId || !brandId) {
      return res.status(400).json({
        success: false,
        message: "Event ID and Brand ID are required",
      });
    }

    // Check if user has permission to view analytics for this brand
    const brand = await Brand.findOne({
      _id: brandId,
      $or: [{ owner: req.user.userId }, { "team.user": req.user.userId }],
    });

    if (!brand) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view analytics for this brand",
      });
    }

    // Verify event belongs to the brand
    const event = await Event.findOne({
      _id: eventId,
      brand: brandId,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not belong to this brand",
      });
    }

    // Fetch all code settings for this event
    const codeSettings = await CodeSetting.find({ eventId });

    // Get Guest Codes stats (always present)
    const guestCodes = await getCodesStats(eventId, "guest");

    // Get detailed Tickets stats by category
    const ticketStats = await getDetailedTicketStats(eventId);

    // Process custom code types from settings
    const customCodeTypes = [];
    const processedTypes = new Set(["guest"]); // Track already processed types

    // Process each code setting
    for (const setting of codeSettings) {
      try {
        // Skip if we've already processed this type or if it's a default type
        if (processedTypes.has(setting.name.toLowerCase())) continue;

        // Get stats for this code type
        const codeStats = await getCodesStats(eventId, setting.name);

        // Get host summaries for custom codes
        const hostSummaries = await getHostSummaries(eventId, setting.name);

        // Only add if there are any codes of this type
        if (codeStats.count > 0) {
          customCodeTypes.push({
            name: setting.name,
            stats: codeStats,
            hostSummaries,
          });

          // Mark as processed
          processedTypes.add(setting.name.toLowerCase());
        }
      } catch (error) {
        console.error(`Error processing code type ${setting.name}:`, error);
        // Continue with other code types even if one fails
        continue;
      }
    }

    // Calculate totals including detailed ticket stats
    let totalCapacity = guestCodes.generated + ticketStats.totalSold;
    let totalCheckedIn = guestCodes.checkedIn + ticketStats.totalCheckedIn;

    // Add custom code types to totals
    customCodeTypes.forEach((type) => {
      totalCapacity += type.stats.generated;
      totalCheckedIn += type.stats.checkedIn;
    });

    const totals = {
      capacity: totalCapacity,
      checkedIn: totalCheckedIn,
    };

    // Return the compiled stats
    res.status(200).json({
      success: true,
      guestCodes,
      tickets: ticketStats,
      customCodeTypes,
      totals,
      eventInfo: {
        title: event.title,
        date: event.startDate || event.date,
        location: event.location,
      },
    });
  } catch (error) {
    console.error("Error in getAnalyticsSummary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics data",
      error: error.message,
    });
  }
};

// Helper function to get code stats by type
async function getCodesStats(eventId, type) {
  try {
    // Handle case sensitivity and variations
    const codeType = type.toLowerCase();
    const typeQuery = new RegExp(`^${codeType}$`, "i");

    // Get all codes of the specified type for the event
    const codes = await Code.find({
      eventId,
      $or: [
        { type: typeQuery },
        { name: typeQuery },
        { "metadata.codeType": type },
        { "metadata.settingName": type },
      ],
    });

    let totalPax = 0;
    let totalPaxChecked = 0;

    // Sum up pax and paxChecked values
    codes.forEach((code) => {
      totalPax += code.maxPax || 0;
      totalPaxChecked += code.paxChecked || 0;
    });

    return {
      generated: totalPax,
      checkedIn: totalPaxChecked,
      count: codes.length,
      type: type,
    };
  } catch (error) {
    console.error(`Error getting ${type} code stats:`, error);
    return {
      generated: 0,
      checkedIn: 0,
      count: 0,
      type: type,
    };
  }
}

// Helper function to get host summaries
async function getHostSummaries(eventId, type) {
  try {
    // Get all codes for this type and event
    const codes = await Code.find({
      eventId,
      $or: [
        { type: type.toLowerCase() },
        { name: type },
        { "metadata.codeType": type },
        { "metadata.settingName": type },
      ],
    }).populate("createdBy", "username firstName lastName"); // Populate user data directly

    // Group codes by host
    const hostGroups = {};

    for (const code of codes) {
      const hostId = code.createdBy?._id || code.metadata?.hostInfo?.id;
      if (!hostId) continue;

      if (!hostGroups[hostId]) {
        // Use populated user data if available
        const hostData = code.createdBy || {};

        hostGroups[hostId] = {
          hostId,
          hostName:
            hostData.firstName && hostData.lastName
              ? `${hostData.firstName} ${hostData.lastName}`.trim()
              : hostData.username ||
                code.metadata?.hostInfo?.username ||
                "Unknown",
          totalPax: 0,
          totalCheckedIn: 0,
          codesGenerated: 0,
        };
      }

      hostGroups[hostId].totalPax += code.maxPax || 0;
      hostGroups[hostId].totalCheckedIn += code.paxChecked || 0;
      hostGroups[hostId].codesGenerated += 1;
    }

    // Convert to array and sort by totalPax descending
    return Object.values(hostGroups).sort((a, b) => b.totalPax - a.totalPax);
  } catch (error) {
    console.error(`Error getting host summaries for ${type}:`, error);
    return [];
  }
}

// Enhanced ticket stats function
async function getDetailedTicketStats(eventId) {
  try {
    // Get all ticket settings for this event
    const ticketSettings = await TicketSettings.find({ eventId });

    // Get all tickets for the event
    const tickets = await Ticket.find({ eventId });
    
    console.log(`Found ${tickets.length} tickets for event ${eventId}`);
    if (tickets.length > 0) {
      console.log('Sample ticket fields:', Object.keys(tickets[0].toObject()));
      console.log('Sample ticket:', JSON.stringify(tickets[0].toObject(), null, 2));
    }

    // Initialize summary object
    const summary = {
      totalSold: 0,
      totalCheckedIn: 0,
      totalRevenue: 0,
      categories: [],
    };

    // Determine common payment method
    // Default to the first ticket setting's payment method if available
    let commonPaymentMethod =
      ticketSettings.length > 0
        ? ticketSettings[0].paymentMethod || "online"
        : "online";

    // Set the payment method in the summary
    summary.paymentMethod = commonPaymentMethod;

    // Process each ticket setting
    for (const setting of ticketSettings) {
      console.log(`Processing setting: ${setting.name}`);
      
      // Filter tickets for this category - try multiple field matches
      const categoryTickets = tickets.filter(
        (ticket) => 
          ticket.ticketName === setting.name ||
          ticket.ticketType === setting.name ||
          ticket.ticketName === setting.type ||
          ticket.ticketType === setting.type
      );
      
      console.log(`Found ${categoryTickets.length} tickets for setting ${setting.name}`);

      // Calculate stats for this category
      const categorySold = categoryTickets.reduce(
        (sum, ticket) => sum + (ticket.pax || 0),
        0
      );
      const categoryCheckedIn = categoryTickets.reduce(
        (sum, ticket) => sum + (ticket.paxChecked || 0),
        0
      );
      const categoryRevenue = categoryTickets.reduce(
        (sum, ticket) => sum + ((ticket.price || 0) * (ticket.pax || 1)),
        0
      );

      // Add to category summaries (include even with 0 sales for completeness)
      if (categorySold > 0 || setting.isEnabled !== false) {
        summary.categories.push({
          name: setting.name,
          price: setting.price,
          color: setting.color || "#2196F3",
          // Include payment method from ticket settings
          paymentMethod: setting.paymentMethod || commonPaymentMethod,
          stats: {
            sold: categorySold,
            checkedIn: categoryCheckedIn,
            revenue: categoryRevenue,
            count: categoryTickets.length,
            maxTickets: setting.isLimited ? setting.maxTickets : null,
            remainingTickets: setting.isLimited
              ? Math.max(0, setting.maxTickets - setting.soldCount)
              : null,
            soldPercentage: setting.isLimited
              ? Math.min(
                  100,
                  Math.round((setting.soldCount / setting.maxTickets) * 100)
                )
              : null,
          },
        });

        // Add to totals
        summary.totalSold += categorySold;
        summary.totalCheckedIn += categoryCheckedIn;
        summary.totalRevenue += categoryRevenue;
      }
      
      // Always add to totals even if category wasn't added to array
      if (categorySold === 0 && (setting.isEnabled === false || !summary.categories.find(c => c.name === setting.name))) {
        // Still count tickets that exist but weren't added to categories
        summary.totalSold += categorySold;
        summary.totalCheckedIn += categoryCheckedIn;
        summary.totalRevenue += categoryRevenue;
      }
    }

    // Sort categories by number of tickets sold (descending)
    summary.categories.sort((a, b) => b.stats.sold - a.stats.sold);

    return summary;
  } catch (error) {
    console.error("Error getting detailed ticket stats:", error);
    return {
      totalSold: 0,
      totalCheckedIn: 0,
      totalRevenue: 0,
      categories: [],
      paymentMethod: "online", // Default fallback
    };
  }
}
