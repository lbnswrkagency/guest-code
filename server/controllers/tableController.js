const TableCode = require("../models/TableCode");
const QRCode = require("qrcode");
const nodeHtmlToImage = require("node-html-to-image");
const path = require("path");

const qrOption = {
  margin: 1,
  width: 225,
  color: {
    dark: "#000", // QR Code color
    light: "#0000", // Background color of QR code, transparent
  },
};

const addTableCode = async (req, res) => {
  const { name, pax, tableNumber, event, host, hostId } = req.body;

  try {
    const createdTableCode = await TableCode.create({
      name,
      pax,
      tableNumber,
      event,
      host,
      hostId,
    });

    const bufferImage = await QRCode.toDataURL(
      createdTableCode._id.toString(),
      qrOption
    );

    let myImage = await nodeHtmlToImage({
      output: "./table-image.png",
      html: `
        <html>
          <head>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Manrope">
            <style>
              body { font-family: 'Manrope', sans-serif; }
              /* Add your CSS styling here */
            </style>
          </head>
          <body>
            <div>
              <h1>Table Reservation Code</h1>
              <p>Name: ${name}</p>
              <p>Table Number: ${tableNumber}</p>
              <p>Pax: ${pax}</p>
              <!-- Add more details as needed -->
              <img src="${bufferImage}" alt="QR Code">
            </div>
          </body>
        </html>
      `,
      puppeteerArgs: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
    });

    // If you want to send the image directly
    // const absPath = path.resolve("./table-image.png");
    // res.sendFile(absPath);

    // Or if you prefer to send a JSON response:
    res
      .status(201)
      .json({
        message: "Table Code created successfully",
        data: createdTableCode,
      });
  } catch (err) {
    console.error("Error creating table code:", err);
    res
      .status(500)
      .json({ message: "Error creating table code", error: err.message });
  }
};

module.exports = {
  addTableCode,
};
