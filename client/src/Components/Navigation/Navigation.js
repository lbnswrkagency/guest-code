// Navigation.js
import React, { useState, useEffect } from "react";
import "./Navigation.scss";
import {
  RiArrowLeftSLine,
  RiMenuLine,
  RiBellLine,
  RiLogoutBoxRLine,
  RiSearchLine,
  RiLoginBoxLine,
  RiHomeLine,
  RiUser3Line,
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
import { ensureSidebarClass } from "../../utils/layoutHelpers";

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Update the sidebar class management with our utility
  useEffect(() => {
    // Apply sidebar class based on current state
    ensureSidebarClass();

    // Update on resize
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        ensureSidebarClass();
      }
    };

    window.addEventListener("resize", handleResize);

    // Also set up a periodic check to ensure sidebar class consistency
    const intervalCheck = setInterval(() => {
      ensureSidebarClass();
    }, 500);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(intervalCheck);
    };
  }, [isMobile]);

  // Listen for dashboard controller status
  useEffect(() => {
    const handleDashboardMounted = (event) => {
      if (event.detail.navigationController) {
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
    } else if (isDashboardController) {
      // If we're in dashboard context and in a subcomponent, navigate back to dashboard
      const isDashboardSubComponent =
        location.pathname.includes("/dashboard") ||
        localStorage.getItem("currentComponent") === "Analytics";

      if (isDashboardSubComponent) {
        navigate("/dashboard");
      } else {
        navigate(`/@${user.username}`);
      }
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

  const handleProfile = () => {
    if (isAuthenticated && user) {
      // First check if we need to close any open panels
      // Dispatch an event that these components can listen for
      window.dispatchEvent(
        new CustomEvent("closeComponentFromProfile", {
          detail: { source: "NavigationProfile" },
        })
      );

      // Then navigate to profile
      navigate(`/@${user.username}`);
    }
  };

  // Listen for navigation back events
  useEffect(() => {
    const handleNavigationBack = (event) => {
      const { source, returnTo } = event.detail;

      if (returnTo === "Dashboard") {
        // Save the current component to localStorage to help with back navigation
        localStorage.setItem("currentComponent", source);
        navigate("/dashboard");
      } else if (onBack) {
        onBack();
      } else {
        handleBack();
      }
    };

    window.addEventListener("navigationBack", handleNavigationBack);
    return () => {
      window.removeEventListener("navigationBack", handleNavigationBack);
    };
  }, [navigate, onBack]);

  // Render sidebar navigation for tablet and larger screens
  const renderSidebar = () => {
    return (
      <div className="appNav-sidebar">
        <div className="appNav-sidebar-content">
          <div className="appNav-brand" onClick={handleHome}>
            <span className="appNav-brand-guest">Guest</span>
            <span className="appNav-brand-code">Code</span>
          </div>

          <div className="appNav-sidebar-menu">
            {/* Profile - Now positioned at the top where Home used to be */}
            {isAuthenticated && (
              <div className="appNav-sidebar-item" onClick={handleProfile}>
                <RiUser3Line className="appNav-icon" />
                <span className="appNav-label">Profile</span>
              </div>
            )}

            {/* Search - Available for all users */}
            <div className="appNav-sidebar-item" onClick={handleSearchClick}>
              <RiSearchLine className="appNav-icon" />
              <span className="appNav-label">Search</span>
            </div>

            {/* Authenticated-only elements */}
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <div
                  className={`appNav-sidebar-item ${
                    unreadCount > 0 ? "appNav-has-notification" : ""
                  }`}
                  onClick={toggleNotifications}
                >
                  <RiBellLine className="appNav-icon" />
                  {unreadCount > 0 && (
                    <span className="appNav-notification-count">
                      {unreadCount}
                    </span>
                  )}
                  <span className="appNav-label">Notifications</span>
                </div>

                {/* Menu */}
                <div
                  className="appNav-sidebar-item"
                  onClick={handleMenuIconClick}
                  role="button"
                  aria-label="Open menu"
                >
                  <RiMenuLine className="appNav-icon" />
                  <span className="appNav-label">Menu</span>
                </div>

                {/* Logout - at the bottom */}
                <div
                  className="appNav-sidebar-item appNav-sidebar-logout"
                  onClick={handleLogout}
                >
                  <RiLogoutBoxRLine className="appNav-icon" />
                  <span className="appNav-label">Logout</span>
                </div>
              </>
            ) : (
              /* Login button for non-authenticated users */
              <div
                className="appNav-sidebar-item appNav-sidebar-login"
                onClick={handleLogin}
              >
                <RiLoginBoxLine className="appNav-icon" />
                <span className="appNav-label">Login</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render top navigation for mobile screens
  const renderTopNav = () => {
    return (
      <div className="appNav-content">
        <div className="appNav-left">
          {location.pathname !== "/" && (
            <motion.div
              className="appNav-icon-wrapper appNav-back-button"
              onClick={handleBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RiArrowLeftSLine className="appNav-icon" />
            </motion.div>
          )}
          <div className="appNav-brand" onClick={handleHome}>
            <span className="appNav-brand-guest">Guest</span>
            <span className="appNav-brand-code">Code</span>
          </div>
        </div>

        <div className="appNav-right">
          {/* Search - Available for all users */}
          <motion.div
            className="appNav-icon-wrapper"
            onClick={handleSearchClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiSearchLine className="appNav-icon" />
          </motion.div>

          {/* Authenticated-only elements */}
          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <motion.div
                className={`appNav-icon-wrapper ${
                  unreadCount > 0 ? "appNav-has-notification" : ""
                }`}
                onClick={toggleNotifications}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RiBellLine className="appNav-icon" />
                {unreadCount > 0 && (
                  <span className="appNav-notification-count">
                    {unreadCount}
                  </span>
                )}
              </motion.div>

              {/* Menu */}
              <motion.div
                className="appNav-icon-wrapper"
                onClick={handleMenuIconClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                role="button"
                aria-label="Open menu"
              >
                <RiMenuLine className="appNav-icon" />
              </motion.div>

              {/* Logout */}
              <motion.div
                className="appNav-icon-wrapper"
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RiLogoutBoxRLine className="appNav-icon" />
              </motion.div>
            </>
          ) : (
            /* Login button for non-authenticated users */
            <motion.div
              className="appNav-icon-wrapper"
              onClick={handleLogin}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RiLoginBoxLine className="appNav-icon" />
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.nav
      className={`appNav ${!isMobile ? "appNav-sidebar-active" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {isMobile ? renderTopNav() : renderSidebar()}

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
