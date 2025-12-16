// EmailVerification.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import "./EmailVerification.scss";

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState("verifying");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/auth/verify-email/${token}`
        );
        if (response.data.success) {
          setVerificationStatus("success");
          // Wait 3 seconds before redirecting
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        }
      } catch (error) {
        setVerificationStatus("error");
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="email-verification">
      <motion.div
        className="verification-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {verificationStatus === "verifying" && (
          <div className="verification-status">
            <div className="loading-icon">⌛</div>
            <h2>Verifying Your Email</h2>
            <p>Please wait while we verify your email address...</p>
          </div>
        )}

        {verificationStatus === "success" && (
          <div className="verification-status success">
            <div className="success-icon">✓</div>
            <h2>Email Verified Successfully!</h2>
            <p>Your email has been verified. Redirecting you to login...</p>
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="verification-status error">
            <div className="error-icon">❌</div>
            <h2>Verification Failed</h2>
            <p>
              Sorry, we couldn't verify your email. The link may have expired or
              is invalid.
            </p>
            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Go to Login
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default EmailVerification;
