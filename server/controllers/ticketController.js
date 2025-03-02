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
const createTicketsForOrder = async (order, userId) => {
  try {
    const tickets = [];

    // Create a ticket for each item in the order
    for (const item of order.tickets) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketData = {
          eventId: order.eventId,
          userId:
            userId || new mongoose.Types.ObjectId("000000000000000000000000"), // Use a default guest user ID if userId is not provided
          orderId: order._id,
          ticketType: item.type || "standard",
          ticketName: item.name,
          price: item.pricePerUnit,
          // Additional fields can be added here if needed
        };

        const ticket = await createTicket(ticketData);
        tickets.push(ticket);
      }
    }

    return tickets;
  } catch (error) {
    console.error("Error creating tickets for order:", error);
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
    const event = await Event.findById(ticket.eventId).populate("brand");
    const brand = event ? await Brand.findById(event.brand) : null;

    // Get brand colors or use defaults
    const primaryColor = brand?.colors?.primary || "#ffc807";
    const accentColor = brand?.colors?.accent || "#000000";

    // Generate QR code
    const qrCodeDataUrl = await generateTicketQR(ticket.securityToken);

    // Format date
    const eventDate = formatTicketDate(event?.date);

    // Create HTML template for the ticket
    const htmlTemplate = `
    <html style="font-family: 'Manrope', sans-serif;">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Manrope&display=swap" rel="stylesheet">
      <body
      style="position: relative; color: white; background-color: black; border-radius: 1.75rem; width: 24.375rem; height: 47.438rem; font-family: Manrope;">
        <h1 style="position: absolute; top: 3.25rem; left: 2.313rem; margin: 0; font-weight: 500; font-size: 1.85rem">Ticket</h1>
        ${
          brand?.logo?.medium
            ? `<img src="${brand.logo.medium}" style="position: absolute; top: 4rem; right: 2.313rem; width: 4rem;">`
            : `<div style="position: absolute; top: 4rem; right: 2.313rem; width: 4rem; height: 4rem; background-color: ${primaryColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: ${accentColor}; font-weight: bold; font-size: 1.5rem;">${
                brand?.name?.charAt(0) || "G"
              }</span>
          </div>`
        }
        <div style="color: black; position: absolute; width: 20.375rem; height: 27rem; background-color: ${accentColor}; border-radius: 1.75rem; top: 7.5rem; left: 2rem;">
          
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
            </div>
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Date</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                eventDate.day
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                eventDate.date
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                event?.startTime || eventDate.time
              }</p>
            </div>
          </div>
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div> 
              <div style="margin-top: 0.5rem;">
                <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Line Up</p>
                ${
                  event?.lineup
                    ? event.lineup
                        .map(
                          (artist) =>
                            `<p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${artist.name}</p>`
                        )
                        .join("")
                    : `<p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">TBA</p>`
                }
              </div>
            </div>

            <div style="margin-top: 0.5rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Music</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Afrobeats</p>                    
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Amapiano</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Dancehall</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">& co</p>
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
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Price</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${ticket.price.toFixed(
                2
              )} EUR</p>        
            </div>
          </div>
        </div>

        <div style="color: black; position: absolute; bottom: 2.938rem; left: 2rem; background-color: white; width: 20.375rem; height: 10rem; border-radius: 1.75rem; display: grid; grid-template-columns: repeat(2,minmax(min-content,max-content)); grid-gap: 2.5rem; justify-items: center; justify-content: center; align-content: center; align-items: center;">
          <div style="justify-self: center; text-align: center;">
            <p style="margin: 0; font-weight: 700; font-size: .90rem; line-height: 1.5rem;">${ticket.ticketName.toUpperCase()}</p>
            <p style="margin: 0; font-weight: 700; font-size: 1.35rem; line-height: 1.5rem;">${
              brand?.name || "GuestCode"
            }</p>
          </div>
          <div style="justify-self: center;">
            <img style="background-color: white; width: 8rem; height: 8rem;" src="${qrCodeDataUrl}"></img>
            <p style="margin: 0; font-weight: 500; font-size: 0.5rem; text-align: center;">${
              ticket.securityToken
            }</p>        
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
