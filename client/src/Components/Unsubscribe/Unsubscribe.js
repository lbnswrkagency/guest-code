// Unsubscribe.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import "./Unsubscribe.scss";

const Unsubscribe = () => {
  const { codeId } = useParams();
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    const unsubscribe = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/codes/unsubscribe/${codeId}`
        );
        if (response.data.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (error) {
        if (error.response?.status === 404) {
          setStatus("not-found");
        } else {
          setStatus("error");
        }
      }
    };

    unsubscribe();
  }, [codeId]);

  return (
    <div className="unsubscribe-page">
      <motion.div
        className="unsubscribe-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {status === "processing" && (
          <div className="unsubscribe-status">
            <div className="loading-icon">⌛</div>
            <h2>Processing...</h2>
            <p>Please wait while we update your preferences...</p>
          </div>
        )}

        {status === "success" && (
          <div className="unsubscribe-status success">
            <div className="success-icon">✓</div>
            <h2>You've been unsubscribed!</h2>
            <p>
              Thank you for visiting us in the past. You will no longer receive
              personal invitations from us.
            </p>

            <div className="contact-info">
              <p className="contact-title">Want to join us again?</p>
              <p>If you want to come to any of our events, feel free to:</p>
              <p className="contact-method">
                <span className="icon">📧</span> Email us at{" "}
                <a href="mailto:contact@afrospiti.com">contact@afrospiti.com</a>
              </p>
              <p className="contact-method">
                <span className="icon">📱</span> Text us on Instagram{" "}
                <a
                  href="https://instagram.com/afrospiti"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @afrospiti
                </a>
              </p>
            </div>

            <p className="closing-message">
              We respect your privacy and your choice. You can always contact us
              if you change your mind!
            </p>
          </div>
        )}

        {status === "not-found" && (
          <div className="unsubscribe-status error">
            <div className="error-icon">❌</div>
            <h2>Code Not Found</h2>
            <p>
              We couldn't find the code you're trying to unsubscribe. It may
              have already been removed or the link may be invalid.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="unsubscribe-status error">
            <div className="error-icon">❌</div>
            <h2>Something went wrong</h2>
            <p>
              We encountered an error while processing your request. Please try
              again later or contact us directly at{" "}
              <a href="mailto:contact@afrospiti.com">contact@afrospiti.com</a>
            </p>
          </div>
        )}

        <div className="footer">
          <p>GuestCode - The Future of Event Management</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Unsubscribe;
