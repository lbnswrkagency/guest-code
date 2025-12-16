/**
 * Cleans a username by:
 * 1. Removing whitespace and newlines
 * 2. Limiting length
 * 3. Removing special characters
 * @param {string} username - The username to clean
 * @returns {string} - The cleaned username
 */
export const cleanUsername = (username) => {
  if (!username) return "";

  return username
    .trim() // Remove leading/trailing whitespace and newlines
    .replace(/[\r\n\t\f\v ]+/g, "") // Remove all whitespace characters
    .replace(/[^\w-]/g, "") // Remove special characters except - and _
    .slice(0, 30); // Limit length to 30 characters
};

/**
 * Validates a username
 * @param {string} username - The username to validate
 * @returns {Object} - { isValid: boolean, error: string | null }
 */
export const validateUsername = (username) => {
  if (!username) {
    return { isValid: false, error: "Username is required" };
  }

  if (username.length < 3) {
    return { isValid: false, error: "Username must be at least 3 characters" };
  }

  if (username.length > 30) {
    return {
      isValid: false,
      error: "Username must be less than 30 characters",
    };
  }

  if (!/^[\w-]+$/.test(username)) {
    return {
      isValid: false,
      error:
        "Username can only contain letters, numbers, underscores, and hyphens",
    };
  }

  return { isValid: true, error: null };
};
