#!/usr/bin/env node
/**
 * Migration script to fix weekly child event dates that were calculated with the wrong timezone
 *
 * Problem: Previous code used getDate()/setDate() which caused dates to shift by one day
 * when UTC dates cross midnight in local timezone.
 *
 * This script:
 * 1. Finds all weekly child events (have parentEventId and weekNumber > 0)
 * 2. Calculates the correct date using UTC methods
 * 3. Only updates events where the date is actually wrong
 * 4. Logs what was fixed
 *
 * Run with: node server/scripts/fixWeeklyChildDates.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Event = require("../models/eventsModel");

async function fixWeeklyChildDates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all weekly child events
    const childEvents = await Event.find({
      parentEventId: { $exists: true, $ne: null },
      weekNumber: { $gt: 0 }
    });

    console.log(`\n📊 Found ${childEvents.length} weekly child events to check\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const child of childEvents) {
      try {
        // Fetch the parent event
        const parent = await Event.findById(child.parentEventId);

        if (!parent) {
          console.log(`⚠️  Parent not found for child ${child._id} (${child.title})`);
          errorCount++;
          continue;
        }

        // Calculate the correct date using UTC methods
        const parentStartDate = new Date(parent.startDate);
        const correctStartDate = new Date(parentStartDate);
        correctStartDate.setUTCDate(parentStartDate.getUTCDate() + child.weekNumber * 7);

        // Calculate duration from parent
        const parentEndDate = new Date(parent.endDate);
        const duration = parentEndDate.getTime() - parentStartDate.getTime();
        const correctEndDate = new Date(correctStartDate.getTime() + duration);

        // Check if the current date is wrong
        const currentStartDate = new Date(child.startDate);

        // Compare UTC dates (ignore time, just check if the day is different)
        const currentUTCDate = currentStartDate.getUTCDate();
        const correctUTCDate = correctStartDate.getUTCDate();
        const currentUTCMonth = currentStartDate.getUTCMonth();
        const correctUTCMonth = correctStartDate.getUTCMonth();
        const currentUTCYear = currentStartDate.getUTCFullYear();
        const correctUTCYear = correctStartDate.getUTCFullYear();

        const isWrong = currentUTCDate !== correctUTCDate ||
                        currentUTCMonth !== correctUTCMonth ||
                        currentUTCYear !== correctUTCYear;

        if (isWrong) {
          // Update the event
          const updateData = {
            startDate: correctStartDate,
            endDate: correctEndDate
          };

          // Clear the legacy .date field if it exists
          if (child.date) {
            updateData.$unset = { date: "" };
          }

          await Event.findByIdAndUpdate(child._id, updateData);

          console.log(`✅ Fixed: ${child.title} (Week ${child.weekNumber})`);
          console.log(`   Was: ${currentStartDate.toISOString().split('T')[0]} (UTC day: ${currentUTCDate})`);
          console.log(`   Now: ${correctStartDate.toISOString().split('T')[0]} (UTC day: ${correctUTCDate})`);
          console.log("");

          fixedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.log(`❌ Error processing ${child._id}: ${error.message}`);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Summary:");
    console.log(`   Fixed:   ${fixedCount} events`);
    console.log(`   Skipped: ${skippedCount} events (already correct)`);
    console.log(`   Errors:  ${errorCount} events`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

fixWeeklyChildDates();
