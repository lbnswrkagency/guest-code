/**
 * Shared date/time formatting utilities
 * Used across EventDetails, UpcomingEvent, EventFeed, etc.
 */

/**
 * Get the best available date from an event object
 */
export const getEventDate = (event) => {
  if (!event) return null;
  if (event.calculatedStartDate) return event.calculatedStartDate;
  return event.startDate;
};

/**
 * Format date in a readable way: "Mon, Jan 1"
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return "Date TBD";
  const date = new Date(dateString);
  const defaultOptions = { weekday: "short", month: "short", day: "numeric" };
  return date.toLocaleDateString("en-US", { ...defaultOptions, ...options });
};

/**
 * Format date with year: "Mon, Jan 1, 2025"
 */
export const formatDateWithYear = (dateString) => {
  if (!dateString) return "Date TBD";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format date compactly: "FR 27/06/25"
 */
export const formatCompactDate = (dateString) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  const dayName = date
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${dayName} ${day}/${month}/${year}`;
};

/**
 * Format time string for display.
 * Handles "HH:MM" strings and ISO date strings.
 */
export const formatTime = (timeString) => {
  if (!timeString) return "TBA";

  try {
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      return timeString;
    }

    if (
      timeString instanceof Date ||
      (typeof timeString === "string" && timeString.includes("T"))
    ) {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
    }

    return timeString;
  } catch {
    return timeString || "TBA";
  }
};
