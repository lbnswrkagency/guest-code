require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

// Default values for missing required fields
const DEFAULT_BIRTHDAY = new Date("1990-01-01");
const DEFAULT_FIRST_NAME = "Guest";
const DEFAULT_LAST_NAME = "User";

async function fixUserAccountsBulk() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Find users with missing required fields
    console.log("Searching for users with missing required fields...");

    // Count users missing birthday
    const birthdayCount = await User.countDocuments({
      birthday: { $exists: false },
    });
    console.log(`Found ${birthdayCount} users missing birthday field`);

    // Count users missing firstName
    const firstNameCount = await User.countDocuments({
      firstName: { $exists: false },
    });
    console.log(`Found ${firstNameCount} users missing firstName field`);

    // Count users missing lastName
    const lastNameCount = await User.countDocuments({
      lastName: { $exists: false },
    });
    console.log(`Found ${lastNameCount} users missing lastName field`);

    // Count users with string-type avatars (old format)
    const stringAvatarCount = await User.countDocuments({
      avatar: { $type: "string" },
    });
    console.log(`Found ${stringAvatarCount} users with string-type avatars`);

    // Update users missing birthday
    if (birthdayCount > 0) {
      console.log("Updating users missing birthday...");
      const birthdayResult = await User.updateMany(
        { birthday: { $exists: false } },
        { $set: { birthday: DEFAULT_BIRTHDAY } }
      );
      console.log(
        `✅ Updated ${birthdayResult.modifiedCount} users with default birthday`
      );
    }

    // Update users missing firstName
    if (firstNameCount > 0) {
      console.log("Updating users missing firstName...");
      const firstNameResult = await User.updateMany(
        { firstName: { $exists: false } },
        { $set: { firstName: DEFAULT_FIRST_NAME } }
      );
      console.log(
        `✅ Updated ${firstNameResult.modifiedCount} users with default firstName`
      );
    }

    // Update users missing lastName
    if (lastNameCount > 0) {
      console.log("Updating users missing lastName...");
      const lastNameResult = await User.updateMany(
        { lastName: { $exists: false } },
        { $set: { lastName: DEFAULT_LAST_NAME } }
      );
      console.log(
        `✅ Updated ${lastNameResult.modifiedCount} users with default lastName`
      );
    }

    // Update users with string-type avatars using bulk operation
    if (stringAvatarCount > 0) {
      console.log(
        "Updating users with string-type avatars (bulk operation)..."
      );

      const defaultAvatarObject = {
        thumbnail: null,
        medium: null,
        full: null,
        timestamp: Date.now(),
      };

      const avatarResult = await User.updateMany(
        { avatar: { $type: "string" } },
        { $set: { avatar: defaultAvatarObject } }
      );

      console.log(
        `✅ Updated ${avatarResult.modifiedCount} users with proper avatar object format`
      );
    }

    console.log("\n✅ All user accounts have been fixed successfully!");
  } catch (err) {
    console.error("❌ Error fixing user accounts:", err);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the function
fixUserAccountsBulk();
