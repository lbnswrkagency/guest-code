require("dotenv").config();
const mongoose = require("mongoose");
const GuestCode = require("./models/GuestCode");
const InvitationCode = require("./models/InvitationModel");
const Brand = require("./models/brandModel");
const LineUp = require("./models/lineupModel");
const Genre = require("./models/genreModel");
const fs = require("fs");
const path = require("path");
const { sendQRCodeInvitation } = require("./utils/email");
const chalk = require("chalk");
const ora = require("ora");

const testMode = false; // Set to 'false' for production
const testEmail = "zafer.gueney@gmail.com"; // Your test email

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

function generateProgressBar(progress) {
  const barLength = 20;
  const filledLength = Math.round(barLength * progress);
  const bar = "█".repeat(filledLength) + "-".repeat(barLength - filledLength);
  return `[${bar}] ${(progress * 100).toFixed(2)}%`;
}

async function sendInviteEmails() {
  try {
    await connectToDatabase();

    console.log(chalk.cyan("\n📂 Reading invitation PDFs..."));
    const invitesDir = path.join(__dirname, "invites");
    
    // Check if invites directory exists
    if (!fs.existsSync(invitesDir)) {
      console.log(chalk.red("❌ Invites directory not found. Please run send-invites.js first."));
      process.exit(1);
    }
    
    const pdfFiles = fs.readdirSync(invitesDir);
    const totalPDFs = pdfFiles.length;
    console.log(chalk.green(`✅ Found ${totalPDFs} PDFs to process`));

    if (totalPDFs === 0) {
      console.log(chalk.yellow("⚠️  No PDFs found. Please run send-invites.js first."));
      process.exit(0);
    }

    console.log(chalk.cyan("\n🚀 Sending invitation emails with Happy New Year theme..."));
    let emailsSent = 0;
    const spinner = ora("Processing invitations...").start();

    for (const [index, pdfFile] of pdfFiles.entries()) {
      const pdfPath = path.join(invitesDir, pdfFile);
      const invitationCodeId = path.basename(pdfFile, ".pdf");

      try {
        const invitationCode = await InvitationCode.findById(invitationCodeId);
        if (invitationCode) {
          // Check if this is from legacy GuestCode or new Code model
          let sourceCode = null;
          if (invitationCode.guestCode) {
            sourceCode = await GuestCode.findById(invitationCode.guestCode);
          }

          if (sourceCode || !invitationCode.guestCode) {
            // Determine recipient email based on testMode
            const recipientEmail = testMode ? testEmail : invitationCode.email;

            // Updated email sending with Happy New Year theme, eventId, and codeId for unsubscribe
            const codeIdForUnsubscribe = invitationCode.code || invitationCode.guestCode;
            await sendQRCodeInvitation(
              invitationCode.name,
              recipientEmail,
              pdfPath,
              invitationCode.event, // Pass eventId for email template
              codeIdForUnsubscribe // Pass codeId for unsubscribe link
            );
            console.log(
              chalk.green(`\n✅ Happy New Year invitation email sent to: ${recipientEmail}`)
            );

            // In production mode, update source code and delete PDF
            if (!testMode) {
              // Update the source code inviteCreated status
              if (sourceCode) {
                sourceCode.inviteCreated = false;
                sourceCode.invited = (sourceCode.invited || 0) + 1;
                await sourceCode.save();
              }
              
              // Delete the PDF after sending
              fs.unlinkSync(pdfPath);
              console.log(chalk.green(`  🗑️ PDF deleted: ${pdfFile}`));
            } else {
              // In test mode, delete the test PDF after sending
              fs.unlinkSync(pdfPath);
              console.log(chalk.yellow(`\n🗑️ Test PDF deleted: ${pdfFile}`));
            }

            emailsSent++;

            // In test mode, stop after sending one email
            if (testMode) {
              console.log(
                chalk.yellow("\n🛑 Test mode: Sent one test email. Stopping.")
              );
              break;
            }

            // Add a delay between sending emails to avoid being marked as spam
            if (index < pdfFiles.length - 1) { // Don't delay after the last email
              console.log(chalk.blue("  ⏳ Waiting 5 seconds before next email..."));
              await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds delay
            }
          } else {
            console.log(chalk.yellow(`\n⚠️  Source code not found for ${invitationCode.email}, skipping...`));
          }
        } else {
          console.log(chalk.red(`\n❌ InvitationCode not found for ${pdfFile}`));
        }
      } catch (error) {
        console.error(chalk.red(`\n❌ Error processing ${pdfFile}:`), error);
      }

      const progress = (index + 1) / totalPDFs;
      spinner.text = chalk.yellow(
        `Progress: ${generateProgressBar(
          progress
        )} (${emailsSent}/${totalPDFs})`
      );
    }

    spinner.succeed(chalk.green(`Happy New Year invitation email process completed`));
    console.log(chalk.yellow(`\n🎉 Summary:`));
    console.log(chalk.yellow(`   Total PDFs processed: ${totalPDFs}`));
    console.log(chalk.yellow(`   Happy New Year emails sent: ${emailsSent}`));
    console.log(chalk.green(`\n🎊 Happy New Year from the GuestCode team! 🎊`));
  } catch (error) {
    console.error(
      chalk.red("\n❌ Error during the invitation email process:"),
      error
    );
  } finally {
    await mongoose.disconnect();
    console.log(chalk.magenta("\n👋 Disconnected from MongoDB"));
  }
}

sendInviteEmails();