const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const sendContactForm = async (req, res) => {
  const { name, email, message } = req.body;

  // Validate required fields
  if (!name || !message) {
    return res.status(400).json({ message: "Name and message are required." });
  }

  try {
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [
      { email: process.env.SENDER_EMAIL || "contact@guest-code.com" },
    ];

    // Reply-to set to user's email if provided, otherwise use a default
    const replyTo = email
      ? { email: email, name: name }
      : { email: "no-reply@guest-code.com", name: "No Reply" };

    sendSmtpEmail.sender = {
      name: "GuestCode Contact Form",
      email: process.env.SENDER_EMAIL || "contact@guest-code.com",
    };

    sendSmtpEmail.replyTo = replyTo;
    sendSmtpEmail.subject = "New Contact Message from GuestCode Website";

    // Create HTML content with contact method displayed appropriately
    const contactMethod = email
      ? `<p><strong>Contact Method:</strong> ${email}</p>`
      : "";

    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc807; border-bottom: 2px solid #ffc807; padding-bottom: 10px;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        ${contactMethod}
        <div style="margin-top: 20px;">
          <h3 style="color: #333;">Message:</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc807;">
            ${message.replace(/\n/g, "<br>")}
          </div>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #777;">This message was sent from the GuestCode website contact form.</p>
      </div>
    `;

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(200).json({
      success: true,
      message:
        "Your message has been sent successfully. We'll get back to you soon!",
    });
  } catch (error) {
    console.error("Error sending contact form email:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't send your message. Please try again later.",
    });
  }
};

module.exports = {
  sendContactForm,
};
