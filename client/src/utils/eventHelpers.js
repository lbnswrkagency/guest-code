/**
 * Shared event helper utilities
 * Extracted from UpcomingEvent for reuse and slimmer component code.
 */

/**
 * Get the best flyer image URL for an event (full display).
 * Priority: landscape > square > portrait, quality: full > medium > thumbnail.
 */
export const getEventImage = (event) => {
  if (!event?.flyer) return null;

  const pickBest = (format) =>
    format?.full || format?.medium || format?.thumbnail || null;

  if (event.flyer.landscape) return pickBest(event.flyer.landscape);
  if (event.flyer.square) return pickBest(event.flyer.square);
  if (event.flyer.portrait) return pickBest(event.flyer.portrait);
  if (typeof event.flyer === "string") return event.flyer;

  return null;
};

/**
 * Get a preview/thumbnail image URL for an event (carousel cards).
 * Priority: square > landscape > portrait, quality: thumbnail > medium > full.
 */
export const getPreviewImage = (event) => {
  if (!event?.flyer) return null;

  const pickSmall = (format) =>
    format?.thumbnail || format?.medium || format?.full || null;

  if (event.flyer.square) return pickSmall(event.flyer.square);
  if (event.flyer.landscape) return pickSmall(event.flyer.landscape);
  if (event.flyer.portrait) return pickSmall(event.flyer.portrait);
  if (typeof event.flyer === "string") return event.flyer;

  return null;
};

/**
 * Return a CSS class name based on the event's flyer aspect ratio.
 */
export const determineAspectRatioClass = (event) => {
  if (!event?.flyer) return "";
  if (event.flyer.landscape) return "has-landscape-flyer";
  if (event.flyer.square) return "has-square-flyer";
  if (event.flyer.portrait) return "has-portrait-flyer";
  return "";
};

/**
 * Preload the medium-quality flyer image for faster display.
 */
export const preloadEventImage = (event) => {
  if (!event?.flyer) return;

  const src =
    event.flyer.landscape?.medium ||
    event.flyer.square?.medium ||
    event.flyer.portrait?.medium;

  if (src) {
    const img = new Image();
    img.src = src;
  }
};
