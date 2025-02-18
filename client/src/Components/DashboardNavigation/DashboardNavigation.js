import React from "react";
import "./DashboardNavigation.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiHome5Line,
  RiCalendarEventLine,
  RiCloseLine,
  RiBuildingLine,
  RiSettings4Line,
  RiMapPinLine,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";

const DashboardNavigation = ({ isOpen, onClose, currentUser }) => {
  const navigate = useNavigate();

  if (!currentUser) return null;

  const menuItems = [
    {
      title: "Profile",
      icon: <RiHome5Line />,
      path: `/@${currentUser.username}`,
    },
    {
      title: "Brands",
      icon: <RiBuildingLine />,
      path: `/@${currentUser.username}/brands`,
    },
    {
      title: "Locations",
      icon: <RiMapPinLine />,
      path: "/locations",
    },
    {
      title: "Events",
      icon: <RiCalendarEventLine />,
      path: "/events",
    },
    {
      title: "Settings",
      icon: <RiSettings4Line />,
      path: "/settings",
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
                <span className="username">@{currentUser.username}</span>
              </div>
            </div>

            <div className="dashboard-navigation-content">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  className="menu-item"
                  variants={menuItemVariants}
                  custom={index}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
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
