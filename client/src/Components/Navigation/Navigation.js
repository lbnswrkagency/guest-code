// Navigation.js
import React, { useState } from "react";
import "./Navigation.scss";
import {
  RiArrowLeftSLine,
  RiMailLine,
  RiMenuLine,
  RiBellLine,
  RiLogoutBoxRLine,
  RiTestTubeLine,
  RiGlobalLine,
  RiMessage3Line,
  RiHome5Line,
} from "react-icons/ri";
import NotificationPanel from "../NotificationPanel/NotificationPanel";
import { useNotificationDot } from "../../hooks/useNotificationDot";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationContext";
import { useChat } from "../../contexts/ChatContext";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import axiosInstance from "../../utils/axiosConfig";

const Navigation = ({ onBack, onMenuClick, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasMessages = useNotificationDot("message");
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleLogout = async () => {
    try {
      console.log("[Navigation] Initiating logout process", {
        hasUser: !!user,
        userId: user?._id,
        timestamp: new Date().toISOString(),
      });

      // Clean up socket connection before logout
      if (socket) {
        console.log("[Navigation] Disconnecting socket before logout");
        socket.disconnect();
      }

      // Call AuthContext logout
      await logout();

      console.log("[Navigation] Logout completed successfully");
    } catch (error) {
      console.error("[Navigation] Logout failed:", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/dashboard");
    }
  };

  const handleHome = () => {
    navigate("/dashboard");
  };

  const createTestNotification = async () => {
    try {
      console.log("[Navigation] Creating test notification");
      const response = await axiosInstance.post("/notifications/create", {
        userId: user._id,
        type: "info",
        title: "Test Notification",
        message: "This is a test notification. Click to mark as read!",
        metadata: {
          timestamp: new Date().toISOString(),
          testData: "This is some test metadata",
        },
      });

      console.log("[Navigation] Test notification created:", response.data);
    } catch (error) {
      console.error(
        "[Navigation] Error creating test notification:",
        error.message
      );
    }
  };

  return (
    <motion.nav
      className="app-navigation"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="nav-content">
        <div className="nav-left">
          {location.pathname !== "/dashboard" && (
            <motion.div
              className="nav-icon-wrapper back-button"
              onClick={handleBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RiArrowLeftSLine className="icon" />
            </motion.div>
          )}
          <motion.div
            className="nav-icon-wrapper home-button"
            onClick={handleHome}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiHome5Line className="icon" />
          </motion.div>
          <div className="nav-brand">GuestCode</div>
        </div>

        <div className="nav-right">
          {/* Test Notification Button */}
          <motion.div
            className="nav-icon-wrapper test-notification"
            onClick={createTestNotification}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Create Test Notification"
          >
            <RiTestTubeLine className="icon" />
          </motion.div>

          {/* Global Chat */}
          {/* <motion.div
            className="nav-icon-wrapper"
            onClick={() => navigate("/dashboard/global-chat")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Global Chat"
          >
            <RiGlobalLine className="icon" />
          </motion.div> */}

          {/* Personal Chat */}
          {/* <motion.div
            className={`nav-icon-wrapper ${
              chatUnreadCount > 0 ? "has-notification" : ""
            }`}
            onClick={() => navigate("/dashboard/chat")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Personal Messages"
          >
            <RiMessage3Line className="icon" />
            {chatUnreadCount > 0 && (
              <span className="notification-count">{chatUnreadCount}</span>
            )}
          </motion.div> */}

          {/* Notifications */}
          <motion.div
            className={`nav-icon-wrapper ${
              unreadCount > 0 ? "has-notification" : ""
            }`}
            onClick={toggleNotifications}
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
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiLogoutBoxRLine className="icon" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showNotifications && (
          <NotificationPanel onClose={() => setShowNotifications(false)} />
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navigation;
