/**
 * Utility functions for URL generation and formatting
 */

/**
 * Formats a date as MMDDYY for URL use
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string (e.g., "110824" for November 8, 2024)
 */
export const formatDateForUrl = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(2);
  return `${month}${day}${year}`;
};

/**
 * Converts a string to a URL-friendly slug
 * @param {string} text - Text to slugify
 * @returns {string} URL-friendly slug
 */
export const generateSlug = (text) => {
  return text
    .toString()
    .normalize("NFD") // Normalize to decomposed form for handling accents
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, "") // Remove non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Remove leading hyphens
    .replace(/-+$/, ""); // Remove trailing hyphens
};

/**
 * Helper for determining the event date field to use
 * @param {Object} event - Event object
 * @returns {Date} The event date to use
 */
export const getEventDate = (event) => {
  return event.startDate;
};

/**
 * Generates a pretty URL for an event
 * @param {Object} event - Event object with title, date, and brand
 * @param {Object} user - Current user object (optional)
 * @returns {string} Formatted URL for the event
 */
export const getEventUrl = (event, user = null) => {
  if (
    !event ||
    !event.brand ||
    !event.brand.username
  ) {
    // Return null if we don't have all required data
    return null;
  }

  // Use the existing format: /@brandUsername/DDMMYY
  const dateSlug = formatDateForUrl(new Date(getEventDate(event)));
  const brandUsername = event.brand.username;

  // Simple format that works with existing BrandProfile routing
  return `/@${brandUsername}/${dateSlug}`;
};

/**
 * Create a URL slug for an event
 * @param {Object} event - Event object
 * @param {Object} user - Current user object (optional)
 * @param {string} brandUsername - Brand username
 * @returns {string} Formatted URL for the event
 */
export const createEventSlug = (event, user, brandUsername) => {
  if (
    !event ||
    !event._id ||
    !brandUsername ||
    !event.startDate ||
    !event.title
  ) {
    // If we don't have all the required fields, return null
    return null;
  }

  // Clean up brand username and ensure it doesn't start with @
  const brand = brandUsername.replace(/^@/, "");

  // Format date for URL (MMDDYY)
  const dateSlug = formatDateForUrl(new Date(getEventDate(event)));

  // Construct URL based on user authentication status
  if (user) {
    return `/@${user.username}/@${brand}/${dateSlug}`;
  } else {
    return `/@${brand}/${dateSlug}`;
  }
};
