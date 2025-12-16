require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User"); // Ensure this path is correct

async function transferNameToFirstName() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database connected successfully");

    // Find all users with a 'name' field
    const usersToUpdate = await User.find({
      name: { $exists: true },
    });

    let updatedCount = 0;

    console.log("Users to update:", usersToUpdate.length);

    for (const user of usersToUpdate) {
      // Logging the user object to check its structure
      console.log(`Processing user: ${JSON.stringify(user)}`);

      // Update the document by setting firstName to the value of name and removing name
      const result = await User.findByIdAndUpdate(
        user._id,
        {
          $set: { firstName: user.firstName },
          $unset: { name: "" },
        },
        { runValidators: false, new: true }
      );

      if (result) {
        console.log(
          `Updated user: ${user.firstName} -> firstName set and name removed`
        );
        updatedCount++;
      } else {
        console.log(`Failed to update user: ${user.firstName}`);
      }
    }

    console.log(
      `Name transfer process completed. Updated ${updatedCount} users.`
    );
  } catch (error) {
    console.error("Error transferring user names:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Database disconnected");
  }
}

// Run the transfer function
transferNameToFirstName();
