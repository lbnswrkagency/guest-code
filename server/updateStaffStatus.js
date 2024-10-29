// updateStaffStatus.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const chalk = require("chalk");
const ora = require("ora");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function connectToDatabase() {
  const spinner = ora("Connecting to MongoDB...").start();
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    spinner.succeed(chalk.green("Connected to MongoDB successfully"));
  } catch (error) {
    spinner.fail(chalk.red("Failed to connect to MongoDB"));
    console.error(error);
    process.exit(1);
  }
}

async function updateStaffStatus() {
  const spinner = ora("Fetching non-staff users...").start();
  try {
    const nonStaffUsers = await User.find({
      $or: [{ isStaff: false }, { isStaff: { $exists: false } }],
    });
    spinner.succeed(
      chalk.green(`Found ${nonStaffUsers.length} non-staff users`)
    );

    for (const user of nonStaffUsers) {
      console.log(chalk.cyan("\nUser details:"));
      console.log(chalk.yellow(`Name: ${user.firstName} ${user.lastName}`));
      console.log(chalk.yellow(`Username: ${user.username}`));
      console.log(chalk.yellow(`Email: ${user.email}`));
      console.log(chalk.yellow(`Created At: ${user.createdAt}`));
      console.log(
        chalk.yellow(
          `Current isStaff status: ${
            user.isStaff === undefined ? "Not set" : user.isStaff
          }`
        )
      );

      const answer = await new Promise((resolve) => {
        rl.question(chalk.magenta("Make this user staff? (y/n): "), resolve);
      });

      if (answer.toLowerCase() === "y") {
        await User.updateOne({ _id: user._id }, { $set: { isStaff: true } });
        console.log(chalk.green("User updated to staff status."));
      } else {
        if (user.isStaff === undefined) {
          await User.updateOne({ _id: user._id }, { $set: { isStaff: false } });
          console.log(chalk.blue("User's isStaff field set to false."));
        } else {
          console.log(chalk.blue("User remains non-staff."));
        }
      }
    }

    console.log(chalk.green("\nAll users processed."));
  } catch (error) {
    spinner.fail(chalk.red("Error updating staff status"));
    console.error(chalk.red("\n❌ Error details:"), error);
  }
}

async function main() {
  try {
    await connectToDatabase();
    await updateStaffStatus();
  } catch (error) {
    console.error(chalk.red("\n❌ Unexpected error:"), error);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.magenta("\n👋 Disconnected from MongoDB"));
    rl.close();
  }
}

main();
