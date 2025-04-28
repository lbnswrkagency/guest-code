import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./SettingsPopUp.scss";

/**
 * SettingsPopUp - A reusable settings popup component with animations
 *
 * Features:
 * - Framer motion animations
 * - Keyboard handling (ESC to close)
 * - Click outside to close
 * - Customizable title and action buttons
 * - Responsive design
 *
 * @param {Object} props - Component props
 * @param {string} props.title - The title of the popup
 * @param {React.ReactNode} props.children - Content to render inside the popup
 * @param {Function} props.onClose - Function to call when popup is closed
 * @param {Function} props.onSave - Function to call when save button is clicked
 * @param {string} [props.saveButtonText="Save Changes"] - Text for the save button
 * @param {boolean} [props.showCancelButton=true] - Whether to show the cancel button
 * @returns {React.ReactElement}
 */
const SettingsPopUp = ({
  title,
  children,
  onClose,
  onSave,
  saveButtonText = "Save Changes",
  showCancelButton = true,
}) => {
  const containerRef = useRef(null);

  // Handle ESC key press to close popup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Handle click outside to close popup
  const handleOverlayClick = (e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      onClose();
    }
  };

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 350,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        className="settingspopup-overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={handleOverlayClick}
      >
        <motion.div
          className="settingspopup-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          ref={containerRef}
        >
          <div className="settingspopup-header">
            <h2 className="settingspopup-title">{title}</h2>
            <button
              className="settingspopup-close"
              onClick={onClose}
              aria-label="Close popup"
            >
              ×
            </button>
          </div>

          <div className="settingspopup-content">{children}</div>

          <div className="settingspopup-actions">
            {showCancelButton && (
              <button className="settingspopup-cancel" onClick={onClose}>
                Cancel
              </button>
            )}
            <button className="settingspopup-save" onClick={onSave}>
              {saveButtonText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SettingsPopUp;
