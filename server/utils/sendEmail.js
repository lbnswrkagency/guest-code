const fs = require("fs");
const nodemailer = require("nodemailer");
const key = require("./key.json");
const puppeteer = require("puppeteer");

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

  const str = dd + "." + mm + "." + yyyy;
  return str;
};

const sendEmail = async (createdTicket, isNoCostOrder) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        type: "oAuth2",
        user: "mail@hilifechallenge.net", // generated ethereal user
        serviceClient: key.client_id,
        privateKey: key.private_key, // generated ethereal password
      },
    });

    const image = fs.readFileSync("hilifelogo.png");
    const base64Image = new Buffer.from(image).toString("base64");
    const dataURI = "data:image/jpeg;base64," + base64Image;

    if (!isNoCostOrder) {
      const totalAmount = () => {
        let total = createdTicket.price;
        return total;
      };

      const ticketHtml = () => {
        let htmlStr = "";
        htmlStr =
          htmlStr +
          `        <div
          style="
        
            width: 100%;

            display: grid;
            grid-template-columns: 0.2fr 1fr 0.3fr 0.3fr 0.3fr;
            margin-bottom: 1rem;
            align-items: center;
            align-content: center;
          "
        >
          <p style="padding-left: 1rem; align-self: start">1.</p>
            <div style="display: grid; grid-gap: .3rem;">
              <p style="font-weight: 600; margin: 0;">${createdTicket.challengeName}</p> 
            </div>
          <p style="justify-self: end; padding-right: 1rem; align-self: start">1 Stk</p>
          <p style="justify-self: end; padding-right: 1rem; align-self: start">${createdTicket.price}.00 EUR</p>
          <p style="justify-self: end; padding-right: 1rem; align-self: start">${createdTicket.price}.00 EUR</p>
        </div>`;

        return htmlStr;
      };

      const line2HTML = createdTicket.billingAddress.line2
        ? `<p>${createdTicket.billingAddress.line2}</p>`
        : "";

      const addressHTML = `
  <p>${createdTicket.firstname}&nbsp; ${createdTicket.lastname}</p>
  <p>${createdTicket.billingAddress.line1}</p>
  ${line2HTML}
  <p>${createdTicket.billingAddress.postal_code}, ${createdTicket.billingAddress.city}</p>
`;

      const ticketStr = () => {
        let str = "";
        if (createdTicket.vip)
          str = str + " | VIP: " + createdTicket.vip.toString() + " | ";
        if (createdTicket.premium)
          str = str + " | Premium: " + createdTicket.premium.toString() + " | ";
        if (createdTicket.regular)
          str = str + " | Regular: " + createdTicket.regular.toString() + " | ";
        return str;
      };

      const str = `<div style="z-index:5; color:white; position:absolute; bottom: 1rem; margin-left:auto; margin-right:auto; font-size:.8rem;">${ticketStr()}</div>`;

      const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(`
      <html>
  
  <body style="width: 100%; margin: 0;">
    <div style="width: 100%">
      <div style="background-color: black; display: grid; height: 8rem;">
        <img
        style="justify-self: center; padding: 1rem; width: 5rem;"
        src="${dataURI}"
        alt=""
        />
      </div>
  
  <div style="padding-left: 2rem; padding-right: 2rem">
  <div style="display: grid; grid-template-columns: 1fr 1fr">
  <div style="margin-top: 3rem">
    <p style="font-size: 0.6rem; margin-bottom: .75rem">
      myleo GmbH - Franklinstr. 10 - 10587 Berlin
    </p>
   ${addressHTML}
  </div>
  
  <div
    style="
      grid-column: 2/3;
      display: grid;
      grid-template-columns: 1fr 1fr;
      justify-content: end;
      justify-items: end;
    "
  >
    <div style="margin-top: 2rem">
      <p style="font-weight: 600">Rechnungs-Nr.</p>
      <p>Rechnungsdatum</p>
      <p>Lieferdatum</p>
    </div>
    <div style="margin-top: 2rem">
      <p>RE-${addLeadingZeros(createdTicket.invoiceNo, 4)}</p>
      <p>${formattedDate()}</p>
      <p>${formattedDate()}</p>
    </div>
  </div>
  </div>
  
  <div style="display: grid; grid-template-columns: .3fr 1fr;; margin-top: 5rem;">
  <h1>Rechnung</h1>
  
  
  </div>
  <div
  style="
    height: 2rem;
    width: 100%;
    background-color: black;
    display: grid;
    grid-template-columns: 0.2fr 1fr 0.3fr 0.3fr 0.3fr;
    color: white;
    align-items: center;
    align-content: center;
  "
  >
  <p style="padding-left: 1rem">Pos.</p>
  <p>Beschreibung</p>
  <p style="justify-self: end; padding-right: 1rem">Menge</p>
  <p style="justify-self: end; padding-right: 1rem">Einzelpreis</p>
  <p style="justify-self: end; padding-right: 1rem">Gesamtpreis</p>
  </div>
  
  <!-- TICKETS -->
  
  ${ticketHtml()}
  
  <!-- TICKETS -->
  
  <div
  style="
    height: 2rem;
    width: 100%;
    background-color: black;
    display: grid;
    grid-template-columns: 0.2fr 1fr 0.3fr 0.3fr 0.3fr;
    color: white;
    align-items: center;
    align-content: center;
  
  "
  >
  <p style="padding-left: 1rem"></p>
  <p>Gesamtbetrag netto</p>
  <p style="justify-self: end; padding-right: 1rem"></p>
  <p style="justify-self: end; padding-right: 1rem"></p>
  <p style="justify-self: end; padding-right: 1rem">${
    Math.round((totalAmount() / 1.19 + Number.EPSILON) * 100) / 100
  }EUR</p>
  </div>
  
  <div
  style="
    height: 2rem;
    width: 100%;
    display: grid;
    grid-template-columns: 0.2fr 1fr 0.3fr 0.3fr 0.3fr;
    color: black;
    align-items: center;
    align-content: center;
  "
  >
  <p style="padding-left: 1rem"></p>
  <p>zzgl. Umsatzsteuer 19%</p>
  <p style="justify-self: end; padding-right: 1rem"></p>
  <p style="justify-self: end; padding-right: 1rem"></p>
  <p style="justify-self: end; padding-right: 1rem">${
    Math.round((totalAmount() - totalAmount() / 1.19 + Number.EPSILON) * 100) /
    100
  } EUR</p>
  </div>
  <div
  style="
    height: 2rem;
    width: 100%;
    background-color: black;
    display: grid;
    grid-template-columns: 0.2fr 1fr 0.3fr 0.3fr 0.3fr;
    color: white;
    align-items: center;
    align-content: center;
  "
  >
  <p style="padding-left: 1rem"></p>
  <p style="font-weight: 600;">Gesamtbetrag brutto</p>
  <p style="justify-self: end; padding-right: 1rem"></p>
  <p style="justify-self: end; padding-right: 1rem"></p>
  <p style="justify-self: end; padding-right: 1rem; font-weight: 600; ">${
    Math.round((totalAmount() + Number.EPSILON) * 100) / 100
  }.00 EUR</p>
  </div>
  
  <div style="margin-top: 5rem;">
    <p style="margin: 0;">Die Rechnung ist vollständig beglichen.</p>
    <p style="margin: 0;">Wir bedanken uns für Ihr Vertrauen und wünschen eine erfolgreiche Challenge.</p>
  </div>
  </div>
  <div style="background-color: black; display: grid; grid-template-columns: 1fr 1fr 1fr; margin-top: 11.5rem; height: 8rem;">
  
  <div style="color: rgb(180, 176, 176); font-weight: 300; font-size: .8rem; align-self: center; padding-left: 2rem; display: grid; grid-template-columns: repeat(2,minmax(min-content,max-content)); grid-gap:2rem;">
  
    <div>            
        <p style="margin:0; font-weight: 600;">myleo GmbH</p>
    </div>
  
    <div>
    <p style="margin:0;">Franklinstr. 10</p>
    <p style="margin:0;">10587 Berlin</p>
    <p style="margin:0;">Deutschland</p>
    </div>
  
  </div>
  
  <img
  style="justify-self: center; align-self: center; width: 5rem;"
  src="${dataURI}"
  alt=""
  />
  <div style="color: rgb(180, 176, 176); font-weight: 300; font-size: .8rem; align-self: center; justify-self: end; padding-right: 2rem; display: grid; grid-template-columns: repeat(2,minmax(min-content,max-content));">
  
    <div>
    <p style="margin:0;">E-Mail:</p>
    <p style="margin:0;">Web:</p>
    <p style="margin:0;">Umsatzsteuer ID :</p>
     <p style="margin:0;">Handelsregister: </p>
    </div>
    <div>
    <p style="margin:0; text-align: right;">mail@hilifechallenge.net</p>
    <p style="margin:0; text-align: right;">www.hilifechallenge.net</p>
    <p style="margin:0; text-align: right;">DE289104024</p>
     <p style="margin:0; text-align: right;">HRB 149335</p>
    </div>
  
  </div>
  </div>
  </div>
  </div>
  </body>
      </html>
      `);
      await page.emulateMediaType("screen");
      await page.pdf({
        path: "invoice.pdf",
        format: "A4",
        printBackground: true,
      });

      await browser.close();

      await transporter.sendMail({
        from: '"HiLife Challenge" <mail@hilifechallenge.et>', // sender address
        to: createdTicket.email, // list of receivers
        subject: "HiLife Challenge - Rechnung", // Subject line
        text: "", // plain text body
        html: `    
          <div style="color: black">
              <div>Hallo ${createdTicket.firstname},</div>
              <br />
              <div>vielen Dank für deinen Einkauf. Im Anhang befindet sich die Rechnung.</div><br />
              <br />
              <br>
              <div>Wir freuen uns.</div>
              _____________________________
              <br /><br />
              <b>Beste Grüße</b>
              <br /><br />
              <p>
              <img style="float: left; width: 3.5rem" src="cid:my-qr-code-1-1-1" /> 
              </p>
              
              <br /><br /><br /><br /><br />
              <h3>HiLife Challenge</h3>
              <p>Email: mail@hilifechallenge.net<br /><p>Website: www.hilifechallenge.net</p>
          </div>`,
        attachments: [
          {
            filename: "invoice.pdf",
            path: "./invoice.pdf",
          },
        ], // html body
      });
    } else {
      await transporter.sendMail({
        from: '"HiLife Challenge" <mail@hilifechallenge.et>', // sender address
        to: createdTicket.email, // list of receivers
        subject: "HiLife Challenge - Willkommen", // Subject line
        text: "", // plain text body
        html: `    
          <div style="color: black">
              <div>Hallo ${createdTicket.firstname},</div>
              <br />
              <div>vielen Dank für Deine Anmeldung zur HiLife Challenge! Wir freuen uns auf 4 gemeinsame Wochen für mehr Power, Health & Happiness und Deine Topform!</div>
              <br />
              ___________
              <br /><br />
              <div>Viele Grüße</div>
              <div>Dein HiLife Challenge Team</div>
              <br /><br />
              <img style="width: 150px" src="cid:logo" />
          </div>`,
        attachments: [
          {
            filename: "logo.png",
            path: "./views/img/logo.png",
            cid: "logo",
          },
        ],
      });
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  sendEmail,
};
