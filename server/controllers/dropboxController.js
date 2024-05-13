const { Dropbox } = require("dropbox");
require("dotenv").config();

exports.authorize = (req, res) => {
  const dbx = new Dropbox({
    clientId: process.env.DROPBOX_API_KEY, // Changed from DROPBOX_KEY to DROPBOX_API_KEY
    clientSecret: process.env.DROPBOX_API_SECRET, // Changed from DROPBOX_SECRET to DROPBOX_API_SECRET
  });
  const redirectUri = `${req.protocol}://${req.get(
    "host"
  )}/api/dropbox/oauth/callback`;
  dbx.auth.setClientId(process.env.DROPBOX_API_KEY); // Make sure clientId is set if necessary
  const authUrl = dbx.auth.getAuthenticationUrl(
    redirectUri,
    null,
    "code",
    "offline",
    null,
    "none",
    false
  );
  res.redirect(authUrl);
};
exports.oauthCallback = async (req, res) => {
  const { code } = req.query;
  const redirectUri = `${req.protocol}://${req.get(
    "host"
  )}/api/dropbox/oauth/callback`;
  const dbx = new Dropbox({
    clientId: process.env.DROPBOX_API_KEY,
    clientSecret: process.env.DROPBOX_API_SECRET,
  });
  try {
    const tokenResult = await dbx.auth.getAccessTokenFromCode(
      redirectUri,
      code
    );
    req.session.accessToken = tokenResult.result.access_token;
    await req.session.save(); // Make sure to save the session explicitly if needed
    res.redirect("/api/dropbox/folder");
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).json({
      message: "Failed to authenticate with Dropbox",
      error: error.message,
    });
  }
};

exports.getFolderContents = async (req, res) => {
  console.log("Accessing Folder Contents");
  if (!req.session.accessToken) {
    console.log("No access token in session.");
    return res.status(403).json({ message: "No access token available." });
  }
  const dbx = new Dropbox({ accessToken: req.session.accessToken });
  try {
    const response = await dbx.filesListFolder({
      path: "/FYPED/Kunden/Afro Spiti/Promotion",
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
