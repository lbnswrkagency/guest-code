require("dotenv").config();
const mongoose = require("mongoose");

// Update these require statements to match your project's file structure
const FriendsCode = require("./models/FriendsCode");
const GuestCode = require("./models/GuestCode");
const BackstageCode = require("./models/BackstageCode");

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    generateEventStatistics();
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

async function generateEventStatistics() {
  try {
    const [friendsCodes, guestCodes, backstageCodes] = await Promise.all([
      FriendsCode.find(),
      GuestCode.find(),
      BackstageCode.find(),
    ]);

    // Calculate statistics
    const totalCodesGenerated =
      friendsCodes.length + guestCodes.length + backstageCodes.length;
    const totalPaxChecked =
      friendsCodes.reduce((acc, cur) => acc + cur.paxChecked, 0) +
      guestCodes.reduce((acc, cur) => acc + cur.paxChecked, 0) +
      backstageCodes.reduce((acc, cur) => acc + cur.paxChecked, 0);

    const redemptionRate = (totalPaxChecked / totalCodesGenerated) * 100;

    // Additional statistic: Average pax per code
    const averagePaxPerCode = totalPaxChecked / totalCodesGenerated;

    console.log(`Total Codes Generated: ${totalCodesGenerated}`);
    console.log(`Total Pax Checked: ${totalPaxChecked}`);
    console.log(`Redemption Rate: ${redemptionRate.toFixed(2)}%`);
    console.log(`Average Pax Per Code: ${averagePaxPerCode.toFixed(2)}`);

    // Clean up after yourself
    mongoose.disconnect();
  } catch (error) {
    console.error("Error generating event statistics:", error);
    mongoose.disconnect();
  }
}
