import React from "react";
import { motion } from "framer-motion";
import "./Maintenance.scss";

const Maintenance = () => {
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
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            We're making some improvements to give you a better experience.
            <br />
            This won't take long.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Maintenance;
