/**
 * Migration script to update events that have 'date' field but missing startDate/endDate
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/eventsModel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guest-code';

async function migrateDateFields() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find events that have date but missing startDate or endDate
    const eventsToUpdate = await Event.find({
      $or: [
        { startDate: { $exists: false } },
        { endDate: { $exists: false } },
        { startDate: null },
        { endDate: null }
      ],
      date: { $exists: true, $ne: null }
    });

    console.log(`Found ${eventsToUpdate.length} events to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const event of eventsToUpdate) {
      try {
        // Calculate startDate and endDate from date and time fields
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

        // Update the event
        event.startDate = startDate;
        event.endDate = endDate;
        
        await event.save();
        updatedCount++;
        console.log(`Updated event "${event.title}" (${event._id})`);
      } catch (error) {
        errorCount++;
        console.error(`Error updating event ${event._id}:`, error.message);
      }
    }

    console.log(`\nMigration completed:`);
    console.log(`- ${updatedCount} events successfully updated`);
    console.log(`- ${errorCount} events failed to update`);

    // Check if there are still events without proper date fields
    const remainingEvents = await Event.countDocuments({
      $or: [
        { startDate: { $exists: false } },
        { endDate: { $exists: false } },
        { startDate: null },
        { endDate: null }
      ]
    });

    if (remainingEvents > 0) {
      console.log(`\nWARNING: ${remainingEvents} events still missing startDate/endDate`);
    } else {
      console.log('\nAll events now have startDate and endDate fields!');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
migrateDateFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });