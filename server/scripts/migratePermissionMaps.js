/**
 * Migration script to convert Map types to plain objects in permissions
 *
 * This script:
 * 1. Converts Role.permissions.codes from Map to plain Object
 * 2. Converts Event.coHostRolePermissions[].rolePermissions[].permissions.codes from Map to plain Object
 *
 * This is needed because:
 * - Map types cause serialization issues with .lean() and JSON.stringify
 * - Plain objects are simpler to work with and don't require special handling
 *
 * Run with: node server/scripts/migratePermissionMaps.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

console.log('Loading environment from:', path.join(__dirname, '../.env'));
console.log('MONGODB_URI loaded:', process.env.MONGODB_URI ? 'Yes' : 'No');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guest-code';

/**
 * Converts a Mongoose Map or Map-like object to a plain object
 */
function mapToObject(mapOrObject) {
  if (!mapOrObject) return {};

  // If it's already a plain object, return as-is
  if (typeof mapOrObject === 'object' && !mapOrObject.constructor?.name?.includes('Map')) {
    // But check if it has Map-like structure (MongoDB sometimes returns Maps as objects with special structure)
    if (mapOrObject._bsontype === 'Map' || mapOrObject instanceof Map) {
      return Object.fromEntries(mapOrObject);
    }
    // It's already a plain object
    return { ...mapOrObject };
  }

  // If it's a Map instance
  if (mapOrObject instanceof Map) {
    return Object.fromEntries(mapOrObject);
  }

  // If it has a toObject method (Mongoose Map)
  if (typeof mapOrObject.toObject === 'function') {
    return mapOrObject.toObject();
  }

  // Fallback: try to spread it
  try {
    return { ...mapOrObject };
  } catch (e) {
    console.warn('Could not convert map-like object:', e.message);
    return {};
  }
}

async function migratePermissionMaps() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const rolesCollection = db.collection('roles');
    const eventsCollection = db.collection('events');

    // ========================================
    // Step 1: Migrate Role.permissions.codes
    // ========================================
    console.log('='.repeat(50));
    console.log('Step 1: Migrating Role permissions.codes');
    console.log('='.repeat(50));

    const roles = await rolesCollection.find({
      'permissions.codes': { $exists: true }
    }).toArray();

    console.log(`Found ${roles.length} roles with permissions.codes\n`);

    let rolesUpdated = 0;
    let rolesSkipped = 0;
    let rolesErrors = 0;

    for (const role of roles) {
      try {
        const codes = role.permissions?.codes;

        if (!codes) {
          rolesSkipped++;
          continue;
        }

        // Convert to plain object
        const codesAsObject = mapToObject(codes);

        // Check if it's already a plain object with same content
        const codesJson = JSON.stringify(codes);
        const objectJson = JSON.stringify(codesAsObject);

        if (codesJson === objectJson && typeof codes === 'object' && !(codes instanceof Map)) {
          rolesSkipped++;
          continue;
        }

        // Update the document
        await rolesCollection.updateOne(
          { _id: role._id },
          { $set: { 'permissions.codes': codesAsObject } }
        );

        rolesUpdated++;
        console.log(`  Updated role "${role.name}" (${role._id})`);
      } catch (error) {
        rolesErrors++;
        console.error(`  Error updating role ${role._id}:`, error.message);
      }
    }

    console.log(`\nRole migration summary:`);
    console.log(`  Updated: ${rolesUpdated}`);
    console.log(`  Skipped (already plain object): ${rolesSkipped}`);
    console.log(`  Errors: ${rolesErrors}\n`);

    // ========================================
    // Step 2: Migrate Event.coHostRolePermissions
    // ========================================
    console.log('='.repeat(50));
    console.log('Step 2: Migrating Event coHostRolePermissions');
    console.log('='.repeat(50));

    const events = await eventsCollection.find({
      'coHostRolePermissions': { $exists: true, $ne: [], $ne: null }
    }).toArray();

    console.log(`Found ${events.length} events with coHostRolePermissions\n`);

    let eventsUpdated = 0;
    let eventsSkipped = 0;
    let eventsErrors = 0;
    let totalPermissionsUpdated = 0;

    for (const event of events) {
      try {
        const coHostRolePermissions = event.coHostRolePermissions;

        if (!coHostRolePermissions || !Array.isArray(coHostRolePermissions) || coHostRolePermissions.length === 0) {
          eventsSkipped++;
          continue;
        }

        let eventNeedsUpdate = false;
        const updatedCoHostRolePermissions = coHostRolePermissions.map(brandPerm => {
          if (!brandPerm.rolePermissions || !Array.isArray(brandPerm.rolePermissions)) {
            return brandPerm;
          }

          const updatedRolePermissions = brandPerm.rolePermissions.map(rolePerm => {
            if (!rolePerm.permissions?.codes) {
              return rolePerm;
            }

            const codes = rolePerm.permissions.codes;
            const codesAsObject = mapToObject(codes);

            // Check if conversion is needed
            const codesJson = JSON.stringify(codes);
            const objectJson = JSON.stringify(codesAsObject);

            if (codesJson !== objectJson || codes instanceof Map) {
              eventNeedsUpdate = true;
              totalPermissionsUpdated++;
              return {
                ...rolePerm,
                permissions: {
                  ...rolePerm.permissions,
                  codes: codesAsObject
                }
              };
            }

            return rolePerm;
          });

          return {
            ...brandPerm,
            rolePermissions: updatedRolePermissions
          };
        });

        if (eventNeedsUpdate) {
          await eventsCollection.updateOne(
            { _id: event._id },
            { $set: { coHostRolePermissions: updatedCoHostRolePermissions } }
          );
          eventsUpdated++;
          console.log(`  Updated event "${event.title}" (${event._id})`);
        } else {
          eventsSkipped++;
        }
      } catch (error) {
        eventsErrors++;
        console.error(`  Error updating event ${event._id}:`, error.message);
      }
    }

    console.log(`\nEvent migration summary:`);
    console.log(`  Events updated: ${eventsUpdated}`);
    console.log(`  Events skipped (already plain objects): ${eventsSkipped}`);
    console.log(`  Total role permissions updated: ${totalPermissionsUpdated}`);
    console.log(`  Errors: ${eventsErrors}\n`);

    // ========================================
    // Final Summary
    // ========================================
    console.log('='.repeat(50));
    console.log('        MIGRATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Roles updated:           ${rolesUpdated}`);
    console.log(`Events updated:          ${eventsUpdated}`);
    console.log(`Total permissions fixed: ${rolesUpdated + totalPermissionsUpdated}`);
    console.log('='.repeat(50));

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
console.log('   PERMISSION MAP TO OBJECT MIGRATION');
console.log('   Converts Map types to plain objects');
console.log('='.repeat(50));
console.log('\n');

migratePermissionMaps()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
