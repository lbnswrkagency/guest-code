/**
 * One-time migration: Clear stale coHostRolePermissions from weekly child events.
 *
 * Background:
 * - generateWeeklyOccurrences used to copy coHostRolePermissions from the template event
 * - EventForm always saves co-host permissions to the parent event (EventForm.js:1911)
 * - So all child copies are stale snapshots from creation time
 * - After this migration, child events with no coHostRolePermissions will inherit from parent at read time
 *
 * Usage: node server/scripts/clearChildCoHostPermissions.js
 *
 * Set MONGODB_URI environment variable or it will use the default from .env
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Event = require("../models/eventsModel");

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Find all weekly child events that have coHostRolePermissions
  const childEvents = await Event.find({
    parentEventId: { $exists: true, $ne: null },
    isWeekly: true,
    "coHostRolePermissions.0": { $exists: true }, // Has at least one entry
  }).select("_id parentEventId weekNumber title coHostRolePermissions");

  console.log(`Found ${childEvents.length} child events with coHostRolePermissions to clear`);

  if (childEvents.length === 0) {
    console.log("Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // Clear coHostRolePermissions from all these child events
  const result = await Event.updateMany(
    {
      parentEventId: { $exists: true, $ne: null },
      isWeekly: true,
      "coHostRolePermissions.0": { $exists: true },
    },
    { $set: { coHostRolePermissions: [] } }
  );

  console.log(`Updated ${result.modifiedCount} child events — cleared stale coHostRolePermissions`);
  console.log("These events will now inherit permissions from their parent at read time.");

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
