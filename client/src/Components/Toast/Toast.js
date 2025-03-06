import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCheckLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiCloseLine,
  RiLoader4Line,
} from "react-icons/ri";
import "./Toast.scss";

const toastTypes = {
  success: {
    icon: RiCheckLine,
    className: "success",
  },
  error: {
    icon: RiErrorWarningLine,
    className: "error",
  },
  info: {
    icon: RiInformationLine,
    className: "info",
  },
  loading: {
    icon: RiLoader4Line,
    className: "loading",
  },
};

const Toast = ({ message, type = "info", duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const ToastIcon = toastTypes[type]?.icon;

  useEffect(() => {
    if (duration && type !== "loading") {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, type]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  // Truncate long messages
  const displayMessage =
    typeof message === "string" && message.length > 50
      ? message.substring(0, 50) + "..."
      : message;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`toast ${toastTypes[type]?.className}`}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: -20,
            scale: 0.8,
            transition: { duration: 0.15 },
          }}
        >
          <div className="toast-content">
            <div className="toast-icon">
              {type === "loading" ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <ToastIcon />
                </motion.div>
              ) : (
                <ToastIcon />
              )}
            </div>
            <p className="toast-message">{displayMessage}</p>
            {type !== "loading" && (
              <button className="toast-close" onClick={handleClose}>
                <RiCloseLine />
              </button>
            )}
          </div>
          {type !== "loading" && duration && (
            <div
              className="toast-progress"
              style={{
                animationDuration: `${duration}ms`,
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
