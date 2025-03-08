require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Brand = require("./models/brandModel");
const Role = require("./models/roleModel");

// Default values for missing required fields
const DEFAULT_BIRTHDAY = new Date("1990-01-01");
const DEFAULT_FIRST_NAME = "Guest";
const DEFAULT_LAST_NAME = "User";

// Constants for brand and event IDs
const TARGET_EVENT_ID = "654d4bf7b3cceeb4f02c13b5";
const TARGET_BRAND_ID = "67ba051873bd89352d3ab6db";
const MEDIA_MANAGER_ROLE = "MEDIA MANAGER";

async function fixUserAccounts() {
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

    // Find users missing birthday
    const usersMissingBirthday = await User.find({
      birthday: { $exists: false },
    });
    console.log(
      `Found ${usersMissingBirthday.length} users missing birthday field`
    );

    // Find users missing firstName
    const usersMissingFirstName = await User.find({
      firstName: { $exists: false },
    });
    console.log(
      `Found ${usersMissingFirstName.length} users missing firstName field`
    );

    // Find users missing lastName
    const usersMissingLastName = await User.find({
      lastName: { $exists: false },
    });
    console.log(
      `Found ${usersMissingLastName.length} users missing lastName field`
    );

    // Find users with string-type avatars (old format)
    const usersWithStringAvatars = await User.find({
      avatar: { $type: "string" },
    });
    console.log(
      `Found ${usersWithStringAvatars.length} users with string-type avatars`
    );

    // Find users who have the specific event ID in their events array but are not part of the brand
    console.log(
      `Searching for users with event ID ${TARGET_EVENT_ID} who are not part of brand ${TARGET_BRAND_ID}...`
    );

    // Get the brand
    const brand = await Brand.findById(TARGET_BRAND_ID);
    if (!brand) {
      console.error(`❌ Brand with ID ${TARGET_BRAND_ID} not found`);
      return;
    }

    // Get existing team member user IDs
    const existingTeamMemberIds = brand.team.map((member) =>
      member.user.toString()
    );

    // Find users who have the event but are not in the team
    const usersWithEvent = await User.find({
      events: TARGET_EVENT_ID,
      _id: { $nin: existingTeamMemberIds },
    });

    console.log(
      `Found ${usersWithEvent.length} users with the event who are not part of the brand team`
    );

    // Update users missing birthday
    if (usersMissingBirthday.length > 0) {
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
    if (usersMissingFirstName.length > 0) {
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
    if (usersMissingLastName.length > 0) {
      console.log("Updating users missing lastName...");
      const lastNameResult = await User.updateMany(
        { lastName: { $exists: false } },
        { $set: { lastName: DEFAULT_LAST_NAME } }
      );
      console.log(
        `✅ Updated ${lastNameResult.modifiedCount} users with default lastName`
      );
    }

    // Update users with string-type avatars
    if (usersWithStringAvatars.length > 0) {
      console.log("Updating users with string-type avatars...");

      // For each user with string avatar, update to the new object format
      let avatarFixCount = 0;
      for (const user of usersWithStringAvatars) {
        // Set avatar to null object format
        user.avatar = {
          thumbnail: null,
          medium: null,
          full: null,
          timestamp: Date.now(),
        };
        await user.save();
        avatarFixCount++;

        // Log progress every 10 users
        if (avatarFixCount % 10 === 0) {
          console.log(
            `Progress: Fixed ${avatarFixCount}/${usersWithStringAvatars.length} avatars`
          );
        }
      }

      console.log(
        `✅ Updated ${avatarFixCount} users with proper avatar object format`
      );
    }

    // Add users with the specific event to the brand team
    if (usersWithEvent.length > 0) {
      console.log(
        `Adding users with event ID ${TARGET_EVENT_ID} to brand team with role "${MEDIA_MANAGER_ROLE}"...`
      );

      // Check if the MEDIA MANAGER role exists
      const mediaManagerRole = await Role.findOne({
        brandId: TARGET_BRAND_ID,
        name: MEDIA_MANAGER_ROLE,
      });

      if (!mediaManagerRole) {
        console.log(`Creating "${MEDIA_MANAGER_ROLE}" role for brand...`);
        // Create the role if it doesn't exist
        const newRole = new Role({
          name: MEDIA_MANAGER_ROLE,
          brandId: TARGET_BRAND_ID,
          createdBy: brand.owner,
          isDefault: false,
          permissions: {
            events: {
              create: false,
              edit: true,
              delete: false,
              view: true,
            },
            team: {
              manage: false,
              view: true,
            },
            analytics: {
              view: true,
            },
            codes: {
              friends: {
                generate: true,
                limit: 10,
                unlimited: false,
              },
              backstage: {
                generate: false,
                limit: 0,
                unlimited: false,
              },
              table: {
                generate: false,
              },
              ticket: {
                generate: false,
              },
              guest: {
                generate: false,
              },
            },
            scanner: {
              use: true,
            },
          },
        });

        await newRole.save();
        console.log(`✅ Created "${MEDIA_MANAGER_ROLE}" role for brand`);
      }

      // Add users to the brand team
      let addedCount = 0;
      for (const user of usersWithEvent) {
        // Check if user is already in the team (double-check)
        const isAlreadyTeamMember = brand.team.some(
          (member) => member.user.toString() === user._id.toString()
        );

        if (!isAlreadyTeamMember) {
          // Add user to team with MEDIA MANAGER role
          brand.team.push({
            user: user._id,
            role: MEDIA_MANAGER_ROLE,
            joinedAt: new Date(),
          });

          addedCount++;
        }
      }

      if (addedCount > 0) {
        await brand.save();
        console.log(
          `✅ Added ${addedCount} users to brand team with "${MEDIA_MANAGER_ROLE}" role`
        );
      } else {
        console.log("No new users were added to the brand team");
      }
    }

    // Log details of fixed users
    console.log("\n--- Detailed User Fixes ---");

    // Log details of users that had missing birthday
    if (usersMissingBirthday.length > 0) {
      console.log("\nUsers fixed with default birthday:");
      for (const user of usersMissingBirthday) {
        console.log(`- ${user.username || user.email} (ID: ${user._id})`);
      }
    }

    // Log details of users that had missing firstName
    if (usersMissingFirstName.length > 0) {
      console.log("\nUsers fixed with default firstName:");
      for (const user of usersMissingFirstName) {
        console.log(`- ${user.username || user.email} (ID: ${user._id})`);
      }
    }

    // Log details of users that had missing lastName
    if (usersMissingLastName.length > 0) {
      console.log("\nUsers fixed with default lastName:");
      for (const user of usersMissingLastName) {
        console.log(`- ${user.username || user.email} (ID: ${user._id})`);
      }
    }

    // Log details of users that had string-type avatars
    if (usersWithStringAvatars.length > 0) {
      console.log("\nUsers fixed with proper avatar object format:");
      for (const user of usersWithStringAvatars) {
        console.log(`- ${user.username || user.email} (ID: ${user._id})`);
      }
    }

    // Log details of users added to the brand team
    if (usersWithEvent.length > 0) {
      console.log(
        `\nUsers added to brand team with "${MEDIA_MANAGER_ROLE}" role:`
      );
      for (const user of usersWithEvent) {
        console.log(`- ${user.username || user.email} (ID: ${user._id})`);
      }
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
fixUserAccounts();
