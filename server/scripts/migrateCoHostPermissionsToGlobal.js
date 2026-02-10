/**
 * Migration script to move co-host permissions from per-event to global (brand-level)
 *
 * This script:
 * 1. Finds all events with coHostRolePermissions
 * 2. Groups by (hostBrandId, coHostBrandId) pair
 * 3. Takes the most recent permission for each pair
 * 4. Saves to hostBrand.coHostPermissions
 *
 * Run with: node server/scripts/migrateCoHostPermissionsToGlobal.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

console.log('Loading environment from:', path.join(__dirname, '../.env'));
console.log('MONGODB_URI loaded:', process.env.MONGODB_URI ? 'Yes' : 'No');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guest-code';

async function migrateCoHostPermissionsToGlobal() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');
    const brandsCollection = db.collection('brands');

    // ========================================
    // Step 1: Find all events with coHostRolePermissions
    // ========================================
    console.log('='.repeat(50));
    console.log('Step 1: Finding events with co-host permissions');
    console.log('='.repeat(50));

    const events = await eventsCollection.find({
      'coHostRolePermissions': { $exists: true, $not: { $size: 0 } }
    }).toArray();

    console.log(`Found ${events.length} events with coHostRolePermissions\n`);

    // ========================================
    // Step 2: Group by (hostBrand, coHostBrand) pair
    // ========================================
    console.log('='.repeat(50));
    console.log('Step 2: Grouping by (host, co-host) pairs');
    console.log('='.repeat(50));

    // Map: "hostBrandId:coHostBrandId" -> { permissions, updatedAt, eventTitle }
    const permissionsByPair = new Map();

    for (const event of events) {
      const hostBrandId = event.brand?.toString();
      if (!hostBrandId) continue;

      const coHostRolePermissions = event.coHostRolePermissions || [];
      const eventUpdatedAt = event.updatedAt || event.createdAt || new Date(0);

      for (const brandPerm of coHostRolePermissions) {
        const coHostBrandId = brandPerm.brandId?.toString();
        if (!coHostBrandId) continue;

        const pairKey = `${hostBrandId}:${coHostBrandId}`;
        const existing = permissionsByPair.get(pairKey);

        // Keep the most recent one
        if (!existing || new Date(eventUpdatedAt) > new Date(existing.updatedAt)) {
          permissionsByPair.set(pairKey, {
            hostBrandId,
            coHostBrandId,
            rolePermissions: brandPerm.rolePermissions || [],
            updatedAt: eventUpdatedAt,
            eventTitle: event.title,
            eventId: event._id.toString(),
          });
        }
      }
    }

    console.log(`Found ${permissionsByPair.size} unique (host, co-host) pairs\n`);

    // ========================================
    // Step 3: Group by host brand for batch update
    // ========================================
    console.log('='.repeat(50));
    console.log('Step 3: Grouping permissions by host brand');
    console.log('='.repeat(50));

    // Map: hostBrandId -> [{ coHostBrandId, rolePermissions, updatedAt }]
    const permissionsByHost = new Map();

    for (const [pairKey, data] of permissionsByPair) {
      const { hostBrandId, coHostBrandId, rolePermissions, updatedAt } = data;

      if (!permissionsByHost.has(hostBrandId)) {
        permissionsByHost.set(hostBrandId, []);
      }

      permissionsByHost.get(hostBrandId).push({
        coHostBrandId: new mongoose.Types.ObjectId(coHostBrandId),
        rolePermissions: rolePermissions.map(rp => ({
          roleId: rp.roleId,
          permissions: rp.permissions || {}
        })),
        updatedAt: new Date(updatedAt),
      });

      console.log(`  ${data.eventTitle}: ${hostBrandId} -> ${coHostBrandId}`);
    }

    console.log(`\nWill update ${permissionsByHost.size} host brands\n`);

    // ========================================
    // Step 4: Save to Brand.coHostPermissions
    // ========================================
    console.log('='.repeat(50));
    console.log('Step 4: Saving global co-host permissions');
    console.log('='.repeat(50));

    let brandsUpdated = 0;
    let brandsErrors = 0;

    for (const [hostBrandId, coHostPerms] of permissionsByHost) {
      try {
        // Fetch the brand to get its name for logging
        const brand = await brandsCollection.findOne({
          _id: new mongoose.Types.ObjectId(hostBrandId)
        });

        if (!brand) {
          console.log(`  Skipping: Brand ${hostBrandId} not found`);
          continue;
        }

        // Update the brand with global co-host permissions
        await brandsCollection.updateOne(
          { _id: new mongoose.Types.ObjectId(hostBrandId) },
          { $set: { coHostPermissions: coHostPerms } }
        );

        brandsUpdated++;
        console.log(`  Updated "${brand.name}" with ${coHostPerms.length} co-host permission(s)`);

        // Log details
        for (const perm of coHostPerms) {
          const coHostBrand = await brandsCollection.findOne({
            _id: perm.coHostBrandId
          });
          console.log(`    - Co-host: ${coHostBrand?.name || perm.coHostBrandId}`);
        }
      } catch (error) {
        brandsErrors++;
        console.error(`  Error updating brand ${hostBrandId}:`, error.message);
      }
    }

    // ========================================
    // Final Summary
    // ========================================
    console.log('\n');
    console.log('='.repeat(50));
    console.log('        MIGRATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Events processed:        ${events.length}`);
    console.log(`Unique pairs found:      ${permissionsByPair.size}`);
    console.log(`Host brands updated:     ${brandsUpdated}`);
    console.log(`Errors:                  ${brandsErrors}`);
    console.log('='.repeat(50));
    console.log('\nNote: Event.coHostRolePermissions field still exists.');
    console.log('Update controllers to use Brand.coHostPermissions before removing it.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
console.log('\n');
console.log('='.repeat(50));
console.log('   CO-HOST PERMISSIONS MIGRATION');
console.log('   Moving from per-event to global (brand-level)');
console.log('='.repeat(50));
console.log('\n');

migrateCoHostPermissionsToGlobal()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
