const Friends = require("../models/FriendsCode");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const nodeHtmlToImage = require("node-html-to-image");
const { default: mongoose } = require("mongoose");

const qrOption = {
  margin: "1",
  width: "225",
  color: {
    dark: "#fff", // Blue dots
    // light: "#0000", // Transparent background
    light: "#000000", // Transparent background
  },
};

// // @desc    Adds a new Guestcode
// // @route   POST /api/friends/add
// // @access  Public

const addFriendsCode = async (req, res) => {
  const { name, pax, condition, date, paxChecked, event, host } = req.body;

  try {
    const createdFriend = await Friends.create({
      name: name,
      pax: pax,
      condition: condition,
      date: date,
      paxChecked: paxChecked,
      event: event,
      host: host,
    });

    const bufferImage = await QRCode.toDataURL(
      createdFriend._id.toString(),
      qrOption
    );

    let myImage = await nodeHtmlToImage({
      output: "./friends-image.png",

      html: `
 <html style="font-family: 'Manrope', sans-serif;">
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
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">Bolivar</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857em; line-height: 1.25rem;">Leof. Poseidonos</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">174 55, Athens</p>
                </div>
                <div>
                  <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Date</p>
                  <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">Wednesday</p>
<<<<<<< HEAD
                             <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">18.092024</p>
=======
                             <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">04.09.2024</p>
>>>>>>> a69bb9eafd235099c60a167f5fbe9e2a732fadd9
                         <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">09 PM</p>
                </div>
            </div>
          
          
           <div style="display: grid; margin-top: 1.5rem; grid-template-columns: 1fr 1fr; padding-left: 2.438rem;">

              <div> 
                <div style="margin-top: 0.5rem;">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Line Up</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Hulk</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Dim Kay</p>
<<<<<<< HEAD
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Gelo</p>
=======
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; color: #fff; line-height: 1.25rem;">Dim Kay</p>
>>>>>>> a69bb9eafd235099c60a167f5fbe9e2a732fadd9
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

            <div style="position: relative;"> 
                <div style="margin-top: 0.75rem; left: 2.438rem; position: absolute;">
                    <p style="margin: 0; color: #A6965D; font-weight: 600; font-size: 0.625rem; line-height: 1rem;">Name</p>
                    <p style="margin: 0; font-weight: 500; font-size: 0.857rem; line-height: 1.25rem;">${createdFriend.name}</p>        
                </div>

    
            </div>
          </div>
          <div style="color: black; position: absolute; bottom: 2.938rem; left: 2rem; background-color: white; width: 20.375rem; height: 10rem; border-radius: 1.75rem; display: grid; grid-template-columns: repeat(2,minmax(min-content,max-content)); grid-gap: 2.5rem; justify-items: center; justify-content: center; align-content: center; align-items: center;">
              
              <div style="justify-self: center;">
                  <p style="margin: 0; font-weight: 700; font-size: .85rem; line-height: 1.5rem;">FREE ENTRANCE</p>
                  <p style="margin: 0; font-weight: 700; font-size: 1.35rem; line-height: 1.5rem;">ALL NIGHT</p>
              </div>
              <div style="justify-self: center;">
                  <img style="background-color: white; width: 8rem; height: 8rem; " src=${bufferImage}></img>
                  <p style="margin: 0; font-weight: 500; font-size: 0.5rem; text-align: center;">${createdFriend._id}</p>        
               </div>
          </div>
          </body>
          </html>
          `,
      puppeteerArgs: {
        headless: true,
        args: ["--no-sandbox"],
      },
    });
    const absPath = path.resolve("./friends-image.png");
    res.sendFile(absPath);
  } catch (err) {
    console.log(err);
    res.status(400).send("Error entering data into the db!");
  }
};

// @desc    Gets the friend from ID
// @route   POST /api/friends/get-friend
// @access  Public
const getFriend = (req, res) => {
  Friends.findOne(
    { _id: mongoose.Types.ObjectId(req.body.friendID) },
    (err, friend) => {
      if (err) {
        console.log(err);
        res.sendStatus(404);
      }
      if (friend) res.status(200).json(friend);
      else res.sendStatus(204);
    }
  );
};

// @desc    increments the pax checked var in the db
// @route   POST /api/friends/inc-pax-checked
// @access  Public
const incPaxChecked = (req, res) => {
  Friends.findOneAndUpdate(
    { _id: mongoose.Types.ObjectId(req.body.friendID) },
    { $inc: { paxChecked: 1 } },
    (err, friend) => {
      if (err) {
        console.log(err);
        res.sendStatus(404);
      } else {
        res.status(200).json(friend);
      }
    }
  );
};

// @desc    Decrements the pax checked var in the db
// @route   POST /api/friends/dec-pax-checked
// @access  Public
const decPaxChecked = (req, res) => {
  Friends.findOneAndUpdate(
    { _id: mongoose.Types.ObjectId(req.body.friendID) },
    { $inc: { paxChecked: -1 } },
    (err, friend) => {
      if (err) {
        console.log(err);
        res.sendStatus(404);
      } else {
        res.status(200).json(friend);
      }
    }
  );
};

module.exports = {
  getFriend,
  addFriendsCode,
  incPaxChecked,
  decPaxChecked,
};
