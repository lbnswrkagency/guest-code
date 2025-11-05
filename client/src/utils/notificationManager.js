// notificationManager.js - Manages session notifications to prevent duplicates

/**
 * Flag to track if an auth notification is currently being shown
 */
let authNotificationActive = false;

/**
 * Auth notification timeout ID for cleanup
 */
let authNotificationTimeoutId = null;

/**
 * Show a notification for authentication related events
 * This function ensures only one auth notification is shown at a time
 */
const showAuthNotification = (message) => {
  // If there's already an auth notification, clear it first
  clearAllAuthNotifications();

  // Set the active flag
  authNotificationActive = true;

  // Create a custom event with the session expired message
  window.dispatchEvent(
    new CustomEvent("auth:required", {
      detail: {
        redirectUrl: window.location.pathname,
        message: message,
      },
    })
  );

  // Set a timeout to reset the flag
  authNotificationTimeoutId = setTimeout(() => {
    authNotificationActive = false;
  }, 5000); // 5 seconds should be enough time for navigation and cleanup

  return true;
};

/**
 * Clear all auth notifications and reset flags
 */
const clearAllAuthNotifications = () => {
  if (authNotificationTimeoutId) {
    clearTimeout(authNotificationTimeoutId);
    authNotificationTimeoutId = null;
  }

  authNotificationActive = false;

  // Also clear any auth error notifications that might be in the DOM
  const authErrorElements = document.querySelectorAll(
    ".auth-message, .auth-error"
  );
  authErrorElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  return true;
};

/**
 * Check if an auth notification is currently active
 */
const isAuthNotificationActive = () => {
  return authNotificationActive;
};

const notificationManager = {
  showAuthNotification,
  clearAllAuthNotifications,
  isAuthNotificationActive,
};

export default notificationManager;
