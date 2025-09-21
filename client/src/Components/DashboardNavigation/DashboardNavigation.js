import React, { useState, useEffect, useRef } from "react";
import "./DashboardNavigation.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiHome5Line,
  RiCalendarEventLine,
  RiCloseLine,
  RiBuildingLine,
  RiSettings4Line,
  RiKeyLine,
  RiArrowRightLine,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../contexts/SocketContext";
import AvatarUpload from "../AvatarUpload/AvatarUpload";
import OnlineIndicator from "../OnlineIndicator/OnlineIndicator";
import AlphaAccess from "../AlphaAccess/AlphaAccess";

const DashboardNavigation = ({ isOpen, onClose, currentUser, setUser }) => {
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  const [isCropMode, setIsCropMode] = useState(false);
  const [showAlphaAccess, setShowAlphaAccess] = useState(false);
  const navRef = useRef(null);

  // Simplified alpha animation state
  const [animateAlpha, setAnimateAlpha] = useState(false);

  // Track if component has been mounted
  const hasMounted = useRef(false);

  // Force an update after mount to ensure proper rendering
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;

      // Force a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Force a reflow/repaint
        const element = document.querySelector(".dashNav");
        if (element) {
          element.style.display = "none";
          // This forces a reflow
          void element.offsetHeight;
          element.style.display = "flex";
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, []);

  // Handle click outside to close the menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target) && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Calculate hasAlphaAccess directly from user props
  const hasAlphaAccess = Boolean(currentUser?.isAlpha);

  // Simple animation reset when menu is closed
  useEffect(() => {
    if (!isOpen) {
      setAnimateAlpha(false);
    } else if (hasAlphaAccess) {
      setAnimateAlpha(true);
    }
  }, [isOpen, hasAlphaAccess]);

  // Listen for alpha access granted event
  useEffect(() => {
    const handleAlphaAccessGranted = (event) => {
      if (
        event.detail.userId === currentUser?._id ||
        event.detail.userId === currentUser?.id
      ) {
        setAnimateAlpha(true);
      }
    };

    window.addEventListener("alphaAccessGranted", handleAlphaAccessGranted);
    return () => {
      window.removeEventListener(
        "alphaAccessGranted",
        handleAlphaAccessGranted
      );
    };
  }, [currentUser]);

  if (!currentUser) return null;

  // Generate menu items based on alpha access
  const menuItems = [
    // Always add Profile
    {
      title: "Profile",
      icon: <RiHome5Line />,
      path: `/@${currentUser.username}`,
      action: () => {
        navigate(`/@${currentUser.username}`);
        onClose();
      },
    },
  ];

  // Alpha-only menu items
  if (hasAlphaAccess) {
    // Add Brands
    menuItems.push({
      title: "Brands",
      icon: <RiBuildingLine />,
      path: `/@${currentUser.username}/brands`,
      action: () => {
        navigate(`/@${currentUser.username}/brands`);
        onClose();
      },
    });

    // Add Events
    menuItems.push({
      title: "Events",
      icon: <RiCalendarEventLine />,
      path: `/@${currentUser.username}/events`,
      action: () => {
        navigate(`/@${currentUser.username}/events`);
        onClose();
      },
    });

    // Add Settings
    menuItems.push({
      title: "Settings",
      icon: <RiSettings4Line />,
      action: () => {
        navigate(`/@${currentUser.username}/settings`);
        onClose();
      },
    });
  } else {
    // Only show Alpha Access option if user doesn't have alpha access
    menuItems.push({
      title: "Alpha Access",
      icon: <RiKeyLine />,
      action: () => {
        setShowAlphaAccess(true);
      },
    });
  }

  // Modified navigation variants to open only 3/4 of the way
  const navigationVariants = {
    hidden: { x: "100%" },
    visible: {
      x: "25%", // This makes it open only 3/4 of the way (100% - 25% = 75%)
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        when: "beforeChildren",
      },
    },
  };

  const menuItemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 25,
      },
    }),
  };

  const handleCloseAlphaAccess = () => {
    setShowAlphaAccess(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="dashNav-wrapper">
          {/* Backdrop with blur effect */}
          <motion.div
            className="dashNav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Main navigation panel */}
          <motion.div
            ref={navRef}
            className="dashNav"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={navigationVariants}
          >
            <div className="dashNav-header">
              <motion.button
                className="dashNav-closeButton"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RiCloseLine />
              </motion.button>
              <div className="dashNav-userInfo">
                <div className="dashNav-avatarSection">
                  <div className="dashNav-avatarContainer">
                    <AvatarUpload
                      user={currentUser}
                      setUser={setUser}
                      isCropMode={isCropMode}
                      setIsCropMode={setIsCropMode}
                    />
                    {currentUser?._id && (
                      <OnlineIndicator
                        userId={currentUser._id}
                        size="medium"
                        className="dashNav-onlineIndicator"
                      />
                    )}
                  </div>
                  <div className="dashNav-userDetails">
                    <span className="dashNav-displayName">
                      {currentUser.firstName}
                    </span>
                    <span className="dashNav-username">
                      @{currentUser.username}
                    </span>
                    {currentUser.isAlpha && (
                      <span className="dashNav-alphaBadge">Alpha</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="dashNav-content">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  className="dashNav-menuItem"
                  variants={menuItemVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  onClick={item.action}
                  whileHover={{
                    x: -4,
                    backgroundColor: "rgba(50, 50, 50, 0.3)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="dashNav-menuItem-icon">{item.icon}</div>
                  <div className="dashNav-menuItem-text">
                    <h4>{item.title}</h4>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Minimalistic close button at bottom */}
            <div className="dashNav-footer">
              <motion.button
                className="dashNav-bottomCloseButton"
                onClick={onClose}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span>Close</span>
                <RiArrowRightLine />
              </motion.button>
            </div>

          </motion.div>
        </div>
      )}

      {/* Alpha Access Modal - Now rendered outside the navigation */}
      <AlphaAccess
        user={currentUser}
        setUser={setUser}
        onSuccess={handleCloseAlphaAccess}
        onClose={handleCloseAlphaAccess}
        isOpen={showAlphaAccess}
      />
    </AnimatePresence>
  );
};

export default DashboardNavigation;
