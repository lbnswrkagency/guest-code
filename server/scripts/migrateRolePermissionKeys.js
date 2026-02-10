/**
 * Migration script: Remap role permission keys from name-based to _id-based
 *
 * Old format: permissions.codes = { "Guest": { generate: true, ... }, "VIP": { ... } }
 * New format: permissions.codes = { "abc123objectid": { generate: true, ... } }
 *
 * Usage: node server/scripts/migrateRolePermissionKeys.js
 *
 * Set MONGODB_URI environment variable or it will use the default from .env
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Role = require("../models/roleModel");
const CodeSettings = require("../models/codeSettingsModel");

const isValidObjectId = (str) => mongoose.Types.ObjectId.isValid(str);

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("No MONGODB_URI or MONGO_URI found in environment");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const roles = await Role.find({ "permissions.codes": { $exists: true, $ne: {} } });
  console.log(`Found ${roles.length} roles with code permissions`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const role of roles) {
    const codes = role.permissions?.codes;
    if (!codes || typeof codes !== "object") continue;

    const keys = Object.keys(codes);
    if (keys.length === 0) continue;

    let changed = false;
    const newCodes = {};

    for (const key of keys) {
      // If key is already a valid ObjectId, keep it as-is
      if (isValidObjectId(key)) {
        newCodes[key] = codes[key];
        continue;
      }

      // Key is name-based — try to find matching CodeSettings by name + brandId
      const matchingCode = await CodeSettings.findOne({
        brandId: role.brandId,
        name: key,
      });

      if (matchingCode) {
        const newKey = matchingCode._id.toString();
        newCodes[newKey] = codes[key];
        console.log(`  Role "${role.name}" (${role._id}): "${key}" → ${newKey}`);
        changed = true;
      } else {
        // No match found — keep old key so fallback lookup still works
        newCodes[key] = codes[key];
        console.log(`  Role "${role.name}" (${role._id}): "${key}" → no match found, keeping as-is`);
      }
    }

    if (changed) {
      role.permissions.codes = newCodes;
      role.markModified("permissions.codes");
      try {
        await role.save();
        updatedCount++;
      } catch (err) {
        console.error(`  Error saving role ${role._id}:`, err.message);
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log("\n--- Migration Summary ---");
  console.log(`Total roles processed: ${roles.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped (already _id-based or no match): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  await mongoose.disconnect();
  console.log("Done.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
