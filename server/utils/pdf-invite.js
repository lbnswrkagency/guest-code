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
        font-size: 18px;
      }

      h3 {
        font-weight: 600;
        color: #A6965D;
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
        color: black;
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
      grid-template-columns: .75fr .25fr;
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
        background: #FAE28C;
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
 
        p {
          font-size: 18px;
        }
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
        margin-top: 3% !important;
   
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

      .qrcode-data {
         justify-self: center;
      }

      .qrcode-data p {
        font-size: .5rem;
        text-align: center;
      
      }

      .qrcode-text {
        justify-self: center;
        align-self: center;
      }

      .qrcode-text > h2 {
        font-size: 25px;
        font-weight: 800;
      }

      .qrcode-text > p {
        font-size: 25px;
      }



      .qrcode img {
        justify-self: center;
        width: 200px;
      }

  


    </style>
  </head>
  <body>
    <div class="ticket">
      <div class="header">
        <h1 class="header-title">Invitation Code</h1>
        <img src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png" alt="" class="header-logo" />
      </div>

      <div class="event">
        <h1 class="event-title">Afro Spiti</h1>

        <div class="event-date">
          <h3>Date</h3>
          <p>Wednesday, 11.09.2024</p>
        </div>

        <div class="event-beats">
          <h3>Beats</h3>
          <p>Afrobeats<br/>Amapiano<br/>Dancehall</p>
        </div>

        <div class="event-bites">
          <h3>Line Up</h3>
          <p>Hulk</p>
          <p>Hendricks</p>
          <p>Deeze (Cyprus)</p>
          <p>J Fyah</p>
        </div>

        <div class="event-hours">
          <h3>Opens</h3>
          <p>09 PM</p>
        </div>

        <div class="event-location">
          <h3>Location</h3>
          <p>Bolivar<br />Leof. Poseidonos<br />174 55, Athens<br /></p>
        </div>
        <svg
          width="248"
          height="1"
          viewBox="0 0 248 1"
          fill="#DEDEDE"
          xmlns="http://www.w3.org/2000/svg"
          class="event-divider"
          ;
        >
          <line y1="0.5" x2="248" y2="0.5" stroke="#A6965D" />
        </svg>

        <div class="event-name">
          <h3>Name</h3>
          <p>${name}</p>
        </div>
      </div>

      <div class="qrcode">
        <div class="qrcode-text">
          <h2>FREE ENTRANCE</h3>
          <p>ALL NIGHT</p>
        </div>

        <div class="qrcode-data">
        <img src="${qrCodeDataURL}" alt="QR Code" />
        <p>${event._id}</p>
        </div>
  

      </div>
    </div>
  </body>
</html>
  `;

  await page.setContent(htmlContent);
  await page.pdf({ path: pdfPath, format: "A6", printBackground: true });
  await browser.close();
};

module.exports = createTicketPDFInvitation;
