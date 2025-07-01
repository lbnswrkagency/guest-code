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
  RiAlertLine,
  RiFireLine,
  RiPhoneLine,
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
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPax, setGuestPax] = useState(1);
  const [maxPax, setMaxPax] = useState(5);
  const [primaryColor, setPrimaryColor] = useState("#d4af37"); // Default gold color
  const [generatingCode, setGeneratingCode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [existingCodeWarning, setExistingCodeWarning] = useState("");
  const [formTouched, setFormTouched] = useState({});
  const [limitInfo, setLimitInfo] = useState(null);
  const [isLoadingLimit, setIsLoadingLimit] = useState(false);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone format (accepts various formats including local numbers)
  const isValidPhone = (phone) => {
    // Remove spaces, dashes, parentheses, and other common separators
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Accept various formats:
    // - International: +49123456789
    // - Local German: 0123456789 (10-11 digits starting with 0)
    // - Other international: 49123456789 (without +)
    // - General: any number with 7-15 digits
    const phoneRegex = /^(\+?[1-9]\d{1,14}|0\d{9,10})$/;
    
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 7;
  };

  // Get guest code settings
  const getGuestCodeSettings = () => {
    if (event && event.codeSettings && event.codeSettings.length > 0) {
      return event.codeSettings.find(cs => cs.type === 'guest');
    }
    return null;
  };

  // Email is always required
  const isEmailRequired = () => true;

  // Check if phone is required
  const isPhoneRequired = () => {
    const settings = getGuestCodeSettings();
    return settings?.requirePhone === true; // Default to false
  };

  // Effect to fetch limit information
  useEffect(() => {
    const fetchLimitInfo = async () => {
      if (event && event._id) {
        try {
          setIsLoadingLimit(true);
          
          const response = await axiosInstance.get(
            `/codes/counts/${event._id}?type=guest`
          );
          
          if (response.data) {
            setLimitInfo(response.data);
          }
        } catch (error) {
          // Silent error handling
        } finally {
          setIsLoadingLimit(false);
        }
      }
    };

    fetchLimitInfo();
  }, [event]);

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

  // Function to check if limit is reached
  const isLimitReached = () => {
    if (!limitInfo || limitInfo.unlimited) return false;
    return limitInfo.totalPax >= limitInfo.limit;
  };

  // Function to get remaining slots
  const getRemainingSlots = () => {
    if (!limitInfo || limitInfo.unlimited) return null;
    return Math.max(0, limitInfo.limit - limitInfo.totalPax);
  };

  // Function to check if we should show limit info
  const shouldShowLimit = () => {
    const guestCodeSetting = event?.codeSettings?.find(
      (cs) => cs.type === "guest"
    );
    return (
      limitInfo &&
      !limitInfo.unlimited &&
      limitInfo.limit > 0 &&
      guestCodeSetting &&
      !guestCodeSetting.unlimited &&
      guestCodeSetting.limit > 0
    );
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
      case "phone":
        setGuestPhone(value);
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

      // Email is always required
      if (!guestEmail.trim()) {
        errors.email = "Please enter your email";
      } else if (!isValidEmail(guestEmail)) {
        errors.email = "Please enter a valid email address";
      }

      // Validate phone if required
      if (isPhoneRequired()) {
        if (!guestPhone.trim()) {
          errors.phone = "Please enter your phone number";
        } else if (!isValidPhone(guestPhone)) {
          errors.phone = "Please enter a valid phone number";
        }
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

      const requestData = {
        eventId: eventId,
        guestName: guestName,
        guestEmail: guestEmail, // Email is always included
        maxPax: guestPax,
      };

      // Add phone if required and provided
      if (isPhoneRequired() && guestPhone) {
        requestData.guestPhone = guestPhone;
      }

      const response = await axiosInstance.post("/guest-code/generate", requestData);

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
        setGuestPhone("");
        setGuestPax(1);
        setFormTouched({});

        // Show success message
        const contactInfo = [];
        if (guestEmail) contactInfo.push(`email (${guestEmail})`);
        if (guestPhone) contactInfo.push(`phone (${guestPhone})`);
        
        setSuccessMessage(
          `Guest code sent to your ${contactInfo.join(' and ')}. Please check your messages.`
        );
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000); // Clear the message after 5 seconds

        // Show success toast
        toast.showSuccess("Guest code generated and sent successfully");

        // Refresh limit info after successful generation
        try {
          const response = await axiosInstance.get(
            `/codes/counts/${event._id}?type=guest`
          );
          if (response.data) {
            setLimitInfo(response.data);
          }
        } catch (error) {
          // Silent error handling
        }
      } else {
        // If response doesn't have expected success properties, show an error
        toast.showError(
          response.data?.message || "Failed to generate guest code"
        );
      }
    } catch (error) {
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

        {/* Limit Display */}
        {shouldShowLimit() && limitInfo && (
          <div className="limit-display">
            <div className="limit-content">
              <RiFireLine
                className="limit-icon"
                style={{ color: primaryColor }}
              />
              <div className="limit-text">
                <span className="limit-remaining">
                  {limitInfo.totalPax}/{limitInfo.limit}
                </span>
                <span className="limit-label">limited</span>
              </div>
              <div className="limit-bar">
                <div
                  className="limit-progress"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        (limitInfo.totalPax / (limitInfo.limit || 1)) * 100
                      )
                    )}%`,
                    backgroundColor: primaryColor,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div
          className={`guest-code-form ${
            isLimitReached() ? "limit-reached" : ""
          }`}
          style={{ position: "relative" }}
        >
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

          {isPhoneRequired() && (
            <div className="form-group">
              <div
                className="input-icon"
                style={{ color: formTouched.phone ? primaryColor : undefined }}
              >
                <RiPhoneLine />
              </div>
              <input
                type="tel"
                placeholder="Your Phone Number"
                value={guestPhone}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                onBlur={() => {
                  setFormTouched((prev) => ({ ...prev, phone: true }));
                  if (guestPhone && !isValidPhone(guestPhone)) {
                    setFormErrors((prev) => ({
                      ...prev,
                      phone: "Please enter a valid phone number",
                    }));
                  }
                }}
                className={
                  formErrors.phone
                    ? "error"
                    : formTouched.phone && isValidPhone(guestPhone)
                    ? "valid"
                    : ""
                }
                style={{
                  borderColor:
                    formTouched.phone &&
                    !formErrors.phone &&
                    isValidPhone(guestPhone)
                      ? `${primaryColor}40`
                      : undefined,
                }}
              />
              {formErrors.phone && (
                <div className="error-message">{formErrors.phone}</div>
              )}
              {formTouched.phone &&
                isValidPhone(guestPhone) &&
                !formErrors.phone && (
                  <div
                    className="valid-indicator"
                    style={{ backgroundColor: primaryColor }}
                  ></div>
                )}
            </div>
          )}

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
            disabled={generatingCode || isLimitReached()}
            whileHover={
              !isLimitReached()
                ? { y: -2, boxShadow: "0 6px 20px rgba(0,0,0,0.3)" }
                : {}
            }
            whileTap={
              !isLimitReached()
                ? { y: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }
                : {}
            }
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
                <span>
                  {isLimitReached() ? "Limit Reached" : "Generate Guest Code"}
                </span>
              </>
            )}
          </motion.button>
        </div>

        {/* Limit Reached Overlay */}
        <AnimatePresence>
          {isLimitReached() && (
            <motion.div
              className="limit-reached-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="limit-reached-content">
                <motion.div
                  className="limit-reached-icon"
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, ease: "backOut" }}
                >
                  <RiAlertLine />
                </motion.div>
                <motion.h3
                  className="limit-reached-title"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  SOLD OUT
                </motion.h3>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
