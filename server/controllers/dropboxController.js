const { Dropbox } = require("dropbox");
require("dotenv").config();

exports.authorize = (req, res) => {
  const redirectUri = `${req.protocol}://${req.get(
    "host"
  )}/api/dropbox/oauth/callback`;
  const dbx = new Dropbox({
    clientId: process.env.DROPBOX_KEY,
    clientSecret: process.env.DROPBOX_SECRET,
  });
  const authUrl = dbx.getAuthenticationUrl(redirectUri);
  res.redirect(authUrl);
};

exports.oauthCallback = async (req, res) => {
  const { code } = req.query;
  const redirectUri = `${req.protocol}://${req.get(
    "host"
  )}/api/dropbox/oauth/callback`;
  const dbx = new Dropbox({
    clientId: process.env.DROPBOX_KEY,
    clientSecret: process.env.DROPBOX_SECRET,
  });
  try {
    const token = await dbx.getAccessTokenFromCode(redirectUri, code);
    req.session.accessToken = token.result.access_token; // Store access token in session
    res.redirect("/api/dropbox/folder");
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    res.status(500).json({
      message: "Failed to authenticate with Dropbox",
      error: error.message,
    });
  }
};

exports.getFolderContents = async (req, res) => {
  console.log("Accessing Folder Contents");

  if (!req.session) {
    console.log("Session object is missing.");
    return res.status(500).json({ message: "Session handling error." });
  }

  if (!req.session.accessToken) {
    console.log("No access token in session.");
    return res.status(403).json({ message: "No access token available." });
  }

  console.log("Session Access Token:", req.session.accessToken);
  const dbx = new Dropbox({ accessToken: req.session.accessToken });

  try {
    const response = await dbx.filesListFolder({
      path: "/FYPED/Kunden/Afro Spiti/Promotion",
      recursive: false,
    });
    console.log("Files List:", response.result.entries);
    res.status(200).json(response.result.entries);
  } catch (error) {
    console.error("Dropbox API error:", error);
    res.status(500).json({
      message: "Failed to retrieve folder contents from Dropbox",
      error: error.message,
    });
  }
};
