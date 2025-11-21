const SibApiV3Sdk = require("sib-api-v3-sdk");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const Ticket = require("../models/ticketModel");
const QRCode = require("qrcode");
// Import email layout utility
const { createEventEmailTemplate } = require("../utils/emailLayout");

// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const addLeadingZeros = (num, totalLength) => {
  return String(num).padStart(totalLength, "0");
};

const formattedDate = () => {
  let today = new Date();
  const yyyy = today.getFullYear();
  let mm = today.getMonth() + 1;
  let dd = today.getDate();

  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;

  return dd + "." + mm + "." + yyyy;
};

// Generate a shorter invoice number with random digits
const generateInvoiceNumber = (sessionId) => {
  // Generate a random 4-digit number (between 1000-9999)
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  // Add timestamp component to ensure uniqueness (last 2 digits of current timestamp)
  const timestamp = Date.now().toString().slice(-2);

  // Combine for a unique 4-digit code
  const uniqueCode = (parseInt(randomNum.toString() + timestamp) % 10000)
    .toString()
    .padStart(4, "0");

  return `GC${uniqueCode}`;
};

// Format date with leading zeros
const formatDateWithLeadingZeros = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
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

// Add generateTicketQR function
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

// Add generateTicketPDF function directly in this file
const generateTicketPDF = async (ticket) => {
  try {
    // Fetch related data
    const event = await Event.findById(ticket.eventId)
      .populate("brand")
      .populate({
        path: "lineups",
        select: "name category avatar",
      });
    const brand = event ? await Brand.findById(event.brand) : null;

    // Get brand colors or use defaults
    const primaryColor = brand?.colors?.primary || "#ffc807";
    const accentColor = brand?.colors?.accent || "#000000";

    // Generate QR code
    const qrCodeDataUrl = await generateTicketQR(ticket.securityToken);

    // Format date - prioritize startDate over date
    const formatTicketDate = (dateString) => {
      if (!dateString) return { day: "", date: "", time: "" };

      const date = new Date(dateString);
      const formatter = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const formatted = formatter.format(date);

      return {
        day: formatted.split(",")[0],
        date: formatted
          .split(",")[1]
          .trim()
          .replace(/(\d+)\/(\d+)\/(\d+)/, "$2.$1.$3"),
        time:
          date.getHours().toString().padStart(2, "0") +
          ":" +
          date.getMinutes().toString().padStart(2, "0") +
          " H",
      };
    };

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
          
          ${
            ticket.paymentMethod === "atEntrance"
              ? `<div style="margin-top: 1.5rem; padding-left: 2.438rem; padding-right: 2.438rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Price</p>
              <p style="margin: 0; font-weight: 700; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${ticket.price.toFixed(
                2
              )} EUR</p>
            </div>`
              : ""
          }
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

// Greek Company Information
const COMPANY_INFO = {
  name: "LBNSWRK E.E.",
  dba: "GuestCode",
  address: {
    line1: "Davaki Pindou 14",
    city: "Athens",
    postalCode: "15773",
    country: "Greece",
  },
  email: "contact@guest-code.com",
  vat: "803058973",
  taxOffice: "ΚΕΦΟΔΕ ΑΤΤΙΚΗΣ",
  gemi: "188401803000",
  bank: {
    name: "Eurobank",
    accountHolder: "Zafer Guney",
    iban: "GR1502601020000160201252477",
  },
};

const sendEmail = async (order) => {
  try {
    // Fetch event and brand information
    const event = await Event.findById(order.eventId)
      .populate("brand")
      .populate("lineups");
    const brand = event ? await Brand.findById(event.brand) : null;

    // Get brand colors or use defaults
    const primaryColor = brand?.colors?.primary || "#ffc807";
    const accentColor = brand?.colors?.accent || "#000000";

    // Create an elegant logo with SVG for better quality
    const logoHtml = `
      <div style="text-align: center; padding: 20px;">
        <h1 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 28px; font-weight: 700; margin: 0; color: ${primaryColor}; letter-spacing: 1px;">${COMPANY_INFO.dba}</h1>
        <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; margin: 5px 0 0; letter-spacing: 0.5px; color: #666;">The Future of Event Management</p>
      </div>
    `;

    // Add brand logo if available
    const brandLogoHtml = brand?.logo?.medium
      ? `<div style="display: flex; align-items: center; justify-content: center; background-color: #000000; border-radius: 50%; width: 60px; height: 60px; padding: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><img src="${brand.logo.medium}" alt="${brand.name}" style="max-height: 55px; max-width: 55px; object-fit: contain;"></div>`
      : "";

    // Generate the tickets HTML with improved styling
    const ticketsHtml = order.tickets
      .map(
        (ticket, index) => `
      <div style="width: 100%; display: grid; grid-template-columns: 0.2fr 1fr 0.3fr 0.3fr 0.3fr; margin-bottom: 0.6rem; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 0.6rem;">
        <p style="padding-left: 1rem; align-self: start; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 0;">${
          index + 1
        }.</p>
        <div style="display: grid; grid-gap: .2rem;">
          <p style="font-weight: 600; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">${
            ticket.name
          }</p>
        </div>
        <p style="justify-self: end; padding-right: 1rem; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 0;">${
          ticket.quantity
        } Stk</p>
        <p style="justify-self: end; padding-right: 1rem; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 0;">${ticket.pricePerUnit.toFixed(
          2
        )} ${order.originalCurrency || "EUR"}</p>
        <p style="justify-self: end; padding-right: 1rem; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; font-weight: 600; margin: 0;">${(
          ticket.quantity * ticket.pricePerUnit
        ).toFixed(2)} ${order.originalCurrency || "EUR"}</p>
      </div>
    `
      )
      .join("");

    const line2HTML = order.billingAddress.line2
      ? `<p style="margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #555; font-size: 13px;">${order.billingAddress.line2}</p>`
      : "";
    const addressHTML = `
      <div style="margin-top: 20px;">
        <p style="margin: 0 0 15px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #666; font-size: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Receipt To:</p>
        <p style="margin: 0 0 5px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; font-weight: 600; font-size: 15px;">${order.firstName} ${order.lastName}</p>
        <p style="margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #555; font-size: 13px;">${order.billingAddress.line1}</p>
        ${line2HTML}
        <p style="margin: 3px 0 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #555; font-size: 13px;">${order.billingAddress.postal_code} ${order.billingAddress.city}</p>
        <p style="margin: 3px 0 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #555; font-size: 13px;">${order.billingAddress.country}</p>
      </div>
    `;

    // Launch puppeteer to generate PDF with new headless mode
    const browser = await puppeteer.launch({
      headless: "new", // Use the new headless mode
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Generate invoice HTML with improved styling
    const invoiceHtml = `
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          line-height: 1.4;
          min-height: 100vh;
        }
        .invoice-container {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .header {
          background-color: white;
          padding: 2rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          border-bottom: 1px solid #eee;
        }
        .content {
          padding: 2rem;
          flex: 1;
        }
        .address-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin: 2rem 0;
          gap: 2rem;
        }
        .company-info {
          font-size: 12px;
          color: #666;
          margin: 0 0 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-details-grid {
          display: inline-grid;
          grid-template-columns: auto auto;
          gap: 10px;
          text-align: left;
        }
        .invoice-details-label {
          color: #666;
          font-size: 13px;
          text-align: right;
          padding-right: 15px;
        }
        .invoice-details-value {
          color: #333;
          font-size: 13px;
          font-weight: 500;
        }
        .invoice-title-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: 700;
          color: #222;
          margin: 0;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .event-info {
          margin-bottom: 1rem;
          padding: 0.8rem;
          background-color: #f9f9f9;
          border-radius: 4px;
          border-left: 3px solid ${primaryColor};
        }
        .table-header {
          height: 2.2rem;
          width: 100%;
          background-color: ${accentColor};
          display: grid;
          grid-template-columns: 0.2fr 1fr 0.3fr 0.3fr 0.3fr;
          color: white;
          align-items: center;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }
        .table-footer {
          height: 2.2rem;
          width: 100%;
          background-color: ${accentColor};
          display: grid;
          grid-template-columns: 0.2fr 1fr 0.3fr 0.3fr 0.3fr;
          color: white;
          align-items: center;
          border-radius: 4px;
          margin-top: 0.5rem;
        }
        .footer-message {
          margin-top: 1.5rem;
          padding: 1rem;
          background-color: #f9f9f9;
          border-radius: 4px;
          border-left: 3px solid ${primaryColor};
        }
        .footer {
          background-color: ${accentColor};
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          margin-top: auto;
          height: 5rem;
          color: #b4b0b0;
        }
        .footer-left {
          align-self: center;
          padding-left: 2rem;
          font-size: 0.7rem;
        }
        .footer-center {
          justify-self: center;
          align-self: center;
        }
        .footer-right {
          align-self: center;
          justify-self: end;
          padding-right: 2rem;
          font-size: 0.7rem;
          text-align: right;
        }
        .invoice-number {
          color: ${primaryColor};
          font-weight: 600;
        }
        .total-amount {
          font-weight: 700;
          font-size: 1rem;
        }
        p {
          margin: 0.2rem 0;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          ${logoHtml}
        </div>

        <div class="content">
          <div class="address-section">
            <div>
              <div class="company-info">
                ${COMPANY_INFO.dba} • ${COMPANY_INFO.email} • www.guest-code.com
              </div>
              ${addressHTML}
            </div>

            <div class="invoice-details">
              <div class="invoice-details-grid">
                <span class="invoice-details-label">Receipt No.</span>
                <span class="invoice-details-value" style="color: ${primaryColor};">${generateInvoiceNumber(
      order.stripeSessionId
    )}</span>
                <span class="invoice-details-label">Date</span>
                <span class="invoice-details-value">${formattedDate()}</span>
                <span class="invoice-details-label">ΑΦΜ</span>
                <span class="invoice-details-value">${COMPANY_INFO.vat}</span>
                <span class="invoice-details-label">MARK</span>
                <span class="invoice-details-value" style="color: #999;">Pending</span>
              </div>
            </div>
          </div>

          <div class="invoice-title-section">
            <h1 class="invoice-title">Receipt</h1>
            ${
              brandLogoHtml
                ? `<div class="brand-logo">${brandLogoHtml}</div>`
                : ""
            }
          </div>
          
          ${
            event
              ? `
          <div class="event-info">
            <p style="font-weight: 600; margin: 0;">${
              event.title || "Event"
            }</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px;">
              <p style="margin: 3px 0 0; font-size: 0.9rem;">${
                brand ? brand.name : ""
              }</p>
              ${
                event.startDate
                  ? `<p style="margin: 3px 0 0; font-size: 0.9rem;">• ${formatDateWithLeadingZeros(
                      event.startDate
                    )}</p>`
                  : ""
              }
              ${
                event.location
                  ? `<p style="margin: 3px 0 0; font-size: 0.9rem;">• ${event.location}</p>`
                  : ""
              }
              ${
                event.startTime
                  ? `<p style="margin: 3px 0 0; font-size: 0.9rem;">• ${
                      event.startTime
                    }${event.endTime ? ` - ${event.endTime}` : ""}</p>`
                  : ""
              }
            </div>
          </div>
          `
              : ""
          }

          <div class="table-header">
            <p style="padding-left: 1rem; font-weight: 500; margin: 0;">Pos.</p>
            <p style="font-weight: 500; margin: 0;">Description</p>
            <p style="justify-self: end; padding-right: 1rem; font-weight: 500; margin: 0;">Quantity</p>
            <p style="justify-self: end; padding-right: 1rem; font-weight: 500; margin: 0;">Unit Price</p>
            <p style="justify-self: end; padding-right: 1rem; font-weight: 500; margin: 0;">Total</p>
          </div>

          ${ticketsHtml}

          <div class="table-footer">
            <p style="padding-left: 1rem; margin: 0;"></p>
            <p style="font-weight: 500; margin: 0;">Total Amount</p>
            <p style="justify-self: end; padding-right: 1rem; margin: 0;"></p>
            <p style="justify-self: end; padding-right: 1rem; margin: 0;"></p>
            <p class="total-amount" style="justify-self: end; padding-right: 1rem; margin: 0;">${(
              order.originalAmount || order.totalAmount
            ).toFixed(2)} ${order.originalCurrency || "EUR"}</p>
          </div>

          <!-- Tax Information -->
          <div style="margin-top: 1rem; text-align: right; padding-right: 1rem;">
            ${
              order.vatRate > 0
                ? `
            <p style="margin: 0; font-size: 0.9rem;">Net Amount: ${(
              (order.originalAmount || order.totalAmount) /
              (1 + order.vatRate / 100)
            ).toFixed(2)} ${order.originalCurrency || "EUR"}</p>
            <p style="margin: 0; font-size: 0.9rem;">VAT (${
              order.vatRate
            }%): ${(
                    (order.originalAmount || order.totalAmount) -
                    (order.originalAmount || order.totalAmount) /
                      (1 + order.vatRate / 100)
                  ).toFixed(2)} ${order.originalCurrency || "EUR"}</p>
            <p style="margin: 0; font-size: 0.9rem; font-weight: 600;">Gross Amount: ${(
              order.originalAmount || order.totalAmount
            ).toFixed(2)} ${order.originalCurrency || "EUR"}</p>
            `
                : `
            <p style="margin: 0; font-size: 0.9rem; font-weight: 600;">Total Amount: ${(
              order.originalAmount || order.totalAmount
            ).toFixed(2)} ${order.originalCurrency || "EUR"}</p>
            <p style="margin: 0; font-size: 0.8rem; color: #666;">No VAT applicable</p>
            `
            }
            ${
              order.conversionRate && order.conversionRate !== 1
                ? `<p style="margin: 5px 0 0; font-size: 0.8rem; color: #666;">
                    Conversion to USD: ${order.totalAmount.toFixed(2)} USD 
                    (Rate: ${order.conversionRate.toFixed(4)})
                    ${
                      order.isEstimatedRate
                        ? '<span style="color: #999; font-style: italic;">*estimated</span>'
                        : ""
                    }
                  </p>
                  <p style="margin: 2px 0 0; font-size: 0.7rem; color: #888;">
                    *Commission is calculated based on USD amount
                  </p>`
                : ""
            }
          </div>

          <div class="footer-message">
            <p style="margin: 0; font-weight: 500;">Payment has been processed successfully.</p>
            <p style="margin: 3px 0 0 0;">Thank you for your purchase. We look forward to seeing you at the event!</p>
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">
            <p style="margin:0; font-weight: 600;">${COMPANY_INFO.name}</p>
            <p style="margin:2px 0 0;">${COMPANY_INFO.address.line1}</p>
            <p style="margin:2px 0 0;">${COMPANY_INFO.address.postalCode} ${COMPANY_INFO.address.city}, ${COMPANY_INFO.address.country}</p>
          </div>

          <div class="footer-center">
            <p style="color: white; font-size: 0.7rem; margin: 0;">ΑΦΜ: ${COMPANY_INFO.vat}</p>
            <p style="color: white; font-size: 0.7rem; margin: 2px 0 0;">Γ.Ε.ΜΗ.: ${COMPANY_INFO.gemi}</p>
            <p style="color: ${primaryColor}; font-weight: 600; font-size: 0.9rem; margin: 4px 0 0;">${COMPANY_INFO.dba}</p>
          </div>

          <div class="footer-right">
            <p style="margin:0;">IBAN: ${COMPANY_INFO.bank.iban.slice(0, 12)}...</p>
            <p style="margin:2px 0 0;">Email: ${COMPANY_INFO.email}</p>
            <p style="margin:2px 0 0;">Web: www.guest-code.com</p>
          </div>
        </div>
      </div>
    </body>
    </html>`;

    await page.setContent(invoiceHtml);
    await page.emulateMediaType("screen");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    await browser.close();

    // Generate tickets for the order - DIRECT IMPLEMENTATION
    // Instead of using createTicketsForOrder, we'll create tickets directly here
    const tickets = [];
    for (const item of order.tickets) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketData = {
          eventId: order.eventId,
          userId:
            order.userId ||
            new mongoose.Types.ObjectId("000000000000000000000000"),
          orderId: order._id,
          ticketType: "standard",
          ticketName: item.name,
          price: item.pricePerUnit,
          pax: item.pax || 1,
          status: "valid",
          paymentMethod: "online",
          securityToken: generateRandomString(12),
          firstName: order.firstName || null,
          lastName: order.lastName || null,
          customerEmail: order.email || null,
          // Properly map the billing address fields
          billingAddress: order.billingAddress
            ? {
                street: order.billingAddress.line1 || "",
                additionalInfo: order.billingAddress.line2 || "",
                city: order.billingAddress.city || "",
                state: order.billingAddress.state || "",
                postalCode: order.billingAddress.postal_code || "",
                country: order.billingAddress.country || "",
              }
            : null,
        };

        const ticket = new Ticket(ticketData);
        await ticket.save();
        tickets.push(ticket);
      }
    }

    // Group identical tickets
    const ticketGroups = {};
    tickets.forEach((ticket) => {
      const key = ticket.ticketName;
      if (!ticketGroups[key]) {
        ticketGroups[key] = [];
      }
      ticketGroups[key].push(ticket);
    });

    // Generate PDF tickets - one per unique ticket type
    const ticketPDFs = [];
    const ticketAttachments = [];

    for (const [ticketName, ticketGroup] of Object.entries(ticketGroups)) {
      // Use the first ticket of each group as a template
      const representativeTicket = ticketGroup[0];

      // Set pax to the number of tickets in the group if there are multiple
      if (ticketGroup.length > 1) {
        representativeTicket.pax = ticketGroup.length;
      }

      const pdfBuffer = await generateTicketPDF(representativeTicket);
      ticketPDFs.push(pdfBuffer);

      ticketAttachments.push({
        content: pdfBuffer.toString("base64"),
        name: `Ticket_${ticketName.replace(
          /\s+/g,
          "_"
        )}_${representativeTicket.securityToken.slice(0, 8)}.pdf`,
        type: "application/pdf",
      });
    }

    // Prepare and send email using Brevo with improved email template
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: order.email }];
    sendSmtpEmail.bcc = [{ email: "contact@guest-code.com" }];
    sendSmtpEmail.sender = {
      name: brand?.name || "GuestCode",
      email: process.env.SENDER_EMAIL || "contact@guest-code.com",
    };
    sendSmtpEmail.subject = `${
      brand?.name || "GuestCode"
    } - Your Receipt and Tickets`;

    // Create additional content specific to the order and tickets
    const additionalContent = `
      <div style="background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-weight: 500;">Receipt Number: <span style="color: ${primaryColor};">${generateInvoiceNumber(
      order.stripeSessionId
    )}</span></p>
        <p style="margin: 8px 0 0;">Total Amount: <strong>${(
          order.originalAmount || order.totalAmount
        ).toFixed(2)} ${order.originalCurrency || "EUR"}</strong></p>
        <p style="margin: 8px 0 0;">Tickets: <strong>${
          Object.keys(ticketGroups).length
        }</strong></p>
        <p style="margin: 8px 0 0;">Payment Status: <strong>Successfully Processed</strong></p>
      </div>

      <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Your receipt and tickets are attached to this email. Please bring your tickets with you to the event.</p>
    `;

    // Use the common email template
    sendSmtpEmail.htmlContent = createEventEmailTemplate({
      recipientName: `${order.firstName} ${order.lastName}`,
      eventTitle: event?.title || "Event",
      eventDate: event?.date,
      eventLocation: event?.location || event?.venue || "",
      eventAddress: event?.street || "",
      eventCity: event?.city || "",
      eventPostalCode: event?.postalCode || "",
      startTime: event?.startTime || "",
      endTime: event?.endTime || "",
      description:
        "Thank you for your purchase. Your payment has been successfully processed, and your receipt and tickets are attached to this email.",
      lineups: event?.lineups || [],
      primaryColor: brand?.colors?.primary || "#ffc807",
      additionalContent: additionalContent,
      footerText:
        "This is an automated email. For any questions, please contact us at contact@guest-code.com.",
    });

    // Prepare attachments
    const attachments = [
      {
        content: pdfBuffer.toString("base64"),
        name: `${generateInvoiceNumber(order.stripeSessionId)}.pdf`,
        type: "application/pdf",
      },
      ...ticketAttachments,
    ];

    sendSmtpEmail.attachment = attachments;

    // Send the email
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.debug(
      "Order confirmation email with tickets sent successfully to:",
      order.email
    );

    return tickets;
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};
