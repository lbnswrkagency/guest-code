require("dotenv").config();
const mongoose = require("mongoose");
const GuestCode = require("./models/GuestCode");
const InvitationCode = require("./models/InvitationModel");
const Brand = require("./models/brandModel"); // Required for populate
const LineUp = require("./models/lineupModel"); // Required for populate
const Genre = require("./models/genreModel"); // Required for populate
const fs = require("fs");
const path = require("path");
const { sendQRCodeInvitation } = require("./utils/email");
const chalk = require("chalk");

// ═══════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════
const testMode = false;
const testEmail = "zafer.gueney@gmail.com";
const DELAY_BETWEEN_EMAILS = 5000; // 5 seconds

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
const log = {
  header: (text) =>
    console.log(
      chalk.bold.cyan(`\n${"═".repeat(60)}\n  ${text}\n${"═".repeat(60)}`),
    ),
  step: (text) => console.log(chalk.gray(`  → ${text}`)),
  success: (text) => console.log(chalk.green(`  ✓ ${text}`)),
  warn: (text) => console.log(chalk.yellow(`  ⚠ ${text}`)),
  error: (text) => console.log(chalk.red(`  ✗ ${text}`)),
  info: (text) => console.log(chalk.white(`  ${text}`)),
  dim: (text) => console.log(chalk.dim(`    ${text}`)),
  sent: (name, email) =>
    console.log(
      chalk.green(`  ✓ `) + chalk.white(name.padEnd(25)) + chalk.dim(email),
    ),
  progress: (current, total) => {
    const pct = ((current / total) * 100).toFixed(0).padStart(3);
    const bar = "█".repeat(Math.round((current / total) * 20)).padEnd(20, "░");
    return `${chalk.cyan(bar)} ${chalk.white(pct + "%")}`;
  },
  newline: () => console.log(),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectToDatabase() {
  log.step("Connecting to MongoDB...");
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log.success("Connected");
  } catch (error) {
    log.error("Failed to connect");
    process.exit(1);
  }
}

async function sendInviteEmails() {
  try {
    // Header
    console.clear();
    log.header(testMode ? "EMAIL SENDER (TEST MODE)" : "EMAIL SENDER");

    await connectToDatabase();
    log.newline();

    // Check invites directory
    const invitesDir = path.join(__dirname, "invites");
    if (!fs.existsSync(invitesDir)) {
      log.error("No invites directory found. Run send-invites.js first.");
      process.exit(1);
    }

    const pdfFiles = fs
      .readdirSync(invitesDir)
      .filter((f) => f.endsWith(".pdf"));
    if (pdfFiles.length === 0) {
      log.warn("No PDFs found. Run send-invites.js first.");
      process.exit(0);
    }

    log.success(`${pdfFiles.length} invitations ready to send`);
    log.newline();

    if (testMode) {
      log.header("TEST MODE - Sending 1 email");
    } else {
      log.header(`Sending ${pdfFiles.length} emails`);
    }

    let sent = 0;
    let failed = 0;

    const total = pdfFiles.length;

    for (let i = 0; i < pdfFiles.length; i++) {
      const pdfFile = pdfFiles[i];
      const pdfPath = path.join(invitesDir, pdfFile);
      const invitationCodeId = path.basename(pdfFile, ".pdf");

      try {
        const invitationCode = await InvitationCode.findById(invitationCodeId);

        if (!invitationCode) {
          failed++;
          continue;
        }

        // Get source code for unsubscribe link
        let sourceCode = null;
        if (invitationCode.guestCode) {
          sourceCode = await GuestCode.findById(invitationCode.guestCode);
        }

        const recipientEmail = testMode ? testEmail : invitationCode.email;
        const codeIdForUnsubscribe =
          invitationCode.code || invitationCode.guestCode;

        // Show progress bar with name
        const current = i + 1;
        const remaining = total - current;
        const pct = ((current / total) * 100).toFixed(0).padStart(3);
        const bar = "█"
          .repeat(Math.round((current / total) * 20))
          .padEnd(20, "░");
        const cleanName = (invitationCode.name || "")
          .replace(/^Guest Code for /i, "")
          .substring(0, 20)
          .padEnd(20);
        process.stdout.write(
          `\r  ${chalk.cyan(bar)} ${chalk.white(pct + "%")} ${chalk.gray("|")} ${chalk.white(cleanName)} ${chalk.dim(`(${remaining} left)`)}`,
        );

        // Send email
        await sendQRCodeInvitation(
          invitationCode.name,
          recipientEmail,
          pdfPath,
          invitationCode.event,
          codeIdForUnsubscribe,
        );

        sent++;

        // Update source code and delete PDF in production
        if (!testMode) {
          if (sourceCode) {
            sourceCode.inviteCreated = false;
            sourceCode.invited = (sourceCode.invited || 0) + 1;
            await sourceCode.save();
          }
          fs.unlinkSync(pdfPath);
        } else {
          fs.unlinkSync(pdfPath);
        }

        // Stop after 1 in test mode
        if (testMode) {
          log.newline();
          log.newline();
          log.info(`Set ${chalk.bold("testMode = false")} to send all emails`);
          break;
        }

        // Delay between emails (show countdown)
        if (i < pdfFiles.length - 1) {
          for (let s = DELAY_BETWEEN_EMAILS / 1000; s > 0; s--) {
            process.stdout.write(
              `\r  ${chalk.cyan(bar)} ${chalk.white(pct + "%")} ${chalk.gray("|")} ${chalk.green("✓")} ${chalk.white(cleanName)} ${chalk.dim(`next in ${s}s...`)}  `,
            );
            await sleep(1000);
          }
        }
      } catch (error) {
        failed++;
        process.stdout.write(
          `\r  ${chalk.red("✗")} Failed to send                                              \n`,
        );
      }
    }

    log.newline();
    log.header("COMPLETE");
    log.success(`${sent} emails sent`);
    if (failed > 0) log.dim(`${failed} failed`);
  } catch (error) {
    log.error(error.message);
  } finally {
    await mongoose.disconnect();
    log.newline();
    log.dim("Disconnected from MongoDB");
    log.newline();
  }
}

sendInviteEmails();
