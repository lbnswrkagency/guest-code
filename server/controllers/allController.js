const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const CodeSettings = require("../models/codeSettingsModel");
const TicketSettings = require("../models/ticketSettingsModel");
const TableCode = require("../models/TableCode");
const LineUp = require("../models/lineupModel");
const Genre = require("../models/genreModel");

/**
 * OPTIMIZED: Get all data needed for UpcomingEvent component in one request
 * Smart filtering and efficient queries for maximum performance
 */
exports.getUpcomingEventData = async (req, res) => {
  try {
    const { brandId, brandUsername, limit = 10 } = req.query;
    const now = new Date();
    
    console.log("🚀 [AllController] OPTIMIZED comprehensive data fetch", {
      brandId,
      brandUsername,
      limit,
      hasAuth: !!req.user
    });

    // Step 1: Smart Brand + Events Query with pre-filtering
    let brand;
    let targetBrandId;

    if (brandId) {
      targetBrandId = brandId;
      brand = await Brand.findById(brandId).select('name username logo description colors').lean();
    } else if (brandUsername) {
      const cleanUsername = brandUsername.replace(/^@/, "");
      brand = await Brand.findOne({ username: cleanUsername }).select('name username logo description colors').lean();
      targetBrandId = brand?._id;
    }

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found"
      });
    }

    console.log("✅ [AllController] Brand found:", brand.username);

    // Step 2: SIMPLIFIED EVENT QUERY - Get all events for brand, filter logic will be in JavaScript
    console.log("🔍 [AllController] Executing simplified event query...");

    // Get all parent events for the brand (we'll filter in JavaScript for better control)
    const parentEvents = await Event.find({
      brand: targetBrandId,
      parentEventId: { $exists: false }
    })
    .sort({ startDate: 1, date: 1 })
    .limit(parseInt(limit))
    .select('title subTitle description startDate endDate date startTime endTime isWeekly isLive user lineups genres location brand parentEventId weekNumber flyer street postalCode city music ticketsAvailable codeSettings tableLayout')
    .populate("user", "username firstName lastName avatar")
    .populate("lineups", "name avatar category subtitle events isActive sortOrder description socialLinks")
    .populate("genres", "name description color")
    .lean();

    console.log("✅ [AllController] Found", parentEvents.length, "parent events");
    
    // Debug: Show sample of parent events
    if (parentEvents.length > 0) {
      console.log("🔍 [AllController] Sample parent event:", {
        title: parentEvents[0].title,
        isLive: parentEvents[0].isLive,
        startDate: parentEvents[0].startDate,
        date: parentEvents[0].date,
        tableLayout: parentEvents[0].tableLayout,
        hasFlyer: !!parentEvents[0].flyer
      });
    }

    // Step 3: Smart child events fetching (only for relevant weekly parents)
    let allEvents = [...parentEvents];
    
    const weeklyParents = parentEvents.filter(event => event.isWeekly);
    if (weeklyParents.length > 0) {
      console.log("🔍 [AllController] Fetching children for", weeklyParents.length, "weekly parents");
      
      const childEvents = await Event.find({
        parentEventId: { $in: weeklyParents.map(p => p._id) }
      })
      .select('title subTitle description startDate endDate date startTime endTime isWeekly isLive user lineups genres location brand parentEventId weekNumber flyer street postalCode city music ticketsAvailable codeSettings tableLayout')
      .populate("user", "username firstName lastName avatar")
      .populate("lineups", "name avatar category subtitle events isActive sortOrder description socialLinks")
      .populate("genres", "name description color")
      .lean();
      
      console.log("✅ [AllController] Found", childEvents.length, "relevant child events");
      allEvents = [...allEvents, ...childEvents];
    }

    // Step 4: Quick event processing (minimal calculations since we pre-filtered)
    const processedEvents = allEvents.map((event) => {
      const startDate = event.startDate ? new Date(event.startDate) : new Date(event.date);
      
      let endDate;
      if (event.endDate) {
        endDate = new Date(event.endDate);
      } else if (event.endTime) {
        endDate = new Date(startDate);
        const [hours, minutes] = event.endTime.split(":").map(Number);
        endDate.setHours(hours, minutes, 0, 0);
        
        if (event.startTime) {
          const [startHours, startMinutes] = event.startTime.split(":").map(Number);
          if (hours < startHours || (hours === startHours && minutes < startMinutes)) {
            endDate.setDate(endDate.getDate() + 1);
          }
        }
      } else {
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      }

      if (event.startTime) {
        const [startHours, startMinutes] = event.startTime.split(":").map(Number);
        startDate.setHours(startHours, startMinutes || 0, 0);
      }

      let status;
      if (now >= startDate && now <= endDate) {
        status = "active";
      } else if (now < startDate) {
        status = "upcoming";
      } else {
        status = "past";
      }

      return {
        ...event,
        calculatedStartDate: startDate,
        calculatedEndDate: endDate,
        status,
      };
    });

    // Step 5: Filter for relevant events (active and upcoming, and only live events)
    const relevantEvents = processedEvents.filter((event) => {
      // First, check if event is live - only show events that are set to live
      if (!event.isLive) {
        return false;
      }

      // For weekly events, handle them differently
      if (event.isWeekly) {
        if (event.weekNumber === 0 || !event.weekNumber) {
          // For parent events, always show if active or upcoming
          return event.status === "active" || event.status === "upcoming";
        }
      }

      // For regular events or weekly child events
      return event.status === "active" || event.status === "upcoming";
    });

    console.log("✅ [AllController] Filtered to", relevantEvents.length, "relevant events");
    
    // Debug: Show filtering details
    if (processedEvents.length > 0) {
      console.log("🔍 [AllController] Filtering breakdown:");
      console.log("  - Total processed:", processedEvents.length);
      console.log("  - Live events:", processedEvents.filter(e => e.isLive).length);
      console.log("  - Active/upcoming:", processedEvents.filter(e => e.status === "active" || e.status === "upcoming").length);
      console.log("  - Final relevant:", relevantEvents.length);
      
      if (relevantEvents.length > 0) {
        console.log("🔍 [AllController] Sample relevant event:", {
          title: relevantEvents[0].title,
          status: relevantEvents[0].status,
          isLive: relevantEvents[0].isLive,
          tableLayout: relevantEvents[0].tableLayout,
          calculatedStartDate: relevantEvents[0].calculatedStartDate,
          hasCompleteData: !!(relevantEvents[0].title && relevantEvents[0].flyer && relevantEvents[0].tableLayout)
        });
      }
    }

    // Step 6: Final sort (most should already be in good order)
    const sortedEvents = relevantEvents.sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "active") return -1;
        if (b.status === "active") return 1;
      }
      return a.calculatedStartDate - b.calculatedStartDate;
    });

    console.log("✅ [AllController] Processed", sortedEvents.length, "final events");

    if (sortedEvents.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          brand,
          events: [],
          ticketSettings: {},
          codeSettings: {},
          tableData: {},
          totalEvents: 0
        }
      });
    }

    // Step 7: BULK fetch related data (only for final relevant events)
    const eventIds = sortedEvents.map(event => event._id);
    const allEventIds = [...eventIds]; // Include parent IDs for inheritance
    
    // Add parent IDs for inheritance lookup
    sortedEvents.forEach(event => {
      if (event.parentEventId && !allEventIds.includes(event.parentEventId)) {
        allEventIds.push(event.parentEventId);
      }
    });

    console.log("🔍 [AllController] Bulk fetching data for", eventIds.length, "events (+", allEventIds.length - eventIds.length, "parents)");

    const [ticketSettingsArray, codeSettingsArray, tableDataArray] = await Promise.all([
      TicketSettings.find({ eventId: { $in: allEventIds } }).lean(),
      CodeSettings.find({ eventId: { $in: allEventIds } }).lean(), // Gets all fields by default
      TableCode.find({ event: { $in: allEventIds } }).lean() // Gets all fields by default
    ]);

    console.log("✅ [AllController] Found", ticketSettingsArray.length, "tickets,", codeSettingsArray.length, "codes,", tableDataArray.length, "tables");
    
    // Debug: Show sample data structures
    if (codeSettingsArray.length > 0) {
      console.log("🔍 [AllController] Sample code setting:", {
        type: codeSettingsArray[0].type,
        condition: codeSettingsArray[0].condition,
        maxPax: codeSettingsArray[0].maxPax,
        isEnabled: codeSettingsArray[0].isEnabled,
        hasAllFields: Object.keys(codeSettingsArray[0])
      });
    }
    
    if (tableDataArray.length > 0) {
      console.log("🔍 [AllController] Sample table data:", {
        tableNumber: tableDataArray[0].tableNumber,
        status: tableDataArray[0].status,
        pax: tableDataArray[0].pax,
        hasAllFields: Object.keys(tableDataArray[0])
      });
    }

    // Step 8: SMART data organization with inheritance handling
    const ticketSettingsByEvent = {};
    const codeSettingsByEvent = {};
    const tableDataByEvent = {};

    // Use reduce for better performance than forEach
    ticketSettingsArray.reduce((acc, setting) => {
      const eventId = setting.eventId;
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(setting);
      return acc;
    }, ticketSettingsByEvent);

    codeSettingsArray.reduce((acc, setting) => {
      const eventId = setting.eventId;
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(setting);
      return acc;
    }, codeSettingsByEvent);

    tableDataArray.reduce((acc, tableCode) => {
      const eventId = tableCode.event.toString();
      if (!acc[eventId]) acc[eventId] = [];
      acc[eventId].push(tableCode);
      return acc;
    }, tableDataByEvent);

    // Step 9: Handle inheritance for child events (smart inheritance)
    const finalTicketSettings = { ...ticketSettingsByEvent };
    const finalCodeSettings = { ...codeSettingsByEvent };
    const finalTableData = { ...tableDataByEvent };

    sortedEvents.forEach(event => {
      const eventId = event._id.toString();
      
      // Smart inheritance: only inherit if child event has no data
      if (event.parentEventId) {
        const parentId = event.parentEventId.toString();
        
        if (!finalTicketSettings[eventId] && ticketSettingsByEvent[parentId]) {
          finalTicketSettings[eventId] = ticketSettingsByEvent[parentId];
        }
        if (!finalCodeSettings[eventId] && codeSettingsByEvent[parentId]) {
          finalCodeSettings[eventId] = codeSettingsByEvent[parentId];
        }
        if (!finalTableData[eventId] && tableDataByEvent[parentId]) {
          finalTableData[eventId] = tableDataByEvent[parentId];
        }
      }
    });

    // Step 10: Format table data to match TableSystem expectations
    const formattedTableDataByEvent = Object.keys(finalTableData).reduce((acc, eventId) => {
      const tableCodes = finalTableData[eventId];
      // TableSystem expects { tableCounts: [], totalCount: 0 } format
      acc[eventId] = {
        tableCounts: tableCodes || [],
        totalCount: tableCodes ? tableCodes.length : 0
      };
      return acc;
    }, {});

    console.log("🎉 [AllController] OPTIMIZED compilation complete!");

    // Step 11: Return optimized response
    res.status(200).json({
      success: true,
      data: {
        brand,
        events: sortedEvents,
        ticketSettings: finalTicketSettings,
        codeSettings: finalCodeSettings,
        tableData: formattedTableDataByEvent,
        totalEvents: sortedEvents.length,
        metadata: {
          fetchTime: new Date().toISOString(),
          brandId: brand._id,
          brandUsername: brand.username,
          eventCount: sortedEvents.length,
          ticketSettingsCount: Object.keys(finalTicketSettings).length,
          codeSettingsCount: Object.keys(finalCodeSettings).length,
          tableDataCount: Object.keys(formattedTableDataByEvent).length,
          optimized: true,
          queryTime: req.startTime ? Date.now() - req.startTime : 0
        }
      }
    });

  } catch (error) {
    console.error("❌ [AllController] OPTIMIZED Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming event data",
      error: error.message
    });
  }
};