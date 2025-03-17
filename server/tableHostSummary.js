require("dotenv").config();
const mongoose = require("mongoose");
const TableCode = require("./models/TableCode");

// Function to determine which event date a code belongs to
function getEventDateForCode(codeCreatedAt) {
  // Start date for the first event (Sunday October 27, 2024)
  const firstEventDate = new Date("2024-10-27T00:00:00.000Z");

  // The time we use for cutoffs is 6:00 AM on Monday after an event
  const codeDate = new Date(codeCreatedAt);

  // Calculate days since the first event
  const daysSinceFirstEvent = Math.floor(
    (codeDate - firstEventDate) / (24 * 60 * 60 * 1000)
  );

  // Find the nearest previous Sunday (event date)
  // Event cycle repeats every 7 days
  // We need to find which "week" this code falls into
  const weekNumber = Math.floor(daysSinceFirstEvent / 7);

  // Calculate the event date for this week (Sunday)
  const eventDate = new Date(firstEventDate);
  eventDate.setDate(firstEventDate.getDate() + weekNumber * 7);

  // Check if the code was created before Monday 6:00 AM
  // If so, it belongs to the previous event
  const dayOfWeek = codeDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const hours = codeDate.getUTCHours();

  // If it's Monday (1) and before 6:00 AM, or if it's Sunday (0),
  // this code belongs to this Sunday's event
  // Otherwise, it belongs to the next Sunday's event
  if ((dayOfWeek === 1 && hours < 6) || dayOfWeek === 0) {
    return eventDate;
  } else {
    // It's after Monday 6:00 AM, so it belongs to next Sunday's event
    const nextEventDate = new Date(eventDate);
    nextEventDate.setDate(eventDate.getDate() + 7);
    return nextEventDate;
  }
}

// Format date as DD.MM.YYYY
function formatDate(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

// Get the time period for an event (Monday 6AM to next Monday 6AM)
function getTimePeriodForEvent(eventDate) {
  const eventDay = new Date(eventDate);

  // Calculate the Monday after the event at 6:00 AM
  const mondayAfterEvent = new Date(eventDate);
  const daysUntilMonday = (1 - eventDay.getUTCDay() + 7) % 7; // 0 is Sunday, 1 is Monday
  mondayAfterEvent.setUTCDate(eventDay.getUTCDate() + daysUntilMonday);
  mondayAfterEvent.setUTCHours(6, 0, 0, 0);

  // Calculate the Monday before that (i.e., the week before) at 6:00 AM
  const mondayBeforeEvent = new Date(mondayAfterEvent);
  mondayBeforeEvent.setUTCDate(mondayAfterEvent.getUTCDate() - 7);

  return {
    from: formatDate(mondayBeforeEvent),
    to: formatDate(mondayAfterEvent),
  };
}

async function generateTableHostSummary() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Query all TableCodes with paxChecked > 0 (no date filter initially)
    const tableCodes = await TableCode.find({
      paxChecked: { $gt: 0 },
    }).lean();

    console.log(
      `Found ${tableCodes.length} TableCode entries with checked-in guests`
    );

    // Group by event date and then by host
    const eventSummary = {};

    tableCodes.forEach((code) => {
      // Determine which event this code belongs to
      const eventDate = getEventDateForCode(code.createdAt);
      const eventDateStr = formatDate(eventDate);
      const hostName = code.host;

      if (!eventSummary[eventDateStr]) {
        eventSummary[eventDateStr] = {};
      }

      if (!eventSummary[eventDateStr][hostName]) {
        eventSummary[eventDateStr][hostName] = {
          count: 0,
          totalCheckedIn: 0,
        };
      }

      eventSummary[eventDateStr][hostName].count += 1;
      eventSummary[eventDateStr][hostName].totalCheckedIn += code.paxChecked;
    });

    // Print the summary for each event date
    console.log("\n📊 TABLE HOST SUMMARY BY EVENT DATE 📊");

    // Sort event dates chronologically
    const sortedEventDates = Object.keys(eventSummary).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split(".");
      const [dayB, monthB, yearB] = b.split(".");
      // Compare as YYYY-MM-DD format
      return `${yearA}-${monthA}-${dayA}`.localeCompare(
        `${yearB}-${monthB}-${dayB}`
      );
    });

    for (const eventDateStr of sortedEventDates) {
      // Parse the event date to get the time period
      const [day, month, year] = eventDateStr.split(".");
      const eventDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      const period = getTimePeriodForEvent(eventDate);

      console.log("\n================================");
      console.log(`EVENT DATE: ${eventDateStr}`);
      console.log(`PERIOD: ${period.from} 06:00 - ${period.to} 06:00`);
      console.log("================================");

      const hosts = eventSummary[eventDateStr];

      // Sort hosts by number of tables in descending order
      const sortedHosts = Object.entries(hosts).sort(
        (a, b) => b[1].count - a[1].count
      );

      console.log(
        "Host Name | Tables with Check-ins | Total Guests Checked In"
      );
      console.log("---------|----------------------|----------------------");

      sortedHosts.forEach(([hostName, data]) => {
        console.log(
          `${hostName.padEnd(10)} | ${String(data.count).padEnd(22)} | ${
            data.totalCheckedIn
          }`
        );
      });

      // Calculate totals for this event
      const totalTables = sortedHosts.reduce(
        (sum, [_, data]) => sum + data.count,
        0
      );
      const totalGuests = sortedHosts.reduce(
        (sum, [_, data]) => sum + data.totalCheckedIn,
        0
      );

      console.log("---------|----------------------|----------------------");
      console.log(
        `TOTAL     | ${String(totalTables).padEnd(22)} | ${totalGuests}`
      );
    }

    // Print overall totals
    console.log("\n================================");
    console.log("OVERALL TOTALS");
    console.log("================================");

    const overallHostSummary = {};

    // Combine data across all events
    for (const eventDate in eventSummary) {
      const hosts = eventSummary[eventDate];

      for (const hostName in hosts) {
        if (!overallHostSummary[hostName]) {
          overallHostSummary[hostName] = {
            count: 0,
            totalCheckedIn: 0,
          };
        }

        overallHostSummary[hostName].count += hosts[hostName].count;
        overallHostSummary[hostName].totalCheckedIn +=
          hosts[hostName].totalCheckedIn;
      }
    }

    // Sort hosts by overall number of tables
    const sortedOverallHosts = Object.entries(overallHostSummary).sort(
      (a, b) => b[1].count - a[1].count
    );

    console.log("Host Name | Total Tables | Total Guests Checked In");
    console.log("---------|-------------|----------------------");

    sortedOverallHosts.forEach(([hostName, data]) => {
      console.log(
        `${hostName.padEnd(10)} | ${String(data.count).padEnd(13)} | ${
          data.totalCheckedIn
        }`
      );
    });

    const grandTotalTables = sortedOverallHosts.reduce(
      (sum, [_, data]) => sum + data.count,
      0
    );
    const grandTotalGuests = sortedOverallHosts.reduce(
      (sum, [_, data]) => sum + data.totalCheckedIn,
      0
    );

    console.log("---------|-------------|----------------------");
    console.log(
      `GRAND TOTAL | ${String(grandTotalTables).padEnd(
        11
      )} | ${grandTotalGuests}`
    );
    console.log("================================");
  } catch (err) {
    console.error("❌ Error generating table host summary:", err);
    console.error(err.stack);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the function
generateTableHostSummary();
