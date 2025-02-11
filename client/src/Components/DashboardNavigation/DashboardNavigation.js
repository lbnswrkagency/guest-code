import React from "react";
import "./DashboardNavigation.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiHome5Line,
  RiBuilding2Line,
  RiCalendarEventLine,
  RiStore2Line,
  RiSettings4Line,
  RiCloseFill,
  RiTeamLine,
  RiVipCrownLine,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";

const DashboardNavigation = ({ isOpen, onClose, currentUser }) => {
  const navigate = useNavigate();

  if (!currentUser) return null;

  const menuItems = [
    {
      title: "Brands",
      icon: <RiStore2Line />,
      path: "/brands",
    },
    {
      title: "My Memberships",
      icon: <RiVipCrownLine />,
      path: "/memberships",
    },
    {
      title: "Locations",
      icon: <RiBuilding2Line />,
      path: "/locations",
    },
    {
      title: "Events",
      icon: <RiCalendarEventLine />,
      path: "/events",
    },
    {
      title: "Team",
      icon: <RiTeamLine />,
      path: "/team",
    },
    {
      title: "Settings",
      icon: <RiSettings4Line />,
      path: "/settings",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="dashboard-navigation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="dashboard-navigation"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
          >
            <div className="dashboard-navigation-header">
              <button className="close-button" onClick={onClose}>
                <RiCloseFill />
              </button>
              <div className="user-info">
                <img
                  src={currentUser.avatar || "/image/default-avatar.png"}
                  alt="Profile"
                  className="user-avatar"
                />
                <div className="user-details">
                  <h3>{currentUser.firstName || "@" + currentUser.username}</h3>
                  <span className="user-role">Member</span>
                </div>
              </div>
            </div>

            <div className="dashboard-navigation-content">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  className="menu-item"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
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
