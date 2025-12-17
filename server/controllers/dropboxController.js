const { Dropbox, DropboxAuth } = require("dropbox");
const DropboxToken = require("../models/dropboxTokenModel");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

// Get the current valid token from database
const getCurrentToken = async () => {
  try {
    // Find the active token
    const tokenDoc = await DropboxToken.findOne({ isActive: true }).sort({ createdAt: -1 });
    
    if (!tokenDoc) {
      // Fallback to env variable for initial setup
      if (process.env.DROPBOX_API_ACCESS_TOKEN) {
        console.log("[Dropbox] No token in database, using env variable");
        return process.env.DROPBOX_API_ACCESS_TOKEN;
      }
      throw new Error("No Dropbox token available");
    }

    // Check if token is expired
    if (tokenDoc.isExpired()) {
      console.log("[Dropbox] Token expired, refreshing...");
      return await refreshAccessToken(tokenDoc);
    }

    return tokenDoc.accessToken;
  } catch (error) {
    console.error("[Dropbox] Error getting current token:", error);
    throw error;
  }
};

// Helper function to refresh the access token
const refreshAccessToken = async (tokenDoc) => {
  try {
    if (!tokenDoc || !tokenDoc.refreshToken) {
      throw new Error("No refresh token available");
    }

    console.log("[Dropbox] Attempting to refresh access token using refresh token...");
    
    // Use direct HTTP request to refresh the token
    const axios = require('axios');
    
    try {
      // Make a POST request to Dropbox OAuth2 token endpoint
      const tokenResponse = await axios.post('https://api.dropbox.com/oauth2/token', null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: tokenDoc.refreshToken,
          client_id: process.env.DROPBOX_API_KEY,
          client_secret: process.env.DROPBOX_API_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log("[Dropbox] Token refresh successful");
      
      const { access_token, expires_in } = tokenResponse.data;
      
      if (!access_token) {
        throw new Error("No access token in refresh response");
      }
      
      // Update the token in database
      await tokenDoc.updateTokens(access_token, expires_in || 14400); // Default 4 hours
      
      console.log("[Dropbox] Access token refreshed and saved to database");
      return access_token;
      
    } catch (httpError) {
      console.error("[Dropbox] HTTP refresh error:", {
        status: httpError.response?.status,
        statusText: httpError.response?.statusText,
        data: httpError.response?.data
      });
      
      // If HTTP method fails, try the SDK method as fallback
      console.log("[Dropbox] Trying SDK method as fallback...");
      
      const dbxAuth = new DropboxAuth({
        clientId: process.env.DROPBOX_API_KEY,
        clientSecret: process.env.DROPBOX_API_SECRET,
      });
      
      // Set the refresh token
      dbxAuth.setRefreshToken(tokenDoc.refreshToken);
      
      // Try to get the access token after setting refresh token
      await dbxAuth.refreshAccessToken();
      
      // Get the access token from the auth object
      const access_token = dbxAuth.getAccessToken();
      
      if (!access_token) {
        throw new Error("Could not get access token from DropboxAuth");
      }
      
      // Update the token in database
      await tokenDoc.updateTokens(access_token, 14400); // Default 4 hours
      
      console.log("[Dropbox] Access token refreshed via SDK and saved to database");
      return access_token;
    }
  } catch (error) {
    console.error("[Dropbox] Failed to refresh access token:", error);
    throw error;
  }
};

// Helper function to get Dropbox client with team root access
const getDropboxClient = async (useTeamRoot = true) => {
  const accessToken = await getCurrentToken();
  
  const config = {
    accessToken: accessToken
  };
  
  if (useTeamRoot && process.env.DROPBOX_ROOT_NAMESPACE_ID) {
    config.pathRoot = JSON.stringify({
      ".tag": "root",
      "root": process.env.DROPBOX_ROOT_NAMESPACE_ID
    });
  }
  
  return new Dropbox(config);
};

// Create a wrapper for Dropbox operations that handles token refresh
const withTokenRefresh = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    // Check for expired token errors
    if (error.status === 401 || 
        (error.error?.error?.['.tag'] === 'expired_access_token') ||
        (error.message && error.message.includes('expired'))) {
      console.log("[Dropbox] Token expired during operation, refreshing...");
      
      // Get the token document and refresh it
      const tokenDoc = await DropboxToken.findOne({ isActive: true }).sort({ createdAt: -1 });
      if (tokenDoc) {
        await refreshAccessToken(tokenDoc);
        // Get a new client with the refreshed token
        const dbx = await getDropboxClient(true);
        // Retry the operation with the new client
        return await operation.call({ dbx });
      }
    }
    throw error;
  }
};

// Note: We initialize dbx locally in each function since it now requires async token management

exports.getFolderContents = async (req, res) => {
  try {
    // Get folder path from query parameter or use default
    const folderPath = req.query.path || "";
    
    // Ensure path starts with forward slash (unless it's empty for root)
    const normalizedPath = folderPath === "" ? "" : (folderPath.startsWith("/") ? folderPath : `/${folderPath}`);
    
    console.log(`[Dropbox] Requesting folder: "${normalizedPath}" (original: "${folderPath}")`);
    
    // Get client with automatic token refresh
    const dbx = await getDropboxClient(true);
    
    const listFolderResponse = await withTokenRefresh(async function() {
      return await this.dbx.filesListFolder({
        path: normalizedPath,
        include_mounted_folders: true,  // Include team/business folders
      });
    }.bind({ dbx }));
    
    console.log(`[Dropbox] Found ${listFolderResponse.result.entries.length} items in folder`);

    const entries = listFolderResponse.result.entries;

    // For folder browser, we want to return both folders and files
    // But prioritize folders for folder selection
    const folders = entries.filter(entry => entry['.tag'] === 'folder');
    const files = entries.filter(entry => entry['.tag'] === 'file');

    // For image files, add thumbnails
    const filesWithThumbnails = await Promise.all(
      files
        .filter((file) => isImage(file.name))
        .map(async (file) => {
          try {
            const thumbnailResponse = await dbx.filesGetThumbnail({
              path: file.path_lower,
            });
            file.thumbnailLink = `data:image/jpeg;base64,${thumbnailResponse.result.fileBinary.toString(
              "base64"
            )}`;
            return file;
          } catch (error) {
            console.error("Error fetching thumbnail:", error);
            return file;
          }
        })
    );

    // Return all entries with folders first
    const allEntries = [...folders, ...files, ...filesWithThumbnails];
    res.status(200).json(allEntries);
  } catch (error) {
    console.error("Dropbox API error:", error);
    res.status(500).json([]);
  }
};

exports.getDownloadLink = async (req, res) => {
  const { path } = req.params; // Path of the file for which the download link is requested
  try {
    const result = await dbx.filesGetTemporaryLink({ path });
    res.status(200).json({ link: result.result.link });
  } catch (error) {
    console.error("Dropbox API error:", error);
    res.status(500).json({
      message: "Failed to get download link",
      error: error.message,
    });
  }
};

function isImage(filename) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
}

function isVideo(filename) {
  return /\.(mp4|mov|avi|webm)$/i.test(filename);
}

// Thumbnail caching system
const CACHE_DIR = path.join(__dirname, '../cache/thumbnails');
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Ensure cache directory exists
const ensureCacheDir = () => {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log('📁 [Cache] Created thumbnail cache directory');
  }
};

// Generate cache key for thumbnail
const getCacheKey = (filePath, size = 'w256h256') => {
  const hash = crypto.createHash('md5').update(`${filePath}-${size}`).digest('hex');
  return `${hash}.jpg`;
};

// Check if cached thumbnail exists and is valid
const getCachedThumbnail = (cacheKey) => {
  try {
    const cachePath = path.join(CACHE_DIR, cacheKey);
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtime.getTime();
      
      if (age < CACHE_MAX_AGE) {
        const thumbnail = fs.readFileSync(cachePath);
        console.log(`💾 [Cache] Hit for ${cacheKey}`);
        return `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
      } else {
        // Cache expired, delete the file
        fs.unlinkSync(cachePath);
        console.log(`🗑️ [Cache] Expired and removed ${cacheKey}`);
      }
    }
  } catch (error) {
    console.log(`⚠️ [Cache] Error reading ${cacheKey}:`, error.message);
  }
  return null;
};

// Save thumbnail to cache
const saveThumbnailToCache = (cacheKey, thumbnailBuffer) => {
  try {
    ensureCacheDir();
    const cachePath = path.join(CACHE_DIR, cacheKey);
    fs.writeFileSync(cachePath, thumbnailBuffer);
    console.log(`💾 [Cache] Saved ${cacheKey}`);
  } catch (error) {
    console.log(`⚠️ [Cache] Error saving ${cacheKey}:`, error.message);
  }
};

// Clean old cache files (run periodically)
const cleanOldCache = () => {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    
    const files = fs.readdirSync(CACHE_DIR);
    let cleaned = 0;
    
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtime.getTime();
      
      if (age > CACHE_MAX_AGE) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 [Cache] Cleaned ${cleaned} expired thumbnail(s)`);
    }
  } catch (error) {
    console.log('⚠️ [Cache] Error during cleanup:', error.message);
  }
};

// Clean cache on startup and then every hour
cleanOldCache();
setInterval(cleanOldCache, 60 * 60 * 1000);

// Method to handle file uploads
exports.uploadFile = async (req, res) => {
  console.log("Starting upload process...");

  // Check for Dropbox token
  if (!process.env.DROPBOX_API_ACCESS_TOKEN) {
    console.error("Dropbox API token not found in environment variables");
    return res.status(500).json({
      message: "Dropbox configuration error",
      error: "API token not configured",
    });
  }

  // Check for files in request
  if (!req.files || Object.keys(req.files).length === 0) {
    console.error("No files received in request");
    return res.status(400).json({
      message: "No files were uploaded",
      error: "Missing files in request",
    });
  }

  let uploadedFile = req.files.uploadedFile;
  console.log("Received file:", {
    name: uploadedFile.name,
    size: uploadedFile.size,
    type: uploadedFile.mimetype,
  });

  // Add timestamp to filename to prevent conflicts
  const timestamp = new Date().getTime();
  const fileName = `${timestamp}_${uploadedFile.name}`;
  const uploadPath = `/promotion_materials/${fileName}`;

  console.log("Attempting to upload to path:", uploadPath);

  try {
    // Get client with automatic token refresh
    const dbx = await getDropboxClient(true);
    
    // Try to create the folder first
    console.log("Checking/creating promotion_materials folder...");
    try {
      const folderResponse = await dbx.filesCreateFolderV2({
        path: "/promotion_materials",
      });
      console.log("Folder created:", folderResponse);
    } catch (error) {
      if (error.status === 409) {
        console.log("Folder already exists, continuing...");
      } else {
        console.error("Error creating folder:", error);
        throw error;
      }
    }

    // Attempt the upload
    console.log("Starting file upload to Dropbox...");
    const response = await dbx
      .filesUpload({
        path: uploadPath,
        contents: uploadedFile.data,
        mode: { ".tag": "add" },
      })
      .catch((error) => {
        console.error("Dropbox upload error:", {
          error: error.message,
          status: error.status,
          response: error.response,
        });
        throw error;
      });

    console.log("Upload response from Dropbox:", response);

    if (!response || !response.result) {
      throw new Error("Invalid response from Dropbox");
    }

    res.status(200).json({
      message: "File uploaded successfully!",
      path: uploadPath,
      name: fileName,
      dropboxResponse: response.result,
    });
  } catch (error) {
    console.error("Upload failed:", {
      error: error.message,
      stack: error.stack,
      status: error.status,
    });

    res.status(500).json({
      message: "Failed to upload file",
      error: error.message,
      details: error.response?.data || "No additional details available",
    });
  }
};

// Method to fetch event gallery media (photos and videos)
exports.getEventGallery = async (req, res) => {
  try {
    const folderPath = req.query.path;
    
    if (!folderPath) {
      return res.status(400).json({ 
        message: "Folder path is required",
        media: []
      });
    }
    
    // Ensure path starts with forward slash
    const normalizedPath = folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
    
    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);
    
    try {
      const listFolderResponse = await withTokenRefresh(async function() {
        return await dbx.filesListFolder({
          path: normalizedPath,
          recursive: false, // Only get immediate contents
          include_media_info: true,
          include_mounted_folders: true  // Include team/business folders
        });
      });

      const entries = listFolderResponse.result.entries;
      
      // Separate photos and videos
      const photos = [];
      const videos = [];
      
      // Process media files
      for (const file of entries) {
        if (file['.tag'] === 'file') {
          if (isImage(file.name)) {
            try {
              // Get thumbnail for images
              const thumbnailResponse = await dbx.filesGetThumbnail({
                path: file.path_lower,
                size: { ".tag": "w256h256" }
              });
              
              const photo = {
                id: file.id,
                name: file.name,
                path: file.path_lower,
                size: file.size,
                modified: file.client_modified,
                thumbnail: `data:image/jpeg;base64,${thumbnailResponse.result.fileBinary.toString("base64")}`,
                type: 'image'
              };
              
              photos.push(photo);
            } catch (thumbnailError) {
              // If thumbnail fails, still add the photo without thumbnail
              photos.push({
                id: file.id,
                name: file.name,
                path: file.path_lower,
                size: file.size,
                modified: file.client_modified,
                thumbnail: null,
                type: 'image'
              });
            }
          } else if (isVideo(file.name)) {
            videos.push({
              id: file.id,
              name: file.name,
              path: file.path_lower,
              size: file.size,
              modified: file.client_modified,
              type: 'video'
            });
          }
        }
      }
      
      res.status(200).json({
        success: true,
        folderPath: normalizedPath,
        media: {
          photos: photos,
          videos: videos,
          totalCount: photos.length + videos.length
        }
      });
      
    } catch (dropboxError) {
      if (dropboxError.status === 409) {
        // Folder doesn't exist
        return res.status(200).json({
          success: true,
          folderPath: normalizedPath,
          media: {
            photos: [],
            videos: [],
            totalCount: 0
          },
          message: "Folder not found"
        });
      }
      throw dropboxError;
    }
    
  } catch (error) {
    console.error("Dropbox gallery error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery",
      error: error.message
    });
  }
};

// OAuth Flow Methods
exports.initiateOAuth = async (req, res) => {
  try {
    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_API_KEY,
      clientSecret: process.env.DROPBOX_API_SECRET
    });

    // Simplified OAuth without PKCE for testing
    // In production, you should use PKCE with proper session storage
    
    const authUrl = await dbxAuth.getAuthenticationUrl(
      process.env.DROPBOX_REDIRECT_URI,
      undefined, // state
      'code', // response type
      'offline', // token access type for refresh tokens
      undefined, // scope - uses app's permissions
      undefined, // includeGrantedScopes
      undefined  // no PKCE for testing
    );

    console.log('[Dropbox OAuth] Generated auth URL:', authUrl);

    // For testing: directly redirect to Dropbox
    // In production, you'd send this to frontend and let them handle it
    res.redirect(authUrl);
  } catch (error) {
    console.error('[Dropbox OAuth] Error initiating OAuth:', error);
    res.status(500).json({ 
      error: 'Failed to initiate OAuth',
      details: error.message 
    });
  }
};

exports.handleOAuthCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>❌ Authorization Failed</h1>
          <p>No authorization code received from Dropbox.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  }

  try {
    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_API_KEY,
      clientSecret: process.env.DROPBOX_API_SECRET
    });

    console.log('[Dropbox OAuth] Exchanging code for token...');
    
    const tokenResponse = await dbxAuth.getAccessTokenFromCode(
      process.env.DROPBOX_REDIRECT_URI,
      code
    );

    const { access_token, refresh_token, expires_in, account_id } = tokenResponse.result;

    console.log('[Dropbox OAuth] ✅ Token obtained successfully');
    console.log('[Dropbox OAuth] Token expires in:', expires_in, 'seconds');

    // Test the new token with team root access
    const dbxTest = new Dropbox({ 
      accessToken: access_token,
      pathRoot: JSON.stringify({
        ".tag": "root", 
        "root": process.env.DROPBOX_ROOT_NAMESPACE_ID
      })
    });
    const accountInfo = await dbxTest.usersGetCurrentAccount();
    
    // Save tokens to database
    try {
      // Deactivate any existing tokens for this account
      await DropboxToken.updateMany(
        { accountId: accountInfo.result.account_id },
        { isActive: false }
      );
      
      // Create new token document
      const tokenDoc = new DropboxToken({
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + (expires_in || 14400) * 1000),
        accountId: accountInfo.result.account_id,
        email: accountInfo.result.email,
        isActive: true
      });
      
      await tokenDoc.save();
      console.log('[Dropbox OAuth] ✅ Tokens saved to database');
    } catch (dbError) {
      console.error('[Dropbox OAuth] Failed to save tokens to database:', dbError);
    }
    
    // Test folder access
    const folders = await dbxTest.filesListFolder({ 
      path: "",
      include_mounted_folders: true 
    });

    // Create HTML response
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dropbox Connected</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .success {
            background: #d4edda;
            color: #155724;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .token-box {
            background: white;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border: 1px solid #dee2e6;
          }
          .folders {
            background: white;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .folder-list {
            list-style: none;
            padding-left: 0;
          }
          .folder-list li {
            padding: 5px 0;
            border-bottom: 1px solid #eee;
          }
          button {
            background: #0061fe;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
          }
          button:hover {
            background: #0051d3;
          }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✅ Dropbox Connected Successfully!</h1>
          <p>Account: ${accountInfo.result.email}</p>
          <p>Name: ${accountInfo.result.name.display_name}</p>
          <p>Account Type: ${accountInfo.result.account_type['.tag']}</p>
        </div>

        <div class="token-box">
          <h2>🎉 Tokens Saved to Database!</h2>
          <p>Your Dropbox tokens have been securely saved to the database.</p>
          <p>The access token will be automatically refreshed when it expires.</p>
          <p style="color: #28a745; font-weight: bold;">✅ No manual configuration needed!</p>
          
          <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0;"><strong>Token Details:</strong></p>
            <ul style="margin: 10px 0;">
              <li>Access token expires in: ${Math.round((expires_in || 14400) / 3600)} hours</li>
              <li>Refresh token: Permanent (until revoked)</li>
              <li>Auto-refresh: Enabled</li>
            </ul>
          </div>
        </div>

        <div class="folders">
          <h2>📁 Folders Found (${folders.result.entries.length})</h2>
          <ul class="folder-list">
            ${folders.result.entries.map(f => 
              `<li>${f['.tag'] === 'folder' ? '📁' : '📄'} ${f.name} (${f.path_display})</li>`
            ).join('')}
          </ul>
        </div>

        <p style="margin-top: 30px; color: #666;">
          <strong>You're all set! 🎉</strong><br>
          The Dropbox integration is now fully configured and will handle token refresh automatically.<br>
          You can close this window and start using Dropbox features in your app.
        </p>

        <script>
          // Auto-close window after 10 seconds
          setTimeout(() => {
            window.close();
          }, 10000);
        </script>
      </body>
      </html>
    `;

    res.send(html);

  } catch (error) {
    console.error('[Dropbox OAuth] Error handling callback:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ OAuth Failed</h1>
          <p>Error: ${error.message}</p>
          <pre>${JSON.stringify(error.response?.data || error, null, 2)}</pre>
          <script>setTimeout(() => window.close(), 5000);</script>
        </body>
      </html>
    `);
  }
};

// Check if a brand has any galleries available
exports.checkBrandGalleries = async (req, res) => {
  try {
    const { brandId } = req.params;
    
    console.log('🔍 [Dropbox Controller] checkBrandGalleries called for brandId:', brandId);
    
    // Import models
    const Brand = require("../models/brandModel");
    const Event = require("../models/eventsModel");
    
    // Find the brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      console.log('❌ [Dropbox Controller] Brand not found:', brandId);
      return res.status(404).json({ 
        success: false,
        message: "Brand not found",
        hasGalleries: false
      });
    }
    
    console.log('✅ [Dropbox Controller] Found brand:', brand.name, 'ID:', brand._id);
    
    // Find all events for this brand that have dropboxFolderPath
    const eventsWithGalleries = await Event.find({
      brand: brandId,
      dropboxFolderPath: { $exists: true, $ne: null, $ne: "" }
    }).select('dropboxFolderPath title startDate date _id').sort({ startDate: -1, date: -1 });
    
    console.log('📸 [Dropbox Controller] Found events with galleries:', eventsWithGalleries.length);
    eventsWithGalleries.forEach((event, index) => {
      console.log(`  Event ${index + 1}: "${event.title}" (${event._id}) - Path: ${event.dropboxFolderPath}`);
      console.log(`    Date: ${event.startDate}`);
    });
    
    const hasGalleries = eventsWithGalleries.length > 0;
    
    console.log('🎯 [Dropbox Controller] Final result - hasGalleries:', hasGalleries);
    
    res.json({
      success: true,
      hasGalleries,
      totalEvents: eventsWithGalleries.length,
      events: eventsWithGalleries
    });
    
  } catch (error) {
    console.error("❌ [Dropbox Controller] Error checking brand galleries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check brand galleries",
      hasGalleries: false,
      error: error.message
    });
  }
};

// Get all available gallery dates for a brand
exports.getBrandGalleryDates = async (req, res) => {
  try {
    const { brandId } = req.params;
    
    // Import models
    const Brand = require("../models/brandModel");
    const Event = require("../models/eventsModel");
    
    // Find the brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ 
        success: false,
        message: "Brand not found"
      });
    }
    
    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);
    
    // Find all events for this brand that have dropboxFolderPath
    const eventsWithGalleries = await Event.find({
      brand: brandId,
      dropboxFolderPath: { $exists: true, $ne: null, $ne: "" }
    }).select('dropboxFolderPath title subTitle startDate date _id isWeekly weekNumber parentEventId')
    .sort({ startDate: -1, date: -1 });

    // Process events to check if galleries actually exist
    const galleryOptions = [];
    const skippedEvents = [];
    
    for (const event of eventsWithGalleries) {
      try {
        const folderPath = event.dropboxFolderPath.startsWith("/") 
          ? event.dropboxFolderPath 
          : `/${event.dropboxFolderPath}`;
        
        // Check if folder exists and has media
        const listFolderResponse = await withTokenRefresh(async function() {
          return await this.dbx.filesListFolder({
            path: folderPath,
            recursive: false,
            include_mounted_folders: true
          });
        }.bind({ dbx }));
        
        const mediaFiles = listFolderResponse.result.entries.filter(file => 
          file['.tag'] === 'file' && (isImage(file.name) || isVideo(file.name))
        );
        
        if (mediaFiles.length > 0) {
          const eventDate = event.startDate;
          const displayTitle = event.isWeekly && event.weekNumber > 0 
            ? `${event.title} - Week ${event.weekNumber}`
            : event.title;
          
          galleryOptions.push({
            eventId: event._id,
            title: displayTitle,
            subTitle: event.subTitle,
            date: eventDate,
            folderPath: event.dropboxFolderPath,
            mediaCount: mediaFiles.length,
            isWeekly: event.isWeekly,
            weekNumber: event.weekNumber || 0,
            parentEventId: event.parentEventId
          });
        }
      } catch (folderError) {
        // Skip events where folder doesn't exist or can't be accessed
        skippedEvents.push({ title: event.title, reason: folderError.message });
      }
    }

    res.json({
      success: true,
      brandName: brand.name,
      galleryOptions: galleryOptions,
      totalGalleries: galleryOptions.length,
      // Include debug info
      debug: {
        eventsChecked: eventsWithGalleries.length,
        galleriesFound: galleryOptions.length,
        skippedCount: skippedEvents.length
      }
    });
    
  } catch (error) {
    console.error("Error getting brand gallery dates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get gallery dates",
      error: error.message
    });
  }
};

// Get gallery for a specific event
exports.getEventGalleryById = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Import models
    const Event = require("../models/eventsModel");
    
    // Find the event
    const event = await Event.findById(eventId).select('dropboxFolderPath title startDate date');
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: "Event not found"
      });
    }
    
    if (!event.dropboxFolderPath) {
      return res.status(200).json({
        success: true,
        message: "No gallery path set for this event",
        media: {
          photos: [],
          videos: [],
          totalCount: 0
        }
      });
    }
    
    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);
    
    // Use the existing gallery logic
    const folderPath = event.dropboxFolderPath.startsWith("/") 
      ? event.dropboxFolderPath 
      : `/${event.dropboxFolderPath}`;
    
    try {
      const listFolderResponse = await withTokenRefresh(async function() {
        return await this.dbx.filesListFolder({
          path: folderPath,
          recursive: false,
          include_media_info: true,
          include_mounted_folders: true
        });
      }.bind({ dbx }));

      const entries = listFolderResponse.result.entries;
      
      // Separate photos and videos
      const photos = [];
      const videos = [];
      
      // Separate image and video files first
      const imageFiles = entries.filter(file => 
        file['.tag'] === 'file' && isImage(file.name)
      );
      const videoFiles = entries.filter(file => 
        file['.tag'] === 'file' && isVideo(file.name)
      );
      
      console.log(`📷 [Dropbox Controller] Found ${imageFiles.length} images, ${videoFiles.length} videos in event "${event.title}"`);
      
      // For faster loading, generate thumbnails for first batch, cache others for lazy loading
      const INITIAL_THUMBNAIL_COUNT = 12; // Increased from 8
      const MAX_CONCURRENT_THUMBNAILS = 8; // Increased from 4
      const THUMBNAIL_TIMEOUT = 5000; // 5 seconds per thumbnail
      
      // Enhanced thumbnail function with caching
      const getThumbnailWithCache = async (file) => {
        try {
          const cacheKey = getCacheKey(file.path_lower);
          
          // Check cache first
          const cachedThumbnail = getCachedThumbnail(cacheKey);
          if (cachedThumbnail) {
            return {
              id: file.id,
              name: file.name,
              path: file.path_lower,
              size: file.size,
              modified: file.client_modified,
              thumbnail: cachedThumbnail,
              type: 'image',
              cached: true
            };
          }
          
          // Generate new thumbnail with timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Thumbnail timeout')), THUMBNAIL_TIMEOUT)
          );
          
          const thumbnailPromise = withTokenRefresh(async function() {
            return await this.dbx.filesGetThumbnail({
              path: file.path_lower,
              size: { ".tag": "w256h256" }
            });
          }.bind({ dbx }));
          
          const thumbnailResponse = await Promise.race([thumbnailPromise, timeoutPromise]);
          const thumbnailBase64 = `data:image/jpeg;base64,${thumbnailResponse.result.fileBinary.toString("base64")}`;
          
          // Save to cache (async, don't wait)
          setImmediate(() => saveThumbnailToCache(cacheKey, thumbnailResponse.result.fileBinary));
          
          return {
            id: file.id,
            name: file.name,
            path: file.path_lower,
            size: file.size,
            modified: file.client_modified,
            thumbnail: thumbnailBase64,
            type: 'image',
            cached: false
          };
        } catch (thumbnailError) {
          console.log(`⚠️ [Dropbox Controller] Thumbnail failed for ${file.name}:`, thumbnailError.message);
          // Return photo without thumbnail
          return {
            id: file.id,
            name: file.name,
            path: file.path_lower,
            size: file.size,
            modified: file.client_modified,
            thumbnail: null,
            type: 'image',
            needsLazyLoad: true
          };
        }
      };
      
      // Process only the first batch of images with thumbnails
      const initialImages = imageFiles.slice(0, INITIAL_THUMBNAIL_COUNT);
      const remainingImages = imageFiles.slice(INITIAL_THUMBNAIL_COUNT);
      
      console.log(`🚀 [Dropbox Controller] Generating thumbnails for first ${initialImages.length} images only`);
      
      // Process initial images in batches for thumbnails
      const batchSize = MAX_CONCURRENT_THUMBNAILS;
      let cacheHits = 0;
      
      for (let i = 0; i < initialImages.length; i += batchSize) {
        const batch = initialImages.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(file => getThumbnailWithCache(file))
        );
        
        // Count cache hits for performance metrics
        cacheHits += batchResults.filter(result => result.cached).length;
        
        photos.push(...batchResults);
        
        console.log(`📸 [Dropbox Controller] Processed ${Math.min(i + batchSize, initialImages.length)}/${initialImages.length} initial images (${cacheHits} cache hits) for event "${event.title}"`);
      }
      
      // Add remaining images without thumbnails (for lazy loading)
      for (const file of remainingImages) {
        photos.push({
          id: file.id,
          name: file.name,
          path: file.path_lower,
          size: file.size,
          modified: file.client_modified,
          thumbnail: null, // No thumbnail initially
          type: 'image',
          needsLazyLoad: true
        });
      }
      
      // Process videos (no thumbnails needed, so it's fast)
      for (const file of videoFiles) {
        videos.push({
          id: file.id,
          name: file.name,
          path: file.path_lower,
          size: file.size,
          modified: file.client_modified,
          type: 'video'
        });
      }
      
      res.status(200).json({
        success: true,
        eventTitle: event.title,
        eventDate: event.startDate,
        folderPath: folderPath,
        media: {
          photos: photos,
          videos: videos,
          totalCount: photos.length + videos.length
        }
      });
      
    } catch (dropboxError) {
      if (dropboxError.status === 409) {
        // Folder doesn't exist
        return res.status(200).json({
          success: true,
          eventTitle: event.title,
          eventDate: event.startDate,
          folderPath: folderPath,
          media: {
            photos: [],
            videos: [],
            totalCount: 0
          },
          message: "Gallery folder not found"
        });
      }
      throw dropboxError;
    }
    
  } catch (error) {
    console.error("Dropbox event gallery error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event gallery",
      error: error.message
    });
  }
};

// Get video gallery for a specific event
exports.getEventVideoGalleryById = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Import models
    const Event = require("../models/eventsModel");

    // Find the event
    const event = await Event.findById(eventId).select('dropboxFolderPath dropboxVideoFolderPath title startDate date');
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Use video folder path if set, otherwise fall back to main folder
    const videoFolderPath = event.dropboxVideoFolderPath || event.dropboxFolderPath;

    if (!videoFolderPath) {
      return res.status(200).json({
        success: true,
        message: "No video gallery path set for this event",
        media: {
          videos: [],
          totalCount: 0
        }
      });
    }

    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);

    // Ensure path starts with forward slash
    const folderPath = videoFolderPath.startsWith("/")
      ? videoFolderPath
      : `/${videoFolderPath}`;

    try {
      const listFolderResponse = await withTokenRefresh(async function() {
        return await this.dbx.filesListFolder({
          path: folderPath,
          recursive: false,
          include_media_info: true,
          include_mounted_folders: true
        });
      }.bind({ dbx }));

      const entries = listFolderResponse.result.entries;

      // Filter only video files
      const videoFiles = entries.filter(file =>
        file['.tag'] === 'file' && isVideo(file.name)
      );

      console.log(`🎬 [Dropbox Controller] Found ${videoFiles.length} videos in event "${event.title}"`);

      // Process videos with thumbnails
      const videos = [];
      const MAX_CONCURRENT_VIDEO_THUMBNAILS = 4;
      const VIDEO_THUMBNAIL_TIMEOUT = 5000;

      // Helper function to get video thumbnail with caching
      const getVideoThumbnailWithCache = async (file) => {
        try {
          const cacheKey = getCacheKey(file.path_lower, 'video-w256h256');

          // Check cache first
          const cachedThumbnail = getCachedThumbnail(cacheKey);
          if (cachedThumbnail) {
            return {
              id: file.id,
              name: file.name,
              path: file.path_lower,
              size: file.size,
              modified: file.client_modified,
              thumbnail: cachedThumbnail,
              type: 'video',
              extension: file.name.split('.').pop().toLowerCase(),
              cached: true
            };
          }

          // Generate new video thumbnail with timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Video thumbnail timeout')), VIDEO_THUMBNAIL_TIMEOUT)
          );

          const thumbnailPromise = withTokenRefresh(async function() {
            return await this.dbx.filesGetThumbnail({
              path: file.path_lower,
              size: { ".tag": "w256h256" },
              format: { ".tag": "jpeg" }
            });
          }.bind({ dbx }));

          const thumbnailResponse = await Promise.race([thumbnailPromise, timeoutPromise]);
          const thumbnailBase64 = `data:image/jpeg;base64,${thumbnailResponse.result.fileBinary.toString("base64")}`;

          // Save to cache (async, don't wait)
          setImmediate(() => saveThumbnailToCache(cacheKey, thumbnailResponse.result.fileBinary));

          return {
            id: file.id,
            name: file.name,
            path: file.path_lower,
            size: file.size,
            modified: file.client_modified,
            thumbnail: thumbnailBase64,
            type: 'video',
            extension: file.name.split('.').pop().toLowerCase(),
            cached: false
          };
        } catch (thumbnailError) {
          console.log(`⚠️ [Dropbox Controller] Video thumbnail failed for ${file.name}:`, thumbnailError.message);
          // Return video without thumbnail
          return {
            id: file.id,
            name: file.name,
            path: file.path_lower,
            size: file.size,
            modified: file.client_modified,
            thumbnail: null,
            type: 'video',
            extension: file.name.split('.').pop().toLowerCase()
          };
        }
      };

      // Process videos in batches for thumbnails
      for (let i = 0; i < videoFiles.length; i += MAX_CONCURRENT_VIDEO_THUMBNAILS) {
        const batch = videoFiles.slice(i, i + MAX_CONCURRENT_VIDEO_THUMBNAILS);
        const batchResults = await Promise.all(
          batch.map(file => getVideoThumbnailWithCache(file))
        );
        videos.push(...batchResults);
        console.log(`🎬 [Dropbox Controller] Processed ${Math.min(i + MAX_CONCURRENT_VIDEO_THUMBNAILS, videoFiles.length)}/${videoFiles.length} video thumbnails`);
      }

      res.status(200).json({
        success: true,
        eventTitle: event.title,
        eventDate: event.startDate,
        folderPath: folderPath,
        media: {
          videos: videos,
          totalCount: videos.length
        }
      });

    } catch (dropboxError) {
      if (dropboxError.status === 409) {
        // Folder doesn't exist
        return res.status(200).json({
          success: true,
          eventTitle: event.title,
          eventDate: event.startDate,
          folderPath: folderPath,
          media: {
            videos: [],
            totalCount: 0
          },
          message: "Video gallery folder not found"
        });
      }
      throw dropboxError;
    }

  } catch (error) {
    console.error("Dropbox video gallery error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch video gallery",
      error: error.message
    });
  }
};

// Get latest video gallery for a brand
exports.getLatestBrandVideoGallery = async (req, res) => {
  try {
    const { brandId } = req.params;

    console.log('🎬 [Dropbox Controller] getLatestBrandVideoGallery called for brandId:', brandId);

    // Import models
    const Brand = require("../models/brandModel");
    const Event = require("../models/eventsModel");

    // Find the brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found"
      });
    }

    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);

    // Find events with video gallery paths
    const now = new Date();

    // Look for events with dropboxVideoFolderPath OR dropboxFolderPath
    let eventsWithVideos = await Event.find({
      brand: brandId,
      $or: [
        { startDate: { $lt: now } },
        { date: { $lt: now } }
      ],
      $or: [
        { dropboxVideoFolderPath: { $exists: true, $ne: null, $ne: "" } },
        { dropboxFolderPath: { $exists: true, $ne: null, $ne: "" } }
      ]
    }).select('dropboxFolderPath dropboxVideoFolderPath title startDate date _id')
    .sort({ startDate: -1, date: -1 })
    .limit(5);

    // Try to find one that actually has videos
    for (const event of eventsWithVideos) {
      try {
        const videoFolderPath = event.dropboxVideoFolderPath || event.dropboxFolderPath;
        if (!videoFolderPath) continue;

        const folderPath = videoFolderPath.startsWith("/")
          ? videoFolderPath
          : `/${videoFolderPath}`;

        const listFolderResponse = await withTokenRefresh(async function() {
          return await dbx.filesListFolder({
            path: folderPath,
            recursive: false,
            include_mounted_folders: true
          });
        });

        const videoFiles = listFolderResponse.result.entries.filter(file =>
          file['.tag'] === 'file' && isVideo(file.name)
        );

        if (videoFiles.length > 0) {
          console.log(`✅ [Dropbox Controller] Found ${videoFiles.length} videos in event "${event.title}"`);
          // Found videos, return this event's gallery
          return await exports.getEventVideoGalleryById(
            { params: { eventId: event._id } },
            res
          );
        }
      } catch (folderError) {
        continue;
      }
    }

    // No events with videos found
    res.status(200).json({
      success: true,
      message: "No video galleries found for this brand",
      eventTitle: "No Videos Available",
      media: {
        videos: [],
        totalCount: 0
      }
    });

  } catch (error) {
    console.error("Error getting latest brand video gallery:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get latest video gallery",
      error: error.message
    });
  }
};

// Check if a brand has any video galleries available
exports.checkBrandVideoGalleries = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Import models
    const Brand = require("../models/brandModel");
    const Event = require("../models/eventsModel");

    // Find the brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
        hasVideoGalleries: false
      });
    }

    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);

    // Find events with potential video galleries
    const eventsWithPaths = await Event.find({
      brand: brandId,
      $or: [
        { dropboxVideoFolderPath: { $exists: true, $ne: null, $ne: "" } },
        { dropboxFolderPath: { $exists: true, $ne: null, $ne: "" } }
      ]
    }).select('dropboxFolderPath dropboxVideoFolderPath title _id').limit(10);

    // Check each event for actual videos
    for (const event of eventsWithPaths) {
      try {
        const videoFolderPath = event.dropboxVideoFolderPath || event.dropboxFolderPath;
        if (!videoFolderPath) continue;

        const folderPath = videoFolderPath.startsWith("/")
          ? videoFolderPath
          : `/${videoFolderPath}`;

        const listFolderResponse = await withTokenRefresh(async function() {
          return await dbx.filesListFolder({
            path: folderPath,
            recursive: false,
            include_mounted_folders: true
          });
        });

        const hasVideos = listFolderResponse.result.entries.some(file =>
          file['.tag'] === 'file' && isVideo(file.name)
        );

        if (hasVideos) {
          return res.json({
            success: true,
            hasVideoGalleries: true
          });
        }
      } catch (folderError) {
        continue;
      }
    }

    res.json({
      success: true,
      hasVideoGalleries: false
    });

  } catch (error) {
    console.error("Error checking brand video galleries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check video galleries",
      hasVideoGalleries: false,
      error: error.message
    });
  }
};

// Get all available video gallery dates for a brand
exports.getBrandVideoGalleryDates = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Import models
    const Brand = require("../models/brandModel");
    const Event = require("../models/eventsModel");

    // Find the brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found"
      });
    }

    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);

    // Find all events for this brand that have dropboxFolderPath
    const eventsWithPaths = await Event.find({
      brand: brandId,
      $or: [
        { dropboxVideoFolderPath: { $exists: true, $ne: null, $ne: "" } },
        { dropboxFolderPath: { $exists: true, $ne: null, $ne: "" } }
      ]
    }).select('dropboxFolderPath dropboxVideoFolderPath title subTitle startDate date _id isWeekly weekNumber parentEventId')
    .sort({ startDate: -1, date: -1 });

    // Process events to check if they have videos
    const videoGalleryOptions = [];

    for (const event of eventsWithPaths) {
      try {
        const videoFolderPath = event.dropboxVideoFolderPath || event.dropboxFolderPath;
        if (!videoFolderPath) continue;

        const folderPath = videoFolderPath.startsWith("/")
          ? videoFolderPath
          : `/${videoFolderPath}`;

        // Check if folder exists and has videos
        const listFolderResponse = await withTokenRefresh(async function() {
          return await this.dbx.filesListFolder({
            path: folderPath,
            recursive: false,
            include_mounted_folders: true
          });
        }.bind({ dbx }));

        const videoFiles = listFolderResponse.result.entries.filter(file =>
          file['.tag'] === 'file' && isVideo(file.name)
        );

        if (videoFiles.length > 0) {
          const eventDate = event.startDate;
          const displayTitle = event.isWeekly && event.weekNumber > 0
            ? `${event.title} - Week ${event.weekNumber}`
            : event.title;

          videoGalleryOptions.push({
            eventId: event._id,
            title: displayTitle,
            subTitle: event.subTitle,
            date: eventDate,
            folderPath: videoFolderPath,
            videoCount: videoFiles.length,
            isWeekly: event.isWeekly,
            weekNumber: event.weekNumber || 0,
            parentEventId: event.parentEventId
          });
        }
      } catch (folderError) {
        // Skip events where folder doesn't exist or can't be accessed
        continue;
      }
    }

    res.json({
      success: true,
      brandName: brand.name,
      galleryOptions: videoGalleryOptions,
      totalGalleries: videoGalleryOptions.length
    });

  } catch (error) {
    console.error("Error getting brand video gallery dates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get video gallery dates",
      error: error.message
    });
  }
};

// Lazy load thumbnails for specific images
exports.loadThumbnails = async (req, res) => {
  try {
    const { filePaths } = req.body; // Array of file paths to generate thumbnails for
    
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({
        success: false,
        message: "filePaths array is required"
      });
    }
    
    console.log(`🔄 [Dropbox Controller] Lazy loading ${filePaths.length} thumbnails`);
    
    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);
    
    const thumbnails = [];
    const MAX_CONCURRENT = 6; // Slightly less for lazy loading to avoid overwhelming
    const THUMBNAIL_TIMEOUT = 4000; // 4 seconds timeout
    
    // Process in batches
    for (let i = 0; i < filePaths.length; i += MAX_CONCURRENT) {
      const batch = filePaths.slice(i, i + MAX_CONCURRENT);
      
      const batchPromises = batch.map(async (filePath) => {
        try {
          const cacheKey = getCacheKey(filePath);
          
          // Check cache first
          const cachedThumbnail = getCachedThumbnail(cacheKey);
          if (cachedThumbnail) {
            return {
              filePath,
              thumbnail: cachedThumbnail,
              success: true,
              cached: true
            };
          }
          
          // Generate new thumbnail
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Thumbnail timeout')), THUMBNAIL_TIMEOUT)
          );
          
          const thumbnailPromise = withTokenRefresh(async function() {
            return await this.dbx.filesGetThumbnail({
              path: filePath,
              size: { ".tag": "w256h256" }
            });
          }.bind({ dbx }));
          
          const thumbnailResponse = await Promise.race([thumbnailPromise, timeoutPromise]);
          const thumbnailBase64 = `data:image/jpeg;base64,${thumbnailResponse.result.fileBinary.toString("base64")}`;
          
          // Save to cache (async)
          setImmediate(() => saveThumbnailToCache(cacheKey, thumbnailResponse.result.fileBinary));
          
          return {
            filePath,
            thumbnail: thumbnailBase64,
            success: true,
            cached: false
          };
          
        } catch (error) {
          console.log(`⚠️ [Dropbox Controller] Lazy thumbnail failed for ${filePath}:`, error.message);
          return {
            filePath,
            thumbnail: null,
            success: false,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      thumbnails.push(...batchResults);
      
      console.log(`🔄 [Dropbox Controller] Lazy loaded batch ${Math.ceil((i + 1) / MAX_CONCURRENT)}/${Math.ceil(filePaths.length / MAX_CONCURRENT)}`);
    }
    
    const successful = thumbnails.filter(t => t.success).length;
    const cached = thumbnails.filter(t => t.cached).length;
    
    console.log(`✅ [Dropbox Controller] Lazy loading complete: ${successful}/${filePaths.length} successful (${cached} from cache)`);
    
    res.status(200).json({
      success: true,
      thumbnails,
      stats: {
        total: filePaths.length,
        successful,
        failed: filePaths.length - successful,
        cached
      }
    });
    
  } catch (error) {
    console.error("Lazy thumbnail loading error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load thumbnails",
      error: error.message
    });
  }
};

// Get most recent past event gallery for a brand
exports.getLatestBrandGallery = async (req, res) => {
  try {
    const { brandId } = req.params;
    
    console.log('🚀 [Dropbox Controller] getLatestBrandGallery called for brandId:', brandId);
    
    // Import models
    const Brand = require("../models/brandModel");
    const Event = require("../models/eventsModel");
    
    // Find the brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      console.log('❌ [Dropbox Controller] Brand not found:', brandId);
      return res.status(404).json({ 
        success: false,
        message: "Brand not found"
      });
    }
    
    console.log('✅ [Dropbox Controller] Found brand:', brand.name);
    
    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);
    
    // Find the most recent events with gallery (including future events as fallback)
    const now = new Date();
    console.log('📅 [Dropbox Controller] Current time:', now.toISOString());
    
    // First try to find past events
    let eventsWithGalleries = await Event.find({
      brand: brandId,
      $or: [
        { startDate: { $lt: now } },
        { date: { $lt: now } }
      ],
      dropboxFolderPath: { $exists: true, $ne: null, $ne: "" }
    }).select('dropboxFolderPath title subTitle startDate date _id isWeekly weekNumber')
    .sort({ startDate: -1, date: -1 })
    .limit(5); // Check last 5 past events
    
    console.log('📸 [Dropbox Controller] Found past events with galleries:', eventsWithGalleries.length);
    
    // If no past events, fall back to any events with galleries (including future)
    if (eventsWithGalleries.length === 0) {
      console.log('⏰ [Dropbox Controller] No past events found, checking all events...');
      eventsWithGalleries = await Event.find({
        brand: brandId,
        dropboxFolderPath: { $exists: true, $ne: null, $ne: "" }
      }).select('dropboxFolderPath title subTitle startDate date _id isWeekly weekNumber')
      .sort({ startDate: -1, date: -1 })
      .limit(5); // Check last 5 events
      
      console.log('📸 [Dropbox Controller] Found total events with galleries:', eventsWithGalleries.length);
    }
    
    // Log all events found
    eventsWithGalleries.forEach((event, index) => {
      console.log(`  Event ${index + 1}: "${event.title}" (${event._id}) - Path: ${event.dropboxFolderPath}`);
      console.log(`    Date: ${event.startDate}`);
    });
    
    // Try to find one that actually has media (with timeout)
    for (const event of eventsWithGalleries) {
      try {
        console.log(`🔍 [Dropbox Controller] Checking event "${event.title}" for media...`);
        
        const folderPath = event.dropboxFolderPath.startsWith("/") 
          ? event.dropboxFolderPath 
          : `/${event.dropboxFolderPath}`;
        
        console.log(`📁 [Dropbox Controller] Checking folder: ${folderPath}`);
        
        // Add timeout to Dropbox call (increased timeout)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Dropbox request timeout')), 30000)
        );
        
        const dropboxPromise = withTokenRefresh(async function() {
          return await dbx.filesListFolder({
            path: folderPath,
            recursive: false,
            include_mounted_folders: true
          });
        });
        
        const listFolderResponse = await Promise.race([dropboxPromise, timeoutPromise]);
        
        const mediaFiles = listFolderResponse.result.entries.filter(file => 
          file['.tag'] === 'file' && (isImage(file.name) || isVideo(file.name))
        );
        
        console.log(`📷 [Dropbox Controller] Found ${mediaFiles.length} media files in "${event.title}"`);
        
        if (mediaFiles.length > 0) {
          console.log(`✅ [Dropbox Controller] Using event "${event.title}" for latest gallery`);
          // Found an event with media, return its gallery
          return await exports.getEventGalleryById(
            { params: { eventId: event._id } }, 
            res
          );
        }
      } catch (folderError) {
        console.log(`⚠️ [Dropbox Controller] Error checking folder for event "${event.title}":`, folderError.message);
        // Continue to next event if this one fails
        continue;
      }
    }
    
    console.log('📭 [Dropbox Controller] No events with media found');
    // No events with galleries found
    res.status(200).json({
      success: true,
      message: "No galleries found for this brand",
      eventTitle: "No Gallery Available",
      media: {
        photos: [],
        videos: [],
        totalCount: 0
      }
    });
    
  } catch (error) {
    console.error("❌ [Dropbox Controller] Error getting latest brand gallery:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get latest gallery",
      error: error.message
    });
  }
};

// Download selected media files as ZIP
exports.downloadGalleryZip = async (req, res) => {
  try {
    const { itemIds } = req.body;
    const { eventId } = req.params;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items selected for download"
      });
    }
    
    // Import required modules
    const Event = require("../models/eventsModel");
    const archiver = require('archiver');
    
    // Find the event to get folder path
    const event = await Event.findById(eventId).select('dropboxFolderPath title');
    if (!event || !event.dropboxFolderPath) {
      return res.status(404).json({
        success: false,
        message: "Event or gallery not found"
      });
    }
    
    const folderPath = event.dropboxFolderPath.startsWith("/") 
      ? event.dropboxFolderPath 
      : `/${event.dropboxFolderPath}`;
    
    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);
    
    // Get all files in the folder
    const listFolderResponse = await dbx.filesListFolder({
      path: folderPath,
      recursive: false,
      include_mounted_folders: true
    });
    
    // Filter files by selected IDs
    const selectedFiles = listFolderResponse.result.entries.filter(file => 
      file['.tag'] === 'file' && itemIds.includes(file.id)
    );
    
    if (selectedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid files found for selected items"
      });
    }
    
    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipName = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_gallery.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    
    archive.pipe(res);
    
    // Add files to archive
    for (const file of selectedFiles) {
      try {
        const downloadResponse = await dbx.filesDownload({ path: file.path_lower });
        archive.append(downloadResponse.result.fileBinary, { name: file.name });
      } catch (downloadError) {
        console.error(`Failed to download file ${file.name}:`, downloadError);
        // Continue with other files
      }
    }
    
    archive.finalize();
    
  } catch (error) {
    console.error("Error creating gallery ZIP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create ZIP download",
      error: error.message
    });
  }
};

// Download single file
exports.downloadGalleryFile = async (req, res) => {
  try {
    const { filePath } = req.params;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: "File path is required"
      });
    }
    
    // Decode the file path
    const decodedPath = decodeURIComponent(filePath);
    
    // Initialize Dropbox client
    const dbx = await getDropboxClient(true);
    
    // Download file from Dropbox
    const downloadResponse = await dbx.filesDownload({ path: decodedPath });
    
    // Extract filename from path
    const filename = decodedPath.split('/').pop();
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send file data
    res.send(downloadResponse.result.fileBinary);
    
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download file",
      error: error.message
    });
  }
};

// Diagnostic endpoint to check account structure and namespaces
exports.diagnosticCheck = async (req, res) => {
  try {
    const dbx = await getDropboxClient(true);
    
    // Get full account details
    const account = await dbx.usersGetCurrentAccount();
    
    // Check team info
    const teamInfo = account.result.team;
    const rootInfo = account.result.root_info;
    
    // Try different path approaches
    const results = {
      accountType: account.result.account_type['.tag'],
      teamInfo: teamInfo,
      rootInfo: rootInfo,
      tests: {}
    };
    
    // Test 1: Empty path (what we've been doing)
    try {
      const test1 = await dbx.filesListFolder({ path: "", include_mounted_folders: true });
      results.tests.emptyPath = {
        count: test1.result.entries.length,
        folders: test1.result.entries.map(e => ({ name: e.name, path: e.path_display, type: e['.tag'] }))
      };
    } catch (e) {
      results.tests.emptyPath = `Error: ${e.message}`;
    }
    
    // Test 2: Explicit root namespace
    if (rootInfo && rootInfo.root_namespace_id) {
      try {
        const test2 = await dbx.filesListFolder({ 
          path: `ns:${rootInfo.root_namespace_id}`,
          include_mounted_folders: true 
        });
        results.tests.rootNamespace = {
          count: test2.result.entries.length,
          folders: test2.result.entries.map(e => ({ name: e.name, path: e.path_display, type: e['.tag'] }))
        };
      } catch (e) {
        results.tests.rootNamespace = `Error: ${e.message}`;
      }
    }
    
    // Test 3: Home namespace
    if (rootInfo && rootInfo.home_namespace_id) {
      try {
        const test3 = await dbx.filesListFolder({ 
          path: `ns:${rootInfo.home_namespace_id}`,
          include_mounted_folders: true 
        });
        results.tests.homeNamespace = {
          count: test3.result.entries.length,
          folders: test3.result.entries.map(e => ({ name: e.name, path: e.path_display, type: e['.tag'] }))
        };
      } catch (e) {
        results.tests.homeNamespace = `Error: ${e.message}`;
      }
    }
    
    // Test 4: Try with withPathRoot
    try {
      const dbxWithRoot = new Dropbox({ 
        accessToken: process.env.DROPBOX_API_ACCESS_TOKEN,
        pathRoot: rootInfo ? JSON.stringify({ ".tag": "root", "root": rootInfo.root_namespace_id }) : undefined
      });
      
      const test4 = await dbxWithRoot.filesListFolder({ 
        path: "",
        include_mounted_folders: true 
      });
      
      results.tests.withPathRoot = {
        count: test4.result.entries.length,
        folders: test4.result.entries.map(e => ({ name: e.name, path: e.path_display, type: e['.tag'] }))
      };
    } catch (e) {
      results.tests.withPathRoot = `Error: ${e.message}`;
    }
    
    res.json(results);
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message, 
      stack: error.stack,
      details: error.response?.data 
    });
  }
};
