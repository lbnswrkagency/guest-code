import React, { useState, useEffect, useMemo } from "react";
import "./DashboardNavigation.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiHome5Line,
  RiCalendarEventLine,
  RiCloseLine,
  RiBuildingLine,
  RiSettings4Line,
  RiKeyLine,
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
  const [newlyUnlocked, setNewlyUnlocked] = useState(false);
  const [animateItems, setAnimateItems] = useState(false);

  // Explicitly calculate hasAlphaAccess from current user props
  const hasAlphaAccess = useMemo(
    () => Boolean(currentUser?.isAlpha),
    [currentUser?.isAlpha]
  );

  useEffect(() => {
    console.log("[DashboardNavigation] Render with currentUser:", {
      isAlpha: currentUser?.isAlpha,
      hasAlphaAccess,
    });
  }, [currentUser, hasAlphaAccess]);

  // Reset states when navigation is opened
  useEffect(() => {
    if (isOpen) {
      console.log(
        "[DashboardNavigation] Menu opened, checking alpha status:",
        hasAlphaAccess ? "ALPHA" : "NON-ALPHA"
      );

      // If user has alpha access but animation hasn't played yet,
      // set animation states for newly unlocked items
      if (hasAlphaAccess && !newlyUnlocked && !animateItems) {
        setNewlyUnlocked(true);
        setTimeout(() => {
          setAnimateItems(true);
        }, 300);
      }
    }
  }, [isOpen, hasAlphaAccess, newlyUnlocked, animateItems]);

  // Listen for alpha access granted event
  useEffect(() => {
    const handleAlphaAccessGranted = (event) => {
      // Check if this event is for the current user
      if (
        event.detail.userId === currentUser?._id ||
        event.detail.userId === currentUser?.id
      ) {
        console.log(
          "[DashboardNavigation] Alpha access granted event received, current isAlpha:",
          currentUser?.isAlpha
        );

        // Force animation states
        setNewlyUnlocked(true);
        setAnimateItems(true);
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

  // Reset animation state when menu is closed
  useEffect(() => {
    if (!isOpen) {
      setAnimateItems(false);

      // Reset newly unlocked state after a delay to ensure it's ready for next open
      setTimeout(() => {
        setNewlyUnlocked(false);
      }, 300);
    }
  }, [isOpen]);

  if (!currentUser) return null;

  // Generate menu items each render using the current hasAlphaAccess value
  const menuItems = () => {
    console.log(
      "[DashboardNavigation] Generating menu items, hasAlphaAccess:",
      hasAlphaAccess
    );
    const items = [];

    // Always add Profile
    items.push({
      title: "Profile",
      icon: <RiHome5Line />,
      path: `/@${currentUser.username}`,
      action: () => {
        navigate(`/@${currentUser.username}`);
        onClose();
      },
    });

    // Check Brands condition
    if (hasAlphaAccess) {
      items.push({
        title: "Brands",
        icon: <RiBuildingLine />,
        path: `/@${currentUser.username}/brands`,
        isNew: newlyUnlocked,
        action: () => {
          navigate(`/@${currentUser.username}/brands`);
          onClose();
        },
      });
    }

    // Check Events condition
    if (hasAlphaAccess) {
      items.push({
        title: "Events",
        icon: <RiCalendarEventLine />,
        path: `/@${currentUser.username}/events`,
        isNew: newlyUnlocked,
        action: () => {
          navigate(`/@${currentUser.username}/events`);
          onClose();
        },
      });
    }

    // Check Settings condition
    if (hasAlphaAccess) {
      items.push({
        title: "Settings",
        icon: <RiSettings4Line />,
        path: "/settings",
        isNew: newlyUnlocked,
        action: () => {
          navigate("/settings");
          onClose();
        },
      });
    }

    // Only show Alpha Access option if user doesn't have alpha access
    if (!hasAlphaAccess) {
      items.push({
        title: "Alpha Access",
        icon: <RiKeyLine />,
        action: () => {
          setShowAlphaAccess(true);
        },
      });
    }

    return items;
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const navigationVariants = {
    hidden: { x: "100%" },
    visible: {
      x: 0,
      transition: {
        type: "tween",
        duration: 0.3,
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
        delay: i * 0.1,
        duration: 0.2,
      },
    }),
  };

  // Enhanced animation for newly unlocked items
  const newItemVariants = {
    hidden: { opacity: 0, x: 40, scale: 0.8 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15,
        duration: 0.5,
      },
    },
  };

  const handleCloseAlphaAccess = () => {
    setShowAlphaAccess(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="dashboard-navigation-overlay"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            onClick={onClose}
          />
          <motion.div
            className="dashboard-navigation"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={navigationVariants}
          >
            <div className="dashboard-navigation-header">
              <motion.button
                className="close-button"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RiCloseLine />
              </motion.button>
              <div className="user-info">
                <div className="avatar-section">
                  <div className="avatar-container">
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
                        className="nav-online-indicator"
                      />
                    )}
                  </div>
                  <div className="user-details">
                    <span className="display-name">
                      {currentUser.firstName}
                    </span>
                    <span className="username">@{currentUser.username}</span>
                    {currentUser.isAlpha && (
                      <motion.span
                        className="alpha-badge"
                        initial={
                          newlyUnlocked
                            ? { scale: 0.5, opacity: 0 }
                            : { scale: 1 }
                        }
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 15,
                        }}
                      >
                        Alpha
                      </motion.span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-navigation-content">
              <AnimatePresence>
                {menuItems().map((item, index) => (
                  <motion.div
                    key={item.title}
                    className={`menu-item ${item.isNew ? "menu-item-new" : ""}`}
                    variants={
                      item.isNew && animateItems
                        ? newItemVariants
                        : menuItemVariants
                    }
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    onClick={item.action}
                    whileHover={{ x: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="menu-item-icon">{item.icon}</div>
                    <div className="menu-item-text">
                      <h4>{item.title}</h4>
                    </div>
                    {item.isNew && (
                      <motion.div
                        className="menu-item-new-badge"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                      >
                        New
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Alpha Access Modal */}
            {showAlphaAccess && (
              <div className="alpha-access-modal">
                <div className="alpha-access-modal-content">
                  <button
                    className="close-alpha-modal"
                    onClick={handleCloseAlphaAccess}
                  >
                    <RiCloseLine />
                  </button>
                  <AlphaAccess
                    user={currentUser}
                    setUser={setUser}
                    onSuccess={handleCloseAlphaAccess}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DashboardNavigation;
