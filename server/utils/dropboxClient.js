// dropboxClient.js
const { Dropbox } = require("dropbox");
require("dotenv").config();

console.log("API KEY", process.env.DROPBOX_API_KEY);
console.log("SECRET", process.env.DROPBOX_API_SECRET);

const dbx = new Dropbox({
  clientId: process.env.DROPBOX_API_KEY,
  clientSecret: process.env.DROPBOX_API_SECRET,
});

module.exports = dbx;
