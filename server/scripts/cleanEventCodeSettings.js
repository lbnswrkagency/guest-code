/**
 * Migration script to remove legacy code settings fields from all events
 *
 * This script removes:
 * - codeSettings (embedded array)
 * - guestCode, friendsCode, ticketCode, tableCode, backstageCode (booleans)
 * - guestCodeSettings, friendsCodeSettings, ticketCodeSettings, tableCodeSettings, backstageCodeSettings (objects)
 *
 * All code settings should come from the CodeSettings collection (which has eventId reference)
 *
 * Run with: node server/scripts/cleanEventCodeSettings.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guest-code';

async function cleanEventCodeSettings() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Access the events collection directly (bypassing Mongoose model)
    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');

    // Fields to remove
    const fieldsToRemove = {
      codeSettings: "",
      guestCode: "",
      friendsCode: "",
      ticketCode: "",
      tableCode: "",
      backstageCode: "",
      guestCodeSettings: "",
      friendsCodeSettings: "",
      ticketCodeSettings: "",
      tableCodeSettings: "",
      backstageCodeSettings: ""
    };

    // Step 1: Count events with these fields
    const counts = {};
    for (const field of Object.keys(fieldsToRemove)) {
      counts[field] = await eventsCollection.countDocuments({ [field]: { $exists: true } });
    }

    console.log('📊 Events with legacy code fields:');
    for (const [field, count] of Object.entries(counts)) {
      console.log(`   ${field}: ${count}`);
    }
    console.log('');

    // Step 2: Remove all legacy fields from all events
    console.log('🗑️  Removing legacy code fields from all events...\n');

    const removeResult = await eventsCollection.updateMany(
      {},
      { $unset: fieldsToRemove }
    );

    console.log(`✅ Updated ${removeResult.modifiedCount} events\n`);

    // Step 3: Verify removal
    console.log('🔍 Verifying removal...\n');
    const remainingCounts = {};
    let totalRemaining = 0;
    for (const field of Object.keys(fieldsToRemove)) {
      const count = await eventsCollection.countDocuments({ [field]: { $exists: true } });
      remainingCounts[field] = count;
      totalRemaining += count;
    }

    if (totalRemaining > 0) {
      console.log('⚠️  WARNING: Some fields still exist:');
      for (const [field, count] of Object.entries(remainingCounts)) {
        if (count > 0) console.log(`   ${field}: ${count}`);
      }
    } else {
      console.log('🎉 SUCCESS: All legacy code fields have been removed!\n');
    }

    // Final summary
    console.log('═══════════════════════════════════════════');
    console.log('            CLEANUP SUMMARY                ');
    console.log('═══════════════════════════════════════════');
    console.log(`Events updated:                   ${removeResult.modifiedCount}`);
    console.log(`Fields remaining (should be 0):   ${totalRemaining}`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the cleanup
console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     CLEAN LEGACY CODE SETTINGS FROM EVENTS               ║');
console.log('║     Removes embedded code fields from Event documents    ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('\n');

cleanEventCodeSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
