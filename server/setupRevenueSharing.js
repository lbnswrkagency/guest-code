require("dotenv").config();
const mongoose = require("mongoose");
const RevenueSharing = require("./models/revenueSharingModel");

async function setupRevenueSharing() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Check if a global revenue sharing config already exists
    const existingConfig = await RevenueSharing.findOne({
      eventId: null,
      brandId: null,
      isActive: true,
    });

    if (existingConfig) {
      console.log("\n⚠️ Global revenue sharing already exists:");
      console.log("ID:", existingConfig._id);
      console.log(
        "Platform Rate:",
        existingConfig.platformCommissionRate + "%"
      );
      console.log("Brand Rate:", existingConfig.brandCommissionRate + "%");
      console.log("Created At:", existingConfig.createdAt);

      const updateConfig = process.argv.includes("--force");

      if (updateConfig) {
        console.log("\n🔄 Updating existing configuration...");

        existingConfig.platformCommissionRate = 2;
        existingConfig.brandCommissionRate = 98;
        existingConfig.includeVAT = true;
        existingConfig.paymentTerms = "net30";
        existingConfig.minimumPayoutAmount = 50;

        await existingConfig.save();
        console.log("✅ Global revenue sharing updated successfully");
      } else {
        console.log("\n❔ To update, run this script with the --force flag");
      }
    } else {
      // Create global default revenue sharing config
      console.log("\n🔧 Creating global revenue sharing configuration...");

      const revenueSharing = new RevenueSharing({
        eventId: null, // null means global default
        brandId: null, // null means global default
        platformCommissionRate: 2, // Platform gets 2%
        brandCommissionRate: 98, // Brand/Event Creator gets 98%
        includeVAT: true, // Commission calculated after VAT
        vatRate: 0, // Will be set dynamically per transaction
        paymentTerms: "net30", // Pay creators after 30 days
        minimumPayoutAmount: 50, // Minimum $50 before payout
        isActive: true,
        effectiveFrom: new Date(),
      });

      await revenueSharing.save();

      console.log("✅ Global revenue sharing created successfully");
      console.log("ID:", revenueSharing._id);
      console.log(
        "Platform Rate:",
        revenueSharing.platformCommissionRate + "%"
      );
      console.log("Brand Rate:", revenueSharing.brandCommissionRate + "%");
      console.log("Created At:", revenueSharing.createdAt);
    }

    // Show all revenue sharing configs for reference
    const allConfigs = await RevenueSharing.find().sort({ createdAt: -1 });

    console.log("\n📋 All Revenue Sharing Configurations:");
    console.log("----------------------------------------");

    if (allConfigs.length === 0) {
      console.log("No configurations found.");
    } else {
      allConfigs.forEach((config, index) => {
        console.log(`\n[${index + 1}] Configuration ID: ${config._id}`);
        console.log(
          `Type: ${
            !config.eventId && !config.brandId
              ? "GLOBAL"
              : config.eventId
              ? "EVENT-SPECIFIC"
              : "BRAND-SPECIFIC"
          }`
        );
        console.log(`Event ID: ${config.eventId || "N/A"}`);
        console.log(`Brand ID: ${config.brandId || "N/A"}`);
        console.log(`Platform Commission: ${config.platformCommissionRate}%`);
        console.log(`Brand Commission: ${config.brandCommissionRate}%`);
        console.log(`Payment Terms: ${config.paymentTerms}`);
        console.log(`Status: ${config.isActive ? "ACTIVE" : "INACTIVE"}`);
        console.log(`Created: ${config.createdAt}`);
      });
    }
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run the function
setupRevenueSharing();
