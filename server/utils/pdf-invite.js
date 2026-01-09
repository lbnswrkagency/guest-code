const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const logoPath = path.join(__dirname, "logo_w.svg");
const logoData = fs.readFileSync(logoPath, { encoding: "base64" });
const logoBase64 = `data:image/svg+xml;base64,${logoData}`;

require("dotenv").config;

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    weekday: "short",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Berlin",
  };
  return date
    .toLocaleDateString("de-DE", options)
    .replace(",", "")
    .replace(".", "");
}

const createTicketPDFInvitation = async (
  event,
  qrCodeDataURL,
  name,
  email,
  condition,
  pax,
  pdfPath
) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  // Get brand colors or use defaults (matching codesController style)
  const primaryColor = event?.brand?.colors?.primary || "#ffc807";

  // Format date (matching codesController style)
  const date = new Date(event?.startDate);
  const days = [
    "Sunday",
    "Monday", 
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const eventDate = {
    day: days[date.getDay()],
    date: date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
    }),
    time: "20:00", // Default time if not specified
  };

  // Use event's startTime if available
  if (event?.startTime && eventDate.time === "20:00") {
    eventDate.time = event.startTime;
  }

  // Create HTML template exactly matching codesController style
  const htmlContent = `
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
      <body style="position: relative; background-color: ${primaryColor}; width: 390px; height: 760px; overflow: hidden; border-radius: 28px; color: #222222;">
        <!-- Header section with logo -->
        <div style="position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 3.25rem 2.313rem 0;">
          <h1 style="margin: 0; font-weight: 700; font-size: 1.6rem; color: #000000;">Personal Invitation</h1>
          ${
            event?.brand?.logo?.medium
              ? `<div style="display: flex; align-items: center; justify-content: center; background-color: #000000; border-radius: 50%; width: 3.5rem; height: 3.5rem; overflow: hidden;"><img src="${event.brand.logo.medium}" style="max-width: 2.8rem; max-height: 2.8rem; object-fit: contain;"></div>`
              : `<div style="width: 3.5rem; height: 3.5rem; background-color: #000000; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 1.5rem;">${
                event?.title?.charAt(0) || "E"
              }</span>
            </div>`
          }
        </div>
        
        <!-- Main content area - Whitish theme with improved contrast -->
        <div style="position: absolute; width: 20.375rem; height: 27rem; background-color: #f5f5f5; border-radius: 1.75rem; top: 7.5rem; left: 2rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
          
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem; color: #222222;">${
            event?.title || "Event"
          }</h3>   
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">             
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Location</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.location || event?.venue || ""
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857em; line-height: 1.25rem;">${
                event?.street || ""
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.postalCode ? `${event.postalCode} ` : ""
              }${event?.city || ""}</p>
            </div>
            <div>
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Date</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                eventDate.day
              }</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                eventDate.date
              }</p>
            </div>
          </div>
          
          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div> 
              <div style="margin-top: 0.5rem;">
                <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Start</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                  event?.startTime || eventDate.time
                }</p>
              </div>
            </div>

            <div style="margin-top: 0.5rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">End</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
                event?.endTime || "06:00"
              }</p>
            </div>
          </div>
          
          <!-- Benefit Section -->
          <div style="margin-top: 1.5rem; padding-left: 2.438rem; padding-right: 2.438rem;">
            <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Benefit</p>
            <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${
              condition || "Free entrance all night"
            }</p>
          </div>
          
          <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid ${primaryColor}; width: 15.5rem;"></div>

          <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">Name</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${name.replace(/^Guest Code for /i, '')}</p>
            </div>
            
            <div style="margin-top: 0.75rem;">
              <p style="margin: 0; color: ${primaryColor}; font-weight: 600; font-size: 0.625rem; line-height: 1rem; text-transform: uppercase;">People</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${pax || 1}</p>
            </div>
          </div>
        </div>

        <!-- QR Code section with centered QR -->
        <div style="position: absolute; bottom: 2.938rem; left: 2rem; background-color: #222222; width: 20.375rem; height: 10rem; border-radius: 1.75rem; display: flex; justify-content: center; align-items: center;">
          <img style="background-color: white; width: 8rem; height: 8rem; border-radius: 0.5rem;" src="${qrCodeDataURL}"></img>
        </div>
      </body>
    </html>`;

  await page.setContent(htmlContent);
  await page.emulateMediaType("screen");

  // Generate PDF with 9:16 aspect ratio matching codesController
  let result;
  if (pdfPath) {
    await page.pdf({ 
      path: pdfPath,
      width: "390px",
      height: "760px",
      printBackground: true,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
    });
    result = true;
  } else {
    result = await page.pdf({ 
      width: "390px",
      height: "760px",
      printBackground: true,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
    });
  }
  
  await browser.close();
  return result;
};

// Function that returns a buffer (used by eventsController)
const createTicketPDF = async (event, qrCodeDataURL, name, email, condition, pax) => {
  return await createTicketPDFInvitation(event, qrCodeDataURL, name, email, condition, pax, null);
};

module.exports = createTicketPDFInvitation;
module.exports.createTicketPDF = createTicketPDF;
