import React from "react";
import { motion } from "framer-motion";
import "./DashboardFeed.scss";

const DashboardFeed = () => {
  // Sample colors for placeholders
  const colors = [
    "linear-gradient(145deg, #ffc807, #d1a300)",
    "linear-gradient(145deg, #ff6b6b, #ff8e53)",
    "linear-gradient(145deg, #4facfe, #00f2fe)",
    "linear-gradient(145deg, #43e97b, #38f9d7)",
    "linear-gradient(145deg, #fa709a, #fee140)",
    "linear-gradient(145deg, #667eea, #764ba2)",
    "linear-gradient(145deg, #f77062, #fe5196)",
    "linear-gradient(145deg, #30cfd0, #330867)",
    "linear-gradient(145deg, #a8edea, #fed6e3)",
  ];

  return (
    <div className="dashboard-feed">
      <div className="feed-grid">
        {colors.map((color, index) => (
          <motion.div
            key={index}
            className="feed-item"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="feed-item-inner" style={{ background: color }}>
              <div className="feed-item-content">
                <span className="feed-item-number">{index + 1}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DashboardFeed;
