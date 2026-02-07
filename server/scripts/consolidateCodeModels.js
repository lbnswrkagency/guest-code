/**
 * Migration Script: Consolidate Code Models
 *
 * This script migrates data from the old 4-model system to the new consolidated CodeSettings model:
 * - CodeTemplate → CodeSettings (brand-level, eventId: null)
 * - CodeBrandAttachment → CodeSettings.isGlobalForBrand
 * - EventCodeActivation → Merged into CodeSettings queries
 *
 * The script:
 * 1. Reads all CodeTemplates and their brand attachments
 * 2. Creates brand-level CodeSettings for each template attached to a brand
 * 3. Updates existing CodeSettings to include brandId
 * 4. Cleans up duplicate entries
 *
 * Run with: node server/scripts/consolidateCodeModels.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", async () => {
  console.log("Connected to MongoDB");
  await runMigration();
  process.exit(0);
});

async function runMigration() {
  try {
    console.log("\n========================================");
    console.log("Starting Code Model Consolidation");
    console.log("========================================\n");

    // Load models
    const CodeSettings = require("../models/codeSettingsModel");
    const Event = require("../models/eventsModel");
    const Brand = require("../models/brandModel");

    // Try to load old models (they may not exist if already deleted)
    let CodeTemplate, CodeBrandAttachment, EventCodeActivation;
    try {
      CodeTemplate = require("../models/codeTemplateModel");
      CodeBrandAttachment = require("../models/codeBrandAttachmentModel");
      EventCodeActivation = require("../models/eventCodeActivationModel");
    } catch (e) {
      console.log("Old models not found - may have already been deleted");
      console.log("Proceeding with updating existing CodeSettings...\n");
    }

    // STEP 1: Update existing CodeSettings to include brandId
    console.log("STEP 1: Updating existing CodeSettings with brandId...");

    const codeSettingsWithoutBrand = await CodeSettings.find({
      brandId: { $exists: false }
    });

    console.log(`Found ${codeSettingsWithoutBrand.length} CodeSettings without brandId`);

    for (const setting of codeSettingsWithoutBrand) {
      if (setting.eventId) {
        const event = await Event.findById(setting.eventId);
        if (event) {
          setting.brandId = event.brand;
          await setting.save();
          console.log(`  Updated: ${setting.name} → brandId: ${event.brand}`);
        } else {
          console.log(`  Warning: Event not found for CodeSettings ${setting._id}`);
        }
      }
    }

    console.log("Step 1 complete.\n");

    // STEP 2: Migrate CodeTemplates to brand-level CodeSettings
    if (CodeTemplate && CodeBrandAttachment) {
      console.log("STEP 2: Migrating CodeTemplates to brand-level CodeSettings...");

      const templates = await CodeTemplate.find();
      console.log(`Found ${templates.length} CodeTemplates to migrate`);

      let migratedCount = 0;
      let skippedCount = 0;

      for (const template of templates) {
        // Find all brand attachments for this template
        const attachments = await CodeBrandAttachment.find({
          codeTemplateId: template._id
        });

        console.log(`  Template "${template.name}": ${attachments.length} brand attachments`);

        for (const attachment of attachments) {
          // Check if brand-level CodeSettings already exists
          const existingBrandCode = await CodeSettings.findOne({
            brandId: attachment.brandId,
            eventId: null,
            name: template.name
          });

          if (existingBrandCode) {
            console.log(`    Skipped: Brand-level code "${template.name}" already exists for brand ${attachment.brandId}`);
            skippedCount++;
            continue;
          }

          // Create brand-level CodeSettings
          const brandCodeSettings = new CodeSettings({
            brandId: attachment.brandId,
            eventId: null, // null = brand-level
            isGlobalForBrand: attachment.isGlobalForBrand || false,
            createdBy: template.userId,
            name: template.name,
            type: template.type || "custom",
            condition: template.condition || "",
            note: template.note || "",
            maxPax: template.maxPax || 1,
            limit: template.defaultLimit || 0,
            color: template.color || "#2196F3",
            icon: template.icon || "RiCodeLine",
            isEnabled: true,
            isEditable: true,
            requireEmail: template.requireEmail !== false,
            requirePhone: template.requirePhone || false,
          });

          await brandCodeSettings.save();
          console.log(`    Created: Brand-level code "${template.name}" for brand ${attachment.brandId}`);
          migratedCount++;
        }
      }

      console.log(`Step 2 complete: Migrated ${migratedCount}, Skipped ${skippedCount}\n`);
    } else {
      console.log("STEP 2: Skipped (old models not found)\n");
    }

    // STEP 3: Clean up duplicate CodeSettings entries
    console.log("STEP 3: Cleaning up duplicates...");

    // Find all brand-event-name combinations
    const allCodeSettings = await CodeSettings.find();
    const seen = new Map();
    let duplicatesRemoved = 0;

    for (const setting of allCodeSettings) {
      const key = `${setting.brandId}_${setting.eventId}_${setting.name}`;

      if (seen.has(key)) {
        // Keep the older one, delete the newer one
        console.log(`  Removing duplicate: ${setting.name} (${setting._id})`);
        await CodeSettings.findByIdAndDelete(setting._id);
        duplicatesRemoved++;
      } else {
        seen.set(key, setting._id);
      }
    }

    console.log(`Step 3 complete: Removed ${duplicatesRemoved} duplicates\n`);

    // STEP 4: Summary
    console.log("========================================");
    console.log("Migration Summary");
    console.log("========================================");

    const finalCodeSettings = await CodeSettings.find();
    const brandLevelCodes = finalCodeSettings.filter(cs => cs.eventId === null);
    const eventLevelCodes = finalCodeSettings.filter(cs => cs.eventId !== null);

    console.log(`Total CodeSettings: ${finalCodeSettings.length}`);
    console.log(`  Brand-level codes: ${brandLevelCodes.length}`);
    console.log(`  Event-level codes: ${eventLevelCodes.length}`);

    console.log("\n========================================");
    console.log("Migration Complete!");
    console.log("========================================\n");

    console.log("Next steps:");
    console.log("1. Test the application to ensure codes work correctly");
    console.log("2. Delete old model files:");
    console.log("   - server/models/codeTemplateModel.js");
    console.log("   - server/models/codeBrandAttachmentModel.js");
    console.log("   - server/models/eventCodeActivationModel.js");
    console.log("3. Delete old controller/route files");
    console.log("4. Update index.js to remove old route registrations");
    console.log("");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}
