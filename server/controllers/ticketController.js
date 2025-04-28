const Ticket = require("../models/ticketModel");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer");
const { format } = require("date-fns");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs").promises;
const nodemailer = require("nodemailer");
const TicketSettings = require("../models/ticketSettingsModel");
const { sendEmail } = require("../utils/sendEmail");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const { createEventEmailTemplate } = require("../utils/emailLayout");

// Create a direct ticket order for pay-at-entrance option
const createDirectTickets = async (req, res) => {
  try {
    const { firstName, lastName, email, eventId, tickets } = req.body;

    if (!email || !eventId || !tickets || tickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Fetch the event details
    const event = await Event.findById(eventId).populate("brand").populate({
      path: "lineups",
      select: "name category avatar",
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Verify that the event uses 'atEntrance' payment method for its tickets
    const ticketSetting = await TicketSettings.findOne({
      eventId: eventId,
    });

    if (!ticketSetting || ticketSetting.paymentMethod !== "atEntrance") {
      return res.status(400).json({
        success: false,
        message: "This event doesn't support pay-at-entrance tickets",
      });
    }

    // Create a mock order object (without Stripe integration)
    const order = {
      eventId,
      email,
      firstName,
      lastName,
      status: "pending-payment", // Special status for pay-at-entrance
      tickets: tickets.map((ticket) => ({
        ticketId: ticket.ticketId,
        name: ticket.name,
        quantity: ticket.quantity,
        pricePerUnit: ticket.price,
        pax: ticket.paxPerTicket || 1, // Map paxPerTicket from frontend to pax in our model
      })),
      paymentMethod: "atEntrance",
      createdAt: new Date(),
      _id: new mongoose.Types.ObjectId(), // Generate a new ID for the order
    };

    // Create tickets for the order
    const createdTickets = [];
    for (const item of order.tickets) {
      for (let i = 0; i < item.quantity; i++) {
        // Create ticket data
        const ticketData = {
          eventId: order.eventId,
          userId:
            req.user?._id ||
            new mongoose.Types.ObjectId("000000000000000000000000"), // Use a default guest user ID if not logged in
          orderId: order._id,
          ticketType: "standard",
          ticketName: item.name,
          price: item.pricePerUnit,
          pax: item.pax || 1, // Use the pax field from our order tickets
          status: "pending-payment", // Special status for pay-at-entrance
          paymentMethod: "atEntrance",
          securityToken: generateRandomString(12), // Generate security token
          // Add customer details separately
          firstName: firstName,
          lastName: lastName,
          customerEmail: email,
        };

        // Create the ticket
        const ticket = new Ticket(ticketData);
        await ticket.save();
        createdTickets.push(ticket);
      }
    }

    // Send email with tickets attached as PDFs
    try {
      await sendPayAtEntranceEmail(order, createdTickets, event);
    } catch (emailError) {
      console.error("Error sending ticket email:", emailError);
      // Continue even if email fails, we still created the tickets
    }

    // Update ticket settings with the number of tickets sold
    for (const item of order.tickets) {
      await TicketSettings.findByIdAndUpdate(
        item.ticketId,
        { $inc: { soldCount: item.quantity } },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Tickets created successfully",
      tickets: createdTickets.map((t) => ({
        id: t._id,
        securityToken: t.securityToken,
      })),
    });
  } catch (error) {
    console.error("Error creating direct tickets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create tickets",
      error: error.message,
    });
  }
};

// Function to send email for pay-at-entrance tickets
const sendPayAtEntranceEmail = async (order, tickets, event) => {
  try {
    // Configure Brevo API client
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // If the event lineups aren't populated, fetch them now
    let eventWithLineups = event;
    if (event && (!event.lineups || !Array.isArray(event.lineups))) {
      eventWithLineups = await Event.findById(event._id)
        .populate("brand")
        .populate({
          path: "lineups",
          select: "name category subtitle avatar",
        });
    }

    // Generate PDF for each ticket
    const ticketPDFs = [];
    for (const ticket of tickets) {
      const pdfBuffer = await generateTicketPDF(ticket);
      ticketPDFs.push({
        content: pdfBuffer.toString("base64"),
        name: `ticket_${ticket.securityToken}.pdf`,
      });
    }

    // Calculate total amount
    const totalAmount = calcTotalAmount(order);

    // Ensure lineups are properly formatted with all fields
    const lineups = Array.isArray(eventWithLineups.lineups)
      ? eventWithLineups.lineups.map((lineup) => ({
          name: lineup.name || "",
          category: lineup.category || "Other",
          subtitle: lineup.subtitle || "",
          avatar: lineup.avatar || null,
        }))
      : [];

    // Create additional content specific to pay-at-entrance tickets
    const additionalContent = `
      <div style="background-color: #f8f8f8; border-left: 4px solid #ff9800; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-weight: 600; font-size: 18px; color: #ff9800;">Important: Payment at Entrance</p>
        <p style="margin: 8px 0 0; font-size: 15px;">These tickets are only valid when paid at the venue entrance.</p>
        <p style="margin: 8px 0 0;">Total Amount Due: <strong>€${totalAmount}</strong></p>
        <p style="margin: 8px 0 0;">Payment Method: <strong>Pay at Entrance</strong></p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Your tickets are attached to this email. Please bring them with you to the event and be prepared to pay the above amount before entry.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #666;">Please note that this is not an invoice, but a ticket reservation. Your reservation will be held for the event, but payment must be completed at the venue entrance.</p>
      </div>
    `;

    // Use the common email template
    const htmlContent = createEventEmailTemplate({
      recipientName: `${order.firstName} ${order.lastName}`,
      eventTitle: eventWithLineups?.title || "Event",
      eventDate: eventWithLineups?.startDate || eventWithLineups?.date,
      eventLocation:
        eventWithLineups?.location || eventWithLineups?.venue || "",
      eventAddress: eventWithLineups?.street || "",
      eventCity: eventWithLineups?.city || "",
      eventPostalCode: eventWithLineups?.postalCode || "",
      startTime: eventWithLineups?.startTime || "",
      endTime: eventWithLineups?.endTime || "",
      description:
        "Thank you for reserving tickets for this event. Please see important payment information below.",
      lineups: lineups,
      primaryColor: eventWithLineups?.brand?.colors?.primary || "#ff9800",
      additionalContent: additionalContent,
      footerText:
        "This is an automated email. For any questions, please contact the event organizer.",
    });

    // Build email parameters
    const emailParams = {
      sender: {
        name: eventWithLineups?.brand?.name || "GuestCode",
        email: process.env.SENDER_EMAIL || "noreply@guest-code.com",
      },
      to: [
        {
          email: order.email,
          name: `${order.firstName} ${order.lastName}`,
        },
      ],
      bcc: [
        {
          email: "contact@guest-code.com",
        },
      ],
      replyTo: {
        email: "contact@guest-code.com",
        name: "GuestCode Support",
      },
      subject: `Your Tickets for ${eventWithLineups?.title} - Payment at Entrance`,
      htmlContent: htmlContent,
      attachment: ticketPDFs,
    };

    // Send email using Brevo API
    const result = await apiInstance.sendTransacEmail(emailParams);
    console.log(
      `Email sent to ${order.email} with ${tickets.length} tickets for pay-at-entrance`
    );
    return result;
  } catch (error) {
    console.error("Error sending pay-at-entrance email:", error);
    throw error;
  }
};

// Helper function to calculate total amount from order
const calcTotalAmount = (order) => {
  return order.tickets
    .reduce((total, item) => total + item.pricePerUnit * item.quantity, 0)
    .toFixed(2);
};

// Function to generate random string for ticket codes
const generateRandomString = (length = 8) => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like 0,O,1,I
  let result = "";

  // Get current timestamp and add 3 chars from it for uniqueness
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  result += timestamp;

  // Fill the rest with random characters
  const remainingLength = length - timestamp.length;
  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
};

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
          pax: item.pax || 1, // Set pax from the item or default to 1
          // Add customer details if available in the order (separate first and last name)
          firstName: order.firstName || null,
          lastName: order.lastName || null,
          customerEmail: order.email || null,
          // Add billing address if available
          billingAddress: order.billingAddress || order.address || null,
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
      .populate({
        path: "lineups",
        select: "name category subtitle avatar",
      });
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

    // Special heading for pay-at-entrance tickets
    const payAtEntranceHeader =
      ticket.paymentMethod === "atEntrance"
        ? `<div style="position: absolute; top: 0.5rem; left: 0; right: 0; text-align: center; background-color: ${primaryColor}; padding: 5px; color: ${accentColor}; font-weight: bold; font-size: 0.8rem;">
        Payment at Entrance
      </div>`
        : "";

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
        ${payAtEntranceHeader}
        
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
              ${
                ticket.paymentMethod === "atEntrance"
                  ? `
                <p style="margin: 0.5rem 0 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Price</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${ticket.price.toFixed(
                  2
                )} EUR</p>
                `
                  : ``
              }
            </div>
            
            <div style="margin-top: 0.75rem;">
              ${
                ticket.paymentMethod === "atEntrance"
                  ? `
                <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">People</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${ticket.pax}</p>
                `
                  : ticket.pax > 1
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
          
          ${ticket.paymentMethod === "atEntrance" ? `` : ""}
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

    // For pay-at-entrance tickets, we need special handling
    if (ticket.paymentMethod === "atEntrance") {
      if (ticket.status === "pending-payment") {
        return res.status(200).json({
          valid: true,
          requiresPayment: true,
          message: "Ticket requires payment at entrance",
          ticket: {
            id: ticket._id,
            type: ticket.ticketType,
            name: ticket.ticketName,
            price: ticket.price,
            event:
              (await Event.findById(ticket.eventId))?.title || "Unknown Event",
          },
        });
      } else if (ticket.status === "paid") {
        // If already paid, handle it like a normal valid ticket
        if (ticket.usedAt) {
          return res.status(400).json({
            valid: false,
            message: `Ticket has already been used at ${ticket.usedAt.toLocaleString()}`,
            status: "used",
            usedAt: ticket.usedAt,
          });
        }
      }
    } else if (ticket.status !== "valid") {
      return res.status(400).json({
        valid: false,
        message: `Ticket is ${ticket.status}`,
        status: ticket.status,
        usedAt: ticket.usedAt,
      });
    }

    // Mark ticket as used
    ticket.status = ticket.paymentMethod === "atEntrance" ? "paid" : "used";
    ticket.usedAt = new Date();
    await ticket.save();

    // Return ticket details
    const event = await Event.findById(ticket.eventId);

    return res.json({
      valid: true,
      message:
        ticket.paymentMethod === "atEntrance"
          ? "Ticket marked as paid and validated"
          : "Ticket validated successfully",
      ticket: {
        id: ticket._id,
        type: ticket.ticketType,
        name: ticket.ticketName,
        price: ticket.price,
        event: event?.title || "Unknown Event",
        paymentMethod: ticket.paymentMethod,
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
  createDirectTickets,
};
