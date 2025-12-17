/**
 * Migration script to remove the legacy 'date' field from all events
 *
 * This script:
 * 1. Ensures all events have startDate and endDate (migrating from date if needed)
 * 2. Removes the 'date' field from all events using $unset
 *
 * Run with: node server/scripts/removeDateField.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guest-code';

async function removeDateField() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Access the events collection directly (bypassing Mongoose model to avoid pre-save hooks)
    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');

    // Step 1: Count events with date field
    const eventsWithDate = await eventsCollection.countDocuments({ date: { $exists: true } });
    console.log(`📊 Found ${eventsWithDate} events with 'date' field\n`);

    if (eventsWithDate === 0) {
      console.log('✨ No events have the date field. Nothing to migrate!');
      return;
    }

    // Step 2: Find events that need startDate/endDate migration (have date but missing startDate or endDate)
    const eventsNeedingMigration = await eventsCollection.find({
      date: { $exists: true, $ne: null },
      $or: [
        { startDate: { $exists: false } },
        { endDate: { $exists: false } },
        { startDate: null },
        { endDate: null }
      ]
    }).toArray();

    console.log(`🔧 Found ${eventsNeedingMigration.length} events needing startDate/endDate migration\n`);

    // Step 3: Migrate startDate/endDate from date for events that need it
    let migratedCount = 0;
    let migrationErrors = 0;

    for (const event of eventsNeedingMigration) {
      try {
        const baseDate = new Date(event.date);

        // Create startDate from date and startTime
        let startDate = new Date(baseDate);
        if (event.startTime) {
          const [hours, minutes] = event.startTime.split(':').map(Number);
          startDate.setHours(hours, minutes, 0, 0);
        }

        // Create endDate from date and endTime
        let endDate = new Date(baseDate);
        if (event.endTime) {
          const [hours, minutes] = event.endTime.split(':').map(Number);
          endDate.setHours(hours, minutes, 0, 0);

          // If end time is earlier than start time, it's the next day
          if (endDate <= startDate) {
            endDate.setDate(endDate.getDate() + 1);
          }
        } else {
          // If no endTime, set endDate to 2 hours after startDate
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
        }

        // Update only the missing fields
        const updateFields = {};
        if (!event.startDate) updateFields.startDate = startDate;
        if (!event.endDate) updateFields.endDate = endDate;

        if (Object.keys(updateFields).length > 0) {
          await eventsCollection.updateOne(
            { _id: event._id },
            { $set: updateFields }
          );
          migratedCount++;
          console.log(`  ✅ Migrated "${event.title}" (${event._id})`);
        }
      } catch (error) {
        migrationErrors++;
        console.error(`  ❌ Error migrating event ${event._id}:`, error.message);
      }
    }

    console.log(`\n📈 Migration step completed: ${migratedCount} events migrated, ${migrationErrors} errors\n`);

    // Step 4: Verify all events now have startDate and endDate
    const eventsStillMissingDates = await eventsCollection.countDocuments({
      $or: [
        { startDate: { $exists: false } },
        { endDate: { $exists: false } },
        { startDate: null },
        { endDate: null }
      ]
    });

    if (eventsStillMissingDates > 0) {
      console.log(`⚠️  WARNING: ${eventsStillMissingDates} events still missing startDate/endDate`);
      console.log('   These events may not have had a date field to migrate from.\n');
    }

    // Step 5: Remove 'date' field from ALL events
    console.log('🗑️  Removing date field from all events...\n');

    const removeResult = await eventsCollection.updateMany(
      { date: { $exists: true } },
      { $unset: { date: "" } }
    );

    console.log(`✅ Removed 'date' field from ${removeResult.modifiedCount} events\n`);

    // Step 6: Verify removal
    const remainingWithDate = await eventsCollection.countDocuments({ date: { $exists: true } });

    if (remainingWithDate > 0) {
      console.log(`⚠️  WARNING: ${remainingWithDate} events still have date field`);
    } else {
      console.log('🎉 SUCCESS: No events have the date field anymore!\n');
    }

    // Final summary
    console.log('═══════════════════════════════════════════');
    console.log('               MIGRATION SUMMARY            ');
    console.log('═══════════════════════════════════════════');
    console.log(`Events with date field (before):  ${eventsWithDate}`);
    console.log(`Events needing date migration:    ${eventsNeedingMigration.length}`);
    console.log(`Successfully migrated:            ${migratedCount}`);
    console.log(`Migration errors:                 ${migrationErrors}`);
    console.log(`Date fields removed:              ${removeResult.modifiedCount}`);
    console.log(`Events with date field (after):   ${remainingWithDate}`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the migration
console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     REMOVE LEGACY DATE FIELD MIGRATION                    ║');
console.log('║     This will remove .date from all events               ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('\n');

removeDateField()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
