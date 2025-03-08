const express = require("express");
const router = express.Router();

// Debug log endpoint to receive client-side logs
router.post("/debug-log", (req, res) => {
  try {
    const { area, message, data, timestamp } = req.body;

    // Format and log the debug information
    console.log(`[ClientDebug:${area}] ${message}`, {
      ...data,
      clientTimestamp: timestamp,
      serverTimestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[DebugRoute] Error processing debug log", error);
    res.status(200).json({ success: false });
  }
});

module.exports = router;
