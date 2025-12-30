const Code = require("../models/codesModel");
const Ticket = require("../models/ticketModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const CodeSetting = require("../models/codeSettingsModel");
const User = require("../models/userModel");
const TicketSettings = require("../models/ticketSettingsModel");
const BattleSign = require("../models/battleSignModel");
const BattleCode = require("../models/battleModel");

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

    // First get the event to check co-hosts
    let event = await Event.findOne({
      _id: eventId,
      brand: brandId,
    });

    if (!event) {
      // Check if this is a co-hosted event (event belongs to different brand but user's brand is co-host)
      const coHostedEvent = await Event.findOne({
        _id: eventId,
        coHosts: { $in: [brandId] },
      });

      if (!coHostedEvent) {
        return res.status(404).json({
          success: false,
          message: "Event not found or does not belong to this brand",
        });
      }

      // Use the co-hosted event for further processing
      event = coHostedEvent;
    }

    // Check if user has permission to view analytics for this brand
    const brand = await Brand.findOne({
      _id: brandId,
      $or: [{ owner: req.user.userId }, { "team.user": req.user.userId }],
    });

    // If user is not a member of the main brand, check co-host permissions
    let hasCoHostPermission = false;
    if (!brand) {
      // Check if this event has co-hosts and if user's brand is a co-host
      if (event.coHosts && event.coHosts.length > 0) {
        // Find all brands where the user is a team member or owner
        const userBrands = await Brand.find({
          $or: [{ owner: req.user.userId }, { "team.user": req.user.userId }],
        });

        // Check if any of the user's brands are co-hosts for this event
        for (const userBrand of userBrands) {
          const isCoHost = event.coHosts.some(
            (coHostId) => coHostId.toString() === userBrand._id.toString()
          );

          if (isCoHost) {
            // Check co-host permissions for this brand/role combination
            const coHostPermissions = event.coHostRolePermissions || [];
            const brandPermissions = coHostPermissions.find(
              (cp) => cp.brandId.toString() === userBrand._id.toString()
            );

            if (brandPermissions) {
              // Find the user's role in this co-host brand
              const userRoleInCoHostBrand = userBrand.team?.find(
                (member) =>
                  member.user.toString() === req.user.userId.toString()
              )?.role;

              // Check if user is owner of co-host brand
              const isCoHostBrandOwner =
                userBrand.owner &&
                userBrand.owner.toString() === req.user.userId.toString();

              if (userRoleInCoHostBrand || isCoHostBrandOwner) {
                // Find permissions for this specific role (or use owner permissions)
                let rolePermission;
                if (isCoHostBrandOwner) {
                  // Owners get the permissions of any admin role
                  rolePermission = brandPermissions.rolePermissions.find(
                    (rp) => {
                      // Find a role with analytics permissions (checking for analytics.access)
                      return (
                        rp.permissions &&
                        rp.permissions.analytics &&
                        rp.permissions.analytics.access === true
                      );
                    }
                  );
                } else {
                  rolePermission = brandPermissions.rolePermissions.find(
                    (rp) =>
                      rp.roleId.toString() === userRoleInCoHostBrand.toString()
                  );
                }

                if (
                  rolePermission &&
                  rolePermission.permissions &&
                  rolePermission.permissions.analytics
                ) {
                  // Check both 'access' and 'view' for analytics permissions
                  hasCoHostPermission =
                    rolePermission.permissions.analytics.access === true ||
                    rolePermission.permissions.analytics.view === true;

                  if (hasCoHostPermission) {
                    break; // Found permission, no need to check other brands
                  }
                }
              }
            }
          }
        }
      }
    }

    if (!brand && !hasCoHostPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view analytics for this brand",
      });
    }

    // Fetch all code settings for this event
    // For child events (weekly occurrences), use parent event's codeSettings
    const effectiveEventId = event.parentEventId || eventId;
    const codeSettings = await CodeSetting.find({ eventId: effectiveEventId });

    // Get Guest Codes stats (always present)
    const guestCodes = await getCodesStats(eventId, "guest");

    // Get detailed Tickets stats by category
    const ticketStats = await getDetailedTicketStats(eventId);

    // Get battle analytics if battle is enabled for this event
    let battleAnalytics = null;
    if (event.battleConfig && event.battleConfig.isEnabled) {
      battleAnalytics = await getBattleAnalytics(eventId);
    }

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

    // Add battle participants to totals if battle is enabled
    if (battleAnalytics) {
      totalCapacity += battleAnalytics.totalParticipants;
      totalCheckedIn += battleAnalytics.totalCheckedIn;
    }

    const totals = {
      capacity: totalCapacity,
      checkedIn: totalCheckedIn,
    };

    // Return the compiled stats
    const response = {
      success: true,
      guestCodes,
      tickets: ticketStats,
      customCodeTypes,
      totals,
      eventInfo: {
        title: event.title,
        date: event.startDate,
        location: event.location,
      },
    };

    // Include battle analytics if enabled
    if (battleAnalytics) {
      response.battle = battleAnalytics;
    }

    res.status(200).json(response);
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
    
    console.log(`[Analytics] Found ${ticketSettings.length} ticket settings for event ${eventId}`);
    if (ticketSettings.length > 0) {
      console.log("[Analytics] Ticket settings names:", ticketSettings.map(s => s.name));
    }

    // Get all tickets for the event
    const tickets = await Ticket.find({ eventId });

    console.log(`[Analytics] Found ${tickets.length} tickets for event ${eventId}`);
    if (tickets.length > 0) {
      console.log("[Analytics] Sample ticket:", {
        ticketName: tickets[0].ticketName,
        ticketType: tickets[0].ticketType,
        pax: tickets[0].pax,
        paxChecked: tickets[0].paxChecked
      });
      console.log("[Analytics] Unique ticket names:", [...new Set(tickets.map(t => t.ticketName))]);
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

    // If we have tickets but no ticket settings, create virtual settings from tickets
    if (ticketSettings.length === 0 && tickets.length > 0) {
      console.log("[Analytics] No ticket settings found, creating virtual settings from tickets");
      
      // Group tickets by ticketName to create virtual settings
      const ticketGroups = {};
      tickets.forEach(ticket => {
        const key = ticket.ticketName || ticket.ticketType || 'Unknown';
        if (!ticketGroups[key]) {
          ticketGroups[key] = {
            name: key,
            price: ticket.price,
            tickets: []
          };
        }
        ticketGroups[key].tickets.push(ticket);
      });

      // Process each virtual ticket group
      for (const [ticketName, group] of Object.entries(ticketGroups)) {
        const categorySold = group.tickets.reduce((sum, ticket) => sum + (ticket.pax || 0), 0);
        const categoryCheckedIn = group.tickets.reduce((sum, ticket) => sum + (ticket.paxChecked || 0), 0);
        const categoryRevenue = group.tickets.reduce((sum, ticket) => sum + (ticket.price || 0) * (ticket.pax || 1), 0);

        summary.categories.push({
          name: ticketName,
          price: group.price,
          color: "#2196F3", // Default color
          paymentMethod: group.tickets[0].paymentMethod || "online",
          stats: {
            sold: categorySold,
            checkedIn: categoryCheckedIn,
            revenue: categoryRevenue,
            count: group.tickets.length
          }
        });

        // Add to totals
        summary.totalSold += categorySold;
        summary.totalCheckedIn += categoryCheckedIn;
        summary.totalRevenue += categoryRevenue;
      }
    }

    // Process each ticket setting
    for (const setting of ticketSettings) {
      // Filter tickets for this category - try multiple field matches
      const categoryTickets = tickets.filter(
        (ticket) =>
          ticket.ticketName === setting.name ||
          ticket.ticketType === setting.name ||
          ticket.ticketName === setting.type ||
          ticket.ticketType === setting.type
      );

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
        (sum, ticket) => sum + (ticket.price || 0) * (ticket.pax || 1),
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
      if (
        categorySold === 0 &&
        (setting.isEnabled === false ||
          !summary.categories.find((c) => c.name === setting.name))
      ) {
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

// Helper function to get battle analytics
async function getBattleAnalytics(eventId) {
  try {
    // Get all battle signups for this event
    const battleSignups = await BattleSign.find({ event: eventId });

    // Get all battle codes for this event (for check-ins)
    const battleCodes = await BattleCode.find({ event: eventId });

    // Group by categories and calculate stats
    const categoryStats = {};
    let totalParticipants = 0;
    let totalCheckedIn = 0;

    // Process battle signups
    battleSignups.forEach((signup) => {
      const participantCount =
        1 + (signup.participants ? signup.participants.length : 0);
      totalParticipants += participantCount;

      signup.categories.forEach((category) => {
        if (!categoryStats[category]) {
          categoryStats[category] = {
            name: category,
            pending: 0,
            confirmed: 0,
            declined: 0,
            total: 0,
            participants: 0,
            checkedIn: 0,
            signups: [],
          };
        }

        categoryStats[category][signup.status] += 1;
        categoryStats[category].total += 1;
        categoryStats[category].participants += participantCount;

        // Add signup details to the category
        categoryStats[category].signups.push({
          _id: signup._id,
          name: signup.name,
          email: signup.email,
          phone: signup.phone,
          instagram: signup.instagram,
          status: signup.status,
          participants: signup.participants || [],
          participantCount: participantCount,
          checkedIn: 0, // Will be updated when processing battle codes
          createdAt: signup.createdAt,
        });
      });
    });

    // Process battle codes to get check-in stats
    battleCodes.forEach((code) => {
      const checkedInCount = code.paxChecked || 0;
      totalCheckedIn += checkedInCount;

      code.categories.forEach((category) => {
        if (categoryStats[category]) {
          categoryStats[category].checkedIn += checkedInCount;

          // Find the corresponding signup by email or battleSignId and update check-in count
          const correspondingSignup = categoryStats[category].signups.find(
            (signup) =>
              signup.email === code.email ||
              signup._id.toString() === code.battleSignId?.toString()
          );

          if (correspondingSignup) {
            correspondingSignup.checkedIn = checkedInCount;
          }
        }
      });
    });

    // Calculate status distribution
    const statusDistribution = {
      pending: battleSignups.filter((s) => s.status === "pending").length,
      confirmed: battleSignups.filter((s) => s.status === "confirmed").length,
      declined: battleSignups.filter((s) => s.status === "declined").length,
    };

    return {
      totalSignups: battleSignups.length,
      totalParticipants,
      totalCheckedIn,
      statusDistribution,
      categories: Object.values(categoryStats),
    };
  } catch (error) {
    console.error("Error getting battle analytics:", error);
    return {
      totalSignups: 0,
      totalParticipants: 0,
      totalCheckedIn: 0,
      statusDistribution: { pending: 0, confirmed: 0, declined: 0 },
      categories: [],
    };
  }
}
