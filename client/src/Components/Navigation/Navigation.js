// Navigation.js
import React, { useState } from "react";
import "./Navigation.scss";
import {
  RiArrowLeftSLine,
  RiMenuLine,
  RiBellLine,
  RiLogoutBoxRLine,
  RiTestTubeLine,
  RiSearchLine,
  RiLoginBoxLine,
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
import Search from "../Search/Search";

const Navigation = ({
  onBack,
  onMenuClick = () => {
    console.warn(
      "[Navigation] onMenuClick prop is not provided. DashboardNavigation won't open."
    );
  },
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasMessages = useNotificationDot("message");
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [showSearch, setShowSearch] = useState(false);

  // Check if user is authenticated
  const isAuthenticated = !!user;

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
    } else if (isAuthenticated) {
      navigate(`/@${user.username}`);
    } else {
      navigate("/");
    }
  };

  const handleHome = () => {
    if (isAuthenticated) {
      navigate(`/@${user.username}`);
    } else {
      navigate("/");
    }
  };

  const handleLogin = () => {
    navigate("/login");
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

  const handleSearchClick = () => {
    setShowSearch(true);
  };

  const handleSearchClose = () => {
    setShowSearch(false);
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
          {location.pathname !== "/" && (
            <motion.div
              className="nav-icon-wrapper back-button"
              onClick={handleBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RiArrowLeftSLine className="icon" />
            </motion.div>
          )}
          <div className="nav-brand" onClick={handleHome}>
            GuestCode
          </div>
        </div>

        <div className="nav-right">
          {/* Search - Available for all users */}
          <motion.div
            className="nav-icon-wrapper"
            onClick={handleSearchClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiSearchLine className="icon" />
          </motion.div>

          {/* Authenticated-only elements */}
          {isAuthenticated ? (
            <>
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
                onClick={() => {
                  console.log(
                    "[Navigation] Menu icon clicked, calling onMenuClick",
                    {
                      hasOnMenuClick: typeof onMenuClick === "function",
                      component: location.pathname,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  if (typeof onMenuClick === "function") {
                    onMenuClick();
                  } else {
                    console.error(
                      "[Navigation] onMenuClick is not a function:",
                      onMenuClick
                    );
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                role="button"
                aria-label="Open menu"
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
            </>
          ) : (
            /* Login button for non-authenticated users */
            <motion.div
              className="nav-icon-wrapper"
              onClick={handleLogin}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RiLoginBoxLine className="icon" />
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <Search isOpen={showSearch} onClose={handleSearchClose} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications && isAuthenticated && (
          <NotificationPanel onClose={() => setShowNotifications(false)} />
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navigation;
