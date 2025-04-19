const Ticket = require("../models/ticketModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer");
const { format } = require("date-fns");
const mongoose = require("mongoose");

// Generate a ticket in the database
const createTicket = async (ticketData) => {
  try {
    const ticket = new Ticket(ticketData);
    await ticket.save();
    return ticket;
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
};

// Create multiple tickets for an order
const createTicketsForOrder = async (order) => {
  try {
    const tickets = [];

    // Generate tickets for each ticket type in the order
    for (const item of order.tickets) {
      // Get ticket settings if available
      let paxValue = item.pax || 1; // Default to item.pax or 1

      if (item.ticketSettingId) {
        try {
          const ticketSetting = await mongoose
            .model("TicketSettings")
            .findById(item.ticketSettingId);
          if (ticketSetting && ticketSetting.paxPerTicket) {
            paxValue = ticketSetting.paxPerTicket;
          }
        } catch (err) {
          console.error(
            `Error fetching ticket settings for ${item.ticketSettingId}:`,
            err
          );
          // Continue with default pax value
        }
      }

      // Create the specified quantity of tickets
      for (let i = 0; i < item.quantity; i++) {
        // Generate a unique code for the ticket
        const ticketCode = generateRandomString(8);

        // Create the ticket data
        const ticketData = {
          orderId: order._id,
          eventId: order.eventId,
          userId: order.userId,
          ticketSettingId: item.ticketSettingId,
          code: ticketCode,
          name: item.name,
          price: item.pricePerUnit,
          status: "active",
          pax: paxValue, // Use the determined pax value
          redeemedAt: null,
        };

        // Create the ticket
        const ticket = await Ticket.create(ticketData);
        tickets.push(ticket);
      }
    }

    return tickets;
  } catch (error) {
    console.error("Error creating tickets:", error);
    throw error;
  }
};

// Format date for display on ticket
const formatTicketDate = (dateString) => {
  if (!dateString) return { day: "", date: "", time: "" };

  const date = new Date(dateString);
  return {
    day: format(date, "EEEE"),
    date: format(date, "dd.MM.yyyy"),
    time: format(date, "HH:mm") + " H",
  };
};

// Calculate remaining time for countdown
const calculateRemainingTime = (endDate) => {
  if (!endDate) return null;

  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return { days, hours };
};

// Generate QR code for a ticket
const generateTicketQR = async (securityToken) => {
  try {
    const qrOption = {
      margin: 1,
      width: 225,
      color: {
        dark: "#000000", // Black dots
        light: "#ffffff", // White background
      },
    };

    return await QRCode.toDataURL(securityToken, qrOption);
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

// Generate PDF ticket
const generateTicketPDF = async (ticket) => {
  try {
    // Fetch related data
    const event = await Event.findById(ticket.eventId)
      .populate("brand")
      .populate("lineups");
    const brand = event ? await Brand.findById(event.brand) : null;

    // Get ticket settings to check for countdown
    const ticketSettings = await mongoose.model("TicketSettings").findOne({
      eventId: ticket.eventId,
      name: ticket.ticketName,
    });

    // Remove countdown from printed ticket - we'll keep the code but not use it in the template
    let countdownDisplay = "";

    // Get brand colors or use defaults
    const primaryColor = brand?.colors?.primary || "#ffc807";
    const accentColor = brand?.colors?.accent || "#000000";

    // Generate QR code
    const qrCodeDataUrl = await generateTicketQR(ticket.securityToken);

    // Format date - prioritize startDate over date
    const eventDate = formatTicketDate(event?.startDate || event?.date);

    // Format ticket name for display - only show the first word (e.g., "EARLY" from "Early Bird")
    const ticketNameParts = ticket.ticketName.split(" ");
    let formattedTicketName = ticketNameParts[0].toUpperCase();

    // Special case for backstage tickets
    if (ticketNameParts[0].toLowerCase() === "backstage") {
      formattedTicketName = "BACKSTAGE";
    }

    // Create a short ticket code for display - shorter version (6 characters)
    const ticketCode = ticket.securityToken.substring(0, 6).toUpperCase();

    // Create HTML template for the ticket
    const htmlTemplate = `
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Manrope', sans-serif;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body
      style="position: relative; color: white; background-color: black; border-radius: 1.75rem; width: 24.375rem; height: 47.438rem; font-family: 'Manrope', sans-serif;">
        <!-- Center the header elements -->
        <div style="position: absolute; top: 3.25rem; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 0 2.313rem;">
          <h1 style="margin: 0; font-weight: 500; font-size: 1.85rem">Ticket</h1>
          ${
            brand?.logo?.medium
              ? `<div style="display: flex; align-items: center; justify-content: center; background-color: #000000; border-radius: 50%; width: 3.5rem; height: 3.5rem; overflow: hidden;"><img src="${brand.logo.medium}" style="max-width: 2.8rem; max-height: 2.8rem; object-fit: contain;"></div>`
              : `<div style="width: 3.5rem; height: 3.5rem; background-color: ${primaryColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span style="color: ${accentColor}; font-weight: bold; font-size: 1.5rem;">${
                  brand?.name?.charAt(0) || "G"
                }</span>
            </div>`
          }
        </div>
        
        <div style="position: absolute; width: 20.375rem; height: 27rem; background-color: black; border-radius: 1.75rem; top: 7.5rem; left: 2rem; border: 1px solid #333333;">
          
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem; color: ${primaryColor};">${
      event?.title || "Event"
    }</h3>   
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">             
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Location</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                event?.venue || ""
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857em; color: #fff; line-height: 1.25rem;">${
                event?.location || ""
              }</p>
              ${
                event?.street
                  ? `<p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${event.street}</p>`
                  : ""
              }
              ${
                event?.postalCode || event?.city
                  ? `<p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                      event.postalCode || ""
                    } ${event.city || ""}</p>`
                  : ""
              }
            </div>
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Date</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                eventDate.day
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                eventDate.date
              }</p>
            </div>
          </div>
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div> 
              <div style="margin-top: 0.5rem;">
                <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Start</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                  event?.startTime || eventDate.time
                }</p>
              </div>
            </div>

            <div style="margin-top: 0.5rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">End</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                event?.endTime
              }</p>
            </div>
          </div>
          
          <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid ${primaryColor}; width: 15.5rem;"></div>

          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Ticket</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                ticket.ticketName
              }</p>        
            </div>
            
            <div style="margin-top: 0.75rem;">
              ${
                ticket.pax > 1
                  ? `
                <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">People</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${ticket.pax}</p>
                `
                  : `
                <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Price</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${ticket.price.toFixed(
                  2
                )} EUR</p>
                `
              }      
            </div>
          </div>
        </div>

        <!-- QR Code section with centered QR and floating code -->
        <div style="position: absolute; bottom: 2.938rem; left: 2rem; background-color: #222222; width: 20.375rem; height: 10rem; border-radius: 1.75rem; display: flex; justify-content: center; align-items: center;">
          <div style="position: relative; width: 100%; height: 100%;">
            <!-- Centered QR code -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
              <img style="background-color: white; width: 8rem; height: 8rem; border-radius: 0.5rem;" src="${qrCodeDataUrl}"></img>
            </div>
            
            <!-- Ticket code displayed in the top right corner -->
            <div style="position: absolute; top: 1rem; right: 1.5rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 700; font-size: .75rem; letter-spacing: 1px;">${ticketCode}</p>
            </div>
          </div>
        </div>
      </body>
    </html>`;

    // Launch puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(htmlTemplate);
    await page.emulateMediaType("screen");

    // Generate PDF with 9:16 aspect ratio
    const pdfBuffer = await page.pdf({
      width: "390px",
      height: "760px",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    await browser.close();

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating ticket PDF:", error);
    throw error;
  }
};

// Validate a ticket (for scanning)
const validateTicket = async (req, res) => {
  try {
    const { securityToken } = req.params;

    const ticket = await Ticket.findOne({ securityToken });

    if (!ticket) {
      return res
        .status(404)
        .json({ valid: false, message: "Ticket not found" });
    }

    if (ticket.status !== "valid") {
      return res.status(400).json({
        valid: false,
        message: `Ticket is ${ticket.status}`,
        status: ticket.status,
        usedAt: ticket.usedAt,
      });
    }

    // Mark ticket as used
    ticket.status = "used";
    ticket.usedAt = new Date();
    await ticket.save();

    // Return ticket details
    const event = await Event.findById(ticket.eventId);

    return res.json({
      valid: true,
      message: "Ticket validated successfully",
      ticket: {
        id: ticket._id,
        type: ticket.ticketType,
        name: ticket.ticketName,
        event: event?.title || "Unknown Event",
        price: ticket.price,
      },
    });
  } catch (error) {
    console.error("Error validating ticket:", error);
    return res.status(500).json({ valid: false, message: "Server error" });
  }
};

// Get tickets for a user
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user._id;

    const tickets = await Ticket.find({ userId })
      .populate({
        path: "eventId",
        select: "title date startTime location venue brand",
        populate: {
          path: "brand",
          select: "name logo",
        },
      })
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res.status(500).json({ message: "Error fetching tickets" });
  }
};

module.exports = {
  createTicket,
  createTicketsForOrder,
  generateTicketPDF,
  validateTicket,
  getUserTickets,
};
