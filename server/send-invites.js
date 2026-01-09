require("dotenv").config();
const mongoose = require("mongoose");
const GuestCode = require("./models/GuestCode");
const InvitationCode = require("./models/InvitationModel");
const Code = require("./models/codesModel");
const Event = require("./models/eventsModel");
const Brand = require("./models/brandModel");
const LineUp = require("./models/lineupModel");
const Genre = require("./models/genreModel");
const fs = require("fs");
const path = require("path");
const createTicketPDFInvitation = require("./utils/pdf-invite");
const QRCode = require("qrcode");
const chalk = require("chalk");

// ═══════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════
const testMode = false;
const testEmail = "zafer.gueney@gmail.com";

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
const log = {
  header: (text) =>
    console.log(
      chalk.bold.cyan(`\n${"═".repeat(60)}\n  ${text}\n${"═".repeat(60)}`)
    ),
  step: (text) => console.log(chalk.gray(`  → ${text}`)),
  success: (text) => console.log(chalk.green(`  ✓ ${text}`)),
  warn: (text) => console.log(chalk.yellow(`  ⚠ ${text}`)),
  error: (text) => console.log(chalk.red(`  ✗ ${text}`)),
  info: (text) => console.log(chalk.white(`  ${text}`)),
  dim: (text) => console.log(chalk.dim(`    ${text}`)),
  progress: (current, total, name, email) => {
    const pct = ((current / total) * 100).toFixed(0).padStart(3);
    const bar = "█".repeat(Math.round((current / total) * 20)).padEnd(20, "░");
    process.stdout.write(
      `\r  ${chalk.cyan(bar)} ${chalk.white(pct + "%")} ${chalk.gray(
        "|"
      )} ${chalk.white(name.padEnd(20))} ${chalk.dim(email)}`
    );
  },
  newline: () => console.log(),
};

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

async function prompt(question) {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(chalk.white(`  ${question} `), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function getEventsByTitle() {
  const eventTitle = await prompt("Event title:");

  log.step(`Searching for "${eventTitle}"...`);
  const allEvents = await Event.find({
    title: { $regex: eventTitle, $options: "i" },
  }).sort({ startDate: 1 });

  if (allEvents.length === 0) {
    log.error("No events found");
    process.exit(1);
  }

  const now = new Date();
  const pastEvents = allEvents.filter((e) => new Date(e.startDate) <= now);
  const futureEvents = allEvents.filter((e) => new Date(e.startDate) > now);

  log.success(
    `Found ${allEvents.length} events (${pastEvents.length} past, ${futureEvents.length} upcoming)`
  );

  if (futureEvents.length === 0) {
    log.warn("No upcoming events - cannot generate invitations");
    process.exit(1);
  }

  const upcomingEvent = futureEvents[0];
  log.info(
    `Target event: ${chalk.bold(upcomingEvent.title)} on ${new Date(
      upcomingEvent.startDate
    ).toLocaleDateString()}`
  );

  const includeLegacy =
    (await prompt("Include legacy GuestCode model? (y/n):")).toLowerCase() ===
    "y";
  const onlyAttended =
    (
      await prompt("Only guests who attended (paxChecked > 0)? (y/n):")
    ).toLowerCase() === "y";

  const confirm = await prompt(
    `\nProceed with ${pastEvents.length} past events for codes? (y/n):`
  );
  if (confirm.toLowerCase() !== "y") {
    log.warn("Aborted");
    process.exit(0);
  }

  return {
    pastEventIds: pastEvents.map((e) => e._id),
    upcomingEvent,
    shouldIncludeGuestCode: includeLegacy,
    onlyAttendedGuests: onlyAttended,
  };
}

async function processInvitations() {
  try {
    // Header
    console.clear();
    log.header(
      testMode ? "INVITATION GENERATOR (TEST MODE)" : "INVITATION GENERATOR"
    );

    // Setup
    const invitesDir = path.join(__dirname, "invites");
    if (!fs.existsSync(invitesDir))
      fs.mkdirSync(invitesDir, { recursive: true });

    await connectToDatabase();
    log.newline();

    // Get events
    const {
      pastEventIds,
      upcomingEvent,
      shouldIncludeGuestCode,
      onlyAttendedGuests,
    } = await getEventsByTitle();
    log.newline();

    // Fetch codes
    log.step("Fetching codes...");

    let codesQuery = {
      eventId: { $in: pastEventIds },
      type: "guest",
      $or: [
        { personalInvite: { $ne: false } },
        { personalInvite: { $exists: false } },
      ],
    };
    if (onlyAttendedGuests) codesQuery.paxChecked = { $gt: 0 };

    const guestCodes = await Code.find(codesQuery);

    // Debug: Check how many codes with personalInvite: false exist (should be excluded)
    const unsubscribedCount = await Code.countDocuments({
      eventId: { $in: pastEventIds },
      type: "guest",
      personalInvite: false
    });
    if (unsubscribedCount > 0) {
      log.dim(`${unsubscribedCount} unsubscribed guests filtered out`);
    }

    let allCodesToProcess = [...guestCodes];

    if (shouldIncludeGuestCode) {
      let legacyQuery = {
        $or: [
          { personalInvite: { $ne: false } },
          { personalInvite: { $exists: false } },
        ],
      };
      if (onlyAttendedGuests) legacyQuery.paxChecked = { $gt: 0 };

      const legacyGuestCodes = await GuestCode.find(legacyQuery);
      const converted = legacyGuestCodes.map((code) => ({
        _id: code._id,
        eventId: code.event,
        type: "guest",
        name: code.name,
        guestName: code.name,
        guestEmail: code.email,
        condition: code.condition,
        maxPax: code.pax,
        paxChecked: code.paxChecked,
        inviteCreated: code.inviteCreated,
        isLegacy: true,
      }));
      allCodesToProcess = [...allCodesToProcess, ...converted];
    }

    // Deduplicate by email
    const uniqueCodes = {};
    for (const code of allCodesToProcess) {
      const email = (code.guestEmail || code.email || "").toLowerCase();
      if (!email) continue;
      if (
        !uniqueCodes[email] ||
        code.createdAt > uniqueCodes[email].createdAt
      ) {
        uniqueCodes[email] = code;
      }
    }

    const totalUnique = Object.keys(uniqueCodes).length;
    const alreadyCreated = Object.values(uniqueCodes).filter(
      (c) => c.inviteCreated
    ).length;
    const toCreate = totalUnique - alreadyCreated;

    log.success(`${totalUnique} unique guests found`);
    log.dim(`${alreadyCreated} already have invitations`);
    log.dim(`${toCreate} new invitations to create`);
    log.newline();

    if (testMode) {
      log.header("TEST MODE - Creating 1 invitation");

      const firstEmail = Object.keys(uniqueCodes)[0];
      if (!firstEmail) {
        log.error("No codes to test");
        return;
      }

      const code = uniqueCodes[firstEmail];
      const rawName = code.guestName || code.name || "Guest";
      const cleanName = rawName.replace(/^Guest Code for /i, "").trim();

      log.info(`Guest: ${chalk.bold(cleanName)} (${testEmail})`);

      const event = await Event.findById(upcomingEvent._id)
        .populate("brand")
        .populate("lineups")
        .populate("genres");

      const invitationCode = new InvitationCode({
        event: event._id,
        name: cleanName,
        email: testEmail,
        condition: "Free entrance all night",
        pax: code.maxPax || code.pax || 1,
        paxChecked: 0,
        guestCode: code.isLegacy ? code._id : null,
        code: code.isLegacy ? null : code._id,
      });
      await invitationCode.save();

      const qrCodeDataURL = await QRCode.toDataURL(`${invitationCode._id}`, {
        errorCorrectionLevel: "L",
      });
      const pdfPath = path.join(invitesDir, `${invitationCode._id}.pdf`);
      await createTicketPDFInvitation(
        event,
        qrCodeDataURL,
        cleanName,
        testEmail,
        invitationCode.condition,
        invitationCode.pax,
        pdfPath
      );

      log.success("PDF created");
      log.newline();
      log.info(
        `Set ${chalk.bold(
          "testMode = false"
        )} to process all ${totalUnique} guests`
      );
    } else {
      // Production mode
      const confirm = await prompt(
        `Create ${toCreate} new invitations? (y/n):`
      );
      if (confirm.toLowerCase() !== "y") {
        log.warn("Aborted");
        process.exit(0);
      }

      log.header(`Processing ${toCreate} invitations`);

      const event = await Event.findById(upcomingEvent._id)
        .populate("brand")
        .populate("lineups")
        .populate("genres");
      let created = 0;
      let skipped = 0;

      const emails = Object.keys(uniqueCodes);
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        const code = uniqueCodes[email];
        const rawName = code.guestName || code.name || email;
        const cleanName = rawName.replace(/^Guest Code for /i, "").trim();

        log.progress(i + 1, emails.length, cleanName, email);

        if (code.inviteCreated) {
          skipped++;
          continue;
        }

        try {
          const invitationCode = new InvitationCode({
            event: event._id,
            name: cleanName,
            email: email,
            condition: "Free entrance all night",
            pax: code.maxPax || code.pax || 1,
            paxChecked: 0,
            guestCode: code.isLegacy ? code._id : null,
            code: code.isLegacy ? null : code._id,
          });
          await invitationCode.save();

          const qrCodeDataURL = await QRCode.toDataURL(
            `${invitationCode._id}`,
            { errorCorrectionLevel: "L" }
          );
          const pdfPath = path.join(invitesDir, `${invitationCode._id}.pdf`);
          await createTicketPDFInvitation(
            event,
            qrCodeDataURL,
            cleanName,
            email,
            invitationCode.condition,
            invitationCode.pax,
            pdfPath
          );

          if (code.isLegacy) {
            await GuestCode.findByIdAndUpdate(code._id, {
              inviteCreated: true,
            });
          } else {
            await Code.findByIdAndUpdate(code._id, { inviteCreated: true });
          }

          created++;
        } catch (err) {
          // Silent fail, continue
        }
      }

      log.newline();
      log.newline();
      log.header("COMPLETE");
      log.success(`${created} invitations created`);
      log.dim(`${skipped} skipped (already existed)`);
    }
  } catch (error) {
    log.error(error.message);
  } finally {
    await mongoose.disconnect();
    log.newline();
    log.dim("Disconnected from MongoDB");
    log.newline();
  }
}

processInvitations();
