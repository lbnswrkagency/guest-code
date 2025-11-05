/**
 * Utility functions to help with layout management across components
 */

/**
 * Ensures the sidebar class is correctly applied based on screen width
 * Should be called when components mount/unmount to prevent layout jumps
 */
export const ensureSidebarClass = () => {
  const isMobile = window.innerWidth < 768;

  if (!isMobile && !document.body.classList.contains("has-sidebar")) {
    document.body.classList.add("has-sidebar");
  } else if (isMobile && document.body.classList.contains("has-sidebar")) {
    document.body.classList.remove("has-sidebar");
  }
};

/**
 * Restores the sidebar class with a small delay to ensure DOM updates properly
 * Should be used in cleanup functions when components unmount
 */
export const restoreSidebarClass = () => {
  const isMobile = window.innerWidth < 768;

  // For non-mobile devices, ensure the sidebar is shown
  if (!isMobile) {
    setTimeout(() => {
      if (!document.body.classList.contains("has-sidebar")) {
        document.body.classList.add("has-sidebar");
      }
    }, 50);
  }
};

/**
 * Safe cleanup when component is unmounted
 * Ensures proper layout restoration
 * @param {Function} cleanupFn - Optional cleanup function to run before layout restoration
 */
export const componentCleanup = (cleanupFn = null) => {
  const hasSidebarClass = document.body.classList.contains("has-sidebar");

  // Run any specific cleanup function first
  if (cleanupFn && typeof cleanupFn === "function") {
    try {
      cleanupFn();
    } catch (err) {
      console.error("Error in component cleanup:", err);
    }
  }

  // Then ensure sidebar class is properly restored
  if (hasSidebarClass) {
    restoreSidebarClass();
  }
};
