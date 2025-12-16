import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import "./EmailVerificationModal.scss";
import { useToast } from "../Toast/ToastContext";

const EmailVerificationModal = ({ isOpen, onClose, email: initialEmail }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [newEmail, setNewEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState("");
  const toast = useToast();

  useEffect(() => {
    setEmail(initialEmail);
    setNewEmail(initialEmail);
  }, [initialEmail]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/resend-verification`,
        { email }
      );

      if (response.data.success) {
        setResendSuccess(true);
        toast.showSuccess(response.data.message || "Verification email sent!");
        
        // Auto close modal after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        toast.showError(response.data.message || "Failed to send verification email");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to send verification email. Please try again.";
      toast.showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmail = () => {
    setIsEditingEmail(true);
    setEmailError("");
    setResendSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditingEmail(false);
    setNewEmail(email);
    setEmailError("");
  };

  const handleSaveEmail = async () => {
    // Validate email
    if (!validateEmail(newEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (newEmail.toLowerCase() === email.toLowerCase()) {
      setEmailError("New email is the same as current email");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/update-unverified-email`,
        { 
          oldEmail: email,
          newEmail: newEmail 
        }
      );

      if (response.data.success) {
        setEmail(response.data.newEmail);
        setIsEditingEmail(false);
        setEmailError("");
        toast.showSuccess("Email updated successfully!");
      } else {
        setEmailError(response.data.message || "Failed to update email");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update email";
      setEmailError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="email-verification-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="email-verification-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Email Verification Required</h2>
              <button className="close-button" onClick={onClose}>
                ×
              </button>
            </div>

            <div className="modal-content">
              {!resendSuccess ? (
                <>
                  <div className="verification-icon">✉️</div>
                  <p className="main-message">
                    Please verify your email address before logging in.
                  </p>
                  
                  {!isEditingEmail ? (
                    <>
                      <p className="sub-message">
                        We sent a verification email to <strong>{email}</strong>
                        <button 
                          className="edit-email-button"
                          onClick={handleEditEmail}
                          disabled={isLoading}
                          title="Edit email address"
                        >
                          ✏️
                        </button>
                      </p>
                      <p className="info-message">
                        Didn't receive the email? Check your spam folder or click below to resend.
                      </p>

                      <button
                        className="resend-button"
                        onClick={handleResendVerification}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <span className="loading-spinner"></span>
                            Sending...
                          </>
                        ) : (
                          "Resend Verification Email"
                        )}
                      </button>

                      <p className="edit-hint">
                        Typed wrong email? Click the pencil icon to edit.
                      </p>
                    </>
                  ) : (
                    <div className="email-edit-section">
                      <p className="edit-message">
                        Enter your correct email address:
                      </p>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          setEmailError("");
                        }}
                        className={`email-input ${emailError ? "error" : ""}`}
                        placeholder="Enter your email"
                        disabled={isLoading}
                      />
                      {emailError && <p className="error-message">{emailError}</p>}
                      
                      <div className="edit-buttons">
                        <button
                          className="save-button"
                          onClick={handleSaveEmail}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <span className="loading-spinner"></span>
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </button>
                        <button
                          className="cancel-button"
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="success-icon">✅</div>
                  <p className="success-message">
                    Verification email sent successfully!
                  </p>
                  <p className="sub-message">
                    Please check your inbox and spam folder.
                  </p>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="close-text-button" onClick={onClose}>
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmailVerificationModal;