const FriendsCode = require("../models/FriendsCode");
const BackstageCode = require("../models/BackstageCode");
const TableCode = require("../models/TableCode"); // Assuming you've created a TableCode model
const QRCode = require("qrcode");
const nodeHtmlToImage = require("node-html-to-image");
const path = require("path");

const qrOption = {
  margin: 1,
  width: 225,
  color: {
    dark: "#000000", // Black dots
    light: "#ffffff", // White background
  },
};

const addCode = async (req, res) => {
  const type = req.params.type;

  try {
    let model;
    const codeData = {
      ...req.body,
      hostId: req.user._id, // Use _id instead of userId
      status: type === "table" ? "pending" : "active", // Default status for table codes
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
  const { startDate, endDate } = req.query;
  const type = req.params.type;

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
      query.hostId = req.user._id; // Non-admins see only their codes
      break;
    case "backstage":
      model = BackstageCode;
      query.hostId = req.user._id;
      break;
    case "table":
      model = TableCode;

      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      break;
    default:
      return res.status(400).send("Invalid code type");
  }

  try {
    const codes = await model.find(query).sort({ createdAt: -1 });
    res.json(codes);
  } catch (error) {
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

    // Generate QR code
    const bufferImage = await QRCode.toDataURL(code._id.toString(), qrOption);

    let htmlTemplate;
    if (type === "friends") {
      htmlTemplate = ` <html style="font-family: 'Manrope', sans-serif;">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Manrope&display=swap" rel="stylesheet">
          <body
          style="position: relative; color: white; background-color: black; border-radius: 1.75rem; width: 24.375rem; height: 47.438rem; font-family: Manrope;">
          <h1 style="position: absolute; top: 3.25rem; left: 2.313rem; margin: 0; font-weight: 500; font-size: 1.85rem">Friends Code</h1>
          <img src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png" style="position: absolute; top: 4rem; right: 2.313rem; width: 4rem;">
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
                             <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">27.10.2024</p>
                         <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">23:00 H</p>
                </div>
            </div>
          
          
           <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">

              <div> 
                <div style="margin-top: 0.5rem;">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Line Up</p>                 
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem;  line-height: 1.25rem;">Hulk</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem;  line-height: 1.25rem;">Hendricks</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem;  line-height: 1.25rem;">J Fyah</p>
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


        <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
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
          <img src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png" style="position: absolute; top: 4rem; right: 2.313rem; width: 4rem;">
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
                                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">27.10.2024</p>
                         <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">23:00 H</p>
                </div>
            </div>
          
          
           <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">

              <div> 
                <div style="margin-top: 0.5rem;">
                  <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Line Up</p> 
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Hulk</p>
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Hendricks</p>
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">J Fyah</p>          
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

        <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
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
      <img src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png" style="position: absolute; top: 4rem; right: 2.313rem; width: 4rem;">
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
                            <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">27.10.2024</p>
                     <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">23:00 H</p>
            </div>
        </div>
      
      
       <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">

          <div> 
            <div style="margin-top: 0.5rem;">
                <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Line Up</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Hulk</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Hendricks</p>
                <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">J Fyah</p>
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

        <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">
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

module.exports = {
  fetchCodes,
  deleteCode,
  editCode,
  addCode,
  generateCodeImage,
  updateCodeStatus,
};
