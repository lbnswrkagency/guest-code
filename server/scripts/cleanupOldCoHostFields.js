/**
 * Cleanup script to remove old co-host permission fields from Brand and Event documents.
 *
 * Run AFTER migration to CoHostRelationship model is complete.
 *
 * Run with: node server/scripts/cleanupOldCoHostFields.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

console.log("Loading environment from:", path.join(__dirname, "../.env"));
console.log("MONGODB_URI loaded:", process.env.MONGODB_URI ? "Yes" : "No");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/guest-code";

async function cleanupOldCoHostFields() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const brandsCollection = db.collection("brands");
    const eventsCollection = db.collection("events");

    // ========================================
    // Step 1: Remove coHostPermissions from Brand documents
    // ========================================
    console.log("=".repeat(50));
    console.log("Step 1: Removing coHostPermissions from Brand documents");
    console.log("=".repeat(50));

    const brandResult = await brandsCollection.updateMany(
      { coHostPermissions: { $exists: true } },
      { $unset: { coHostPermissions: "" } }
    );

    console.log(`Brands updated: ${brandResult.modifiedCount}`);

    // ========================================
    // Step 2: Remove coHostRolePermissions from Event documents
    // ========================================
    console.log("\n");
    console.log("=".repeat(50));
    console.log("Step 2: Removing coHostRolePermissions from Event documents");
    console.log("=".repeat(50));

    const eventResult = await eventsCollection.updateMany(
      { coHostRolePermissions: { $exists: true } },
      { $unset: { coHostRolePermissions: "" } }
    );

    console.log(`Events updated: ${eventResult.modifiedCount}`);

    // ========================================
    // Verification
    // ========================================
    console.log("\n");
    console.log("=".repeat(50));
    console.log("Verification");
    console.log("=".repeat(50));

    const brandsWithOldField = await brandsCollection.countDocuments({
      coHostPermissions: { $exists: true },
    });
    const eventsWithOldField = await eventsCollection.countDocuments({
      coHostRolePermissions: { $exists: true },
    });

    console.log(`Brands still with coHostPermissions: ${brandsWithOldField}`);
    console.log(`Events still with coHostRolePermissions: ${eventsWithOldField}`);

    // ========================================
    // Check CoHostRelationship collection
    // ========================================
    console.log("\n");
    console.log("=".repeat(50));
    console.log("CoHostRelationship Collection Status");
    console.log("=".repeat(50));

    const coHostRelationshipsCollection = db.collection("cohostrelationships");
    const relationshipCount = await coHostRelationshipsCollection.countDocuments();
    console.log(`Total CoHostRelationship documents: ${relationshipCount}`);

    // List all relationships
    const relationships = await coHostRelationshipsCollection.find().toArray();
    for (const rel of relationships) {
      const hostBrand = await brandsCollection.findOne({ _id: rel.hostBrand });
      const coHostBrand = await brandsCollection.findOne({ _id: rel.coHostBrand });
      console.log(`  ${hostBrand?.name || "Unknown"} → ${coHostBrand?.name || "Unknown"}`);
      console.log(`    Roles: ${rel.rolePermissions?.length || 0}, Active: ${rel.isActive}`);
    }

    // ========================================
    // Summary
    // ========================================
    console.log("\n");
    console.log("=".repeat(50));
    console.log("        CLEANUP COMPLETE");
    console.log("=".repeat(50));
    console.log(`Brands cleaned: ${brandResult.modifiedCount}`);
    console.log(`Events cleaned: ${eventResult.modifiedCount}`);
    console.log(`CoHostRelationships: ${relationshipCount}`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run the cleanup
console.log("\n");
console.log("=".repeat(50));
console.log("   CO-HOST FIELD CLEANUP SCRIPT");
console.log("   Removing old embedded permission fields");
console.log("=".repeat(50));
console.log("\n");

cleanupOldCoHostFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
