const express = require("express");
const router = express.Router();
const dropboxController = require("../../controllers/dropboxController");

router.get("/folder", dropboxController.getFolderContents);

// Brand gallery routes (photos)
router.get("/brand/:brandId/galleries/check", dropboxController.checkBrandGalleries);
router.get("/brand/:brandId/galleries/dates", dropboxController.getBrandGalleryDates);
router.get("/brand/:brandId/galleries/latest", dropboxController.getLatestBrandGallery);

// Brand video gallery routes
router.get("/brand/:brandId/videos/check", dropboxController.checkBrandVideoGalleries);
router.get("/brand/:brandId/videos/dates", dropboxController.getBrandVideoGalleryDates);
router.get("/brand/:brandId/videos/latest", dropboxController.getLatestBrandVideoGallery);

// Event gallery routes (photos)
router.get("/event/:eventId/gallery", dropboxController.getEventGalleryById);
router.post("/event/:eventId/gallery/download-zip", dropboxController.downloadGalleryZip);

// Event video gallery routes
router.get("/event/:eventId/video-gallery", dropboxController.getEventVideoGalleryById);

// Lazy loading routes
router.post("/thumbnails/load", dropboxController.loadThumbnails);

// File download routes
router.get("/download/:filePath", dropboxController.downloadGalleryFile);

// Temporary link routes (for fast direct Dropbox CDN access)
router.get("/temp-link/:filePath", dropboxController.getTemporaryLink);
router.post("/temp-links/batch", dropboxController.getBatchTemporaryLinks);

router.get("/test-root", async (req, res) => {
  try {
    const { Dropbox } = require("dropbox");
    const dbx = new Dropbox({ 
      accessToken: process.env.DROPBOX_API_ACCESS_TOKEN,
      pathRoot: JSON.stringify({
        ".tag": "root",
        "root": process.env.DROPBOX_ROOT_NAMESPACE_ID
      })
    });
    
    // Get account info first
    const accountInfo = await dbx.usersGetCurrentAccount();
    console.log("[Dropbox Test] Account info:", {
      name: accountInfo.result.name.display_name,
      email: accountInfo.result.email,
      account_type: accountInfo.result.account_type,
      team: accountInfo.result.team
    });
    
    // Get personal folder with mounted folders (team folders)
    const personalResponse = await dbx.filesListFolder({ 
      path: "",
      include_mounted_folders: true  // This is the key to see team folders!
    });
    console.log("[Dropbox Test] Folder contents (including team):", personalResponse.result.entries.map(e => ({ name: e.name, type: e['.tag'] })));
    
    // Try to get team folder - this is where your projects likely are
    let teamResponse = null;
    try {
      teamResponse = await dbx.filesListFolder({ 
        path: "",
        include_mounted_folders: true,
        path_root: JSON.stringify({
          ".tag": "namespace_id", 
          "namespace_id": accountInfo.result.team ? accountInfo.result.team.id : null
        })
      });
      console.log("[Dropbox Test] Team folder contents:", teamResponse.result.entries.map(e => ({ name: e.name, type: e['.tag'] })));
    } catch (teamError) {
      console.log("[Dropbox Test] Cannot access team folder:", teamError.message);
      
      // Try alternative approach - list all namespaces
      try {
        const namespaces = await dbx.usersGetSpaceUsage();
        console.log("[Dropbox Test] Namespaces:", namespaces);
      } catch (nsError) {
        console.log("[Dropbox Test] Cannot get namespaces:", nsError.message);
      }
    }
    
    res.json({
      success: true,
      account: {
        name: accountInfo.result.name.display_name,
        email: accountInfo.result.email,
        account_type: accountInfo.result.account_type,
        team: accountInfo.result.team
      },
      personal: {
        path: "",
        entries: personalResponse.result.entries.map(e => ({ name: e.name, type: e['.tag'], path: e.path_lower }))
      },
      team: teamResponse ? {
        path: "",
        entries: teamResponse.result.entries.map(e => ({ name: e.name, type: e['.tag'], path: e.path_lower }))
      } : null
    });
  } catch (error) {
    console.error("[Dropbox Test] Error:", error);
    res.status(500).json({ error: error.message });
  }
});
router.get("/download/:path", dropboxController.getDownloadLink);
router.get("/gallery", dropboxController.getEventGallery);

router.post("/upload", dropboxController.uploadFile);

// OAuth routes
router.get("/oauth/authorize", dropboxController.initiateOAuth);
router.get("/oauth/start", dropboxController.initiateOAuth); // Keep backward compatibility
router.get("/oauth/callback", dropboxController.handleOAuthCallback);

// Diagnostic route to check namespaces
router.get("/diagnostic", dropboxController.diagnosticCheck);

// Test route for OAuth token
router.get("/test-oauth-token", async (req, res) => {
  try {
    const { Dropbox } = require("dropbox");
    const dbx = new Dropbox({ 
      accessToken: process.env.DROPBOX_API_ACCESS_TOKEN,
      pathRoot: JSON.stringify({
        ".tag": "root",
        "root": process.env.DROPBOX_ROOT_NAMESPACE_ID
      })
    });
    
    const account = await dbx.usersGetCurrentAccount();
    const folders = await dbx.filesListFolder({ 
      path: "",
      include_mounted_folders: true 
    });
    
    res.json({
      success: true,
      account: {
        email: account.result.email,
        name: account.result.name.display_name,
        type: account.result.account_type['.tag']
      },
      folderCount: folders.result.entries.length,
      folders: folders.result.entries.map(f => ({
        name: f.name,
        path: f.path_display,
        type: f['.tag']
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router;
