/**
 * Migration script to move co-host permissions from Brand.coHostPermissions
 * to the new CoHostRelationship model.
 *
 * Run with: node server/scripts/migrateToCoHostRelationshipModel.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

console.log("Loading environment from:", path.join(__dirname, "../.env"));
console.log("MONGODB_URI loaded:", process.env.MONGODB_URI ? "Yes" : "No");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/guest-code";

async function migrateToCoHostRelationshipModel() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const brandsCollection = db.collection("brands");
    const coHostRelationshipsCollection = db.collection("cohostrelationships");

    // ========================================
    // Step 1: Find all brands with coHostPermissions
    // ========================================
    console.log("=".repeat(50));
    console.log("Step 1: Finding brands with coHostPermissions");
    console.log("=".repeat(50));

    const brandsWithPermissions = await brandsCollection
      .find({
        coHostPermissions: { $exists: true, $not: { $size: 0 } },
      })
      .toArray();

    console.log(
      `Found ${brandsWithPermissions.length} brands with coHostPermissions\n`
    );

    if (brandsWithPermissions.length === 0) {
      console.log("No brands with coHostPermissions found. Nothing to migrate.");
      return;
    }

    // ========================================
    // Step 2: Create CoHostRelationship documents
    // ========================================
    console.log("=".repeat(50));
    console.log("Step 2: Creating CoHostRelationship documents");
    console.log("=".repeat(50));

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const brand of brandsWithPermissions) {
      const hostBrandId = brand._id;
      const hostBrandName = brand.name;
      const coHostPermissions = brand.coHostPermissions || [];

      console.log(`\nProcessing host brand: ${hostBrandName}`);

      for (const perm of coHostPermissions) {
        try {
          const coHostBrandId = perm.coHostBrandId;

          if (!coHostBrandId) {
            console.log(`  Skipping: No coHostBrandId`);
            skipped++;
            continue;
          }

          // Check if relationship already exists
          const existingRelationship = await coHostRelationshipsCollection.findOne({
            hostBrand: hostBrandId,
            coHostBrand: coHostBrandId,
          });

          if (existingRelationship) {
            console.log(`  Skipping: Relationship already exists for coHostBrand ${coHostBrandId}`);
            skipped++;
            continue;
          }

          // Get co-host brand name for logging
          const coHostBrand = await brandsCollection.findOne({
            _id: coHostBrandId,
          });
          const coHostBrandName = coHostBrand?.name || "Unknown";

          // Create new CoHostRelationship document
          const newRelationship = {
            hostBrand: hostBrandId,
            coHostBrand: coHostBrandId,
            rolePermissions: perm.rolePermissions || [],
            isActive: true,
            createdAt: perm.updatedAt || new Date(),
            updatedAt: perm.updatedAt || new Date(),
          };

          await coHostRelationshipsCollection.insertOne(newRelationship);
          created++;

          console.log(`  Created relationship: ${hostBrandName} → ${coHostBrandName}`);
          console.log(`    Roles with permissions: ${(perm.rolePermissions || []).length}`);
        } catch (error) {
          errors++;
          console.error(`  Error processing coHostPermission:`, error.message);
        }
      }
    }

    // ========================================
    // Summary
    // ========================================
    console.log("\n");
    console.log("=".repeat(50));
    console.log("        MIGRATION COMPLETE");
    console.log("=".repeat(50));
    console.log(`Relationships created: ${created}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log("=".repeat(50));
    console.log("\nNext steps:");
    console.log("1. Update coHostController.js to use CoHostRelationship model");
    console.log("2. Update authController.js to use CoHostRelationship model");
    console.log("3. Run cleanup script to remove old fields");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run the migration
console.log("\n");
console.log("=".repeat(50));
console.log("   CO-HOST RELATIONSHIP MODEL MIGRATION");
console.log("   Moving from Brand.coHostPermissions to CoHostRelationship");
console.log("=".repeat(50));
console.log("\n");

migrateToCoHostRelationshipModel()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
