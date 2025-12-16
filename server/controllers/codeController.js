const FriendsCode = require("../models/FriendsCode");
const BackstageCode = require("../models/BackstageCode");
const TableCode = require("../models/TableCode"); // Assuming you've created a TableCode model
const QRCode = require("qrcode");
const nodeHtmlToImage = require("node-html-to-image");
const path = require("path");
const crypto = require("crypto");
const puppeteer = require("puppeteer");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const { format } = require("date-fns");
const mongoose = require("mongoose");
const { createEventEmailTemplate } = require("../utils/emailLayout");

// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const qrOption = {
  margin: 1,
  width: 225,
  color: {
    dark: "#000000", // Black dots
    light: "#ffffff", // White background
  },
};

const getLogoBase64 = async () => {
  const logoPath = path.join(__dirname, "../utils/logo_w.svg");
  const logoData = await fs.readFile(logoPath, "utf8");
  return `data:image/svg+xml;base64,${Buffer.from(logoData).toString(
    "base64"
  )}`;
};

const addCode = async (req, res) => {
  const type = req.params.type;

  try {
    let model;
    let initialStatus = "active";

    // For table codes, check if user has management permissions
    if (type === "table") {
      const Role = require("../models/roleModel");
      const Event = require("../models/eventsModel");

      if (!req.body.event) {
        return res
          .status(400)
          .json({ message: "Event ID required for table codes" });
      }

      // Find the event to get its brand
      const event = await Event.findById(req.body.event).populate("brand");
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get user roles for this brand
      const userRoles = await Role.find({
        brandId: event.brand._id,
        _id: { $in: req.user.roles || [] },
      });

      // Check if user has table management permission
      const hasTableManage = userRoles.some(
        (role) =>
          role.permissions &&
          role.permissions.tables &&
          role.permissions.tables.manage === true
      );

      // Set initial status based on permissions
      initialStatus = hasTableManage ? "confirmed" : "pending";
    }

    const codeData = {
      ...req.body,
      hostId: req.user._id, // Use _id instead of userId
      status: initialStatus,
      createdAt: new Date(),
    };

    switch (type) {
      case "friends":
        model = FriendsCode;
        break;
      case "backstage":
        model = BackstageCode;
        break;
      case "table":
        model = TableCode;
        break;
      default:
        return res.status(400).send("Invalid code type");
    }

    const code = new model(codeData);
    await code.save();

    res.json(code);
  } catch (error) {
    console.error("Error adding code:", error);
    res.status(500).send("Error creating code!");
  }
};

// codeController.js
const updateCodeStatus = async (req, res) => {
  const { type, codeId } = req.params;
  const { status } = req.body;

  let model;
  switch (type) {
    case "friends":
      model = FriendsCode;
      break;
    case "backstage":
      model = BackstageCode;
      break;
    case "table":
      model = TableCode;
      break;
    default:
      return res.status(400).json({
        error: "Invalid code type",
        details: `Received type: ${type}`,
      });
  }

  try {
    const updatedCode = await model.findByIdAndUpdate(
      codeId,
      { status },
      { new: true }
    );

    if (!updatedCode) {
      return res.status(404).json({
        error: "Code not found",
        codeId,
      });
    }

    res.json(updatedCode);
  } catch (error) {
    res.status(500).json({
      error: "Error updating status",
      details: error.message,
    });
  }
};

const fetchCodes = async (req, res) => {
  const { startDate, endDate, eventId } = req.query;
  const type = req.params.type;

  try {
    let model;
    let query = {};

    if (!startDate || !endDate) {
      return res.status(400).send("Start date and end date are required");
    }

    query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    switch (type) {
      case "friends":
        model = FriendsCode;
        query.hostId = req.user._id;
        break;
      case "backstage":
        model = BackstageCode;
        query.hostId = req.user._id;
        break;
      case "table":
        model = TableCode;
        if (eventId) {
          query.event = eventId;
        }
        break;
      default:
        return res.status(400).send("Invalid code type");
    }

    const codes = await model.find(query).sort({ createdAt: -1 });

    // Generate QR codes for each code
    const codesWithQR = await Promise.all(
      codes.map(async (code) => {
        const qrBuffer = await QRCode.toDataURL(code._id.toString(), qrOption);
        const codeObject = code.toObject();
        return {
          ...codeObject,
          qrCode: qrBuffer, // Add QR code to each code object
        };
      })
    );

    res.json(codesWithQR);
  } catch (error) {
    console.error("Error fetching codes:", error);
    res.status(500).send("Error fetching codes!");
  }
};

const deleteCode = async (req, res) => {
  const { type, codeId } = req.params;

  let model;
  switch (type) {
    case "friends":
      model = FriendsCode;
      break;
    case "backstage":
      model = BackstageCode;
      break;
    case "table":
      model = TableCode;
      break;
    default:
      return res.status(400).json({
        error: "Invalid code type",
        details: `Received type: ${type}`,
      });
  }

  try {
    const deletedCode = await model.findByIdAndDelete(codeId);

    if (!deletedCode) {
      return res.status(404).json({
        error: "Code not found",
        codeId,
      });
    }

    res.json({
      message: "Code deleted successfully",
      deletedCode: {
        id: deletedCode._id,
        type,
        name: deletedCode.name,
      },
    });
  } catch (error) {
    console.error("❌ Error in deleteCode:", {
      message: error.message,
      stack: error.stack,
      type,
      codeId,
    });
    res.status(500).json({
      error: "Error deleting code",
      details: error.message,
    });
  }
};

const editCode = async (req, res) => {
  const { type, codeId } = req.params;
  const updateData = req.body;

  let model;
  switch (type) {
    case "friends":
      model = FriendsCode;
      break;
    case "backstage":
      model = BackstageCode;
      break;
    case "table":
      model = TableCode;
      break;
    default:
      return res.status(400).json({
        error: "Invalid code type",
        details: `Received type: ${type}`,
      });
  }

  try {
    const updatedCode = await model.findByIdAndUpdate(
      codeId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCode) {
      return res.status(404).json({
        error: "Code not found",
        codeId,
      });
    }

    res.json(updatedCode);
  } catch (error) {
    res.status(500).json({
      error: "Error updating code",
      details: error.message,
    });
  }
};

const formatCondition = (condition) => {
  // Special case for price conditions
  if (condition.includes("€")) {
    return `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <p style="margin: 0; font-weight: 700; font-size: 1.35rem; line-height: 1.5rem;">
          ${condition.split(" ")[0]} <!-- "5€" -->
        </p>
        <p style="margin: 0; font-weight: 700; font-size: 1.35rem; line-height: 1.5rem;">
          ${condition.split(" ").slice(1).join(" ")} <!-- "ALL NIGHT" -->
        </p>
      </div>
    `;
  }

  // Original format for "FREE ENTRANCE ALL NIGHT"
  if (condition.includes("FREE")) {
    return `
      <p style="margin: 0; font-weight: 700; font-size: .85rem; line-height: 1.5rem;">
        FREE ENTRANCE
      </p>
      <p style="margin: 0; font-weight: 700; font-size: 1.35rem; line-height: 1.5rem;">
        ALL NIGHT
      </p>
    `;
  }

  // Default case
  return `
    <p style="margin: 0; font-weight: 700; font-size: 1.35rem; line-height: 1.5rem;">
      ${condition}
    </p>
  `;
};

const generateCodeImage = async (req, res) => {
  const { type, codeId } = req.params;

  try {
    let model;
    switch (type) {
      case "friends":
        model = FriendsCode;
        break;
      case "backstage":
        model = BackstageCode;
        break;
      case "table":
        model = TableCode;
        break;
      default:
        return res.status(400).send("Invalid code type!");
    }

    const code = await model.findById(codeId);

    if (!code) {
      return res.status(404).send("Code not found");
    }

    // Generate QR code and get logo
    const [bufferImage, logoBase64] = await Promise.all([
      QRCode.toDataURL(code._id.toString(), qrOption),
      getLogoBase64(),
    ]);

    let htmlTemplate;
    if (type === "friends") {
      htmlTemplate = ` <html style="font-family: 'Manrope', sans-serif;">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Manrope&display=swap" rel="stylesheet">
          <body
          style="position: relative; color: white; background-color: black; border-radius: 1.75rem; width: 24.375rem; height: 47.438rem; font-family: Manrope;">
          <h1 style="position: absolute; top: 3.25rem; left: 2.313rem; margin: 0; font-weight: 500; font-size: 1.85rem">Friends Code</h1>
          <img src="${logoBase64}" style="position: absolute; top: 2rem; right: 2.313rem; width: 8rem;">
          <div style="color: black; position: absolute; width: 20.375rem; height: 27rem; background-color: #FAE28C; border-radius: 1.75rem; top: 7.5rem; left: 2rem;">
          
           <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem;">Afro Spiti</h3>   
          
            <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">             
                <div>
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Location</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">Studio 24</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857em; line-height: 1.25rem;">Dekeleon 26</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">188 54, Athens</p>
                </div>
                <div>
                  <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Date</p>
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">Sunday</p>
                             <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">02.03.2025</p>
                         <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">23:00 H</p>
                </div>
            </div>
          
          
           <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">

              <div> 
                <div style="margin-top: 0.5rem;">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Line Up</p>                 
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #000; line-height: 1.25rem;">L'artistique</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #000; line-height: 1.25rem;">Hendricks</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #000; line-height: 1.25rem;">Dim Kay</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #000; line-height: 1.25rem;">J Fyah (MC)</p>
                </div>
                
              </div>
              <div style="margin-top: 0.5rem; ">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Music</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">Afrobeats</p>                    
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">Amapiano</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">Dancehall</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">& co</p>
              </div>
           </div>
          

          
            <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid #E6CF81; width: 15.5rem;"></div>


        <div style="display: grid; margin-top: .3rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
                  <div style="margin-top: 0.75rem;">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Name</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #000; line-height: 1.25rem;">${
                      code.name
                    }</p>        
                </div>


                
           <div style="margin-top: 0.75rem;">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">People</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #000; line-height: 1.25rem;">${
                      code.pax
                    }</p>        
                </div>
    
            </div>

          </div>
<div style="color: black; position: absolute; bottom: 2.938rem; left: 2rem; background-color: white; width: 20.375rem; height: 10rem; border-radius: 1.75rem; display: grid; grid-template-columns: repeat(2,minmax(min-content,max-content)); grid-gap: 2.5rem; justify-items: center; justify-content: center; align-content: center; align-items: center;">
    <div style="justify-self: center; text-align: center; width: 100%;">
        ${formatCondition(code.condition)}
    </div>
    
    <div style="justify-self: center;">
        <img style="background-color: white; width: 8rem; height: 8rem;" src=${bufferImage}></img>
        <p style="margin: 0; font-weight: 500; font-size: 0.5rem; text-align: center;">${
          code._id
        }</p>        
    </div>
</div>
          </body>
          </html>`; // Your Friends Code HTML here
    } else if (type === "backstage") {
      htmlTemplate = ` <html style="font-family: 'Manrope', sans-serif;">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Manrope&display=swap" rel="stylesheet">
          <body
          style="position: relative; color: white; background-color: black; border-radius: 1.75rem; width: 24.375rem; height: 47.438rem; font-family: Manrope;">
          <h1 style="position: absolute; top: 3.25rem; left: 2.313rem; margin: 0; font-weight: 500; font-size: 1.85rem">Backstage Code</h1>
          <img src="${logoBase64}" style="position: absolute; top: 1rem; right: 0rem; width: 9.5rem;">
          <div style="color: black; position: absolute; width: 20.375rem; height: 27rem; background-color: rgb(43, 43, 43); border-radius: 1.75rem; top: 7.5rem; left: 2rem;">
          
           <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem; color: #A6965D;">Afro Spiti</h3>   
          
            <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">             
                <div>
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Location</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Studio 24</p>
                          <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Baby Disco</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857em; color: #fff; line-height: 1.25rem;">Dekeleon 26</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">188 54, Athens</p>
                </div>
                <div>
                  <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Date</p>
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Sunday</p>
                                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">02.03.2025</p>
                         <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">23:00 H</p>
                </div>
            </div>
          
          
           <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">

              <div> 
                <div style="margin-top: 0.5rem;">
                  <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Line Up</p> 
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">L'artistique</p>
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Hendricks</p>
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Dim Kay</p>
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">J Fyah (MC)</p>          
                  </div>
              </div>



                <div style="margin-top: 0.5rem; ">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Music</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Afrobeats</p>                    
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Amapiano</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Dancehall</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">& co</p>
  
                </div>
         

           </div>
          

          
            <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid #A6965D; width: 15.5rem;"></div>

        <div style="display: grid; margin-top: .3rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
                  <div style="margin-top: 0.75rem;">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Name</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${code.name}</p>        
                </div>


                
           <div style="margin-top: 0.75rem;">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">People</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${code.pax}</p>        
                </div>
    
            </div>

          </div>
          <div style="color: black; position: absolute; bottom: 2.938rem; left: 2rem; background-color: white; width: 20.375rem; height: 10rem; border-radius: 1.75rem; display: grid; grid-template-columns: repeat(2,minmax(min-content,max-content)); grid-gap: 2.5rem; justify-items: center; justify-content: center; align-content: center; align-items: center;">
              
              <div style="justify-self: center;">
                  <p style="margin: 0; font-weight: 700; font-size: .90rem; line-height: 1.5rem;">BACKSTAGE VIP</p>
                  <p style="margin: 0; font-weight: 700; font-size: 1.35rem; line-height: 1.5rem;">ALL NIGHT</p>
              </div>
              <div style="justify-self: center;">
                  <img style="background-color: white; width: 8rem; height: 8rem; " src=${bufferImage}></img>
                  <p style="margin: 0; font-weight: 500; font-size: 0.5rem; text-align: center;">${code._id}</p>        
               </div>
          </div>
          </body>
          </html>`; // Your Backstage Code HTML here
    } else {
      htmlTemplate = ` <html style="font-family: 'Manrope', sans-serif;">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Manrope&display=swap" rel="stylesheet">
      <body
      style="position: relative; color: white; background-color: black; border-radius: 1.75rem; width: 24.375rem; height: 47.438rem; font-family: Manrope;">
      <h1 style="position: absolute; top: 3.25rem; left: 2.313rem; margin: 0; font-weight: 500; font-size: 1.85rem">Table Code</h1>
      <img src="${logoBase64}" style="position: absolute; top: 1rem; right: 0rem; width: 9.5rem;">
      <div style="color: black; position: absolute; width: 20.375rem; height: 27rem; background-color: #313D4B; border-radius: 1.75rem; top: 7.5rem; left: 2rem;">
      
       <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem; color: #A6965D;">Afro Spiti</h3>   
      
        <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">             
            <div>
                <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Location</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Studio 24</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857em; color: #fff; line-height: 1.25rem;">Dekeleon 26</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">188 54, Athens</p>
            </div>
            <div>
              <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Date</p>
              <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Sunday</p>
                            <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">02.03.2025</p>
                     <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">23:00 H</p>
            </div>
        </div>
      
      
       <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">

          <div> 
            <div style="margin-top: 0.5rem;">
                <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Line Up</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">L'artistique</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Hendricks</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Dim Kay</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">J Fyah (MC)</p>
            </div>
          </div>



            <div style="margin-top: 0.5rem; ">
                <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Music</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Afrobeats</p>                    
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Amapiano</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Dancehall</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">& co</p>

            </div>
     

       </div>
      

      
        <div style="margin-top: 1.313rem; margin-bottom: .3rem; margin-left: 2.438rem; border: 1px solid #A6965D; width: 15.5rem;"></div>

        <div style="display: grid; margin-top: .3rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
            <div style="margin-top: 0.75rem;">
                <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Name</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                  code.name
                }</p>        
            </div>

            <div style="margin-top: 0.75rem;">
                <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">People</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">${
                  code.pax
                }</p>        
            </div>
        </div>
      </div>
      <div style="grid-gap: 2rem; color: black; position: absolute; bottom: 2.938rem; left: 2rem; background-color: white; width: 20.375rem; height: 10rem; border-radius: 1.75rem; display: grid; grid-template-columns: repeat(2,minmax(min-content,max-content)); justify-items: center; justify-content: center; align-content: center; align-items: center;">
          <div
            style="
              justify-self: center;
              display: grid;
              grid-template-columns: repeat(2,minmax(min-content,max-content));
              grid-gap: .5rem;         
            "
          >
            <div>
              <p
                style="
                  margin: 0;
                  font-weight: 700;
                  font-size: 1rem;
                  line-height: 1.5rem;
                "
              >
                Table
              </p>

              <p
                style="
                  margin: 0;
                  font-weight: 700;
                  font-size: 1rem;
                  line-height: 1.5rem;
                "
              >
                Backstage
              </p>
            </div>
            <div>
              <p
                style="
                  margin: 0;
                  font-weight: 700;
                  font-size: 1.35rem;
                  line-height: 1.5rem;
                "
              >
                ${code.tableNumber}
              </p>

              <p
                style="
                  margin: 0;
                  font-weight: 700;
                  font-size: 1.35rem;
                  line-height: 1.5rem;
                "
              >
                ${code.backstagePass ? "Yes" : "No"}
              </p>
            </div>
          </div>



          <div>
              <img style="background-color: white; width: 8rem; height: 8rem; " src=${bufferImage}></img>
              <p style="margin: 0; font-weight: 500; font-size: 0.5rem; text-align: center;">${
                code._id
              }</p>        
           </div>
      </div>
      </body>
      </html>`;
    }

    // Generate image with correct encoding
    const image = await nodeHtmlToImage({
      html: htmlTemplate,
      puppeteerArgs: { headless: true, args: ["--no-sandbox"] },
      encoding: "buffer", // Ensure the image is returned as a Buffer
    });

    // Prepare filename
    const filename = `${code.name
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_${type}_code.png`;

    // Set appropriate headers for file download
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", image.length);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
        filename
      )}`
    );

    // Send the image as response
    res.end(image); // Buffer is sent directly
  } catch (error) {
    console.error("Error generating code image:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Generate a unique code
const generateUniqueCode = async () => {
  // Generate a random string
  const randomString = crypto.randomBytes(4).toString("hex").toUpperCase();

  // Check if code already exists
  const existingCode = await Code.findOne({ code: randomString });
  if (existingCode) {
    // Recursively generate a new code if this one exists
    return generateUniqueCode();
  }

  return randomString;
};

// Format date with leading zeros
const formatCodeDate = (dateString) => {
  if (!dateString) return { date: "", time: "" };

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return {
    date: `${day}.${month}.${year}`,
    time: `${hours}:${minutes}`,
  };
};

// Generate QR Code for the access code
const generateCodeQR = async (codeId) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(codeId.toString(), {
      margin: 1,
      width: 225,
      color: {
        dark: "#000000", // Black dots
        light: "#ffffff", // White background
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

// Generate PDF for the code
const generateCodePDF = async (code, event, codeSettings) => {
  try {
    // Fetch related data
    const brand = event ? await Brand.findById(event.brand) : null;

    // Get brand colors or use defaults
    const primaryColor = brand?.colors?.primary || "#ffc807";
    const accentColor = brand?.colors?.accent || "#000000";

    // Format date
    const eventDate = formatCodeDate(event?.date);

    // Generate QR code
    const qrCodeDataUrl = await generateCodeQR(code._id);

    // Create HTML template for the code - white theme, opposite of tickets
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
      <body style="position: relative; background-color: white; width: 390px; height: 760px; overflow: hidden; border-radius: 28px; color: #222222;">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 380px; background-color: ${primaryColor}; overflow: hidden; border-top-left-radius: 28px; border-top-right-radius: 28px;">
          <h1 style="position: absolute; top: 52px; left: 38px; margin: 0; font-weight: 700; font-size: 32px; color: #222222;">${code.type.toUpperCase()} CODE</h1>
          
          ${
            brand?.logo?.medium
              ? `<img src="${brand.logo.medium}" style="position: absolute; top: 64px; right: 38px; height: 64px; width: auto;" alt="${brand.name} logo">`
              : `<div style="position: absolute; top: 64px; right: 38px; font-size: 24px; font-weight: 700; color: #222222;">${
                  brand?.name || "GuestCode"
                }</div>`
          }
          
          <div style="position: absolute; top: 120px; left: 38px; right: 38px;">
            <div style="margin-top: 24px; display: flex; justify-content: space-between;">
              <div>
                <p style="margin: 0; color: rgba(34, 34, 34, 0.6); font-weight: 600; font-size: 10px; line-height: 16px; text-transform: uppercase;">Event</p>
                <p style="margin: 0; font-weight: 600; font-size: 16px; line-height: 20px; color: #222222;">${
                  event?.title || "Event"
                }</p>
              </div>
              
              <div>
                <p style="margin: 0; color: rgba(34, 34, 34, 0.6); font-weight: 600; font-size: 10px; line-height: 16px; text-transform: uppercase;">Date</p>
                <p style="margin: 0; font-weight: 600; font-size: 16px; line-height: 20px; color: #222222;">${
                  eventDate.date
                }</p>
                <p style="margin: 0; font-weight: 500; font-size: 14px; line-height: 20px; color: #222222;">${
                  event?.startTime || eventDate.time
                }H Start</p>
              </div>
            </div>
            
            <div style="margin-top: 24px; display: flex; justify-content: space-between;">
              <div>
                <p style="margin: 0; color: rgba(34, 34, 34, 0.6); font-weight: 600; font-size: 10px; line-height: 16px; text-transform: uppercase;">Location</p>
                <p style="margin: 0; font-weight: 600; font-size: 16px; line-height: 20px; color: #222222;">${
                  event?.location?.name || "Venue"
                }</p>
                <p style="margin: 0; font-weight: 500; font-size: 14px; line-height: 20px; color: #222222;">${
                  event?.location?.address || ""
                }</p>
                ${
                  event?.location?.city
                    ? `<p style="margin: 0; font-weight: 500; font-size: 14px; line-height: 20px; color: #222222;">${event.location.city}</p>`
                    : ""
                }
              </div>
              
              <div>
                <p style="margin: 0; color: rgba(34, 34, 34, 0.6); font-weight: 600; font-size: 10px; line-height: 16px; text-transform: uppercase;">Code Type</p>
                <p style="margin: 0; font-weight: 600; font-size: 16px; line-height: 20px; color: #222222;">${
                  code.name
                }</p>
                ${
                  code.maxPax > 1
                    ? `<p style="margin: 0; font-weight: 500; font-size: 14px; line-height: 20px; color: #222222;">Valid for ${code.maxPax} people</p>`
                    : ""
                }
              </div>
            </div>
            
            <div style="margin-top: 24px;">
              <p style="margin: 0; color: rgba(34, 34, 34, 0.6); font-weight: 600; font-size: 10px; line-height: 16px; text-transform: uppercase;">Name</p>
              <p style="margin: 0; font-weight: 600; font-size: 16px; line-height: 20px; color: #222222;">${
                code.guestName || "Guest"
              }</p>
            </div>
            
            ${
              event?.lineups && event.lineups.length > 0
                ? `
            <div style="margin-top: 24px;">
              <p style="margin: 0; color: rgba(34, 34, 34, 0.6); font-weight: 600; font-size: 10px; line-height: 16px; text-transform: uppercase;">Line Up</p>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;">
                ${event.lineups
                  .slice(0, 3)
                  .map(
                    (lineup) =>
                      `<p style="margin: 0; font-weight: 600; font-size: 14px; line-height: 20px; color: #222222;">${
                        lineup.name || lineup
                      }</p>`
                  )
                  .join(" • ")}
                ${event.lineups.length > 3 ? "• ..." : ""}
              </div>
            </div>`
                : ""
            }
          </div>
        </div>
        
        <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 380px; background-color: #222222; overflow: hidden; border-bottom-left-radius: 28px; border-bottom-right-radius: 28px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="margin-bottom: 16px; text-align: center;">
            <p style="margin: 0; font-weight: 600; font-size: 14px; line-height: 20px; color: #ffffff;">SCAN THIS CODE FOR ENTRY</p>
          </div>
          
          <div style="background-color: white; padding: 16px; border-radius: 16px;">
            <img src="${qrCodeDataUrl}" style="width: 200px; height: 200px;">
          </div>
          
          <div style="margin-top: 16px; text-align: center;">
            <p style="margin: 0; font-weight: 700; font-size: 24px; color: ${primaryColor};">${
      code.code
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
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
    });

    await browser.close();

    return {
      buffer: pdfBuffer,
      html: htmlTemplate,
    };
  } catch (error) {
    console.error("[generateCodePDF] Error generating code PDF:", error);
    throw error;
  }
};

// Send code via email
const sendCodeEmail = async (code, email, pdfBuffer) => {
  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Read attachments
    const attachments = [
      {
        content: pdfBuffer.toString("base64"),
        name: `${code.type}_code_${code.code}.pdf`,
      },
    ];

    // Fetch the event data if available
    let event = null;
    if (code.eventId) {
      const Event = require("../models/eventsModel");
      event = await Event.findById(code.eventId)
        .populate("brand")
        .populate("lineups");
    }

    // Create additional content specific to the code
    const additionalContent = `
      <div style="background-color: #f8f8f8; border-left: 4px solid #ffc807; padding: 15px; margin: 20px 0;">
        <p style="font-size: 16px; margin: 0 0 10px; font-weight: bold;">Code Details:</p>
        <p style="font-size: 16px; margin: 0 0 5px;">Code: <strong>${
          code.code
        }</strong></p>
        <p style="font-size: 16px; margin: 0 0 5px;">Type: <strong>${
          code.type
        }</strong></p>
        ${
          code.maxPax > 1
            ? `<p style="font-size: 16px; margin: 0;">Valid for: <strong>${code.maxPax} people</strong></p>`
            : ""
        }
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">Your code is attached to this email as a PDF file. You can either show the PDF on your phone or print it out for entry.</p>
    `;

    // Use the common email template
    const htmlContent = createEventEmailTemplate({
      recipientName: code.guestName || "Guest",
      eventTitle: event?.title || "Event",
      eventDate: event?.date,
      eventLocation: event?.location || event?.venue || "",
      eventAddress: event?.street || event?.address || "",
      eventCity: event?.city || "",
      eventPostalCode: event?.postalCode || "",
      startTime: event?.startTime || "",
      endTime: event?.endTime || "",
      description: `Your ${code.type.toUpperCase()} code has been generated and is attached to this email. Use this code for entry to the event.`,
      primaryColor: event?.brand?.colors?.primary || "#ffc807",
      additionalContent: additionalContent,
      lineups: event?.lineups || [],
      footerText:
        "This is an automated email. Please do not reply to this message.",
    });

    // Build the email parameters
    const params = {
      sender: {
        name: "GuestCode",
        email: "no-reply@guestcode.io",
      },
      to: [
        {
          email: email,
          name: code.guestName || "Guest",
        },
      ],
      subject: `Your ${code.type.toUpperCase()} Code for ${
        event?.title || "Event"
      }`,
      htmlContent: htmlContent,
      attachment: attachments,
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(params);
    return result;
  } catch (error) {
    console.error("[sendCodeEmail] Error sending email:", error);
    throw error;
  }
};

// Generate and send code via email
const generateAndSendCode = async (req, res) => {
  const { type } = req.params;
  const {
    eventId,
    codeSettingId,
    guestName,
    guestEmail,
    maxPax = 1,
  } = req.body;

  if (!eventId || !guestEmail) {
    return res
      .status(400)
      .json({ message: "Event ID and guest email are required" });
  }

  try {
    // Fetch the event
    const event = await Event.findById(eventId).populate("brand");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get code settings if provided
    let codeSettings = null;
    if (codeSettingId) {
      codeSettings = await CodeSettings.findById(codeSettingId);
      if (!codeSettings) {
        return res.status(404).json({ message: "Code settings not found" });
      }
    } else {
      // Find default settings for this type - resolve to parent for CodeSettings lookup
      // CodeSettings only exist for parent events, but Code should keep the original eventId for scanning
      const parentEventId = event.parentEventId || eventId;
      codeSettings = await CodeSettings.findOne({
        eventId: parentEventId,
        type,
      });
    }

    // Generate a unique code
    const codeValue = await generateUniqueCode();

    // Generate QR code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(codeValue, {
      margin: 1,
      width: 225,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // Create the code in the database
    const newCode = new Code({
      eventId,
      codeSettingId: codeSettings?._id,
      type,
      name: codeSettings?.name || type.charAt(0).toUpperCase() + type.slice(1),
      code: codeValue,
      qrCode: qrCodeDataUrl,
      condition: codeSettings?.condition || "",
      maxPax: maxPax || codeSettings?.maxPax || 1,
      status: "active",
      createdBy: req.user._id,
      guestName,
      guestEmail,
    });

    // Save the code
    await newCode.save();

    // Generate PDF for the code
    const { buffer: pdfBuffer } = await generateCodePDF(
      newCode,
      event,
      codeSettings
    );

    // Send the code via email
    await sendCodeEmail(newCode, guestEmail, pdfBuffer);

    res.status(201).json({
      message: "Code generated and sent successfully",
      code: newCode,
    });
  } catch (error) {
    console.error("[generateAndSendCode] Error:", error);
    res.status(500).json({
      message: "Error generating and sending code",
      error: error.message,
    });
  }
};

module.exports = {
  fetchCodes,
  deleteCode,
  editCode,
  addCode,
  generateCodeImage,
  updateCodeStatus,
  generateAndSendCode,
};
