#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const readline = require("readline");
const chalk = require("chalk");

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to prompt the user for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Calculate break-even points and ticket prices
function calculateBreakpoints(
  artistName,
  artistBudget,
  flightsCost,
  hotelsCost,
  commissionPercentage,
  venueCapacity,
  maxThroughput
) {
  // Convert commission from percentage to decimal
  const commissionRate = commissionPercentage / 100;

  // Calculate total artist cost including commission
  const commissionAmount = artistBudget * commissionRate;
  const totalArtistCost =
    artistBudget + flightsCost + hotelsCost + commissionAmount;

  // Define attendance percentages to calculate breakpoints for
  const attendancePercentages = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  // Calculate tickets with 40% profit
  const profitTarget = 0.4; // 40% profit
  const profitTargetTickets = attendancePercentages.map((percentage) => {
    const attendees = Math.round(venueCapacity * percentage);
    // To achieve 40% profit, we need revenue = totalArtistCost * 1.4
    const targetRevenue = totalArtistCost * (1 + profitTarget);
    const ticketPrice = targetRevenue / attendees;

    return {
      percentage,
      attendees,
      ticketPrice: Math.ceil(ticketPrice),
      revenue: attendees * Math.ceil(ticketPrice),
      profit: attendees * Math.ceil(ticketPrice) - totalArtistCost,
      profitPercentage:
        ((attendees * Math.ceil(ticketPrice) - totalArtistCost) /
          totalArtistCost) *
        100,
    };
  });

  // Find the standard ticket at 60% attendance with 40% profit
  const standardTicket = profitTargetTickets.find(
    (ticket) => Math.round(ticket.percentage * 100) === 60
  );

  // Set backstage ticket as 4x the standard ticket price
  const backstageTicket = {
    ticketPrice: standardTicket.ticketPrice * 4,
    attendees: Math.ceil(standardTicket.attendees * 0.1), // Assume 10% of standard attendees
    venuePercentage: Math.round(
      (Math.ceil(standardTicket.attendees * 0.1) / venueCapacity) * 100
    ),
    percentage: standardTicket.percentage,
  };

  return {
    artistName,
    artistBudget,
    flightsCost,
    hotelsCost,
    commissionPercentage,
    commissionAmount,
    totalArtistCost,
    venueCapacity,
    maxThroughput,
    profitTargetTickets,
    recommendations: {
      standardTicket,
      backstageTicket,
    },
  };
}

// Function to format currency with the € symbol after the number
function formatEuro(amount) {
  return `${amount.toLocaleString("de-DE")} €`;
}

// Generate PDF report
function generatePDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    // Create a new PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Budget Analysis for ${data.artistName}`,
        Author: "Event Budget Calculator",
      },
    });

    // Pipe the PDF to a file
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Define colors for the PDF
    const colors = {
      primary: "#3498db", // Blue
      secondary: "#2c3e50", // Dark Blue
      success: "#27ae60", // Green
      warning: "#f39c12", // Orange
      danger: "#e74c3c", // Red
      light: "#ecf0f1", // Light Gray
      dark: "#34495e", // Dark Gray
      highlight: "#9b59b6", // Purple
      background: "#f9f9f9", // Off White
    };

    // Add header with a background color
    doc.rect(0, 0, doc.page.width, 80).fill(colors.secondary);

    // Add title
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("#FFFFFF")
      .text(`Event Budget Analysis`, 50, 30, {
        align: "center",
      });

    doc.fontSize(18).text(`${data.artistName}`, 50, 55, {
      align: "center",
    });

    // Reset positioning
    doc.moveDown(2).fillColor("#000000");

    // Create a styled box for the budget summary
    const summaryBoxY = doc.y + 10;
    doc
      .roundedRect(50, summaryBoxY, doc.page.width - 100, 190, 5)
      .fillAndStroke(colors.light, colors.secondary);

    // Add summary section
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(colors.secondary)
      .text("Budget Summary", 70, summaryBoxY + 15);

    // Draw a divider line
    doc
      .moveTo(70, summaryBoxY + 35)
      .lineTo(doc.page.width - 70, summaryBoxY + 35)
      .stroke(colors.secondary);

    // Two-column layout for summary
    const leftCol = 70;
    const rightCol = doc.page.width / 2 + 20;

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#000000")
      .text(`Artist Budget:`, leftCol, summaryBoxY + 45)
      .font("Helvetica-Bold")
      .text(
        `${formatEuro(data.artistBudget)}`,
        leftCol + 120,
        summaryBoxY + 45
      );

    doc
      .font("Helvetica")
      .text(`Flights Cost:`, leftCol, summaryBoxY + 65)
      .font("Helvetica-Bold")
      .text(`${formatEuro(data.flightsCost)}`, leftCol + 120, summaryBoxY + 65);

    doc
      .font("Helvetica")
      .text(`Hotels Cost:`, leftCol, summaryBoxY + 85)
      .font("Helvetica-Bold")
      .text(`${formatEuro(data.hotelsCost)}`, leftCol + 120, summaryBoxY + 85);

    doc
      .font("Helvetica")
      .text(`Commission Rate:`, leftCol, summaryBoxY + 105)
      .font("Helvetica-Bold")
      .text(`${data.commissionPercentage}%`, leftCol + 120, summaryBoxY + 105);

    doc
      .font("Helvetica")
      .text(`Commission Amount:`, leftCol, summaryBoxY + 125)
      .font("Helvetica-Bold")
      .text(
        `${formatEuro(data.commissionAmount)}`,
        leftCol + 120,
        summaryBoxY + 125
      );

    doc
      .font("Helvetica")
      .text(`Event Date:`, rightCol, summaryBoxY + 45)
      .font("Helvetica-Bold")
      .text(`${data.eventDate}`, rightCol + 120, summaryBoxY + 45);

    doc
      .font("Helvetica")
      .text(`Venue Capacity:`, rightCol, summaryBoxY + 65)
      .font("Helvetica-Bold")
      .text(
        `${data.venueCapacity.toLocaleString("de-DE")} people`,
        rightCol + 120,
        summaryBoxY + 65
      );

    doc
      .font("Helvetica")
      .text(`Maximum Throughput:`, rightCol, summaryBoxY + 85)
      .font("Helvetica-Bold")
      .text(
        `${data.maxThroughput.toLocaleString("de-DE")} people`,
        rightCol + 120,
        summaryBoxY + 85
      );

    // Total cost with background highlight
    doc
      .roundedRect(leftCol - 10, summaryBoxY + 150, 250, 25, 3)
      .fill(colors.secondary);

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#FFFFFF")
      .text(`Total Artist Cost:`, leftCol, summaryBoxY + 157)
      .text(
        `${formatEuro(data.totalArtistCost)}`,
        leftCol + 130,
        summaryBoxY + 157
      );

    // Add recommended price section
    let recommendedBoxY = summaryBoxY + 210;

    // Add recommended price box - highlight the best recommended price
    const recHeight = 110;

    // Box header
    doc
      .roundedRect(50, recommendedBoxY, doc.page.width - 100, recHeight, 5)
      .fillAndStroke(colors.primary, colors.primary);

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#FFFFFF")
      .text("Recommended Ticket Prices", 70, recommendedBoxY + 15, {
        align: "center",
      });

    // Draw a divider line
    doc
      .moveTo(70, recommendedBoxY + 35)
      .lineTo(doc.page.width - 70, recommendedBoxY + 35)
      .stroke("#FFFFFF");

    // Two pricing strategies - adjust width and position
    const ticketBoxWidth = 220;
    const col1 = 80;
    const col2 = doc.page.width - ticketBoxWidth - 80;
    const y = recommendedBoxY + 45;

    // Standard ticket (first and more prominent)
    if (data.recommendations.standardTicket) {
      doc
        .roundedRect(col1, y, ticketBoxWidth, 50, 3)
        .fillAndStroke(colors.warning, colors.warning);

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#FFFFFF")
        .text("Standard Ticket", col1, y + 5, {
          align: "center",
          width: ticketBoxWidth,
        })
        .fontSize(18)
        .text(
          `${formatEuro(data.recommendations.standardTicket.ticketPrice)}`,
          col1,
          y + 25,
          { align: "center", width: ticketBoxWidth }
        );
    }

    // Backstage ticket
    if (data.recommendations.backstageTicket) {
      doc
        .roundedRect(col2, y, ticketBoxWidth, 50, 3)
        .fillAndStroke(colors.success, colors.success);

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#FFFFFF")
        .text("Backstage Ticket", col2, y + 5, {
          align: "center",
          width: ticketBoxWidth,
        })
        .fontSize(18)
        .text(
          `${formatEuro(data.recommendations.backstageTicket.ticketPrice)}`,
          col2,
          y + 25,
          { align: "center", width: ticketBoxWidth }
        );
    }

    // Move to position after the recommendation box
    doc.y = recommendedBoxY + recHeight + 20;

    // Add 40% profit target table directly (skip the break-even analysis)
    // Fix alignment of the header
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(colors.secondary)
      .text("40% Profit Target Analysis", 50, doc.y, { align: "left" });

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#000000")
      .text(
        "This table shows ticket prices needed to achieve a 40% profit at different attendance levels"
      );

    doc.moveDown(0.5);

    // Create a table header with better styling for profit targets
    const profitTableTop = doc.y;

    // Table header background
    doc
      .rect(50, profitTableTop, doc.page.width - 100, 20)
      .fill(colors.secondary);

    // Header text
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF");

    doc.text("Attendance %", 60, profitTableTop + 5);
    doc.text("Attendance Expectation", 130, profitTableTop + 5);
    doc.text("Ticket Price", 250, profitTableTop + 5);
    doc.text("Revenue", 320, profitTableTop + 5);
    doc.text("Profit %", 390, profitTableTop + 5);

    // Add table data
    let rowY = profitTableTop + 20;
    doc.font("Helvetica").fontSize(10).fillColor("#000000");

    data.profitTargetTickets.forEach((result, index) => {
      // Add alternating row background for readability
      const isEvenRow = index % 2 === 0;
      if (isEvenRow) {
        doc.rect(50, rowY - 2, doc.page.width - 100, 14).fill("#f5f5f5");
      }

      // Highlight the 60% attendance row as recommended for standard ticket
      if (Math.round(result.percentage * 100) === 60) {
        doc.rect(50, rowY - 2, doc.page.width - 100, 14).fill(colors.light);

        doc.circle(55, rowY + 5, 3).fill(colors.primary);
      }

      // Reset position
      doc.text("", 60, rowY);
      doc.fillColor("#000000");

      // Add row data
      doc.text(`${Math.round(result.percentage * 100)}%`, 60, rowY);
      doc.text(result.attendees.toLocaleString("de-DE"), 130, rowY);

      // Highlight recommended ticket prices
      if (Math.round(result.percentage * 100) === 60) {
        doc.font("Helvetica-Bold").fillColor(colors.primary);
      }

      doc.text(`${formatEuro(result.ticketPrice)}`, 250, rowY);

      // Reset style
      doc.font("Helvetica").fillColor("#000000");

      doc.text(`${formatEuro(Math.round(result.revenue))}`, 320, rowY);

      // Show profit percentage
      doc.fillColor(colors.success);
      doc.text(`${Math.round(result.profitPercentage)}%`, 390, rowY);

      // Reset fill color
      doc.fillColor("#000000");

      rowY += 14;
    });

    // Add footer with date and page number
    const totalPages = doc.bufferedPageCount;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Add page footer background
      doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill("#f5f5f5");

      // Add page number
      doc.font("Helvetica").fontSize(9).fillColor(colors.dark);

      doc.text(`Page ${i + 1} of ${totalPages}`, 0, doc.page.height - 25, {
        align: "center",
      });

      // Add date
      const date = new Date().toLocaleDateString("de-DE");
      doc.text(`Generated on ${date}`, 50, doc.page.height - 25, {
        align: "left",
      });

      // Add disclaimer
      doc.text(
        "Budget Analysis Tool",
        doc.page.width - 50,
        doc.page.height - 25,
        { align: "right" }
      );
    }

    // Finalize the PDF
    doc.end();

    stream.on("finish", () => {
      resolve(outputPath);
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

// Main function
async function main() {
  console.log(chalk.bold.blue("\n=== Event Budget Calculator ===\n"));

  try {
    // Get user input
    const artistName = await prompt(chalk.yellow("Enter artist name: "));
    const eventDate = await prompt(chalk.yellow("Enter event date: "));
    const artistBudget = parseFloat(
      await prompt(chalk.yellow("Enter artist budget (in €): "))
    );
    const flightsCost = parseFloat(
      await prompt(chalk.yellow("Enter flights cost (in €): "))
    );
    const hotelsCost = parseFloat(
      await prompt(chalk.yellow("Enter hotels cost (in €): "))
    );
    const commissionPercentage = parseFloat(
      await prompt(chalk.yellow("Enter commission percentage (%): "))
    );
    const venueCapacity = parseInt(
      await prompt(chalk.yellow("Enter venue capacity (people): "))
    );
    const maxThroughput = parseInt(
      await prompt(chalk.yellow("Enter maximum throughput (people): "))
    );

    // Validate input
    if (
      isNaN(artistBudget) ||
      isNaN(flightsCost) ||
      isNaN(hotelsCost) ||
      isNaN(commissionPercentage) ||
      isNaN(venueCapacity) ||
      isNaN(maxThroughput)
    ) {
      throw new Error("All numerical inputs must be valid numbers");
    }

    console.log(chalk.green("\nCalculating breakpoints..."));

    // Calculate breakpoints
    const data = calculateBreakpoints(
      artistName,
      artistBudget,
      flightsCost,
      hotelsCost,
      commissionPercentage,
      venueCapacity,
      maxThroughput
    );

    // Add event date to data
    data.eventDate = eventDate;

    // Ensure the output directory exists
    const outputDir = path.join(__dirname, "budget-reports");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Generate a filename based on artist and date
    const sanitizedArtistName = artistName
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    const date = new Date().toISOString().split("T")[0];
    const outputFileName = `${sanitizedArtistName}-budget-analysis-${date}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    console.log(chalk.green("\nGenerating PDF report..."));

    // Generate PDF
    const pdfPath = await generatePDF(data, outputPath);

    console.log(chalk.bold.green("\nSuccess!"));
    console.log(chalk.white(`PDF report has been generated at: ${pdfPath}`));

    // Display summary in console
    console.log(chalk.bold.blue("\n=== Summary ==="));
    console.log(chalk.white(`Artist: ${data.artistName}`));
    console.log(chalk.white(`Event Date: ${data.eventDate}`));
    console.log(chalk.white(`Total Cost: ${formatEuro(data.totalArtistCost)}`));

    // Display pricing recommendations
    if (data.recommendations.standardTicket) {
      console.log(
        chalk.yellow(
          `Standard Ticket: ${formatEuro(
            data.recommendations.standardTicket.ticketPrice
          )} (yields 40% profit at recommended attendance)`
        )
      );
    }

    if (data.recommendations.backstageTicket) {
      console.log(
        chalk.green(
          `Backstage Ticket: ${formatEuro(
            data.recommendations.backstageTicket.ticketPrice
          )} (premium option at 4x standard price)`
        )
      );
    }
  } catch (error) {
    console.error(chalk.bold.red("\nError:"), chalk.red(error.message));
  } finally {
    rl.close();
  }
}

// Run the main function
main();
