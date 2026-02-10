import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Maintenance.scss";

const Maintenance = ({ children }) => {
  const [accessCode, setAccessCode] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState(false);

  // Check if user already has access in sessionStorage
  useEffect(() => {
    const savedAccess = sessionStorage.getItem("maintenanceBypass");
    if (savedAccess === "true") {
      setHasAccess(true);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Compare with environment variable
    if (accessCode === process.env.REACT_APP_ALPHA_PW) {
      setHasAccess(true);
      setError(false);
      // Save access status to sessionStorage
      sessionStorage.setItem("maintenanceBypass", "true");
    } else {
      setError(true);
      setAccessCode("");
    }
  };

  // If access is granted, render children
  if (hasAccess) {
    return children;
  }

  return (
    <div className="maintenance-container">
      <motion.div
        className="maintenance-card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="maintenance-content">
          <h1>We'll be right back</h1>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '24px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            We're making some improvements to give you a better experience.
            <br />
            This won't take long.
          </p>
          <div className="access-form">
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Team access"
                className={error ? "error" : ""}
                autoFocus
              />
              <button type="submit">→</button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Maintenance;
