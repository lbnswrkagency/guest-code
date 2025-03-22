require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

// Parse command line arguments
const args = process.argv.slice(2);
const argsObj = {};

// Parse arguments in format --key=value
args.forEach((arg) => {
  if (arg.startsWith("--")) {
    const [key, value] = arg.substring(2).split("=");
    argsObj[key] = value;
  }
});

async function createUserFromArgs() {
  try {
    // Check for required parameters
    const requiredParams = [
      "username",
      "firstName",
      "lastName",
      "email",
      "password",
      "birthday",
    ];
    const missingParams = requiredParams.filter((param) => !argsObj[param]);

    if (missingParams.length > 0) {
      console.error(
        "❌ Missing required parameters:",
        missingParams.join(", ")
      );
      console.log(
        `\nUsage: node createUserCli.js --username=john --firstName=John --lastName=Doe --email=john@example.com --password=password123 --birthday=2000-01-01 [--isAdmin=true] [--isStaff=true] ...`
      );
      process.exit(1);
    }

    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(argsObj.password, 10);

    // Create user object with required fields
    const userData = {
      username: argsObj.username,
      firstName: argsObj.firstName,
      lastName: argsObj.lastName,
      email: argsObj.email,
      password: hashedPassword,
      birthday: new Date(argsObj.birthday),
      isVerified: argsObj.isVerified === "true" || true, // Default to true for admin-created accounts
    };

    // Add optional role fields if provided
    const roleFields = [
      "isAdmin",
      "isScanner",
      "isPromoter",
      "isStaff",
      "isDeveloper",
      "isBackstage",
      "isSpitixBattle",
      "isTable",
      "isAlpha",
    ];

    roleFields.forEach((role) => {
      if (argsObj[role] !== undefined) {
        userData[role] = argsObj[role] === "true";
      }
    });

    // Create and save the user
    const newUser = new User(userData);

    // Log the user data being created
    console.log("\n📋 Creating user with the following details:");
    console.log(`Username: ${newUser.username}`);
    console.log(`Name: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`Email: ${newUser.email}`);
    console.log(
      `Birthday: ${new Date(newUser.birthday).toISOString().split("T")[0]}`
    );

    // Show roles that are set to true
    const activeRoles = roleFields
      .filter((role) => newUser[role] === true)
      .map((role) => role.replace("is", ""));

    console.log(
      `Roles: ${activeRoles.length > 0 ? activeRoles.join(", ") : "None"}`
    );

    // Save the user
    const savedUser = await newUser.save();
    console.log("\n✅ User created successfully!");
    console.log(`User ID: ${savedUser._id}`);
  } catch (err) {
    if (err.code === 11000) {
      console.error("\n❌ Error: Duplicate key found.");
      if (err.keyPattern?.email) {
        console.error("Email already exists in the database.");
      }
      if (err.keyPattern?.username) {
        console.error("Username already exists in the database.");
      }
    } else {
      console.error("\n❌ Error creating user:", err.message);
    }
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the function
createUserFromArgs();
