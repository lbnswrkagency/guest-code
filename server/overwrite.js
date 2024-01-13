require("dotenv").config();
const mongoose = require("mongoose");
const FriendsCode = require("./models/FriendsCode"); // Update the path according to your folder structure

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    const result = await FriendsCode.updateMany(
      {}, // Empty filter to match all documents
      { $set: { condition: "FREE ENTRANCE ALL NIGHT" } }
    );

    console.log(`Updated ${result.nModified} FriendsCode(s)`);
  })
  .then(() => {
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });
