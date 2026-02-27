import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./GuestCode.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import {
  RiUserLine,
  RiMailLine,
  RiCodeSSlashLine,
  RiVipCrownLine,
  RiGroupLine,
  RiShieldCheckLine,
  RiMailSendLine,
  RiAlertLine,
  RiFireLine,
  RiPhoneLine,
} from "react-icons/ri";

const GuestCode = ({ event }) => {
  const toast = useToast();

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPax, setGuestPax] = useState(1);
  const [maxPax, setMaxPax] = useState(5);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [existingCodeWarning, setExistingCodeWarning] = useState("");
  const [formTouched, setFormTouched] = useState({});
  const [limitInfo, setLimitInfo] = useState(null);
  const [isLoadingLimit, setIsLoadingLimit] = useState(false);

  const guestCodeSettings = useMemo(() => {
    if (!event?.codeSettings?.length) return null;
    return event.codeSettings.find((cs) => cs.type === "guest") || null;
  }, [event]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isValidPhone = (phone) => {
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, "");
    const phoneRegex = /^(\+?[1-9]\d{1,14}|0\d{9,10})$/;
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 7;
  };

  const isPhoneRequired = () => guestCodeSettings?.requirePhone === true;

  useEffect(() => {
    const fetchLimitInfo = async () => {
      if (event?._id) {
        try {
          setIsLoadingLimit(true);
          const response = await axiosInstance.get(
            `/codes/counts/${event._id}?type=guest`
          );
          if (response.data) setLimitInfo(response.data);
        } catch {
          // Silent
        } finally {
          setIsLoadingLimit(false);
        }
      }
    };
    fetchLimitInfo();
  }, [event]);

  useEffect(() => {
    if (guestCodeSettings) {
      setMaxPax(guestCodeSettings.maxPax || 5);
    }
  }, [guestCodeSettings]);

  const conditionText =
    guestCodeSettings?.condition ||
    "Please fill in your details to request a guest code for this event.";

  const noteText = guestCodeSettings?.note || "";

  const isLimitReached = () => {
    if (!limitInfo || limitInfo.unlimited) return false;
    return limitInfo.totalPax >= limitInfo.limit;
  };

  const shouldShowLimit = () => {
    return (
      limitInfo &&
      !limitInfo.unlimited &&
      limitInfo.limit > 0 &&
      guestCodeSettings &&
      !guestCodeSettings.unlimited &&
      guestCodeSettings.limit > 0
    );
  };

  const handleFieldChange = (field, value) => {
    setFormTouched((prev) => ({ ...prev, [field]: true }));

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

    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleGenerateGuestCode = async () => {
    try {
      const errors = {};
      if (!guestName.trim()) errors.name = "Please enter your name";

      if (!guestEmail.trim()) {
        errors.email = "Please enter your email";
      } else if (!isValidEmail(guestEmail)) {
        errors.email = "Please enter a valid email address";
      }

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

      setFormErrors({});
      setExistingCodeWarning("");
      setGeneratingCode(true);
      toast.showInfo("Processing your request...");

      if (!event?._id) {
        toast.showError("Event information is missing");
        setGeneratingCode(false);
        return;
      }

      const requestData = {
        eventId: event._id,
        guestName,
        guestEmail,
        maxPax: guestPax,
      };

      if (isPhoneRequired() && guestPhone) {
        requestData.guestPhone = guestPhone;
      }

      const response = await axiosInstance.post(
        "/guest-code/generate",
        requestData
      );

      if (response.data?.alreadyExists) {
        setExistingCodeWarning(
          response.data.message ||
            "You already received a Guest Code for this event."
        );
        toast.showInfo("You already have a Guest Code for this event.");
      } else if (response.data?.success || response.data?.code) {
        setGuestName("");
        setGuestEmail("");
        setGuestPhone("");
        setGuestPax(1);
        setFormTouched({});

        const contactInfo = [];
        if (guestEmail) contactInfo.push(`email (${guestEmail})`);
        if (guestPhone) contactInfo.push(`phone (${guestPhone})`);

        setSuccessMessage(
          `Guest code sent to your ${contactInfo.join(" and ")}. Please check your messages.`
        );
        setTimeout(() => setSuccessMessage(""), 5000);
        toast.showSuccess("Guest code generated and sent successfully");

        try {
          const refreshResponse = await axiosInstance.get(
            `/codes/counts/${event._id}?type=guest`
          );
          if (refreshResponse.data) setLimitInfo(refreshResponse.data);
        } catch {
          // Silent
        }
      } else {
        toast.showError(
          response.data?.message || "Failed to generate guest code"
        );
      }
    } catch (error) {
      if (error.response?.status === 409) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    handleGenerateGuestCode();
  };

  const fieldClassName = (field, validCheck) => {
    if (formErrors[field]) return "guest-code__input--error";
    if (formTouched[field] && validCheck) return "guest-code__input--valid";
    return "";
  };

  return (
    <div className="guest-code">
      <motion.div
        className="guest-code__card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="guest-code__header">
          <h3 className="guest-code__title">Guest Code</h3>
        </div>

        {/* Condition */}
        <div className="guest-code__condition">
          <RiShieldCheckLine className="guest-code__condition-icon" />
          <p className="guest-code__condition-text">{conditionText}</p>
          {noteText && <p className="guest-code__condition-note">{noteText}</p>}
        </div>

        {/* Success */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              className="guest-code__success"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="guest-code__success-content">
                <RiMailSendLine className="guest-code__success-icon" />
                {successMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warning */}
        <AnimatePresence>
          {existingCodeWarning && (
            <motion.div
              className="guest-code__warning"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="guest-code__warning-content">
                <RiCodeSSlashLine className="guest-code__warning-icon" />
                {existingCodeWarning}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Limit */}
        {shouldShowLimit() && limitInfo && (
          <div className="guest-code__limit">
            <div className="guest-code__limit-content">
              <RiFireLine className="guest-code__limit-icon" />
              <div className="guest-code__limit-text">
                <span className="guest-code__limit-remaining">
                  {limitInfo.totalPax}/{limitInfo.limit}
                </span>
                <span className="guest-code__limit-label">limited</span>
              </div>
            </div>
            <div className="guest-code__limit-bar">
              <div
                className="guest-code__limit-progress"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      (limitInfo.totalPax / (limitInfo.limit || 1)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`guest-code__form ${isLimitReached() ? "guest-code__form--disabled" : ""}`}
        >
          {/* Name */}
          <div className="guest-code__field">
            <div className={`guest-code__field-icon ${formTouched.name ? "guest-code__field-icon--active" : ""}`}>
              <RiUserLine />
            </div>
            <input
              type="text"
              placeholder="Your Name"
              value={guestName}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              onBlur={() => setFormTouched((prev) => ({ ...prev, name: true }))}
              className={`guest-code__input ${fieldClassName("name", guestName)}`}
            />
            {formErrors.name && (
              <div className="guest-code__error">{formErrors.name}</div>
            )}
            {formTouched.name && guestName && !formErrors.name && (
              <div className="guest-code__valid-dot" />
            )}
          </div>

          {/* Email */}
          <div className="guest-code__field">
            <div className={`guest-code__field-icon ${formTouched.email ? "guest-code__field-icon--active" : ""}`}>
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
              className={`guest-code__input ${fieldClassName("email", isValidEmail(guestEmail))}`}
            />
            {formErrors.email && (
              <div className="guest-code__error">{formErrors.email}</div>
            )}
            {formTouched.email && isValidEmail(guestEmail) && !formErrors.email && (
              <div className="guest-code__valid-dot" />
            )}
          </div>

          {/* Phone (conditional) */}
          {isPhoneRequired() && (
            <div className="guest-code__field">
              <div className={`guest-code__field-icon ${formTouched.phone ? "guest-code__field-icon--active" : ""}`}>
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
                className={`guest-code__input ${fieldClassName("phone", isValidPhone(guestPhone))}`}
              />
              {formErrors.phone && (
                <div className="guest-code__error">{formErrors.phone}</div>
              )}
              {formTouched.phone && isValidPhone(guestPhone) && !formErrors.phone && (
                <div className="guest-code__valid-dot" />
              )}
            </div>
          )}

          {/* Pax */}
          <div className="guest-code__field">
            <div className={`guest-code__field-icon ${formTouched.pax ? "guest-code__field-icon--active" : ""}`}>
              <RiGroupLine />
            </div>
            <select
              value={guestPax}
              onChange={(e) => handleFieldChange("pax", e.target.value)}
              onBlur={() => setFormTouched((prev) => ({ ...prev, pax: true }))}
              className={`guest-code__select ${fieldClassName("pax", true)}`}
            >
              {[...Array(maxPax)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} {i === 0 ? "Guest" : "Guests"}
                </option>
              ))}
            </select>
            {formErrors.pax && (
              <div className="guest-code__error">{formErrors.pax}</div>
            )}
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            className="guest-code__submit"
            disabled={generatingCode || isLimitReached()}
            whileHover={!isLimitReached() ? { y: -1 } : {}}
            whileTap={!isLimitReached() ? { y: 0 } : {}}
          >
            {generatingCode ? (
              <>
                <div className="guest-code__submit-spinner" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <RiCodeSSlashLine className="guest-code__submit-icon" />
                <span>{isLimitReached() ? "Limit Reached" : "Generate Guest Code"}</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Sold-out overlay */}
        <AnimatePresence>
          {isLimitReached() && (
            <motion.div
              className="guest-code__sold-out"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="guest-code__sold-out-content">
                <motion.div
                  className="guest-code__sold-out-icon"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, ease: "backOut" }}
                >
                  <RiAlertLine />
                </motion.div>
                <motion.h3
                  className="guest-code__sold-out-title"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                >
                  SOLD OUT
                </motion.h3>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="guest-code__footer">
          <RiShieldCheckLine />
          <span>Your information is secure and will only be used for this event</span>
        </div>
      </motion.div>
    </div>
  );
};

export default GuestCode;
