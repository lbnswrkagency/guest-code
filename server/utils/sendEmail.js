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

// US Company Information
const COMPANY_INFO = {
  name: "LBNSWRK LLC",
  dba: "GuestCode",
  address: {
    line1: "5830 E 2ND ST, STE 7000 #14531",
    city: "CASPER",
    state: "WYOMING",
    zip: "82609",
    country: "USA",
  },
  email: "contact@guest-code.com",
  phone: "888-462-3453",
  ein: "32-0758843",
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
        <p style="margin: 0 0 15px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #666; font-size: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Invoice To:</p>
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
                <span class="invoice-details-label">Invoice No.</span>
                <span class="invoice-details-value" style="color: ${primaryColor};">${generateInvoiceNumber(
      order.stripeSessionId
    )}</span>
                <span class="invoice-details-label">Date</span>
                <span class="invoice-details-value">${formattedDate()}</span>
                <span class="invoice-details-label">EIN</span>
                <span class="invoice-details-value">${COMPANY_INFO.ein}</span>
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
            <p style="margin:2px 0 0;">${COMPANY_INFO.address.city}, ${
      COMPANY_INFO.address.state
    } ${COMPANY_INFO.address.zip}</p>
          </div>

          <div class="footer-center">
            <p style="color: white; font-size: 0.8rem; margin: 0;">Powered by</p>
            <p style="color: ${primaryColor}; font-weight: 600; font-size: 1rem; margin: 0;">${
      COMPANY_INFO.dba
    }</p>
          </div>

          <div class="footer-right">
            <p style="margin:0;">EIN: ${COMPANY_INFO.ein}</p>
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

    // Create additional content specific to the order and tickets
    const additionalContent = `
      <div style="background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-weight: 500;">Invoice Number: <span style="color: ${primaryColor};">${generateInvoiceNumber(
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
      
      <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Your invoice and tickets are attached to this email. Please bring your tickets with you to the event.</p>
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
        "Thank you for your purchase. Your payment has been successfully processed, and your invoice and tickets are attached to this email.",
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
