import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import axiosInstance from "../../utils/axiosConfig";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import "./AlphaAccess.scss";
import { store } from "../../redux/store";

const AlphaAccess = ({ user, setUser, onSuccess }) => {
  const [code, setCode] = useState(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRefs = useRef([]);

  // Focus on first input when component mounts
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

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
    e.preventDefault();

    const fullCode = code.join("");

    // Validate code
    if (fullCode.length !== 4 || !/^\d{4}$/.test(fullCode)) {
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

  // If user already has alpha access, show a success message
  if (user?.isAlpha) {
    return (
      <div className="alpha-access alpha-access--success">
        <div className="alpha-access__container">
          <h2>Alpha Access Granted</h2>
          <p>You already have alpha access to all features.</p>
          {onSuccess && (
            <button
              className="alpha-access__submit"
              onClick={onSuccess}
              style={{ marginTop: "1.5rem" }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="alpha-access">
      <motion.div
        className="alpha-access__container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2>Alpha Access</h2>
        <p>Enter your 4-digit alpha code to unlock exclusive features</p>

        <form onSubmit={handleSubmit}>
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
          >
            {isSubmitting ? "Verifying..." : "Verify Code"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AlphaAccess;
