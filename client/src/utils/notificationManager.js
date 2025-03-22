// notificationManager.js - Manages session notifications to prevent duplicates

// Track if a notification is currently visible
let isNotificationActive = false;

// Store any queued notifications when needed
let notificationQueue = [];

// Max number of notifications to show at once (typically just 1)
const MAX_VISIBLE_NOTIFICATIONS = 1;

// Time in milliseconds before automatically dismissing notifications
const AUTO_DISMISS_TIMEOUT = 10000; // 10 seconds

/**
 * Clear all auth required notification elements from the DOM
 */
const clearAllAuthNotifications = () => {
  // Find all notification elements with class 'auth-notification-overlay'
  const notifications = document.querySelectorAll(".auth-notification-overlay");

  // Remove each notification from the DOM
  notifications.forEach((notification) => {
    notification.remove();
  });

  // Reset notification tracking
  isNotificationActive = false;
  notificationQueue = [];
};

/**
 * Create and show a notification overlay with the given message
 * @param {string} message The message to display
 */
const showAuthNotification = (message) => {
  // Don't show duplicates if already active
  if (isNotificationActive) {
    notificationQueue.push(message);
    return;
  }

  // Create notification container
  const notification = document.createElement("div");
  notification.className = "auth-notification-overlay";
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(255, 59, 48, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    max-width: 90%;
  `;

  // Create message element
  const messageElement = document.createElement("span");
  messageElement.textContent = message;

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "×";
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    margin-left: 15px;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  `;

  // Add close button functionality
  closeButton.addEventListener("click", () => {
    document.body.removeChild(notification);
    isNotificationActive = false;

    // If there are queued notifications, show the next one
    if (notificationQueue.length > 0) {
      const nextMessage = notificationQueue.shift();
      showAuthNotification(nextMessage);
    }
  });

  // Append elements to notification
  notification.appendChild(messageElement);
  notification.appendChild(closeButton);

  // Add to DOM
  document.body.appendChild(notification);
  isNotificationActive = true;

  // Auto-dismiss after timeout
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
      isNotificationActive = false;

      // If there are queued notifications, show the next one
      if (notificationQueue.length > 0) {
        const nextMessage = notificationQueue.shift();
        showAuthNotification(nextMessage);
      }
    }
  }, AUTO_DISMISS_TIMEOUT);
};

// Expose the public methods
export default {
  clearAllAuthNotifications,
  showAuthNotification,
};
