import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import axiosInstance from "../../utils/axiosConfig";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { RiCloseLine } from "react-icons/ri";
import "./AlphaAccess.scss";
import { store } from "../../redux/store";

const AlphaAccess = ({ user, setUser, onSuccess, onClose, isOpen = true }) => {
  const [code, setCode] = useState(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRefs = useRef([]);

  // Focus on first input when component mounts and is open
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        inputRefs.current[0].focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      return () => document.removeEventListener("keydown", handleEscKey);
    }
  }, [isOpen, onClose]);

  // Handle input change
  const handleChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus to next input
    if (value && index < 3 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle key press
  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    // Check if pasted content is 4 digits
    if (/^\d{4}$/.test(pastedData)) {
      const newCode = pastedData.split("");
      setCode(newCode);

      // Focus on last input
      if (inputRefs.current[3]) {
        inputRefs.current[3].focus();
      }
    }
  };

  // Submit the code
  const handleSubmit = async (e) => {
    console.log("[AlphaAccess] handleSubmit called");
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to backdrop handler

    const fullCode = code.join("");
    console.log("[AlphaAccess] Code to submit:", fullCode);

    // Validate code
    if (fullCode.length !== 4 || !/^\d{4}$/.test(fullCode)) {
      console.log("[AlphaAccess] Invalid code format");
      setError("Please enter a valid 4-digit code");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      console.log("Submitting alpha code:", fullCode);

      // Use axiosInstance instead of direct axios call with hardcoded URL
      const response = await axiosInstance.post(`/alpha-keys/verify`, {
        code: fullCode,
      });

      console.log("Alpha code verification response:", response.data);

      if (response.data.success) {
        setSuccess(response.data.message);
        toast.success(response.data.message);

        // Update user state to reflect alpha access
        if (user) {
          // Create a new user object with isAlpha set to true
          const updatedUser = { ...user, isAlpha: true };

          // 1. Directly update Redux store first to ensure global state is updated
          store.dispatch({
            type: "user/updateUser",
            payload: updatedUser,
          });

          // 2. Then update local component state if setUser is provided
          if (setUser) {
            setUser(updatedUser);
          }

          console.log(
            "[AlphaAccess] User state updated with alpha access:",
            updatedUser
          );

          // 3. Force a local storage update if your app uses it
          try {
            const userString = localStorage.getItem("user");
            if (userString) {
              const storedUser = JSON.parse(userString);
              localStorage.setItem(
                "user",
                JSON.stringify({
                  ...storedUser,
                  isAlpha: true,
                })
              );
              console.log(
                "[AlphaAccess] localStorage updated with alpha access"
              );
            }
          } catch (err) {
            console.error("Failed to update local storage:", err);
          }

          // 4. Dispatch a custom event to notify other components
          console.log("[AlphaAccess] Dispatching alphaAccessGranted event");
          const alphaEvent = new CustomEvent("alphaAccessGranted", {
            detail: {
              userId: user._id || user.id,
              timestamp: Date.now(), // Add timestamp to ensure uniqueness
            },
          });
          window.dispatchEvent(alphaEvent);

          // 5. Close modal after a short delay
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            }
            if (onClose) {
              onClose();
            }
          }, 300);
        }
      }
    } catch (error) {
      console.error("Alpha code verification error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          withCredentials: error.config?.withCredentials,
        },
      });

      const message =
        error.response?.data?.message || "Failed to verify alpha code";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  // If user already has alpha access, show a success message
  if (user?.isAlpha) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="alpha-access-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          >
            <motion.div
              className="alpha-access alpha-access--success"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {onClose && (
                <button className="alpha-access__close-button" onClick={onClose}>
                  <RiCloseLine />
                </button>
              )}
              <div className="alpha-access__container">
                <h2>Alpha Access Granted</h2>
                <p>You already have alpha access to all features.</p>
                {(onSuccess || onClose) && (
                  <button
                    className="alpha-access__submit"
                    onClick={() => {
                      if (onSuccess) onSuccess();
                      if (onClose) onClose();
                    }}
                    style={{ marginTop: "1.5rem" }}
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="alpha-access-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="alpha-access"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {onClose && (
              <button className="alpha-access__close-button" onClick={onClose}>
                <RiCloseLine />
              </button>
            )}
            <div className="alpha-access__container">
              <h2>Alpha Access</h2>
              <p>Enter your 4-digit alpha code to unlock exclusive features</p>

              <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
                <div className="alpha-access__code-inputs">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : null}
                      disabled={isSubmitting}
                      autoComplete="off"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  ))}
                </div>

                {error && <div className="alpha-access__error">{error}</div>}
                {success && <div className="alpha-access__success">{success}</div>}

                <button
                  type="submit"
                  className="alpha-access__submit"
                  disabled={isSubmitting || code.join("").length !== 4}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isSubmitting ? "Verifying..." : "Verify Code"}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlphaAccess;
