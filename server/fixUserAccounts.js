require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Brand = require("./models/brandModel");
const Role = require("./models/roleModel");

// Target brand and user IDs
const OWNER_USER_ID = "65707f8da826dc13721ef735";

// Second brand config
const BRAND_ID = "67c5eb3eb81c401346b38e64";
const ROLEX_ROLE_ID = "67c5f4a1b81c401346b3904d";

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
    console.log(`Looking for brand with ID: ${BRAND_ID}`);
    const brand = await Brand.findById(BRAND_ID);
    if (!brand) {
      console.error(`❌ Brand with ID ${BRAND_ID} not found`);
      return;
    }
    console.log(`✅ Found brand: ${brand.name}`);

    // 2. Delete the OWNER role but keep ROLEX role
    console.log("Deleting OWNER role...");
    const oldRoles = await Role.find({ brandId: BRAND_ID });
    let ownerRoleId = null;

    for (const role of oldRoles) {
      if (role.name === "OWNER") {
        ownerRoleId = role._id;
        console.log(`Found OWNER role with ID: ${ownerRoleId}`);
        await Role.deleteOne({ _id: ownerRoleId });
        console.log("✅ Deleted OWNER role");
      } else {
        console.log(`Keeping role: ${role.name} (${role._id})`);
      }
    }

    // 3. Create new Founder role
    console.log("Creating new Founder role...");
    const founderRole = new Role({
      name: "Founder",
      brandId: BRAND_ID,
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

    // Get the updated role IDs
    const founderRoleId = savedFounderRole._id;
    const rolexRoleId = new mongoose.Types.ObjectId(ROLEX_ROLE_ID);
    const ownerUserId = new mongoose.Types.ObjectId(OWNER_USER_ID);

    // Directly update using MongoDB operations to convert string roles to ObjectIds
    const updateResult = await Brand.updateOne({ _id: BRAND_ID }, [
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
                    else: {
                      $cond: {
                        if: { $eq: ["$$teamMember.role", "ROLEX"] },
                        then: rolexRoleId,
                        else: "$$teamMember.role", // Keep any other role as is
                      },
                    },
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
    const roles = await Role.find({ brandId: BRAND_ID });
    console.log(`Found ${roles.length} roles for brand:`);
    roles.forEach((role) => {
      console.log(`- ${role.name} (${role._id}), isFounder: ${role.isFounder}`);
    });

    // Verify team members - fetch fresh data
    const updatedBrand = await Brand.findById(BRAND_ID).lean();

    console.log(`\nTeam members (${updatedBrand.team.length}):`);
    for (const member of updatedBrand.team) {
      const user = await User.findById(member.user);
      const role = await Role.findById(member.role);
      console.log(
        `- ${user ? user.username || user.email : "Unknown"}: Role ${
          role ? role.name : "Unknown"
        } (ID: ${member.role})`
      );
    }

    // Count by role
    const founderCount = updatedBrand.team.filter(
      (m) => m.role && m.role.toString() === founderRoleId.toString()
    ).length;

    const rolexCount = updatedBrand.team.filter(
      (m) => m.role && m.role.toString() === rolexRoleId.toString()
    ).length;

    console.log(
      `\nRole distribution: ${founderCount} founders, ${rolexCount} ROLEX roles`
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
