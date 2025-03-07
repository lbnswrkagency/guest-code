const SibApiV3Sdk = require("sib-api-v3-sdk");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Event = require("../models/eventsModel");
const Brand = require("../models/brandModel");
const {
  createTicketsForOrder,
  generateTicketPDF,
} = require("../controllers/ticketController");

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
      <div style="text-align: center; padding: 10px; background-color: ${accentColor}; color: white;">
        <h1 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 700; margin: 0; color: ${primaryColor}; letter-spacing: 1px;">GuestCode</h1>
        <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; margin: 3px 0 0; letter-spacing: 0.5px;">The Future of Event Management</p>
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
        )} EUR</p>
        <p style="justify-self: end; padding-right: 1rem; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; font-weight: 600; margin: 0;">${(
          ticket.quantity * ticket.pricePerUnit
        ).toFixed(2)} EUR</p>
      </div>
    `
      )
      .join("");

    const line2HTML = order.billingAddress.line2
      ? `<p style="margin: 2px 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">${order.billingAddress.line2}</p>`
      : "";
    const addressHTML = `
      <p style="margin: 2px 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; font-weight: 600;">${order.firstName} ${order.lastName}</p>
      <p style="margin: 2px 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">${order.billingAddress.line1}</p>
      ${line2HTML}
      <p style="margin: 2px 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">${order.billingAddress.postal_code}, ${order.billingAddress.city}</p>
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
          background-color: ${accentColor};
          height: 6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        .content {
          padding: 1.5rem 2rem;
          flex: 1;
        }
        .address-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin-bottom: 1.5rem;
        }
        .company-address {
          margin-top: 1rem;
        }
        .client-address {
          margin-top: 0.5rem;
        }
        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          justify-content: end;
          justify-items: end;
          margin-top: 1rem;
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
            <div class="company-address">
              <p style="font-size: 0.6rem; margin-bottom: .5rem; color: #777;">
                GuestCode - Davaki Pindou 14 - 15773 Athens
              </p>
              ${addressHTML}
            </div>

            <div class="invoice-details">
              <div>
                <p style="font-weight: 600; margin: 2px 0;">Invoice No.</p>
                <p style="margin: 2px 0;">Date</p>
              </div>
              <div>
                <p class="invoice-number" style="margin: 2px 0;">${generateInvoiceNumber(
                  order.stripeSessionId
                )}</p>
                <p style="margin: 2px 0;">${formattedDate()}</p>
              </div>
            </div>
          </div>

          <div class="invoice-title-section">
            <h1 class="invoice-title">Invoice</h1>
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
                event.date
                  ? `<p style="margin: 3px 0 0; font-size: 0.9rem;">• ${formatDateWithLeadingZeros(
                      event.date
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
            <p class="total-amount" style="justify-self: end; padding-right: 1rem; margin: 0;">${order.totalAmount.toFixed(
              2
            )} EUR</p>
          </div>

          <!-- International VAT Information -->
          <div style="margin-top: 1rem; text-align: right; padding-right: 1rem;">
            <p style="margin: 0; font-size: 0.9rem;">Net Amount: ${(
              order.totalAmount / 1.19
            ).toFixed(2)} EUR</p>
            <p style="margin: 0; font-size: 0.9rem;">VAT (19%): ${(
              order.totalAmount -
              order.totalAmount / 1.19
            ).toFixed(2)} EUR</p>
            <p style="margin: 0; font-size: 0.9rem; font-weight: 600;">Gross Amount: ${order.totalAmount.toFixed(
              2
            )} EUR</p>
            <p style="margin: 0.5rem 0 0; font-size: 0.8rem; color: #777;">This invoice includes 19% Value Added Tax (VAT).</p>
          </div>

          <div class="footer-message">
            <p style="margin: 0; font-weight: 500;">Payment has been processed successfully.</p>
            <p style="margin: 3px 0 0 0;">Thank you for your purchase. We look forward to seeing you at the event!</p>
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">
            <p style="margin:0; font-weight: 600;">GuestCode</p>
            <p style="margin:2px 0 0;">Davaki Pindou 14</p>
            <p style="margin:2px 0 0;">15773 Athens</p>
          </div>

          <div class="footer-center">
            <p style="color: white; font-size: 0.8rem; margin: 0;">Powered by</p>
            <p style="color: ${primaryColor}; font-weight: 600; font-size: 1rem; margin: 0;">GuestCode</p>
          </div>

          <div class="footer-right">
            <p style="margin:0;">Email: contact@guest-code.com</p>
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

    // Generate tickets for the order
    const tickets = await createTicketsForOrder(order, order.userId);

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
    } - Your Invoice and Tickets`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; background-color: ${accentColor}; padding: 20px; margin-bottom: 30px;">
          <h1 style="color: ${primaryColor}; font-size: 28px; font-weight: 700; margin: 0;">GuestCode</h1>
          <p style="color: white; font-size: 14px; margin: 5px 0 0;">The Future of Event Management</p>
          ${
            brand?.logo?.medium
              ? `<div style="margin-top: 15px; display: inline-block;"><img src="${brand.logo.medium}" alt="${brand.name}" style="max-height: 80px; max-width: 200px; object-fit: contain;"></div>`
              : ""
          }
        </div>
        
        <h2 style="color: #333; text-align: center; font-size: 24px; margin-bottom: 20px;">Thank You for Your Purchase</h2>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Dear ${
          order.firstName
        },</p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">Thank you for your purchase. Your payment has been successfully processed, and your invoice and tickets are attached to this email.</p>
        
        ${
          event
            ? `
        <div style="background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: 500;">Event: <span style="color: #333;">${
            event.title || "Event"
          }</span></p>
          <p style="margin: 8px 0 0;">Organizer: <strong>${
            brand ? brand.name : "GuestCode"
          }</strong></p>
          ${
            event.date
              ? `<p style="margin: 8px 0 0;">Date: <strong>${new Date(
                  event.date
                ).toLocaleDateString()}</strong></p>`
              : ""
          }
        </div>
        `
            : ""
        }
        
        <div style="background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; font-weight: 500;">Invoice Number: <span style="color: ${primaryColor};">${generateInvoiceNumber(
      order.stripeSessionId
    )}</span></p>
          <p style="margin: 8px 0 0;">Total Amount: <strong>${order.totalAmount.toFixed(
            2
          )} EUR</strong></p>
          <p style="margin: 8px 0 0;">Tickets: <strong>${
            Object.keys(ticketGroups).length
          }</strong></p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">We look forward to seeing you at the event! If you have any questions, please don't hesitate to contact us.</p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Best regards,<br>${
          brand ? brand.name : "The GuestCode Team"
        }</p>
        
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
          <p style="color: ${primaryColor}; font-size: 18px; font-weight: bold; margin: 0;">GuestCode</p>
          <p style="color: #777; font-size: 14px; margin: 5px 0 0;">The Future of Event Management</p>
          <p style="color: #777; font-size: 14px; margin: 15px 0 0;">Email: contact@guest-code.com | Web: www.guest-code.com</p>
        </div>
      </div>
    `;

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
