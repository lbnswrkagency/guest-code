const BattleSign = require("../models/battleSignModel");
const BattleCode = require("../models/battleModel");
const Event = require("../models/eventsModel");
const QRCode = require("qrcode");
const crypto = require("crypto");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const puppeteer = require("puppeteer");
const { createEventEmailTemplate } = require("../utils/emailLayout");

// Configure Brevo API Key
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Set up the email sender using Brevo (single instance for all functions)
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const addBattleSign = async (req, res) => {
  const { name, phone, email, instagram, participants, message, categories, eventId } = req.body;

  try {
    // Validate that the event exists and has battle enabled
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (!event.battleConfig.isEnabled) {
      return res.status(400).json({ error: "Battle registration is not enabled for this event" });
    }

    // Check if registration is still open
    if (!event.battleConfig.isRegistrationOpen) {
      return res.status(400).json({ error: "Battle registration is closed" });
    }

    // Check registration deadline
    if (event.battleConfig.registrationDeadline && new Date() > event.battleConfig.registrationDeadline) {
      return res.status(400).json({ error: "Registration deadline has passed" });
    }

    // Validate categories against event's available categories
    const availableCategories = event.battleConfig.categories.map(cat => cat.name);
    const invalidCategories = categories.filter(cat => !availableCategories.includes(cat));
    
    if (invalidCategories.length > 0) {
      return res.status(400).json({ 
        error: `Invalid categories: ${invalidCategories.join(', ')}. Available categories: ${availableCategories.join(', ')}` 
      });
    }

    // Check if user already registered for the same categories
    const existingSignup = await BattleSign.findOne({
      email: email.toLowerCase(),
      event: eventId,
      categories: { $in: categories } // Check if any of the requested categories overlap
    });

    if (existingSignup) {
      const overlappingCategories = existingSignup.categories.filter(cat => categories.includes(cat));
      if (overlappingCategories.length > 0) {
        return res.status(400).json({ 
          error: `You have already registered for: ${overlappingCategories.join(', ')}. Please choose a different category.` 
        });
      }
    }

    // Check participant limits for each category
    for (const category of categories) {
      const categoryConfig = event.battleConfig.categories.find(cat => cat.name === category);
      const maxParticipants = categoryConfig?.maxParticipants || event.battleConfig.maxParticipantsPerCategory;
      
      const currentParticipants = await BattleSign.countDocuments({
        event: eventId,
        categories: category,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (currentParticipants >= maxParticipants) {
        return res.status(400).json({ 
          error: `Maximum participants reached for category: ${category}` 
        });
      }
    }

    const createdBattleSign = await BattleSign.create({
      name,
      phone,
      email: email.toLowerCase(),
      instagram,
      participants: participants || [],
      message,
      categories,
      event: eventId,
    });

    console.log("✅ Battle signup created:", {
      id: createdBattleSign._id,
      name: createdBattleSign.name,
      email: createdBattleSign.email,
      categories: createdBattleSign.categories,
      eventId: eventId
    });

    // Send initial signup confirmation email
    try {
      console.log("📧 Attempting to send battle signup confirmation email...");
      
      // Use the global Brevo API instance
      const battleContent = `
        <div style="background: linear-gradient(135deg, #ffc107, #fd7e14); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
            ⚠️ BATTLE REGISTRATION RECEIVED
          </div>
          <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">
            Your battle registration is pending review. We'll contact you soon!
          </div>
        </div>
        
        <div style="background: rgba(255, 193, 7, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h3 style="color: #ffc107; margin: 0 0 10px 0;">Registration Details</h3>
          <p><strong>Main Participant:</strong> ${createdBattleSign.name}</p>
          <p><strong>Email:</strong> ${createdBattleSign.email}</p>
          <p><strong>Phone:</strong> ${createdBattleSign.phone}</p>
          ${createdBattleSign.instagram ? `<p><strong>Instagram:</strong> @${createdBattleSign.instagram.replace('@', '')}</p>` : ''}
          ${createdBattleSign.participants && createdBattleSign.participants.length > 0 ? `
            <p><strong>Team Members:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${createdBattleSign.participants.map(p => `<li>${p.name}${p.instagram ? ` (@${p.instagram.replace('@', '')})` : ''}</li>`).join('')}
            </ul>
          ` : ''}
          <p><strong>Category:</strong> ${createdBattleSign.categories.map(categoryName => {
            const categoryConfig = event?.battleConfig?.categories?.find(cat => cat.name === categoryName);
            return categoryConfig?.displayName || categoryName;
          }).join(', ')}</p>
          ${createdBattleSign.message ? `<p><strong>Message:</strong> ${createdBattleSign.message}</p>` : ''}
          <p><strong>Status:</strong> <span style="color: #ffc107; font-weight: bold;">PENDING REVIEW</span></p>
        </div>
      `;

      const emailHtml = createEventEmailTemplate({
        recipientName: createdBattleSign.name,
        title: `Battle Registration Received - ${event.title}`,
        eventTitle: event.title,
        eventDate: event.startDate || event.date,
        eventTime: event.startTime,
        eventLocation: event.location,
        eventAddress: event.street && event.city ? `${event.street}, ${event.city}` : (event.street || event.city || ''),
        additionalContent: battleContent,
        primaryColor: '#ffc107',
      });

      console.log("📧 Sending email to:", createdBattleSign.email);
      console.log("📧 Email subject:", `Battle Registration Received - ${event.title}`);

      // Use the global Brevo API instance with object structure (like table controller)
      const sendParams = {
        to: [{ email: createdBattleSign.email, name: createdBattleSign.name }],
        sender: {
          email: "contact@guestcode.com",
          name: "GuestCode",
        },
        subject: `Battle Registration Received - ${event.title}`,
        htmlContent: emailHtml,
      };
      
      await apiInstance.sendTransacEmail(sendParams);

      console.log("✅ Battle signup confirmation email sent successfully!");

    } catch (emailError) {
      console.error("❌ Error sending battle signup email:", emailError);
      console.error("❌ Email error details:", emailError.message);
      // Don't fail the signup if email fails
    }

    res.status(201).json(createdBattleSign);
  } catch (error) {
    console.log(error);
    res.status(400).send("Error adding battle sign: " + error.message);
  }
};

const fetchBattleSigns = async (req, res) => {
  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    // Validate that the event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const battleSigns = await BattleSign.find({ event: eventId })
      .populate('event', 'title battleConfig')
      .sort({ createdAt: -1 });
    
    res.json(battleSigns);
  } catch (error) {
    res.status(500).send("Error fetching battle signs!");
  }
};

const updateBattleSignStatus = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    let status;
    switch (action) {
      case "confirm":
        status = "confirmed";
        break;
      case "decline":
        status = "declined";
        break;
      case "reset":
        status = "pending";
        break;
      default:
        return res.status(400).send("Invalid action");
    }

    const updatedBattleSign = await BattleSign.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedBattleSign) {
      return res.status(404).send("Battle sign not found");
    }

    res.json(updatedBattleSign);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error updating battle sign status: " + error.message);
  }
};

// Get battle statistics for an event
const getBattleStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event || !event.battleConfig.isEnabled) {
      return res.status(404).json({ error: "Battle not found for this event" });
    }

    const stats = {};
    
    for (const category of event.battleConfig.categories) {
      const totalSignups = await BattleSign.countDocuments({
        event: eventId,
        categories: category.name,
      });
      
      const confirmedSignups = await BattleSign.countDocuments({
        event: eventId,
        categories: category.name,
        status: 'confirmed'
      });

      const maxParticipants = category.maxParticipants || event.battleConfig.maxParticipantsPerCategory;

      stats[category.name] = {
        total: totalSignups,
        confirmed: confirmedSignups,
        pending: await BattleSign.countDocuments({
          event: eventId,
          categories: category.name,
          status: 'pending'
        }),
        declined: await BattleSign.countDocuments({
          event: eventId,
          categories: category.name,
          status: 'declined'
        }),
        maxParticipants,
        spotsRemaining: Math.max(0, maxParticipants - confirmedSignups)
      };
    }

    res.json({
      event: {
        title: event.title,
        battleConfig: event.battleConfig
      },
      stats
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching battle stats" });
  }
};

// Get battle configuration for an event (public endpoint for frontend signup)
const getBattleConfig = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).select('title battleConfig startDate endDate startTime endTime location street city');
    if (!event || !event.battleConfig.isEnabled) {
      return res.status(404).json({ error: "Battle not found for this event" });
    }

    res.json({
      event: {
        _id: event._id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        street: event.street,
        city: event.city,
      },
      battleConfig: event.battleConfig
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching battle configuration" });
  }
};

/**
 * Send confirmation email for battle signup with QR code PDF attachment
 */
const sendBattleConfirmationEmail = async (req, res) => {
  try {
    const { battleId } = req.params;
    console.log("📧 Attempting to send battle confirmation email for ID:", battleId);

    // Find the battle signup and populate event with brand
    const battleSign = await BattleSign.findById(battleId).populate({
      path: 'event',
      populate: {
        path: 'brand',
        select: 'name logo colors'
      }
    });
    if (!battleSign) {
      console.error("❌ Battle signup not found:", battleId);
      return res.status(404).json({ message: "Battle signup not found" });
    }

    console.log("✅ Battle signup found:", {
      name: battleSign.name,
      email: battleSign.email,
      currentStatus: battleSign.status
    });

    // Update status to confirmed
    battleSign.status = 'confirmed';
    await battleSign.save();
    console.log("✅ Status updated to confirmed");

    const event = battleSign.event;
    
    // Create or find existing BattleCode
    let battleCode = await BattleCode.findOne({ 
      battleSignId: battleSign._id 
    });
    
    if (!battleCode) {
      // Generate unique code and security token
      const uniqueCode = crypto.randomBytes(6).toString('hex').toUpperCase();
      const securityToken = crypto.randomBytes(16).toString('hex');
      
      // Split name into first and last name
      const nameParts = battleSign.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      // Create new BattleCode
      battleCode = new BattleCode({
        event: event._id,
        name: battleSign.name,
        firstName: firstName,
        lastName: lastName,
        email: battleSign.email,
        phone: battleSign.phone,
        instagram: battleSign.instagram,
        participants: battleSign.participants || [],
        categories: battleSign.categories,
        message: battleSign.message,
        battleSignId: battleSign._id,
        status: 'confirmed',
        code: uniqueCode,
        securityToken: securityToken,
      });
      
      await battleCode.save();
      console.log("✅ Battle code created:", uniqueCode);
    } else {
      // Update existing battle code status
      battleCode.status = 'confirmed';
      await battleCode.save();
      console.log("✅ Existing battle code updated:", battleCode.code);
    }
    
    // Generate PDF with QR code
    const pdfResult = await generateBattlePDF(battleCode, event);
    const pdfBuffer = pdfResult.buffer;
    
    // Create battle-specific content
    const battleContent = `
      <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
        <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          ⚔️ BATTLE REGISTRATION CONFIRMED
        </div>
        <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">
          Your battle pass is ready! Check the PDF attachment.
        </div>
      </div>
      
      <div style="background: rgba(255, 107, 53, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="color: #ff6b35; margin: 0 0 10px 0;">🥊 Battle Details</h3>
        <p><strong>Participant:</strong> ${battleSign.name}</p>
        ${battleSign.participants && battleSign.participants.length > 0 ? `
          <p><strong>Team Members:</strong></p>
          <div style="margin-left: 20px;">
            ${battleSign.participants.map(p => `<p>${p.name}</p>`).join('')}
          </div>
        ` : ''}
        <p><strong>Battle Code:</strong> ${battleCode.code}</p>
        <p><strong>Category:</strong> ${battleSign.categories.map(categoryName => {
          const categoryConfig = event?.battleConfig?.categories?.find(cat => cat.name === categoryName);
          return categoryConfig?.displayName || categoryName;
        }).join(', ')}</p>
        ${battleSign.instagram ? `<p><strong>Instagram:</strong> @${battleSign.instagram.replace('@', '')}</p>` : ''}
        ${battleSign.message ? `<p><strong>Message:</strong> ${battleSign.message}</p>` : ''}
        <p><strong>⏰ Event Time:</strong> ${event.startTime ? `${event.startTime}` : 'TBD'} ${event.endTime ? `- ${event.endTime}` : ''}</p>
        <p style="color: #ff6b35; font-weight: bold;">⚠️ Please arrive at least 1 hour before the event starts!</p>
        <p style="margin-top: 15px; color: #ff6b35; font-weight: bold;">📎 Your battle pass PDF is attached to this email!</p>
      </div>
    `;

    const emailHtml = createEventEmailTemplate({
      recipientName: battleSign.name,
      title: `Battle Pass Ready - ${event.title}`,
      eventTitle: event.title,
      eventDate: event.startDate || event.date,
      eventTime: event.startTime,
      eventLocation: event.location,
      eventAddress: event.street && event.city ? `${event.street}, ${event.city}` : (event.street || event.city || ''),
      additionalContent: battleContent,
      primaryColor: '#ff6b35',
    });

    console.log("📧 Sending confirmation email with PDF attachment to:", battleSign.email);
    
    // Create safe filename for attachment
    const safeFileName = `Battle_Pass_${battleCode.code}_${battleSign.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    // Use the global Brevo API instance with PDF attachment
    const sendParams = {
      to: [{ email: battleSign.email, name: battleSign.name }],
      sender: {
        email: "contact@guestcode.com",
        name: "GuestCode Battle System",
      },
      subject: `⚔️ Battle Pass Ready - ${event.title}`,
      htmlContent: emailHtml,
      attachment: [
        {
          content: pdfBuffer.toString('base64'),
          name: safeFileName,
        },
      ],
    };
    
    await apiInstance.sendTransacEmail(sendParams);

    // Log the email sending
    battleCode.emailedTo.push({
      email: battleSign.email,
      sentAt: new Date()
    });
    await battleCode.save();

    console.log("✅ Battle confirmation email with PDF sent successfully!");

    res.status(200).json({ 
      message: "Battle confirmation email with PDF sent successfully",
      battleSign,
      battleCode: {
        code: battleCode.code,
        status: battleCode.status
      }
    });

  } catch (error) {
    console.error("❌ Error sending battle confirmation email:", error);
    console.error("❌ Email error details:", error.message);
    res.status(500).json({
      message: "Error sending battle confirmation email",
      error: error.message,
    });
  }
};

/**
 * Send decline email for battle signup
 */
const sendBattleDeclineEmail = async (req, res) => {
  try {
    const { battleId } = req.params;

    // Find the battle signup
    const battleSign = await BattleSign.findById(battleId).populate('event');
    if (!battleSign) {
      return res.status(404).json({ message: "Battle signup not found" });
    }

    // Update status to declined
    battleSign.status = 'declined';
    await battleSign.save();

    // Import email functions (already imported at top)
    // const { createEventEmailTemplate } = require("../utils/emailLayout");
    // Brevo already set up at top of file

    const event = battleSign.event;
    
    // Create battle-specific content
    const battleContent = `
      <div style="background: linear-gradient(135deg, #dc3545, #e74c3c); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
        <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          ❌ BATTLE REGISTRATION DECLINED
        </div>
        <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">
          Unfortunately, your battle registration was not accepted.
        </div>
      </div>
      
      <div style="background: rgba(220, 53, 69, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="color: #dc3545; margin: 0 0 10px 0;">Registration Details</h3>
        <p><strong>Participant:</strong> ${battleSign.name}</p>
        <p><strong>Category:</strong> ${battleSign.categories.map(categoryName => {
          const categoryConfig = event?.battleConfig?.categories?.find(cat => cat.name === categoryName);
          return categoryConfig?.displayName || categoryName;
        }).join(', ')}</p>
        <p style="color: #6c757d; font-style: italic;">
          This could be due to capacity limits or other requirements. Feel free to contact us for more information.
        </p>
      </div>
    `;

    const emailHtml = createEventEmailTemplate({
      recipientName: battleSign.name,
      title: `Battle Registration Update - ${event.title}`,
      eventTitle: event.title,
      eventDate: event.startDate || event.date,
      eventTime: event.startTime,
      eventLocation: event.location,
      eventAddress: event.street && event.city ? `${event.street}, ${event.city}` : (event.street || event.city || ''),
      additionalContent: battleContent,
      primaryColor: '#dc3545',
    });

    // Use the global Brevo API instance with object structure (like table controller)
    const sendParams = {
      to: [{ email: battleSign.email, name: battleSign.name }],
      sender: {
        email: "contact@guestcode.com",
        name: "GuestCode",
      },
      subject: `Battle Registration Update - ${event.title}`,
      htmlContent: emailHtml,
    };
    
    await apiInstance.sendTransacEmail(sendParams);

    res.status(200).json({ 
      message: "Battle decline email sent successfully",
      battleSign 
    });

  } catch (error) {
    console.error("Error sending battle decline email:", error);
    res.status(500).json({
      message: "Error sending battle decline email",
      error: error.message,
    });
  }
};

/**
 * Send cancellation email for battle signup
 */
const sendBattleCancellationEmail = async (req, res) => {
  try {
    const { battleId } = req.params;

    // Find the battle signup
    const battleSign = await BattleSign.findById(battleId).populate('event');
    if (!battleSign) {
      return res.status(404).json({ message: "Battle signup not found" });
    }

    // Update status to declined (cancelled)
    battleSign.status = 'declined';
    await battleSign.save();

    // Import email functions (already imported at top)
    // const { createEventEmailTemplate } = require("../utils/emailLayout");
    // Brevo already set up at top of file

    const event = battleSign.event;
    
    // Create battle-specific content
    const battleContent = `
      <div style="background: linear-gradient(135deg, #dc3545, #e74c3c); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
        <div style="color: white; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          ❌ BATTLE REGISTRATION CANCELLED
        </div>
        <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">
          Your battle registration has been cancelled.
        </div>
      </div>
      
      <div style="background: rgba(220, 53, 69, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="color: #dc3545; margin: 0 0 10px 0;">Cancelled Registration</h3>
        <p><strong>Participant:</strong> ${battleSign.name}</p>
        <p><strong>Category:</strong> ${battleSign.categories.map(categoryName => {
          const categoryConfig = event?.battleConfig?.categories?.find(cat => cat.name === categoryName);
          return categoryConfig?.displayName || categoryName;
        }).join(', ')}</p>
        <p style="color: #6c757d; font-style: italic;">
          If you have any questions about this cancellation, please contact us.
        </p>
      </div>
    `;

    const emailHtml = createEventEmailTemplate({
      recipientName: battleSign.name,
      title: `Battle Registration Cancelled - ${event.title}`,
      eventTitle: event.title,
      eventDate: event.startDate || event.date,
      eventTime: event.startTime,
      eventLocation: event.location,
      eventAddress: event.street && event.city ? `${event.street}, ${event.city}` : (event.street || event.city || ''),
      additionalContent: battleContent,
      primaryColor: '#dc3545',
    });

    // Use the global Brevo API instance with object structure (like table controller)
    const sendParams = {
      to: [{ email: battleSign.email, name: battleSign.name }],
      sender: {
        email: "contact@guestcode.com",
        name: "GuestCode",
      },
      subject: `Battle Registration Cancelled - ${event.title}`,
      htmlContent: emailHtml,
    };
    
    await apiInstance.sendTransacEmail(sendParams);

    res.status(200).json({ 
      message: "Battle cancellation email sent successfully",
      battleSign 
    });

  } catch (error) {
    console.error("Error sending battle cancellation email:", error);
    res.status(500).json({
      message: "Error sending battle cancellation email",
      error: error.message,
    });
  }
};

// Generate QR Code for battle code
const generateQRCodeForBattle = async (data) => {
  try {
    // Create a battle-specific QR code format
    const qrString = typeof data === "string" ? data : `battle-${data.codeId}`;

    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 256,
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error("Error generating QR code for battle:", error);
    throw error;
  }
};

// Generate PDF for a battle code (used for email and download)
const generateBattlePDF = async (battleCode, event) => {
  try {
    // Validate input objects
    if (!battleCode) {
      throw new Error("Battle code object is required");
    }
    if (!event) {
      throw new Error("Event object is required");
    }

    // Generate QR code with the battle code ID
    const qrCodeDataURL = await generateQRCodeForBattle({
      codeId: battleCode._id,
    });

    // Get brand colors or use battle-specific defaults (orange theme for battles)
    const primaryColor = event?.brand?.colors?.primary || "#ff6b35"; // Orange for battles
    const darkColor = event?.brand?.colors?.secondary || "#8B2500"; // Dark red/brown
    const lightColor = "#ffffff";
    const accentColor = "#FFD700"; // Gold accent for battles
    
    // Format dates like in table controller
    const eventDate = event?.startDate || event?.date;
    const dateObj = eventDate ? new Date(eventDate) : new Date();
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDateDE = dateObj.toLocaleDateString('de-DE');
    const startTime = event?.startTime || 'TBD';
    const endTime = event?.endTime || 'TBD';
    const displayCode = `BATTLE-${battleCode.code}`;

    // Create HTML template for battle code - with battle warrior style (copying exact table structure)
    const htmlTemplate = `
    <html>
      <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            margin: 0;
            size: 390px 760px;
          }
          body {
            font-family: 'Manrope', sans-serif;
            margin: 0;
            padding: 0;
            position: relative;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${darkColor} 100%);
            width: 390px;
            height: 760px;
            overflow: hidden;
            border-radius: 28px;
            color: #222222;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Battle background styling */
          .battle-bg-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
              repeating-linear-gradient(
                -45deg,
                rgba(255, 215, 0, 0.1),
                rgba(255, 215, 0, 0.1) 2px,
                transparent 2px,
                transparent 8px
              );
            z-index: 1;
          }
          
          /* Diagonal stripes for warrior section backgrounds */
          .warrior-bg-pattern {
            background-image: 
              linear-gradient(135deg, rgba(255, 215, 0, 0.1) 25%, transparent 25%),
              linear-gradient(225deg, rgba(255, 215, 0, 0.1) 25%, transparent 25%),
              linear-gradient(315deg, rgba(255, 215, 0, 0.1) 25%, transparent 25%),
              linear-gradient(45deg, rgba(255, 215, 0, 0.1) 25%, transparent 25%);
            background-size: 20px 20px;
            background-position: 0 0, 10px 0, 10px -10px, 0px 10px;
          }
          
          .header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3.25rem 2.313rem 0;
            z-index: 2;
          }
          .header h1 {
            margin: 0;
            font-weight: 700;
            font-size: 1.85rem;
            color: ${lightColor};
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
          }
          .logo {
            width: 3.5rem;
            height: 3.5rem;
            background-color: #000000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 1.5rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), 0 0 0 2px ${accentColor};
          }
          .logo img {
            max-width: 2.8rem;
            max-height: 2.8rem;
            object-fit: contain;
          }
          .main-content {
            position: absolute;
            width: 20.375rem;
            height: 27rem;
            background-color: ${lightColor};
            border-radius: 1.75rem;
            top: 7.5rem;
            left: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255, 215, 0, 0.3);
            z-index: 2;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            padding-left: 2.438rem;
          }
          .info-section {
            margin-top: 0.75rem;
          }
          .info-label {
            margin: 0;
            color: ${primaryColor};
            font-weight: 600;
            font-size: 0.625rem;
            line-height: 1rem;
            text-transform: uppercase;
          }
          .info-value {
            margin: 0;
            font-weight: 500;
            font-size: 0.857rem;
            line-height: 1.25rem;
            color: #222;
          }
          .divider {
            margin-top: 1.313rem;
            margin-bottom: .3rem;
            margin-left: 2.438rem;
            border: 1px solid ${accentColor};
            width: 15.5rem;
          }
          .battle-categories-section {
            margin-top: 1.5rem;
            padding: 0.75rem 2.438rem;
            background: rgba(255, 107, 53, 0.07);
          }
          .qr-section {
            position: absolute;
            bottom: 2.938rem;
            left: 2rem;
            width: 20.375rem;
            height: 10rem;
            border-radius: 1.75rem;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255, 215, 0, 0.3);
            background-color: #222222;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .qr-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              45deg,
              ${darkColor},
              ${darkColor} 10px,
              #121212 10px,
              #121212 20px
            );
            opacity: 0.8;
          }
          .qr-gold-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(
              circle at center,
              rgba(255, 215, 0, 0.2) 0%,
              rgba(255, 215, 0, 0) 70%
            );
          }
          .qr-container {
            position: relative;
            background-color: white;
            padding: 10px;
            border-radius: 0.5rem;
            border: 2px solid ${accentColor};
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2;
          }
          .qr-code-image {
            width: 8rem;
            height: 8rem;
            display: block;
          }
          .qr-code-text {
            position: absolute;
            top: 1rem;
            right: 1.5rem;
            background-color: ${darkColor};
            color: ${accentColor};
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.7rem;
            z-index: 3;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            border: 1px solid ${accentColor};
          }
        </style>
      </head>
      <body>
        <!-- Battle background pattern overlay -->
        <div class="battle-bg-pattern"></div>
        
        <!-- Header section with logo -->
        <div class="header">
          <h1>Battle Pass</h1>
          ${
            event?.brand?.logo?.medium
              ? `<div class="logo"><img src="${event.brand.logo.medium}" alt="Brand logo"></div>`
              : `<div class="logo"><span>${
                  event?.brand?.name?.charAt(0) || "B"
                }</span></div>`
          }
        </div>
        
        <!-- Main content area -->
        <div class="main-content warrior-bg-pattern">
          <h3 style="padding-left: 2.438rem; font-size: 0.875rem; font-weight: 700; line-height: 1.25rem; margin-top: 2.063rem;">${
            event?.title || "Battle Event"
          }</h3>   
          
          <div class="info-grid" style="margin-top: 1.5rem;">             
            <div>
              <p class="info-label">LOCATION</p>
              <p class="info-value">${event?.location || event?.venue || ""}</p>
              ${
                event?.street ? `<p class="info-value">${event.street}</p>` : ""
              }
              ${
                event?.address && !event?.street
                  ? `<p class="info-value">${event.address}</p>`
                  : ""
              }
              ${
                event?.postalCode || event?.city
                  ? `<p class="info-value">${event.postalCode || ""} ${
                      event.city || ""
                    }</p>`
                  : ""
              }
            </div>
            <div>
              <p class="info-label">DATE</p>
              <p class="info-value">${dayOfWeek}</p>
              <p class="info-value">${formattedDateDE}</p>
            </div>
          </div>
          
          <div class="info-grid" style="margin-top: 1.5rem;">
            <div class="info-section"> 
              <p class="info-label">START</p>
              <p class="info-value">${startTime}</p>
            </div>
            <div class="info-section">
              <p class="info-label">END</p>
              <p class="info-value">${endTime}</p>
            </div>
          </div>
          
          <div class="battle-categories-section">
            <p class="info-label">BATTLE CATEGORIES</p>
            <p style="margin: 0; font-weight: 700; font-size: 1.25rem; line-height: 1.5rem; color: ${primaryColor};">${
      // Get displayNames from event's battle config categories
      battleCode.categories.map(categoryName => {
        const categoryConfig = event?.battleConfig?.categories?.find(cat => cat.name === categoryName);
        return categoryConfig?.displayName || categoryName;
      }).join(', ')
    }</p>
          </div>
          
          <div class="divider"></div>

          <div class="info-grid">
            <div class="info-section">
              <p class="info-label">PARTICIPANT</p>
              <p class="info-value">${battleCode.name}</p>
              ${battleCode.participants && battleCode.participants.length > 0 ? 
                battleCode.participants.map(p => `<p class="info-value">${p.name}</p>`).join('') 
                : ''
              }
            </div>
            
            <div class="info-section">
              <p class="info-label">STATUS</p>
              <p class="info-value">CONFIRMED</p>
            </div>
          </div>
        </div>

        <!-- QR Code section -->
        <div class="qr-section">
          <div class="qr-background"></div>
          <div class="qr-gold-overlay"></div>
          <div class="qr-container">
            <img class="qr-code-image" src="${qrCodeDataURL}" alt="QR code">
          </div>
        </div>
      </body>
    </html>`;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Set content with longer timeout
      await page.setContent(htmlTemplate, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      await page.emulateMediaType("screen");

      // Set viewport to match the ticket dimensions (9:16 aspect ratio)
      await page.setViewport({
        width: 390,
        height: 760,
        deviceScaleFactor: 2.0, // Higher resolution for crisp image
      });

      // Generate high-quality PDF
      const pdfBuffer = await page.pdf({
        width: "390px",
        height: "760px",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px",
        },
        scale: 1.0, // Ensure 1:1 scaling
      });

      return {
        buffer: pdfBuffer,
        html: htmlTemplate,
      };
    } catch (puppeteerError) {
      console.error("Puppeteer error in generateBattlePDF:", puppeteerError);
      throw new Error(`PDF generation failed: ${puppeteerError.message}`);
    } finally {
      if (browser) {
        await browser.close().catch((err) => {
          console.error("Error closing browser:", err);
        });
      }
    }
  } catch (error) {
    console.error("Error in generateBattlePDF:", error);
    console.error("Stack trace:", error.stack);
    throw error;
  }
};

const deleteBattleSignup = async (req, res) => {
  try {
    const { battleId } = req.params;
    
    // Find the battle signup
    const battleSignup = await BattleSign.findById(battleId);
    if (!battleSignup) {
      return res.status(404).json({ error: "Battle signup not found" });
    }
    
    // Delete the battle signup
    await BattleSign.findByIdAndDelete(battleId);
    
    res.status(200).json({ 
      message: "Battle signup deleted successfully",
      deletedSignup: battleSignup
    });
  } catch (error) {
    console.error("Error deleting battle signup:", error);
    res.status(500).json({ error: "Failed to delete battle signup" });
  }
};

// Tournament bracket generation utilities
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getNextPowerOfTwo = (n) => {
  return Math.pow(2, Math.ceil(Math.log2(n)));
};

const generateTournamentBracket = (participants) => {
  // Handle edge cases
  if (participants.length === 0) {
    return { rounds: [], totalRounds: 0 };
  }
  
  if (participants.length === 1) {
    return {
      rounds: [{
        roundNumber: 1,
        name: "Finals",
        matches: [{ participant1: participants[0], participant2: null, winner: null }]
      }],
      totalRounds: 1
    };
  }

  // Calculate bracket size and handle odd numbers
  const bracketSize = getNextPowerOfTwo(participants.length);
  const byeCount = bracketSize - participants.length;
  
  // Shuffle participants for random seeding, but handle special cases
  let shuffledParticipants = shuffleArray(participants);
  
  // Special handling for Rania and Mpilex - put them in different matches within the last 3 Pre Selection matches
  const raniaIndex = shuffledParticipants.findIndex(p => p.name.toLowerCase().includes('rania'));
  const mpilexIndex = shuffledParticipants.findIndex(p => p.name.toLowerCase().includes('mpilex'));
  
  if (raniaIndex !== -1 && mpilexIndex !== -1) {
    // Remove both from their current positions
    const rania = shuffledParticipants[raniaIndex];
    const mpilex = shuffledParticipants[mpilexIndex];
    
    shuffledParticipants = shuffledParticipants.filter((_, index) => 
      index !== raniaIndex && index !== mpilexIndex
    );
    
    // Calculate positions for last 3 matches (6 positions total: 2 participants per match)
    // We want to place them in different matches within these last 3 matches
    const totalParticipants = shuffledParticipants.length + 2; // +2 for Rania and Mpilex
    const lastSixPositions = Math.max(0, totalParticipants - 6); // Start of last 3 matches
    
    // Place Rania in the 3rd to last match (position -5 from end)
    const raniaPosition = Math.max(0, totalParticipants - 5);
    // Place Mpilex in the 2nd to last match (position -3 from end)  
    const mpilexPosition = Math.max(0, totalParticipants - 3);
    
    // Insert them at their calculated positions
    shuffledParticipants.splice(Math.min(raniaPosition, shuffledParticipants.length), 0, rania);
    shuffledParticipants.splice(Math.min(mpilexPosition, shuffledParticipants.length), 0, mpilex);
  }
  
  // Add bye slots (empty spots for odd numbers)
  const bracketParticipants = [...shuffledParticipants];
  for (let i = 0; i < byeCount; i++) {
    bracketParticipants.push({ name: "", isEmpty: true });
  }
  
  // Generate all rounds
  const rounds = [];
  const totalRounds = Math.log2(bracketSize);
  
  // Create advancement mapping for random placement
  const createRandomAdvancementMap = (currentRoundSize, nextRoundSize) => {
    const sourceIndices = Array.from({ length: currentRoundSize }, (_, i) => i);
    const targetIndices = Array.from({ length: nextRoundSize }, (_, i) => i);
    const doubledTargets = [];
    
    // Each next round match gets 2 sources
    targetIndices.forEach(targetIndex => {
      doubledTargets.push(targetIndex, targetIndex);
    });
    
    // Shuffle the target assignments randomly
    const shuffledTargets = shuffleArray(doubledTargets);
    
    const advancementMap = {};
    sourceIndices.forEach((sourceIndex, i) => {
      advancementMap[sourceIndex] = shuffledTargets[i];
    });
    
    return advancementMap;
  };
  
  // Generate first round (preselection)
  let currentParticipants = [...bracketParticipants];
  let advancementMaps = {};
  
  // Pre-generate all advancement maps for random placement
  for (let roundNum = 1; roundNum < totalRounds; roundNum++) {
    const currentRoundMatches = bracketSize / Math.pow(2, roundNum);
    const nextRoundMatches = bracketSize / Math.pow(2, roundNum + 1);
    advancementMaps[roundNum] = createRandomAdvancementMap(currentRoundMatches, nextRoundMatches);
  }
  
  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const matches = [];
    const nextRoundParticipants = [];
    
    // Determine round name
    let roundName;
    if (roundNum === totalRounds) {
      roundName = "Finals";
    } else if (roundNum === totalRounds - 1) {
      roundName = "Semi Finals";
    } else if (roundNum === 1 && totalRounds > 2) {
      roundName = "Pre Selection";
    } else {
      roundName = `Round ${roundNum}`;
    }
    
    // Create matches for this round
    for (let i = 0; i < currentParticipants.length; i += 2) {
      const participant1 = currentParticipants[i];
      const participant2 = currentParticipants[i + 1];
      
      let winner = null;
      
      // Handle empty spots automatically
      if (participant1?.isEmpty && participant2?.isEmpty) {
        // Both empty, advance empty slot
        winner = { name: "", isEmpty: true };
      } else if (participant1?.isEmpty) {
        winner = participant2;
      } else if (participant2?.isEmpty) {
        winner = participant1;
      } else {
        // Regular match - winner to be determined (leave blank for writing)
        winner = { name: "", isEmpty: true };
      }
      
      const currentMatchIndex = matches.length;
      const targetMatchIndex = advancementMaps[roundNum] ? advancementMaps[roundNum][currentMatchIndex] : null;

      matches.push({
        matchNumber: matches.length + 1,
        participant1: participant1?.isEmpty ? null : participant1,
        participant2: participant2?.isEmpty ? null : participant2,
        winner: winner,
        targetMatchIndex: targetMatchIndex,
        roundNumber: roundNum,
        totalRounds: totalRounds
      });
      
      nextRoundParticipants.push(winner);
    }
    
    rounds.push({
      roundNumber: roundNum,
      name: roundName,
      matches: matches
    });
    
    currentParticipants = nextRoundParticipants;
  }
  
  return {
    rounds: rounds,
    totalRounds: totalRounds,
    originalParticipants: participants.length,
    bracketSize: bracketSize,
    byeCount: byeCount
  };
};

const generateTournamentBracketPDF = async (eventId, category) => {
  let browser = null;
  
  try {
    // Fetch confirmed participants for the category
    const battleSignups = await BattleSign.find({
      event: eventId,
      status: "confirmed",
      categories: { $in: [category] }
    });
    
    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    
    const categoryConfig = event.battleConfig.categories.find(cat => cat.name === category);
    if (!categoryConfig) {
      throw new Error("Category not found");
    }
    
    // Transform signups to participants
    const participants = battleSignups.map((signup, index) => ({
      id: signup._id,
      name: signup.name,
      instagram: signup.instagram,
      participants: signup.participants || [],
      seedNumber: index + 1
    }));
    
    // Generate bracket
    const bracket = generateTournamentBracket(participants);
    
    // Launch puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    
    // Create HTML for the tournament bracket
    const html = generateTournamentBracketHTML(event, categoryConfig, bracket);
    
    await page.setContent(html, { waitUntil: 'networkidle2' });
    
    const pdf = await page.pdf({
      format: 'A3',
      orientation: 'landscape',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    return pdf;
    
  } catch (error) {
    console.error("Error generating tournament bracket PDF:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(err => {
        console.error("Error closing browser:", err);
      });
    }
  }
};

const generateTournamentBracketHTML = (event, categoryConfig, bracket) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString;
  };

  // Generate matches HTML for each round
  const generateRoundHTML = (round, allRounds) => {
    const matchesHTML = round.matches.map((match, matchIndex) => {
      // Find which matches from previous round feed into each participant position
      let participant1SourceInfo = '';
      let participant2SourceInfo = '';
      let winnerDestinationInfo = '';
      
      if (round.roundNumber > 1) {
        // Find the previous round
        const previousRound = allRounds.find(r => r.roundNumber === round.roundNumber - 1);
        if (previousRound) {
          const previousRoundName = previousRound.name === 'Pre Selection' ? 'Pre Selection' : previousRound.name;
          
          // Find which matches from previous round feed into this match
          const sourceMatches = previousRound.matches.filter(prevMatch => 
            prevMatch.targetMatchIndex === matchIndex
          );
          
          // Sort by match number to ensure consistent order
          sourceMatches.sort((a, b) => a.matchNumber - b.matchNumber);
          
          if (sourceMatches.length >= 2) {
            // Two matches feed into this one
            participant1SourceInfo = `<div class="source-match-info">Winner of Match ${sourceMatches[0].matchNumber} ${previousRoundName}</div>`;
            participant2SourceInfo = `<div class="source-match-info">Winner of Match ${sourceMatches[1].matchNumber} ${previousRoundName}</div>`;
          } else if (sourceMatches.length === 1) {
            // One match feeds into this position
            participant1SourceInfo = `<div class="source-match-info">Winner of Match ${sourceMatches[0].matchNumber} ${previousRoundName}</div>`;
          }
        }
      }
      
      // Show where this winner goes (except Finals winner - they've won!)
      if (round.name !== 'Finals') {
        // Find the next round
        const nextRound = allRounds.find(r => r.roundNumber === round.roundNumber + 1);
        if (nextRound) {
          const nextRoundName = nextRound.name;
          const targetMatchNumber = match.targetMatchIndex + 1; // Convert from 0-based to 1-based
          winnerDestinationInfo = `<div class="destination-info">Goes to ${nextRoundName} Match ${targetMatchNumber}</div>`;
        }
      }
      
      return `
      <div class="match">
        <div class="match-header">Match ${match.matchNumber}</div>
        <div class="participants">
          <div class="participant-container">
            <div class="participant ${!match.participant1 ? 'empty' : ''}">
              ${match.participant1 ? match.participant1.name : ''}
              ${match.participant1?.instagram ? `<span class="instagram">@${match.participant1.instagram}</span>` : ''}
            </div>
            ${!match.participant1 ? participant1SourceInfo : ''}
          </div>
          <div class="vs">VS</div>
          <div class="participant-container">
            <div class="participant ${!match.participant2 ? 'empty' : ''}">
              ${match.participant2 ? match.participant2.name : ''}
              ${match.participant2?.instagram ? `<span class="instagram">@${match.participant2.instagram}</span>` : ''}
            </div>
            ${!match.participant2 ? participant2SourceInfo : ''}
          </div>
        </div>
        <div class="winner-section">
          <div class="winner-label">Winner:</div>
          <div class="winner-input-field"></div>
          ${winnerDestinationInfo}
        </div>
      </div>
    `;
    }).join('');

    return `
      <div class="round">
        <h3 class="round-title">${round.name}</h3>
        <div class="matches-container">
          ${matchesHTML}
        </div>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tournament Bracket - ${categoryConfig.displayName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: #ffffff;
          padding: 20px;
          min-height: 100vh;
        }

        .tournament-header {
          text-align: center;
          margin: 0;
          padding: 30px 40px 50px 40px;
          height: calc(100vh - 50px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          background: radial-gradient(circle at center, rgba(255, 200, 7, 0.15) 0%, transparent 70%);
          page-break-after: always;
          box-sizing: border-box;
        }

        .tournament-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            rgba(255, 200, 7, 0.05) 20px,
            rgba(255, 200, 7, 0.05) 40px
          );
        }

        .event-title {
          font-size: 2.5rem;
          font-weight: 900;
          margin-bottom: 10px;
          background: linear-gradient(45deg, #ffc807, #ffed4a);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-shadow: 0 0 30px rgba(255, 200, 7, 0.5);
          z-index: 2;
          position: relative;
        }

        .category-title {
          font-size: 1.8rem;
          color: #ffc807;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          text-shadow: 0 0 20px rgba(255, 200, 7, 0.3);
          z-index: 2;
          position: relative;
        }

        .event-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 15px;
          font-size: 1rem;
          z-index: 2;
          position: relative;
          max-width: 450px;
          width: 100%;
        }

        .event-info-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 200, 7, 0.3);
          backdrop-filter: blur(10px);
        }

        .event-info-label {
          color: #ffc807;
          font-size: 0.9rem;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .event-info-value {
          color: #ffffff;
          font-weight: bold;
          font-size: 1.2rem;
          text-align: center;
        }

        .bracket-info {
          text-align: center;
          margin-top: 20px;
          font-size: 0.9rem;
          z-index: 2;
          position: relative;
        }

        .bracket-info span {
          background: rgba(255, 200, 7, 0.1);
          padding: 5px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 200, 7, 0.3);
          margin: 0 6px;
          font-weight: 600;
          color: #ffffff;
          display: inline-block;
          margin-bottom: 6px;
        }

        .rounds-container {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .round {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          padding: 25px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .round-title {
          font-size: 1.6rem;
          text-align: center;
          margin-bottom: 25px;
          color: #ffc807;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 2px solid rgba(255, 200, 7, 0.3);
          padding-bottom: 10px;
        }

        .matches-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 25px;
        }

        .match {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          transition: transform 0.2s ease;
        }

        .match:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .match-header {
          font-weight: bold;
          text-align: center;
          margin-bottom: 15px;
          color: #ffc807;
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .participants {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 15px;
        }

        .participant-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .participant {
          width: 100%;
          text-align: center;
          padding: 12px;
          background: #ffffff;
          color: #1a1a1a;
          border-radius: 8px;
          border: 2px solid #ffc807;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          min-height: 60px;
          justify-content: center;
          font-weight: 600;
        }

        .participant.empty {
          background: #ffffff;
          border: 2px dashed rgba(255, 200, 7, 0.5);
          color: #666666;
          font-style: italic;
        }

        .participant .instagram {
          font-size: 0.8rem;
          color: #666666;
          margin-top: 4px;
          font-weight: 400;
        }

        .vs {
          font-weight: bold;
          color: #ffc807;
          font-size: 1.2rem;
          text-shadow: 0 0 10px rgba(255, 200, 7, 0.5);
        }

        .winner-section {
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 15px;
          text-align: center;
        }

        .winner-label {
          font-weight: bold;
          color: #ffc807;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .winner-input-field {
          background: #ffffff;
          border: 2px solid #ffc807;
          border-radius: 6px;
          height: 35px;
          margin: 8px 0;
          position: relative;
        }

        .source-match-info {
          font-size: 0.75rem;
          color: #ffc807;
          text-align: center;
          margin-top: 5px;
          font-weight: 500;
          font-style: italic;
          opacity: 0.8;
        }

        .destination-info {
          font-size: 0.75rem;
          color: #4caf50;
          text-align: center;
          margin-top: 5px;
          font-weight: 600;
          background: rgba(76, 175, 80, 0.1);
          padding: 4px 8px;
          border-radius: 10px;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        @media print {
          body {
            background: #1a1a1a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .match {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .round {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .tournament-header {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="tournament-header">
        <h1 class="event-title">${event.title}</h1>
        <h2 class="category-title">${categoryConfig.displayName}</h2>
        <div class="event-info">
          <div class="event-info-item">
            <div class="event-info-label">Date</div>
            <div class="event-info-value">${formatDate(event.startDate || event.date)}</div>
          </div>
          <div class="event-info-item">
            <div class="event-info-label">Time</div>
            <div class="event-info-value">${formatTime(event.startTime)}</div>
          </div>
          <div class="event-info-item">
            <div class="event-info-label">Venue</div>
            <div class="event-info-value">${event.location}</div>
          </div>
          ${categoryConfig.prizeMoney > 0 ? `
          <div class="event-info-item">
            <div class="event-info-label">Prize</div>
            <div class="event-info-value">${categoryConfig.prizeMoney}€</div>
          </div>
          ` : ''}
        </div>
        <div class="bracket-info">
          <span>Total Participants: ${bracket.originalParticipants}</span>
          <span>Bracket Size: ${bracket.bracketSize}</span>
          <span>Total Rounds: ${bracket.totalRounds}</span>
        </div>
      </div>

      <div class="rounds-container">
        ${bracket.rounds.map(round => generateRoundHTML(round, bracket.rounds)).join('')}
      </div>
    </body>
    </html>
  `;
};

const generateTournamentBracketController = async (req, res) => {
  try {
    const { eventId, category } = req.body;
    
    if (!eventId || !category) {
      return res.status(400).json({ error: "Event ID and category are required" });
    }
    
    // Generate the PDF
    const pdf = await generateTournamentBracketPDF(eventId, category);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tournament-bracket.pdf"');
    res.setHeader('Content-Length', pdf.length);
    
    // Send the PDF
    res.send(pdf);
    
  } catch (error) {
    console.error("Error generating tournament bracket:", error);
    res.status(500).json({ error: "Failed to generate tournament bracket" });
  }
};

module.exports = {
  addBattleSign,
  fetchBattleSigns,
  updateBattleSignStatus,
  getBattleStats,
  getBattleConfig,
  sendBattleConfirmationEmail,
  sendBattleDeclineEmail,
  sendBattleCancellationEmail,
  deleteBattleSignup,
  generateBattlePDF,
  generateQRCodeForBattle,
  generateTournamentBracket: generateTournamentBracketController,
};
