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
 * Generates a pretty URL for an event
 * @param {Object} event - Event object with title, date, and brand
 * @param {Object} user - Current user object (optional)
 * @returns {string} Formatted URL for the event
 */
export const getEventUrl = (event, user = null) => {
  if (
    !event ||
    !event.title ||
    !event.date ||
    !event.brand ||
    !event.brand.username
  ) {
    // Return null if we don't have all required data
    return null;
  }

  const dateSlug = formatDateForUrl(new Date(event.date));
  const titleSlug = generateSlug(event.title);
  const brandUsername = event.brand.username;

  return user
    ? `/@${user.username}/@${brandUsername}/e/${dateSlug}/${titleSlug}`
    : `/@${brandUsername}/e/${dateSlug}/${titleSlug}`;
};
