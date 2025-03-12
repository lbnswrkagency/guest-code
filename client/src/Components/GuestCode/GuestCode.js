import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./GuestCode.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { RiUserLine, RiMailLine, RiCodeSSlashLine } from "react-icons/ri";

/**
 * GuestCode component for requesting guest codes for events
 * @param {Object} props
 * @param {Object} props.event - The event object containing all event details
 */
const GuestCode = ({ event }) => {
  const toast = useToast();

  // State for form fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPax, setGuestPax] = useState(1);
  const [maxPax, setMaxPax] = useState(5);
  const [primaryColor, setPrimaryColor] = useState("#d4af37"); // Default gold color
  const [generatingCode, setGeneratingCode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Effect to get maxPax and primaryColor from event code settings
  useEffect(() => {
    if (event && event.codeSettings && event.codeSettings.length > 0) {
      const guestCodeSetting = event.codeSettings.find(
        (cs) => cs.type === "guest"
      );

      if (guestCodeSetting) {
        // Set maxPax if available
        if (guestCodeSetting.maxPax) {
          setMaxPax(guestCodeSetting.maxPax);
        } else {
          // Default to 5 if not specified
          setMaxPax(5);
        }

        // Set primary color if available
        if (guestCodeSetting.primaryColor) {
          setPrimaryColor(guestCodeSetting.primaryColor);
          // Apply the color to CSS variables for dynamic styling
          document.documentElement.style.setProperty(
            "--guest-code-primary-color",
            guestCodeSetting.primaryColor
          );
        }
      }
    }
  }, [event]);

  // Function to get condition text from code settings
  const getConditionText = () => {
    if (event && event.codeSettings && event.codeSettings.length > 0) {
      const guestCodeSetting = event.codeSettings.find(
        (cs) => cs.type === "guest"
      );

      if (guestCodeSetting && guestCodeSetting.condition) {
        return guestCodeSetting.condition;
      }
    }

    return "Please fill in your details to request a guest code for this event.";
  };

  const handleGenerateGuestCode = async () => {
    try {
      // Validate guest name and email
      const errors = {};
      if (!guestName.trim()) {
        errors.name = "Please enter your name";
      }

      if (!guestEmail.trim()) {
        errors.email = "Please enter your email";
      } else if (!isValidEmail(guestEmail)) {
        errors.email = "Please enter a valid email address";
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        toast.showError(Object.values(errors)[0]);
        return;
      }

      // Clear previous errors
      setFormErrors({});

      // Set generating state
      setGeneratingCode(true);

      // Use info toast to let the user know we're processing
      toast.showInfo("Processing your request...");

      // Make sure we have the event ID
      if (!event || !event._id) {
        toast.showError("Event information is missing");
        setGeneratingCode(false);
        return;
      }

      const eventId = event._id;
      console.log("[GuestCode] Generating guest code for event:", eventId);
      console.log("[GuestCode] Guest details:", {
        name: guestName,
        email: guestEmail,
        pax: guestPax,
      });

      const response = await axiosInstance.post("/guest-code/generate", {
        eventId: eventId,
        guestName: guestName,
        guestEmail: guestEmail,
        maxPax: guestPax,
      });

      console.log("[GuestCode] Guest code generated and sent:", response.data);

      // Check if the response contains a success property or code property
      if (response.data && (response.data.success || response.data.code)) {
        // Clear form fields
        setGuestName("");
        setGuestEmail("");
        setGuestPax(1);

        // Show success message
        setSuccessMessage(
          `Guest code sent to ${guestEmail}. Please check your email.`
        );
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000); // Clear the message after 5 seconds

        // Show success toast
        toast.showSuccess("Guest code generated and sent successfully");
      } else {
        // If response doesn't have expected success properties, show an error
        toast.showError(
          response.data?.message || "Failed to generate guest code"
        );
      }
    } catch (err) {
      console.error("[GuestCode] Error generating guest code:", err);

      // Handle specific error cases
      if (err.response?.status === 401) {
        toast.showError("Please log in to generate guest codes");
      } else if (err.response?.status === 403) {
        toast.showError(
          "You don't have permission to generate guest codes for this event"
        );
      } else {
        toast.showError(
          err.response?.data?.message || "Failed to generate guest code"
        );
      }
    } finally {
      setGeneratingCode(false);
    }
  };

  return (
    <div className="guest-code-container">
      <div
        className="guest-code-card"
        style={{
          background: `linear-gradient(145deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.95)), 
                    linear-gradient(to right, rgba(0, 0, 0, 0), ${primaryColor}40, rgba(0, 0, 0, 0))`,
        }}
      >
        <h3 className="guest-code-title">Request Guest Code</h3>

        {/* Condition text from code settings */}
        <p className="condition-text">{getConditionText()}</p>

        {/* Success message */}
        {successMessage && (
          <div className="success-message">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="success-content"
            >
              {successMessage}
            </motion.div>
          </div>
        )}

        <div className="guest-code-form">
          <div className="form-group">
            <div className="input-icon">
              <RiUserLine />
            </div>
            <input
              type="text"
              placeholder="Your Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className={formErrors.name ? "error" : ""}
            />
            {formErrors.name && (
              <div className="error-message">{formErrors.name}</div>
            )}
          </div>

          <div className="form-group">
            <div className="input-icon">
              <RiMailLine />
            </div>
            <input
              type="email"
              placeholder="Your Email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className={formErrors.email ? "error" : ""}
            />
            {formErrors.email && (
              <div className="error-message">{formErrors.email}</div>
            )}
          </div>

          <div className="form-group">
            <div className="input-icon">
              <RiCodeSSlashLine />
            </div>
            <select
              value={guestPax}
              onChange={(e) => setGuestPax(parseInt(e.target.value))}
              className={formErrors.pax ? "error" : ""}
            >
              {[...Array(maxPax)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} {i === 0 ? "Guest" : "Guests"}
                </option>
              ))}
            </select>
            {formErrors.pax && (
              <div className="error-message">{formErrors.pax}</div>
            )}
          </div>

          <button
            className="guest-code-button"
            onClick={handleGenerateGuestCode}
            disabled={generatingCode}
            style={{ backgroundColor: primaryColor }}
          >
            {generatingCode ? (
              <>
                <div className="loading-spinner"></div>
                Generating...
              </>
            ) : (
              "Generate Guest Code"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestCode;
