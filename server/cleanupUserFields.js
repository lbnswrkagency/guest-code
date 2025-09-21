require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

// Fields to remove from all user documents
const fieldsToRemove = [
  "isAdmin",
  "isScanner",
  "isPromoter",
  "isStaff",
  "isBackstage",
  "isSpitixBattle",
  "isTable",
  "backstageCodeLimit",
  "friendsCodeLimit"
];

async function cleanupUsers() {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    console.log("\n🧹 CLEANING UP USER FIELDS");
    console.log("============================");
    console.log("\nFields to be removed:");
    fieldsToRemove.forEach(field => console.log(`  - ${field}`));

    // Count total users
    const totalUsers = await User.countDocuments();
    console.log(`\n📊 Total users in database: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log("\n❌ No users found in database.");
      return;
    }

    // Ask for confirmation
    console.log("\n⚠️  WARNING: This will permanently remove the above fields from ALL users!");
    console.log("Type 'yes' to continue or anything else to cancel:");
    
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("", (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    if (answer.toLowerCase() !== "yes") {
      console.log("\n❌ Operation cancelled.");
      return;
    }

    console.log("\n🚀 Starting cleanup process...");

    // Create update object to unset all fields
    const unsetObject = {};
    fieldsToRemove.forEach(field => {
      unsetObject[field] = "";
    });

    // Perform the update
    const result = await User.updateMany(
      {}, // Empty filter to match all documents
      { $unset: unsetObject }
    );

    console.log("\n✅ Cleanup completed successfully!");
    console.log(`📈 Updated ${result.modifiedCount} user documents`);
    console.log(`✓ Matched ${result.matchedCount} documents`);

    // Verify by checking a sample user
    const sampleUser = await User.findOne();
    if (sampleUser) {
      console.log("\n🔍 Verifying cleanup on sample user:");
      const removedFields = fieldsToRemove.filter(field => field in sampleUser.toObject());
      
      if (removedFields.length === 0) {
        console.log("✅ All specified fields have been successfully removed!");
      } else {
        console.log("⚠️  Warning: Some fields may still exist:", removedFields);
      }
    }

    // Show summary of remaining fields on a user
    if (sampleUser) {
      console.log("\n📋 Sample user structure after cleanup:");
      const userObj = sampleUser.toObject();
      const fields = Object.keys(userObj).filter(key => !key.startsWith('_'));
      console.log("Fields:", fields.join(", "));
    }

  } catch (error) {
    console.error("\n❌ Error during cleanup:", error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error("Could not connect to MongoDB. Make sure MongoDB is running.");
    }
  } finally {
    // Disconnect from MongoDB
    try {
      await mongoose.disconnect();
      console.log("\n🔌 Disconnected from MongoDB");
    } catch (error) {
      console.error("Error disconnecting from MongoDB:", error.message);
    }
    process.exit();
  }
}

// Run the cleanup function
cleanupUsers();