require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
const User = require("./models/User");

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt user for input with a question
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate date format (YYYY-MM-DD)
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (isNaN(timestamp)) return false;

  return date.toISOString().startsWith(dateString);
}

async function createUser() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    console.log("\n🧑‍💻 CREATE NEW USER 🧑‍💻");
    console.log("Please enter the required user information:");

    // Get user input with validation
    let username, email, firstName, lastName, password, birthday;

    do {
      username = await prompt("Username: ");
      if (!username) console.log("❌ Username is required");
    } while (!username);

    do {
      firstName = await prompt("First Name: ");
      if (!firstName) console.log("❌ First name is required");
    } while (!firstName);

    do {
      lastName = await prompt("Last Name: ");
      if (!lastName) console.log("❌ Last name is required");
    } while (!lastName);

    do {
      email = await prompt("Email: ");
      if (!email) {
        console.log("❌ Email is required");
      } else if (!isValidEmail(email)) {
        console.log("❌ Please enter a valid email address");
        email = null;
      }
    } while (!email);

    do {
      password = await prompt("Password (min 6 characters): ");
      if (!password) {
        console.log("❌ Password is required");
      } else if (password.length < 6) {
        console.log("❌ Password must be at least 6 characters");
        password = null;
      }
    } while (!password);

    do {
      birthday = await prompt("Birthday (YYYY-MM-DD): ");
      if (!birthday) {
        console.log("❌ Birthday is required");
      } else if (!isValidDate(birthday)) {
        console.log("❌ Please enter a valid date in YYYY-MM-DD format");
        birthday = null;
      }
    } while (!birthday);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      birthday: new Date(birthday),
      isVerified: true, // Set to true by default for admin-created accounts
    });

    // Additional optional fields
    const setRoles = await prompt("Set user roles? (y/n): ");

    if (setRoles.toLowerCase() === "y") {
      const isAdmin = (await prompt("Is Admin? (y/n): ")).toLowerCase() === "y";
      const isScanner =
        (await prompt("Is Scanner? (y/n): ")).toLowerCase() === "y";
      const isPromoter =
        (await prompt("Is Promoter? (y/n): ")).toLowerCase() === "y";
      const isStaff = (await prompt("Is Staff? (y/n): ")).toLowerCase() === "y";
      const isDeveloper =
        (await prompt("Is Developer? (y/n): ")).toLowerCase() === "y";
      const isBackstage =
        (await prompt("Is Backstage? (y/n): ")).toLowerCase() === "y";
      const isTable = (await prompt("Is Table? (y/n): ")).toLowerCase() === "y";
      const isAlpha = (await prompt("Is Alpha? (y/n): ")).toLowerCase() === "y";

      newUser.isAdmin = isAdmin;
      newUser.isScanner = isScanner;
      newUser.isPromoter = isPromoter;
      newUser.isStaff = isStaff;
      newUser.isDeveloper = isDeveloper;
      newUser.isBackstage = isBackstage;
      newUser.isTable = isTable;
      newUser.isAlpha = isAlpha;
    }

    // Confirm user details before saving
    console.log("\n📋 User Details:");
    console.log(`Username: ${newUser.username}`);
    console.log(`Name: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`Email: ${newUser.email}`);
    console.log(
      `Birthday: ${new Date(newUser.birthday).toISOString().split("T")[0]}`
    );
    console.log(
      `Roles: ${
        Object.entries(newUser.toObject())
          .filter(([key, value]) => key.startsWith("is") && value === true)
          .map(([key]) => key.replace("is", ""))
          .join(", ") || "None"
      }`
    );

    const confirmSave = await prompt("\nSave this user? (y/n): ");

    if (confirmSave.toLowerCase() === "y") {
      await newUser.save();
      console.log("\n✅ User created successfully!");
      console.log(`User ID: ${newUser._id}`);
    } else {
      console.log("\n❌ User creation cancelled.");
    }
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
    // Close the readline interface
    rl.close();

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the function
createUser();
