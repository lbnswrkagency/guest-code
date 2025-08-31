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
};
