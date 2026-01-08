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
const ora = require("ora");

const testMode = true; // Set to 'false' for production
const testEmail = "zafer.gueney@gmail.com"; // Your test email

// New option to include all guests or only those who attended
const includeAllGuests = false; // Set to 'true' to include all guests, 'false' to include only guests who attended

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
  const barLength = 30;
  const filledLength = Math.round(barLength * progress);
  const bar = "▓".repeat(filledLength) + "░".repeat(barLength - filledLength);
  return `${bar} ${(progress * 100).toFixed(2)}%`;
}

async function getEventsByTitle() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) =>
    new Promise((resolve) => rl.question(query, resolve));

  const eventTitle = await question(
    chalk.cyan("Enter the event title (e.g., 'Afro Spiti'): ")
  );

  console.log(
    chalk.cyan(`\n🔍 Searching for events with title: ${eventTitle}`)
  );

  // Find all events with matching title
  const allEvents = await Event.find({
    title: { $regex: eventTitle, $options: "i" },
  }).sort({ startDate: 1 }); // Sort by date ascending

  if (allEvents.length === 0) {
    console.log(chalk.red("❌ No events found with that title"));
    rl.close();
    process.exit(1);
  }

  // Filter for future events (upcoming events only)
  const now = new Date();
  const futureEvents = allEvents.filter(event => new Date(event.startDate) > now);

  let events;
  if (futureEvents.length > 0) {
    // Use only upcoming events
    events = futureEvents;
    console.log(
      chalk.green(`✅ Found ${futureEvents.length} upcoming events with title "${eventTitle}"`)
    );
    console.log(chalk.cyan(`📅 Filtering for upcoming events only (${allEvents.length - futureEvents.length} past events excluded)`));
  } else {
    // If no future events, use all events but warn user
    events = allEvents;
    console.log(
      chalk.yellow(`⚠️  Found ${allEvents.length} events with title "${eventTitle}" but none are upcoming`)
    );
    console.log(chalk.yellow(`📅 Including past events for invitation generation`));
  }

  // Display events for confirmation
  events.forEach((event, index) => {
    const eventDate = new Date(event.startDate);
    const isUpcoming = eventDate > now;
    const dateStr = eventDate.toLocaleDateString();
    const status = isUpcoming ? chalk.green("UPCOMING") : chalk.red("PAST");
    
    console.log(
      chalk.blue(
        `  ${index + 1}. ${event.title} - ${dateStr} [${status}] (ID: ${event._id})`
      )
    );
  });

  // If we have upcoming events, prioritize the next one
  if (futureEvents.length > 0) {
    const nextEvent = futureEvents[0];
    console.log(chalk.cyan(`\n🎯 Next upcoming event: ${nextEvent.title} on ${new Date(nextEvent.startDate).toLocaleDateString()}`));
  }

  const includeGuestCodeAnswer = await question(
    chalk.cyan("\nInclude legacy GuestCode model? (yes/no): ")
  );

  const shouldIncludeGuestCode = includeGuestCodeAnswer.toLowerCase() === "yes";

  const paxCheckedAnswer = await question(
    chalk.cyan("\nOnly include codes where paxChecked > 0 (people who attended)? (yes/no): ")
  );

  const onlyAttendedGuests = paxCheckedAnswer.toLowerCase() === "yes";

  const confirmAnswer = await question(
    chalk.cyan(`\nProceed with these ${events.length} events? (yes/no): `)
  );

  if (confirmAnswer.toLowerCase() !== "yes") {
    console.log(chalk.yellow("Process aborted by user"));
    rl.close();
    process.exit(0);
  }

  rl.close();
  return { events, shouldIncludeGuestCode, onlyAttendedGuests };
}

async function processInvitations() {
  try {
    await connectToDatabase();

    if (testMode) {
      console.log(
        chalk.cyan("\n🧪 Test Mode: Analyzing codes and generating one test invitation...")
      );

      // Get events for test mode (same as production)
      const { events, shouldIncludeGuestCode, onlyAttendedGuests } = await getEventsByTitle();
      const eventIds = events.map(event => event._id);

      console.log(chalk.cyan("\n🔍 Fetching codes from codesModel..."));

      // Fetch guest codes from codesModel (same as production)
      let codesQuery = {
        eventId: { $in: eventIds },
        type: "guest"
      };

      if (onlyAttendedGuests) {
        codesQuery.paxChecked = { $gt: 0 };
      }

      // Only include codes that allow personal invites (undefined/null = true, false = no)
      codesQuery.$or = [
        { personalInvite: { $ne: false } },
        { personalInvite: { $exists: false } }
      ];

      const guestCodes = await Code.find(codesQuery);
      console.log(chalk.green(`✅ Found ${guestCodes.length} guest codes from codesModel`));

      let allCodesToProcess = [...guestCodes];

      // Include GuestCode model data if requested (same as production)
      if (shouldIncludeGuestCode) {
        console.log(chalk.cyan("\n🔍 Fetching from legacy GuestCode model..."));
        
        let guestCodeQuery = {};
        if (onlyAttendedGuests) {
          guestCodeQuery.paxChecked = { $gt: 0 };
        }

        const legacyGuestCodes = await GuestCode.find(guestCodeQuery);
        console.log(chalk.green(`✅ Found ${legacyGuestCodes.length} guest codes from GuestCode model`));
        
        // Convert legacy GuestCode to compatible format
        const convertedGuestCodes = legacyGuestCodes.map(code => ({
          _id: code._id,
          eventId: code.event,
          type: "guest",
          name: code.name,
          guestEmail: code.email,
          condition: code.condition,
          maxPax: code.pax,
          paxChecked: code.paxChecked,
          inviteCreated: code.inviteCreated,
          isLegacy: true
        }));

        allCodesToProcess = [...allCodesToProcess, ...convertedGuestCodes];
      }

      // Process unique emails (same as production)
      console.log(chalk.cyan("\n🧹 Filtering unique codes by email..."));
      const uniqueCodes = {};
      for (const code of allCodesToProcess) {
        const email = code.guestEmail || code.email;
        if (!email) continue;

        if (
          !uniqueCodes[email] ||
          (uniqueCodes[email].createdAt && code.createdAt && uniqueCodes[email].createdAt < code.createdAt)
        ) {
          uniqueCodes[email] = code;
        }
      }

      const totalUniqueCodes = Object.keys(uniqueCodes).length;
      console.log(chalk.green(`✅ ${totalUniqueCodes} unique codes found for processing`));

      // Count codes already processed
      const processedCodesCount = allCodesToProcess.filter(code => 
        code.inviteCreated === true
      ).length;
      console.log(chalk.green(`✅ ${processedCodesCount} codes already have invitations created`));

      // Show what would happen in production
      const newInvitationsCount = Object.keys(uniqueCodes).filter(email => 
        !uniqueCodes[email].inviteCreated
      ).length;
      console.log(chalk.yellow(`\n📊 Test Mode Analysis:`));
      console.log(chalk.yellow(`   Would process: ${totalUniqueCodes} unique emails`));
      console.log(chalk.yellow(`   Would create: ${newInvitationsCount} new invitations`));
      console.log(chalk.yellow(`   Would skip: ${totalUniqueCodes - newInvitationsCount} already created`));

      // Now create ONE test invitation using the first available code
      const firstEmail = Object.keys(uniqueCodes)[0];
      if (!firstEmail) {
        console.log(chalk.red("❌ No codes found to test with"));
        return;
      }

      const firstCode = uniqueCodes[firstEmail];
      
      // Find the next upcoming event for invitation (not the event from the code)
      const now = new Date();
      const upcomingEvents = events.filter(event => new Date(event.startDate) > now);
      const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : events[0];
      
      // Fetch actual event data for PDF generation (use next upcoming event)
      const event = await Event.findById(nextEvent._id)
        .populate("brand")
        .populate("lineups")
        .populate("genres");

      console.log(chalk.cyan(`\n🧪 Creating test invitation using code for: ${firstEmail}`));
      console.log(chalk.cyan(`🎯 Invitation will be for upcoming event: ${event.title} (${new Date(event.startDate).toLocaleDateString()})`));

      // Create InvitationModel for test (link to upcoming event, not code's original event)
      const invitationCode = new InvitationCode({
        event: event._id, // Use upcoming event ID, not original code's event
        name: firstCode.name || firstCode.guestName || "Test User",
        email: testEmail, // Use test email instead of actual email
        condition: "Happy New Year! Free Entrance All Night",
        pax: firstCode.maxPax || firstCode.pax || 1,
        paxChecked: 0,
        guestCode: firstCode.isLegacy ? firstCode._id : null,
        code: firstCode.isLegacy ? null : firstCode._id,
      });
      await invitationCode.save();
      console.log(chalk.green(`  ✅ Test InvitationModel created successfully`));

      // Generate QR code URL
      const qrCodeDataURL = await QRCode.toDataURL(`${invitationCode._id}`, {
        errorCorrectionLevel: "L",
      });
      console.log(chalk.green(`  ✅ QR code generated`));

      // Generate PDF
      const pdfPath = path.join(
        __dirname,
        "invites",
        `${invitationCode._id}.pdf`
      );
      await createTicketPDFInvitation(
        event, // Pass actual event object
        qrCodeDataURL,
        invitationCode.name,
        invitationCode.email,
        invitationCode.condition,
        invitationCode.pax,
        pdfPath
      );
      console.log(chalk.green(`  ✅ PDF generated successfully`));

      console.log(chalk.green(`✅ Test invitation generated successfully for ${testEmail}`));
      console.log(chalk.yellow(`\n🧪 Test completed! Set testMode = false to process all ${totalUniqueCodes} codes.`));
    } else {
      // Production mode - get events by title
      const { events, shouldIncludeGuestCode, onlyAttendedGuests } = await getEventsByTitle();
      const eventIds = events.map((event) => event._id);

      console.log(chalk.cyan("\n🔍 Fetching codes from codesModel..."));

      // Fetch guest codes from codesModel
      let codesQuery = {
        eventId: { $in: eventIds },
        type: "guest",
      };

      if (onlyAttendedGuests) {
        codesQuery.paxChecked = { $gt: 0 };
      }

      // Only include codes that allow personal invites (undefined/null = true, false = no)
      codesQuery.$or = [
        { personalInvite: { $ne: false } },
        { personalInvite: { $exists: false } },
      ];

      const guestCodes = await Code.find(codesQuery);
      console.log(
        chalk.green(`✅ Found ${guestCodes.length} guest codes from codesModel`)
      );

      let allCodesToProcess = [...guestCodes];

      // Include GuestCode model data if requested
      if (shouldIncludeGuestCode) {
        console.log(chalk.cyan("\n🔍 Fetching from legacy GuestCode model..."));

        let guestCodeQuery = {};
        if (onlyAttendedGuests) {
          guestCodeQuery.paxChecked = { $gt: 0 };
        }

        const legacyGuestCodes = await GuestCode.find(guestCodeQuery);
        console.log(
          chalk.green(
            `✅ Found ${legacyGuestCodes.length} guest codes from GuestCode model`
          )
        );

        // Convert legacy GuestCode to compatible format
        const convertedGuestCodes = legacyGuestCodes.map((code) => ({
          _id: code._id,
          eventId: code.event,
          type: "guest",
          name: code.name,
          guestEmail: code.email,
          condition: code.condition,
          maxPax: code.pax,
          paxChecked: code.paxChecked,
          inviteCreated: code.inviteCreated,
          isLegacy: true,
        }));

        allCodesToProcess = [...allCodesToProcess, ...convertedGuestCodes];
      }

      // Process unique emails
      console.log(chalk.cyan("\n🧹 Filtering unique codes by email..."));
      const uniqueCodes = {};
      for (const code of allCodesToProcess) {
        const email = code.guestEmail || code.email;
        if (!email) continue;

        if (
          !uniqueCodes[email] ||
          (uniqueCodes[email].createdAt &&
            code.createdAt &&
            uniqueCodes[email].createdAt < code.createdAt)
        ) {
          uniqueCodes[email] = code;
        }
      }

      const totalUniqueCodes = Object.keys(uniqueCodes).length;
      console.log(
        chalk.green(`✅ ${totalUniqueCodes} unique codes will be processed`)
      );

      // Count codes already processed
      const processedCodesCount = allCodesToProcess.filter(
        (code) => code.inviteCreated === true
      ).length;
      console.log(
        chalk.green(
          `✅ ${processedCodesCount} codes already have invitations created`
        )
      );

      // Ask user if they want to proceed
      const readline = require("readline");

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const question = (query) =>
        new Promise((resolve) => rl.question(query, resolve));

      const answer = await question(
        `\nDo you want to create ${totalUniqueCodes} invitation codes? (yes/no): `
      );

      if (answer.toLowerCase() !== "yes") {
        console.log(chalk.yellow(`\n❌ Process aborted by user.`));
        rl.close();
        process.exit(0);
      }

      rl.close();

      // Find the next upcoming event to use for all invitations
      const now = new Date();
      const upcomingEvents = events.filter(event => new Date(event.startDate) > now);
      const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : events[0];
      
      // Fetch the upcoming event data once for all invitations
      const upcomingEventData = await Event.findById(nextEvent._id)
        .populate("brand")
        .populate("lineups")
        .populate("genres");

      console.log(chalk.cyan("\n🚀 Generating invitations and PDFs..."));
      console.log(chalk.cyan(`🎯 All invitations will be for upcoming event: ${upcomingEventData.title} (${new Date(upcomingEventData.startDate).toLocaleDateString()})`));
      
      let invitationsCreated = 0;
      let skippedInvitations = 0;
      const spinner = ora("Processing invitations...").start();

      for (const [index, email] of Object.keys(uniqueCodes).entries()) {
        const code = uniqueCodes[email];
        const codeName = code.name || code.guestName || email;

        console.log(chalk.blue(`\nProcessing code for ${email}:`));
        console.log(chalk.blue(`  - inviteCreated: ${code.inviteCreated}`));
        console.log(chalk.blue(`  - paxChecked: ${code.paxChecked}`));

        if (!code.inviteCreated) {
          console.log(chalk.yellow(`  Creating invitation for ${email}...`));
          try {
            // Use the upcoming event data (not the original event from the code)
            const event = upcomingEventData;

            // Create InvitationModel for upcoming event
            const invitationCode = new InvitationCode({
              event: event._id, // Use upcoming event ID, not original code's event
              name: codeName,
              email: email,
              condition: "Happy New Year! Free Entrance All Night",
              pax: code.maxPax || code.pax || 1,
              paxChecked: 0,
              guestCode: code.isLegacy ? code._id : null,
              code: code.isLegacy ? null : code._id,
            });
            await invitationCode.save();
            console.log(
              chalk.green(`  ✅ InvitationModel created successfully`)
            );

            // Generate QR code URL
            const qrCodeDataURL = await QRCode.toDataURL(
              `${invitationCode._id}`,
              {
                errorCorrectionLevel: "L",
              }
            );
            console.log(chalk.green(`  ✅ QR code generated`));

            // Generate PDF
            const pdfPath = path.join(
              __dirname,
              "invites",
              `${invitationCode._id}.pdf`
            );
            await createTicketPDFInvitation(
              event, // Pass actual event object
              qrCodeDataURL,
              invitationCode.name,
              invitationCode.email,
              invitationCode.condition,
              code.maxPax || code.pax || 1,
              pdfPath
            );
            console.log(chalk.green(`  ✅ PDF generated successfully`));

            // Update original code
            if (code.isLegacy) {
              // Update GuestCode
              await GuestCode.findByIdAndUpdate(code._id, {
                inviteCreated: true,
              });
              console.log(chalk.green(`  ✅ Legacy GuestCode updated`));
            } else {
              // Update Code from codesModel
              await Code.findByIdAndUpdate(code._id, { inviteCreated: true });
              console.log(chalk.green(`  ✅ Code updated`));
            }

            invitationsCreated++;
            console.log(
              chalk.green(`  ✅ Invitation process completed for ${email}`)
            );
          } catch (error) {
            console.error(
              chalk.red(`  ❌ Error processing invitation for ${email}:`),
              error
            );
          }
        } else {
          console.log(
            chalk.yellow(`  Skipping ${email} - Invitation already created`)
          );
          skippedInvitations++;
        }

        const progress = (index + 1) / totalUniqueCodes;
        spinner.text = chalk.yellow(
          `Processing: ${generateProgressBar(
            progress
          )} (${invitationsCreated}/${totalUniqueCodes})`
        );
      }

      spinner.succeed(chalk.green(`Invitations process completed`));
      console.log(chalk.yellow(`\n📊 Summary:`));
      console.log(
        chalk.yellow(`   Total unique codes processed: ${totalUniqueCodes}`)
      );
      console.log(
        chalk.yellow(
          `   New invitations and PDFs created: ${invitationsCreated}`
        )
      );
      console.log(
        chalk.yellow(`   Skipped (already created): ${skippedInvitations}`)
      );
    }
  } catch (error) {
    console.error(
      chalk.red("\n❌ Error during the invitation process:"),
      error
    );
  } finally {
    await mongoose.disconnect();
    console.log(chalk.magenta("\n👋 Disconnected from MongoDB"));
  }
}

processInvitations();
