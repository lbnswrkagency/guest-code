// Debug logging utility
const debugLog = (area, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${area}] ${message}`;
  if (data) {
    console.log(logMessage, { ...data, timestamp });
  } else {
    console.log(logMessage, { timestamp });
  }
};

module.exports = { debugLog };
