// reset-invites.js

require("dotenv").config();
const mongoose = require("mongoose");
const GuestCode = require("./models/GuestCode");
const InvitationCode = require("./models/InvitationModel");
const chalk = require("chalk");
const ora = require("ora");

async function connectToDatabase() {
  const dbUri = process.env.MONGODB_URI;
  const spinner = ora("Connecting to MongoDB...").start();
  try {
    await mongoose.connect(dbUri, {
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

async function resetInvitations() {
  try {
    await connectToDatabase();

    console.log(chalk.cyan("\n🔍 Fetching GuestCodes..."));
    const guestCodes = await GuestCode.find({ inviteCreated: true });
    console.log(
      chalk.green(`✅ Found ${guestCodes.length} GuestCodes to reset`)
    );

    console.log(
      chalk.cyan("\n🔄 Resetting GuestCodes and deleting InvitationCodes...")
    );
    let resetCount = 0;
    let deletedInvitations = 0;
    const spinner = ora("Processing...").start();

    for (const [index, guestCode] of guestCodes.entries()) {
      // Reset GuestCode
      guestCode.inviteCreated = false;
      await guestCode.save();
      resetCount++;

      // Delete corresponding InvitationCode
      const result = await InvitationCode.deleteOne({
        guestCode: guestCode._id,
      });
      deletedInvitations += result.deletedCount;

      const progress = (index + 1) / guestCodes.length;
      spinner.text = chalk.yellow(
        `Progress: ${(progress * 100).toFixed(2)}% (${index + 1}/${
          guestCodes.length
        })`
      );
    }

    spinner.succeed(chalk.green(`Reset process completed`));
    console.log(chalk.yellow(`\n📊 Summary:`));
    console.log(chalk.yellow(`   GuestCodes reset: ${resetCount}`));
    console.log(
      chalk.yellow(`   InvitationCodes deleted: ${deletedInvitations}`)
    );
  } catch (error) {
    console.error(chalk.red("\n❌ Error during the reset process:"), error);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.magenta("\n👋 Disconnected from MongoDB"));
  }
}

resetInvitations();
