require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

// ============================================================
// EDIT THESE VALUES TO CREATE A NEW USER
// ============================================================

// Required user information - EDIT THESE VALUES
const USER_DATA = {
  username: "miguel", // Required: unique username
  firstName: "Miguel", // Required: first name
  lastName: "Bautista", // Required: last name
  email: "miguel@penelopeandjackson.com", // Required: unique email address
  password: "miguel101", // Required: minimum 6 characters
  birthday: "1990-01-01", // Required: format YYYY-MM-DD
};

// Optional: Set to true any roles you want to assign
const USER_ROLES = {
  isAdmin: false, // Administrative access
  isDeveloper: false, // Developer access
  isAlpha: true, // Alpha access
};

// ============================================================
// DON'T EDIT BELOW THIS LINE
// ============================================================

async function createSimpleUser() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Validate required fields
    const requiredFields = [
      "username",
      "firstName",
      "lastName",
      "email",
      "password",
      "birthday",
    ];
    const missingFields = requiredFields.filter((field) => !USER_DATA[field]);

    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields.join(", "));
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(USER_DATA.email)) {
      console.error("❌ Invalid email format");
      process.exit(1);
    }

    // Validate password length
    if (USER_DATA.password.length < 6) {
      console.error("❌ Password must be at least 6 characters");
      process.exit(1);
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(USER_DATA.birthday)) {
      console.error("❌ Invalid date format. Use YYYY-MM-DD");
      process.exit(1);
    }

    const birthdayDate = new Date(USER_DATA.birthday);
    if (isNaN(birthdayDate.getTime())) {
      console.error("❌ Invalid birth date");
      process.exit(1);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(USER_DATA.password, 10);

    // Create new user with required fields
    const userData = {
      username: USER_DATA.username,
      firstName: USER_DATA.firstName,
      lastName: USER_DATA.lastName,
      email: USER_DATA.email,
      password: hashedPassword,
      birthday: new Date(USER_DATA.birthday),
      isVerified: true, // Set to true by default for admin-created accounts
    };

    // Add any role settings
    Object.keys(USER_ROLES).forEach((role) => {
      if (USER_ROLES[role] === true) {
        userData[role] = true;
      }
    });

    // Create the user
    const newUser = new User(userData);

    // Log the user data being created
    console.log("\n📋 Creating user with the following details:");
    console.log(`Username: ${newUser.username}`);
    console.log(`Name: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`Email: ${newUser.email}`);
    console.log(
      `Birthday: ${new Date(newUser.birthday).toISOString().split("T")[0]}`
    );

    // Show active roles
    const activeRoles = Object.entries(USER_ROLES)
      .filter(([key, value]) => value === true)
      .map(([key]) => key.replace("is", ""));

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
      console.error(err.stack);
    }
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the function
createSimpleUser();
