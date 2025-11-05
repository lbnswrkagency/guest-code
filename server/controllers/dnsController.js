const DNS = require("../models/dnsModel");

// Function to verify custom domain
exports.verifyCustomDomain = async (req, res) => {
  try {
    const { customDomain, verificationToken } = req.body;
    // Implement logic to verify the domain
    // This might involve DNS record checks and matching the verification token
    // For example, you could use a DNS lookup library to verify TXT records

    // If verification is successful
    return res.status(200).json({ message: "Domain verified successfully." });

    // If verification fails
    // return res.status(400).json({ message: "Domain verification failed." });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Function to update custom domain settings
exports.updateCustomDomain = async (req, res) => {
  try {
    const { eventId, customDomain, isActive } = req.body;
    // Update the DNS settings in your database
    await DNS.updateOne(
      { event: eventId },
      { customDomain, isActive, updatedAt: new Date() }
    );
    return res
      .status(200)
      .json({ message: "Custom domain updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error." });
  }
};
