require("dotenv").config();
const mongoose = require("mongoose");
const AlphaKey = require("./models/alphaKeysModel");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Function to generate a random 4-digit code
const generateRandomCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Function to generate unique alpha keys
async function generateAlphaKeys(count = 200) {
  console.log(`Starting to generate ${count} alpha keys...`);

  const existingCodes = new Set();
  const existingKeys = await AlphaKey.find({}, "code");

  // Add existing codes to the set
  existingKeys.forEach((key) => existingCodes.add(key.code));

  let generatedCount = 0;
  let attempts = 0;
  const maxAttempts = count * 10; // Avoid infinite loop

  while (generatedCount < count && attempts < maxAttempts) {
    attempts++;
    const code = generateRandomCode();

    // Skip if code already exists
    if (existingCodes.has(code)) {
      continue;
    }

    try {
      const newKey = new AlphaKey({ code });
      await newKey.save();
      existingCodes.add(code);
      generatedCount++;

      if (generatedCount % 10 === 0) {
        console.log(`Generated ${generatedCount} keys so far...`);
      }
    } catch (error) {
      console.error(`Error saving key with code ${code}:`, error.message);
    }
  }

  console.log(`Successfully generated ${generatedCount} new alpha keys.`);
  return generatedCount;
}

// Run the function and close the connection when done
generateAlphaKeys()
  .then((count) => {
    console.log(`Generation complete. Created ${count} alpha keys.`);
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error generating alpha keys:", error);
    mongoose.connection.close();
    process.exit(1);
  });
