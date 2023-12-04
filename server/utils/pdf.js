// pdf.js
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

const createTicketPDF = async (
  event,
  qrCodeDataURL,
  name,
  email,
  condition,
  pax
) => {
  const browser = await puppeteer.launch({
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

  // headless: true, // Enable headless mode
  // args: ["--no-sandbox", "--disable-setuid-sandbox"], // Add arguments

  const htmlContent = `
<!DOCTYPE html>
  <html style="font-family: 'Manrope', sans-serif;">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope&display=swap" rel="stylesheet">
    <title>Ticket</title>
    <style>
      @page {
        size: A4;
        margin: 0;
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        width: 100vw;
        height: 100vh;
        box-sizing: border-box;
        background-color: black;
        font-size: 16px;
      }

      h3 {
        font-weight: 600;
        color: #a6965d;
      }

      h2 {
        color: #000;

      }

      p {
        font-weight: 600;
        color: #000;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      .ticket {
        font-family: "Manrope";
        width: 100%;
        height: 100%;
        color: white;
        display: grid;
        grid-template-rows: 12.5% 55% 25%;
      }

      .header-title {
        color: #fff;
        font-size: 50px;
        align-self: center;
      }

      .header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding-right: 10%;
      padding-left: 10%;
      align-content: center;
      }

      .header-logo {
        width: 8rem;
        justify-self: end;
        align-self: center;
      }
      .event {
        background: #fae28c;

        border-radius: 28px;
        width: 80%;
        height: 100%;
        box-sizing: border-box;
        justify-self: center;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(6, minmax(min-content, max-content));
        justify-content: start;
        align-content: start;
        padding-top: 8%;
        font-size: 13px;
        padding-left: 8%;
      }

      .event > div {
        margin-top: 9%;
        max-width: 60%;
      }

   
      .event-title {
        grid-row: 1/2;
        grid-column: 1/3;
        color: #000;
     
      }

      .event-bites {
      }

      .event-location {
        grid-column: 1/3;
      }

      .event-hours {
        grid-row: 2/3;
        grid-column: 2/3;
      }

       .event  p {
        font-size: 18px;
      }
      .event-divider {
        grid-row: 5/6;
        grid-column: 1/3;
        margin-top: 6%;
        width: 30rem;
        height: 0.15rem;
      }

      .event-name {
        grid-row: 6/7;
        grid-column: 1/3;
        align-self: start;
        margin-top: 6% !important;
      }


      .qrcode {
        height: 100%;
        width: 80%;
        background: #ffffff;
        border-radius:28px;

        align-self: end;
        justify-self: center;
        display: grid;
        grid-template-columns: repeat(2,1fr);
        align-content: center;
        justify-content: center;
      }

      .qrcode-text {
        justify-self: center;
        align-self: center;
  
      }

      .qrcode-text > h2 {
        font-size: 40px;
      }

      .qrcode-text > p {
        font-size: 30px;
      }



      .qrcode > img {
        justify-self: center;
        width: 200px;
      }



    </style>
  </head>
  <body>
    <div class="ticket">
      <div class="header">
        <h1 class="header-title">Guest Code</h1>
        <img src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png" alt="" class="header-logo" />
      </div>

      <div class="event">
        <h1 class="event-title">${event.title}</h1>

        <div class="event-date">
          <h3>Date</h3>
          <p>Every Sunday</p>
        </div>

        <div class="event-beats">
          <h3>Beats</h3>
          <p>Afrobeats<br/>Amapiano<br/>Dancehall</p>
        </div>

        <div class="event-bites">
          <h3>Bites</h3>
          <p>Chicken Wings, Meat Pie, Beef Stick</p>
        </div>

        <div class="event-hours">
          <h3>Opens</h3>
          <p>8 PM</p>
        </div>

        <div class="event-location">
          <h3>Location</h3>
          <p>Bardeau Bar<br />Navarchou Apostoli 6<br />Psiri, Athens<br /></p>
        </div>
        <svg
          width="248"
          height="1"
          viewBox="0 0 248 1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="event-divider"
          ;
        >
          <line y1="0.5" x2="248" y2="0.5" stroke="#DEDEDE" />
        </svg>

        <div class="event-name">
          <h3>Name</h3>
          <p>${name}</p>
        </div>
      </div>

      <div class="qrcode">
        <div class="qrcode-text">
          <h2>BUY 1 GET 2</h3>
            <p>ANY DRINK</p>
            <p>UNTIL 10PM</p>
        </div>

        <img src="${qrCodeDataURL}" alt="QR Code" />
      </div>
    </div>
  </body>
</html>
  `;

  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ format: "A6", printBackground: true });

  await browser.close();
  return pdfBuffer;
};

module.exports = createTicketPDF;
