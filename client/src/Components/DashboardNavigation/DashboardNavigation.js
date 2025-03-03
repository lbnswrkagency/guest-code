import React, { useState } from "react";
import "./DashboardNavigation.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiHome5Line,
  RiCalendarEventLine,
  RiCloseLine,
  RiBuildingLine,
  RiSettings4Line,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../contexts/SocketContext";
import AvatarUpload from "../AvatarUpload/AvatarUpload";
import OnlineIndicator from "../OnlineIndicator/OnlineIndicator";

const DashboardNavigation = ({ isOpen, onClose, currentUser, setUser }) => {
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  const [isCropMode, setIsCropMode] = useState(false);

  if (!currentUser) return null;

  const menuItems = [
    {
      title: "Profile",
      icon: <RiHome5Line />,
      path: `/@${currentUser.username}`,
      action: () => {
        navigate(`/@${currentUser.username}`);
        onClose();
      },
    },
    {
      title: "Brands",
      icon: <RiBuildingLine />,
      path: `/@${currentUser.username}/brands`,
      action: () => {
        navigate(`/@${currentUser.username}/brands`);
        onClose();
      },
    },
    {
      title: "Events",
      icon: <RiCalendarEventLine />,
      path: `/@${currentUser.username}/events`,
      action: () => {
        navigate(`/@${currentUser.username}/events`);
        onClose();
      },
    },
    {
      title: "Settings",
      icon: <RiSettings4Line />,
      path: "/settings",
      action: (e) => {
        // No action for now, will implement later
        e.stopPropagation();
        onClose();
      },
    },
  ];

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
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-navigation-content">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  className={`menu-item ${
                    item.title === "Settings" ? "disabled" : ""
                  }`}
                  variants={menuItemVariants}
                  custom={index}
                  onClick={item.action}
                  whileHover={{ x: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="menu-item-icon">{item.icon}</div>
                  <div className="menu-item-text">
                    <h4>{item.title}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DashboardNavigation;
