require("dotenv").config();
const mongoose = require("mongoose");
const GuestCode = require("./models/GuestCode"); // Ensure the path is correct

async function updateLatestGuestCodesCondition() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Fetch the latest 120 GuestCodes
    const latestGuestCodes = await GuestCode.find()
      .sort({ createdAt: -1 }) // Sort by creation date descending
      .limit(120)
      .select("_id"); // Select only the _id field

    // Extract the IDs of these GuestCodes
    const guestCodeIds = latestGuestCodes.map((guestCode) => guestCode._id);

    // Update the condition field for these GuestCodes
    const result = await GuestCode.updateMany(
      { _id: { $in: guestCodeIds } },
      { $set: { condition: "FREE ENTRANCE UNTIL 00:30H" } }
    );

    console.log(`Updated ${result.nModified} GuestCode(s)`);
  } catch (err) {
    console.error("Error updating GuestCodes:", err);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

updateLatestGuestCodesCondition();
