require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("./models/eventsModel");

async function fixEventDates() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Find the parent Afro Spiti event
    const parentEventId = "67c9fd654bc504b8b07627e2";
    const parentEvent = await Event.findById(parentEventId);

    if (!parentEvent) {
      console.error("❌ Parent event not found!");
      process.exit(1);
    }

    console.log("\n📋 Parent Event Details:");
    console.log(`Title: ${parentEvent.title}`);
    console.log(`Date: ${parentEvent.date}`);
    console.log(`StartTime: ${parentEvent.startTime}`);
    console.log(`EndTime: ${parentEvent.endTime}`);
    console.log(`StartDate: ${parentEvent.startDate || "Not set"}`);
    console.log(`EndDate: ${parentEvent.endDate || "Not set"}`);

    // Fix parent event dates if missing
    const parentStartDate = new Date(parentEvent.date);

    if (!parentEvent.startDate) {
      parentEvent.startDate = parentStartDate;
      console.log("Added startDate to parent event");
    }

    if (!parentEvent.endDate) {
      // Create endDate by adding 1 day to account for overnight events
      const parentEndDate = new Date(parentStartDate);
      parentEndDate.setDate(parentEndDate.getDate() + 1);
      parentEvent.endDate = parentEndDate;
      console.log("Added endDate to parent event");
    }

    // Save parent event updates
    await parentEvent.save();
    console.log("✅ Parent event updated successfully");

    // Find all child events
    const childEvents = await Event.find({ parentEventId: parentEventId });
    console.log(`\nFound ${childEvents.length} child events`);

    // Update each child event
    let updatedCount = 0;
    for (const child of childEvents) {
      console.log(`\nProcessing child event (Week ${child.weekNumber}):`);
      console.log(`ID: ${child._id}`);
      console.log(`Date: ${child.date}`);
      console.log(`StartTime: ${child.startTime}`);
      console.log(`EndTime: ${child.endTime}`);
      console.log(`StartDate: ${child.startDate || "Not set"}`);
      console.log(`EndDate: ${child.endDate || "Not set"}`);

      // Calculate proper date for this child event based on parent event and week number
      const correctDate = new Date(parentEvent.date);
      correctDate.setDate(correctDate.getDate() + child.weekNumber * 7);

      // Set date field properly (CRITICAL: this is what UpcomingEvent.js uses for filtering)
      child.date = correctDate;
      console.log(`Set date to: ${correctDate}`);

      // Fix startDate based on correct date and startTime
      const [startHour, startMinute] = child.startTime
        .split(":")
        .map((num) => parseInt(num));
      const startDate = new Date(correctDate);
      startDate.setHours(startHour, startMinute, 0, 0);
      child.startDate = startDate;
      console.log(`Set startDate to: ${startDate}`);

      // Fix endDate based on correct date and endTime
      // If endTime is earlier than startTime (like 06:00), it's the next day
      const [endHour, endMinute] = child.endTime
        .split(":")
        .map((num) => parseInt(num));
      const endDate = new Date(correctDate);
      if (endHour < startHour) {
        // Event runs overnight, add 1 day to end date
        endDate.setDate(endDate.getDate() + 1);
      }
      endDate.setHours(endHour, endMinute, 0, 0);
      child.endDate = endDate;
      console.log(`Set endDate to: ${endDate}`);

      // Make sure the child is marked as a weekly occurrence
      if (!child.isWeekly) {
        child.isWeekly = true;
        console.log("Set isWeekly to true");
      }

      // Save child event updates
      await child.save();
      updatedCount++;
      console.log(`✅ Updated child event week ${child.weekNumber}`);
    }

    console.log(`\n✅ Successfully updated ${updatedCount} child events`);
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the function
fixEventDates();
