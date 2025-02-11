// DashboardMenu.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiToolsFill,
  RiBarChartFill,
  RiQrCodeFill,
  RiVipCrownFill,
  RiGroupFill,
  RiTableFill,
} from "react-icons/ri";
import "./DashboardMenu.scss";

const DashboardMenu = ({
  user,
  setShowSettings,
  setShowStatistic,
  setShowScanner,
  setCodeType,
  setShowTableSystem,
  setShowGlobalChat,
  isOnline, // Add this prop
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleClickOutside = (e) => {
    if (!e.target.closest(".menuDashboard")) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className={`menuDashboard ${isOpen ? "open" : ""}`}>
      <motion.button
        className="menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <RiToolsFill className="trigger-icon" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="menu-items"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="menu-grid">
              {user.isDeveloper && (
                <motion.div
                  className="menu-item"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/events")}
                >
                  <RiVipCrownFill />
                  <span>Events</span>
                </motion.div>
              )}

              {user.isAdmin && (
                <motion.div
                  className="menu-item"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowStatistic(true)}
                >
                  <RiBarChartFill />
                  <span>Stats</span>
                </motion.div>
              )}

              {(user.isAdmin || user.isBackstage) && (
                <motion.div
                  className="menu-item"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCodeType("Backstage")}
                >
                  <RiQrCodeFill />
                  <span>Backstage</span>
                </motion.div>
              )}

              {user.isPromoter && (
                <motion.div
                  className="menu-item"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCodeType("Friends")}
                >
                  <RiGroupFill />
                  <span>Friends</span>
                </motion.div>
              )}

              {user.isStaff && (
                <motion.div
                  className="menu-item"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCodeType("Table")}
                >
                  <RiTableFill />
                  <span>Tables</span>
                </motion.div>
              )}

              {user.isScanner && (
                <motion.div
                  className="menu-item"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowScanner(true)}
                >
                  <RiQrCodeFill />
                  <span>Scanner</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardMenu;
