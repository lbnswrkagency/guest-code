// Navigation.js
import React, { useState, useEffect } from "react";
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
import { useNavigation } from "../../contexts/NavigationContext";
import axiosInstance from "../../utils/axiosConfig";
import Search from "../Search/Search";

const Navigation = ({ onBack, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasMessages = useNotificationDot("message");
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { openNavigation } = useNavigation();
  const [showSearch, setShowSearch] = useState(false);
  const [isDashboardController, setIsDashboardController] = useState(false);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Listen for dashboard controller status
  useEffect(() => {
    const handleDashboardMounted = (event) => {
      if (event.detail.navigationController) {
        console.log("Navigation: Recognized Dashboard as controller");
        setIsDashboardController(true);
      }
    };

    window.addEventListener("dashboardMounted", handleDashboardMounted);

    // Check if dashboard is already mounted
    const checkExistingDashboard = setTimeout(() => {
      // Dispatch a query event to check if Dashboard is listening
      window.dispatchEvent(new CustomEvent("navigationQueryController"));
    }, 100);

    return () => {
      window.removeEventListener("dashboardMounted", handleDashboardMounted);
      clearTimeout(checkExistingDashboard);
    };
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleLogout = async () => {
    try {
      // Clean up socket connection before logout
      if (socket) {
        socket.disconnect();
      }

      // Call AuthContext logout
      await logout();
    } catch (error) {
      // Error handling removed
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

  const handleMenuIconClick = (e) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Prevent event propagation

    console.log("Menu icon clicked in Navigation component");

    // Dispatch global event
    window.dispatchEvent(
      new CustomEvent("navigationMenuClick", {
        detail: { source: location.pathname },
      })
    );

    // Use the centralized navigation context
    openNavigation();
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
                onClick={handleMenuIconClick}
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
