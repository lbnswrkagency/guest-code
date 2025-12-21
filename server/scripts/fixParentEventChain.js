/**
 * Migration script to fix broken parentEventId chains
 *
 * Problem: Some child events have parentEventId pointing to another child event
 * instead of the root parent, creating a chain instead of a flat structure.
 *
 * This script:
 * 1. Finds all events with a parentEventId
 * 2. Checks if that parent is also a child (has its own parentEventId)
 * 3. If so, updates the event to point to the root parent instead
 *
 * Run with: node server/scripts/fixParentEventChain.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

console.log('Loading environment from:', path.join(__dirname, '../.env'));
console.log('MONGODB_URI loaded:', process.env.MONGODB_URI ? 'Yes' : 'No');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guest-code';

async function fixParentEventChain() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');

    // Step 1: Find all NON-WEEKLY events with a parentEventId
    // Weekly events are handled differently and should NOT be modified
    const childEvents = await eventsCollection.find({
      parentEventId: { $exists: true, $ne: null },
      isWeekly: { $ne: true }  // SKIP weekly events - they have their own chain logic
    }).toArray();

    console.log(`Found ${childEvents.length} NON-WEEKLY child events with parentEventId`);
    console.log(`(Weekly events are skipped - they use different chain logic)\n`);

    if (childEvents.length === 0) {
      console.log('No child events found. Nothing to fix!');
      return;
    }

    // Step 2: For each child event, check if its parent is also a child
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errors = 0;

    for (const childEvent of childEvents) {
      try {
        const parentId = childEvent.parentEventId;

        // Find the parent event
        const parentEvent = await eventsCollection.findOne({ _id: parentId });

        if (!parentEvent) {
          console.log(`  Warning: Parent event ${parentId} not found for "${childEvent.title}" (${childEvent._id})`);
          continue;
        }

        // Check if the parent is also a child (has its own parentEventId)
        if (parentEvent.parentEventId) {
          // This is a chain! Find the root parent
          let rootParent = parentEvent;
          let depth = 0;
          const maxDepth = 10; // Prevent infinite loops

          while (rootParent.parentEventId && depth < maxDepth) {
            const nextParent = await eventsCollection.findOne({ _id: rootParent.parentEventId });
            if (!nextParent) {
              console.log(`  Warning: Could not find parent ${rootParent.parentEventId} in chain`);
              break;
            }
            rootParent = nextParent;
            depth++;
          }

          if (depth > 0) {
            console.log(`  Found chain of depth ${depth + 1}:`);
            console.log(`    "${childEvent.title}" (${childEvent._id})`);
            console.log(`    -> was pointing to: "${parentEvent.title}" (${parentEvent._id})`);
            console.log(`    -> now pointing to: "${rootParent.title}" (${rootParent._id})`);

            // Update the child to point to the root parent
            await eventsCollection.updateOne(
              { _id: childEvent._id },
              { $set: { parentEventId: rootParent._id } }
            );

            fixedCount++;
            console.log(`    Fixed!\n`);
          }
        } else {
          // Parent is already a root event - this is correct
          alreadyCorrectCount++;
        }
      } catch (error) {
        console.error(`  Error processing event ${childEvent._id}:`, error.message);
        errors++;
      }
    }

    // Final summary
    console.log('=======================================');
    console.log('         FIX PARENT CHAIN SUMMARY      ');
    console.log('=======================================');
    console.log(`Total child events found:    ${childEvents.length}`);
    console.log(`Already correct:             ${alreadyCorrectCount}`);
    console.log(`Fixed (broken chains):       ${fixedCount}`);
    console.log(`Errors:                      ${errors}`);
    console.log('=======================================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
console.log('\n');
console.log('=========================================');
console.log('   FIX PARENT EVENT CHAIN MIGRATION     ');
console.log('   Fixes child events pointing to       ');
console.log('   other children instead of root       ');
console.log('=========================================');
console.log('\n');

fixParentEventChain()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
