require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const GuestCode = require("./models/GuestCode"); // Make sure this path is correct

// Simple email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function collectEmails() {
  try {
    // Connect to the MongoDB database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database connected successfully");

    // Fetch unique and valid emails from GuestCode collection
    const emails = await GuestCode.find({}).select("email -_id"); // Select only the email field
    const filteredEmails = emails
      .map((emailObj) => emailObj.email)
      .filter(
        (email, index, self) =>
          self.indexOf(email) === index && emailRegex.test(email)
      ); // Unique and valid emails

    // Write the valid emails to a text file
    fs.writeFileSync("emails.txt", filteredEmails.join("\n"));
    console.log("Emails exported successfully to emails.txt");
  } catch (error) {
    console.error("Error collecting emails:", error);
  } finally {
    // Disconnect from the database
    await mongoose.disconnect();
    console.log("Database connection closed");
  }
}

collectEmails();
