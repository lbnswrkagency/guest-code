const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authMiddleware");
const { optionalAuthenticateToken } = require("../../middleware/auth");
const codesController = require("../../controllers/codesController");
const Code = require("../../models/codesModel");

// Code Settings Routes
// Get all code settings for an event (with optional authentication)
router.get(
  "/settings/events/:eventId",
  optionalAuthenticateToken,
  codesController.getCodeSettings
);

// Configure code settings for an event (create or update)
router.put(
  "/settings/events/:eventId",
  authenticate,
  codesController.configureCodeSettings
);

// Delete a code setting
router.delete(
  "/settings/events/:eventId/:codeSettingId",
  authenticate,
  codesController.deleteCodeSetting
);

// Code Instance Routes
// Create a new code
router.post("/create", authenticate, codesController.createCode);

// Create a new dynamic code with enhanced features
router.post("/create-dynamic", authenticate, codesController.createDynamicCode);

// Backward compatibility route for existing frontend requests
router.post("/generate", authenticate, codesController.createDynamicCode);

// Get all codes for an event
router.get(
  "/events/:eventId/:type?",
  optionalAuthenticateToken,
  codesController.getEventCodes
);

// Get code counts for an event
router.get("/counts/:eventId", optionalAuthenticateToken, codesController.getCodeCounts);

// Get a specific code
router.get("/:id", optionalAuthenticateToken, codesController.getCode);

// Update a code
router.put("/:codeId", authenticate, codesController.updateCode);

// Delete a code
router.delete("/:codeId", authenticate, codesController.deleteCode);

// Generate QR code image for a code
router.get("/:codeId/image", authenticate, codesController.generateCodeImage);

// Send a code by email
router.post("/:codeId/email", authenticate, codesController.sendCodeByEmail);

// Verify a code
router.post("/verify", authenticate, codesController.verifyCode);

// Track detailed usage of a code
router.post("/:codeId/usage", authenticate, codesController.trackCodeUsage);

// Add a new route for fetching user-specific code counts
router.get(
  "/user-counts/:eventId/:userId",
  authenticate,
  codesController.getUserCodeCounts
);

console.log("✅ Registered route: GET /codes/user-counts/:eventId/:userId");

// Find a code by security token
router.post(
  "/findBySecurityToken",
  authenticate,
  codesController.findBySecurityToken
);

// Get codes by event, user, and specific code settings
router.post(
  "/event-user-codes",
  authenticate,
  codesController.getEventUserCodes
);

// Add route for updating paxChecked
router.put("/:id/update-pax", authenticate, async (req, res) => {
  try {
    const codeId = req.params.id;
    const { increment = true, eventId } = req.body;

    console.log(`Code update-pax: ID=${codeId}, increment=${increment}`);

    // Find the code
    const code = await Code.findById(codeId);

    if (!code) {
      return res.status(404).json({ message: "Code not found" });
    }

    // Check if code belongs to eventId if provided
    if (eventId && code.eventId && code.eventId.toString() !== eventId) {
      return res.status(400).json({
        message: "This code belongs to a different event",
      });
    }

    // Check if code is active
    if (code.status !== "active") {
      return res.status(400).json({
        message: `Code is ${code.status}`,
        status: code.status,
      });
    }

    // Update paxChecked
    if (increment) {
      // Don't exceed maxPax
      if (code.paxChecked >= code.maxPax) {
        return res.status(400).json({
          message: "Maximum capacity reached",
          paxChecked: code.paxChecked,
          maxPax: code.maxPax,
        });
      }
      code.paxChecked += 1;
    } else {
      // Don't go below 0
      if (code.paxChecked <= 0) {
        return res.status(400).json({
          message: "No check-ins to remove",
          paxChecked: code.paxChecked,
        });
      }
      code.paxChecked -= 1;
    }

    // Record usage entry
    code.usage.push({
      timestamp: new Date(),
      paxUsed: increment ? 1 : -1,
      userId: req.user._id,
      deviceInfo: req.headers["user-agent"] || "Unknown device",
    });

    // Update usageCount for metrics
    if (increment) {
      code.usageCount += 1;
    }

    // Save changes
    await code.save();

    console.log(
      `Updated paxChecked to ${code.paxChecked} for code ${code.code}`
    );

    // Return updated code
    return res.status(200).json({
      _id: code._id,
      code: code.code,
      type: code.type,
      maxPax: code.maxPax,
      paxChecked: code.paxChecked,
      status: code.status,
      updatedAt: code.updatedAt,
    });
  } catch (error) {
    console.error("Error updating paxChecked:", error);
    return res
      .status(500)
      .json({ message: "Server error updating paxChecked" });
  }
});

// Unsubscribe from personal invitations
router.get('/unsubscribe/:codeId', async (req, res) => {
  try {
    const { codeId } = req.params;
    
    // Find and update the code to set personalInvite to false
    const code = await Code.findByIdAndUpdate(
      codeId,
      { personalInvite: false },
      { new: true }
    );
    
    if (!code) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Code Not Found - GuestCode</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
            .container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
            h1 { color: #d32f2f; }
            p { color: #666; line-height: 1.6; }
            .footer { margin-top: 30px; font-size: 14px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Code Not Found</h1>
            <p>We couldn't find the code you're trying to unsubscribe. It may have already been removed or the link may be invalid.</p>
            <div class="footer">GuestCode - The Future of Event Management</div>
          </div>
        </body>
        </html>
      `);
    }
    
    console.log(`Code ${codeId} unsubscribed from personal invitations for email: ${code.guestEmail}`);
    
    // Return a nice HTML page with the thank you message
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed Successfully - GuestCode</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
          }
          .container { 
            text-align: center; 
            padding: 50px 40px; 
            background: white; 
            border-radius: 15px; 
            box-shadow: 0 15px 35px rgba(0,0,0,0.2); 
            max-width: 600px; 
            width: 90%;
            border-top: 5px solid #ffc807;
          }
          h1 { 
            color: #333; 
            font-size: 28px; 
            margin-bottom: 20px; 
            font-weight: 600;
          }
          .success-icon {
            font-size: 60px;
            color: #4caf50;
            margin-bottom: 20px;
          }
          p { 
            color: #666; 
            line-height: 1.8; 
            font-size: 16px; 
            margin-bottom: 15px;
          }
          .highlight {
            color: #ffc807;
            font-weight: bold;
          }
          .contact-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 25px 0;
            border-left: 4px solid #ffc807;
          }
          .footer { 
            margin-top: 40px; 
            font-size: 14px; 
            color: #999; 
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          .social-links {
            margin-top: 20px;
          }
          .social-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
            font-weight: 500;
          }
          .social-links a:hover {
            color: #ffc807;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>You've been unsubscribed!</h1>
          <p>Thank you again for visiting us in the past. You will no longer receive personal invitations from us.</p>
          
          <div class="contact-info">
            <p><strong>Want to join us again?</strong></p>
            <p>If you want to come to any of our events, feel free to:</p>
            <p>📧 Send us an email: <span class="highlight">contact@afrospiti.com</span></p>
            <p>📱 Text us on Instagram: <span class="highlight">@afrospiti</span></p>
          </div>
          
          <p>We respect your privacy and your choice. You can always contact us if you change your mind!</p>
          
          <div class="social-links">
            <a href="https://instagram.com/afrospiti" target="_blank">Instagram</a>
            <a href="mailto:contact@afrospiti.com">Email Us</a>
          </div>
          
          <div class="footer">
            <p>GuestCode - The Future of Event Management</p>
            <p>Thank you for being part of our community! 🎉</p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error unsubscribing code:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - GuestCode</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
          .container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
          h1 { color: #d32f2f; }
          p { color: #666; line-height: 1.6; }
          .footer { margin-top: 30px; font-size: 14px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Oops! Something went wrong</h1>
          <p>We encountered an error while processing your request. Please try again later or contact us directly.</p>
          <p>Email: contact@afrospiti.com</p>
          <div class="footer">GuestCode - The Future of Event Management</div>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
