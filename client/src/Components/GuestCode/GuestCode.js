import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./GuestCode.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import {
  RiUserLine,
  RiMailLine,
  RiCodeSSlashLine,
  RiTicket2Line,
  RiVipCrownLine,
  RiGroupLine,
  RiShieldCheckLine,
  RiMailSendLine,
} from "react-icons/ri";

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
  const [existingCodeWarning, setExistingCodeWarning] = useState("");
  const [formTouched, setFormTouched] = useState({});

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

  // Handle field change
  const handleFieldChange = (field, value) => {
    // Update form touched state
    setFormTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    // Update field value
    switch (field) {
      case "name":
        setGuestName(value);
        break;
      case "email":
        setGuestEmail(value);
        break;
      case "pax":
        setGuestPax(parseInt(value));
        break;
      default:
        break;
    }

    // Clear error for this field if it exists
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
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

      // Clear previous errors and warnings
      setFormErrors({});
      setExistingCodeWarning("");

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

      console.log("[GuestCode] API response:", response);

      // Check for the already exists case (status 409)
      if (response.data && response.data.alreadyExists) {
        setExistingCodeWarning(
          response.data.message ||
            "You already received a Guest Code for this event."
        );
        toast.showInfo("You already have a Guest Code for this event.");
      }
      // Check for success
      else if (response.data && (response.data.success || response.data.code)) {
        // Clear form fields
        setGuestName("");
        setGuestEmail("");
        setGuestPax(1);
        setFormTouched({});

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
    } catch (error) {
      console.error("[GuestCode] Error generating guest code:", error);

      // Check for 409 Conflict status (already exists)
      if (error.response && error.response.status === 409) {
        setExistingCodeWarning(
          error.response.data.message ||
            "You already received a Guest Code for this event."
        );
        toast.showInfo("You already have a Guest Code for this event.");
      } else {
        toast.showError(
          error.response?.data?.message || "Failed to generate guest code"
        );
      }
    } finally {
      setGeneratingCode(false);
    }
  };

  return (
    <div className="guest-code-container">
      <motion.div
        className="guest-code-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: `linear-gradient(145deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.95))`,
          borderLeft: `4px solid ${primaryColor}`,
        }}
      >
        <div className="card-header">
          <div className="title-area">
            <RiVipCrownLine
              className="title-icon"
              style={{ color: primaryColor }}
            />
            <h3 className="guest-code-title">Request Guest Code</h3>
          </div>
        </div>

        {/* Condition text from code settings */}
        <div className="condition-wrapper">
          <RiShieldCheckLine
            className="condition-icon"
            style={{ color: primaryColor }}
          />
          <p className="condition-text">{getConditionText()}</p>
        </div>

        {/* Success message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              className="success-message"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="success-content"
              >
                <RiMailSendLine className="success-icon" />
                {successMessage}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing code warning message */}
        <AnimatePresence>
          {existingCodeWarning && (
            <motion.div
              className="warning-message"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="warning-content"
              >
                <RiCodeSSlashLine className="warning-icon" />
                {existingCodeWarning}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="guest-code-form">
          <div className="form-group">
            <div
              className="input-icon"
              style={{ color: formTouched.name ? primaryColor : undefined }}
            >
              <RiUserLine />
            </div>
            <input
              type="text"
              placeholder="Your Name"
              value={guestName}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              onBlur={() => setFormTouched((prev) => ({ ...prev, name: true }))}
              className={
                formErrors.name
                  ? "error"
                  : formTouched.name && guestName
                  ? "valid"
                  : ""
              }
              style={{
                borderColor:
                  formTouched.name && !formErrors.name && guestName
                    ? `${primaryColor}40`
                    : undefined,
              }}
            />
            {formErrors.name && (
              <div className="error-message">{formErrors.name}</div>
            )}
            {formTouched.name && guestName && !formErrors.name && (
              <div
                className="valid-indicator"
                style={{ backgroundColor: primaryColor }}
              ></div>
            )}
          </div>

          <div className="form-group">
            <div
              className="input-icon"
              style={{ color: formTouched.email ? primaryColor : undefined }}
            >
              <RiMailLine />
            </div>
            <input
              type="email"
              placeholder="Your Email"
              value={guestEmail}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              onBlur={() => {
                setFormTouched((prev) => ({ ...prev, email: true }));
                if (guestEmail && !isValidEmail(guestEmail)) {
                  setFormErrors((prev) => ({
                    ...prev,
                    email: "Please enter a valid email address",
                  }));
                }
              }}
              className={
                formErrors.email
                  ? "error"
                  : formTouched.email && isValidEmail(guestEmail)
                  ? "valid"
                  : ""
              }
              style={{
                borderColor:
                  formTouched.email &&
                  !formErrors.email &&
                  isValidEmail(guestEmail)
                    ? `${primaryColor}40`
                    : undefined,
              }}
            />
            {formErrors.email && (
              <div className="error-message">{formErrors.email}</div>
            )}
            {formTouched.email &&
              isValidEmail(guestEmail) &&
              !formErrors.email && (
                <div
                  className="valid-indicator"
                  style={{ backgroundColor: primaryColor }}
                ></div>
              )}
          </div>

          <div className="form-group">
            <div
              className="input-icon"
              style={{ color: formTouched.pax ? primaryColor : undefined }}
            >
              <RiGroupLine />
            </div>
            <select
              value={guestPax}
              onChange={(e) => handleFieldChange("pax", e.target.value)}
              onBlur={() => setFormTouched((prev) => ({ ...prev, pax: true }))}
              className={
                formErrors.pax ? "error" : formTouched.pax ? "valid" : ""
              }
              style={{
                borderColor: formTouched.pax ? `${primaryColor}40` : undefined,
              }}
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
            {formTouched.pax && !formErrors.pax && (
              <div
                className="valid-indicator"
                style={{ backgroundColor: primaryColor }}
              ></div>
            )}
          </div>

          <motion.button
            className="guest-code-button"
            onClick={handleGenerateGuestCode}
            disabled={generatingCode}
            whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(0,0,0,0.3)" }}
            whileTap={{ y: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}
            style={{
              background: primaryColor,
              backgroundImage: generatingCode
                ? "none"
                : `linear-gradient(to bottom, ${primaryColor}DD, ${primaryColor})`,
            }}
          >
            {generatingCode ? (
              <>
                <div className="loading-spinner"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <RiCodeSSlashLine className="button-icon" />
                <span>Generate Guest Code</span>
              </>
            )}
          </motion.button>
        </div>

        <div className="guest-code-footer">
          <RiShieldCheckLine style={{ color: primaryColor }} />
          <span>
            Your information is secure and will only be used for this event
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default GuestCode;
