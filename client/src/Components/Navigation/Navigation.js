// Navigation.js
import React, { useState } from "react";
import "./Navigation.scss";
import {
  RiArrowLeftSLine,
  RiMailLine,
  RiMenuLine,
  RiBellLine,
  RiLogoutBoxRLine,
} from "react-icons/ri";
import NotificationPanel from "../NotificationPanel/NotificationPanel";
import { useNotificationDot } from "../../hooks/useNotificationDot";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationContext";
import { motion } from "framer-motion";

const Navigation = ({ onBack, onMenuClick, onLogout }) => {
  const navigate = useNavigate();
  const hasMessages = useNotificationDot("message");
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <motion.nav
      className="app-navigation"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="nav-content">
        <div className="nav-left">
          <div className="nav-brand">GuestCode</div>
        </div>

        <div className="nav-right">
          {/* Messages/Inbox */}
          <motion.div
            className={`nav-icon-wrapper ${
              hasMessages ? "has-notification" : ""
            }`}
            onClick={() => navigate("/inbox")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiMailLine className="icon" />
            {hasMessages && <div className="notification-dot" />}
          </motion.div>

          {/* Notifications */}
          <motion.div
            className={`nav-icon-wrapper ${
              unreadCount > 0 ? "has-notification" : ""
            }`}
            onClick={() => setShowNotifications(!showNotifications)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiBellLine className="icon" />
            {unreadCount > 0 && (
              <span className="notification-count">{unreadCount}</span>
            )}
          </motion.div>

          {/* Menu */}
          <motion.div
            className="nav-icon-wrapper"
            onClick={onMenuClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiMenuLine className="icon" />
          </motion.div>

          {/* Logout */}
          <motion.div
            className="nav-icon-wrapper"
            onClick={onLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiLogoutBoxRLine className="icon" />
          </motion.div>
        </div>
      </div>

      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </motion.nav>
  );
};

export default Navigation;
