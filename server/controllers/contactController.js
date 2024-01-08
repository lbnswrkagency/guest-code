const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const sendContactForm = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: process.env.SENDER_EMAIL }];
    sendSmtpEmail.sender = {
      name: "Contact Form",
      email: process.env.SENDER_EMAIL,
    };
    sendSmtpEmail.subject = "New Message from AFRO SPITI";
    sendSmtpEmail.htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong> ${message}</p>
    `;

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending contact form email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  sendContactForm,
};
