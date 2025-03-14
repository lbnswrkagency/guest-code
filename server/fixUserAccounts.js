require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Brand = require("./models/brandModel");
const Role = require("./models/roleModel");

// Target brand and role IDs
const TARGET_BRAND_ID = "67ba051873bd89352d3ab6db";
const MEMBER_ROLE_ID = "67cb847c689f27f8dbfceddd";
const OWNER_USER_ID = "65707f8da826dc13721ef735";

async function fixBrandRoles() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // 1. Find the specific brand
    console.log(`Looking for brand with ID: ${TARGET_BRAND_ID}`);
    const brand = await Brand.findById(TARGET_BRAND_ID);
    if (!brand) {
      console.error(`❌ Brand with ID ${TARGET_BRAND_ID} not found`);
      return;
    }
    console.log(`✅ Found brand: ${brand.name}`);

    // 2. Delete all roles for this brand except the Member role
    console.log("Deleting existing roles except Member role...");
    const deleteResult = await Role.deleteMany({
      brandId: TARGET_BRAND_ID,
      _id: { $ne: MEMBER_ROLE_ID },
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} roles`);

    // 3. Create new Founder role
    console.log("Creating new Founder role...");
    const founderRole = new Role({
      name: "Founder",
      brandId: TARGET_BRAND_ID,
      createdBy: OWNER_USER_ID,
      isDefault: true,
      isFounder: true,
      permissions: {
        events: {
          create: true,
          edit: true,
          delete: true,
          view: true,
        },
        team: {
          manage: true,
          view: true,
        },
        analytics: {
          view: true,
        },
        codes: {
          friends: {
            generate: true,
            limit: 0,
            unlimited: true,
          },
          backstage: {
            generate: true,
            limit: 0,
            unlimited: true,
          },
          table: {
            generate: true,
          },
          ticket: {
            generate: true,
          },
          guest: {
            generate: true,
          },
        },
        scanner: {
          use: true,
        },
      },
    });

    const savedFounderRole = await founderRole.save();
    console.log(`✅ Created Founder role with ID: ${savedFounderRole._id}`);

    // 4. Update all team members with the correct role IDs using direct MongoDB operations
    console.log("Updating team members with correct role IDs...");

    // Important: We need to directly update the MongoDB documents to ensure the ObjectIds work correctly
    // Get the updated role IDs
    const founderRoleId = savedFounderRole._id;
    const memberRoleId = new mongoose.Types.ObjectId(MEMBER_ROLE_ID);
    const ownerUserId = new mongoose.Types.ObjectId(OWNER_USER_ID);

    // Directly update using MongoDB operations
    const updateResult = await Brand.updateOne({ _id: TARGET_BRAND_ID }, [
      {
        $set: {
          team: {
            $map: {
              input: "$team",
              as: "teamMember",
              in: {
                user: "$$teamMember.user",
                role: {
                  $cond: {
                    if: {
                      $eq: [{ $toString: "$$teamMember.user" }, OWNER_USER_ID],
                    },
                    then: founderRoleId,
                    else: memberRoleId,
                  },
                },
                joinedAt: "$$teamMember.joinedAt",
                _id: "$$teamMember._id",
              },
            },
          },
        },
      },
    ]);

    console.log(
      `✅ Updated brand team members. Modified: ${updateResult.modifiedCount}`
    );

    // 5. Verify everything is fixed
    console.log("\nVerifying fixes...");

    // Verify roles
    const roles = await Role.find({ brandId: TARGET_BRAND_ID });
    console.log(`Found ${roles.length} roles for brand:`);
    roles.forEach((role) => {
      console.log(`- ${role.name} (${role._id}), isFounder: ${role.isFounder}`);
    });

    // Verify team members - fetch fresh data
    const updatedBrand = await Brand.findById(TARGET_BRAND_ID).lean();

    console.log(`\nTeam members (${updatedBrand.team.length}):`);
    for (let i = 0; i < Math.min(updatedBrand.team.length, 10); i++) {
      const member = updatedBrand.team[i];
      const user = await User.findById(member.user);
      const role = await Role.findById(member.role);
      console.log(
        `- ${user ? user.username || user.email : "Unknown"}: Role ${
          role ? role.name : "Unknown"
        } (ID: ${member.role})`
      );
    }
    console.log(`... and ${updatedBrand.team.length - 10} more team members`);

    // Count by role
    const founderCount = updatedBrand.team.filter(
      (m) => m.role && m.role.toString() === founderRoleId.toString()
    ).length;

    const memberCount = updatedBrand.team.filter(
      (m) => m.role && m.role.toString() === memberRoleId.toString()
    ).length;

    console.log(
      `\nRole distribution: ${founderCount} founders, ${memberCount} members`
    );
    console.log(`Total team size: ${updatedBrand.team.length}`);

    console.log("\n✅ Brand roles have been fixed successfully!");
  } catch (err) {
    console.error("❌ Error fixing brand roles:", err);
    console.error(err.stack);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the function
fixBrandRoles();
