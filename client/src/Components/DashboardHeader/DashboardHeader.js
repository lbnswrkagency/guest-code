// DashboardHeader.js
import React from "react";
import { motion } from "framer-motion";
import { FaUserCircle } from "react-icons/fa";
import { RiCalendarEventLine, RiArrowDownSLine } from "react-icons/ri";
import "./DashboardHeader.scss";
import AvatarUpload from "../AvatarUpload/AvatarUpload.";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

const DashboardHeader = ({
  user,
  isEditingAvatar,
  toggleEditAvatar,
  setIsCropMode,
  isCropMode,
  setUser,
  isOnline,
  onNotificationCreated,
}) => {
  const { getNewToken } = useAuth();

  const createTestNotification = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/create`,
        {
          userId: user._id,
          type: "info",
          title: "Test Notification",
          message: "This is a test notification. Click to mark as read!",
          metadata: {
            timestamp: new Date().toISOString(),
            testData: "This is some test metadata",
          },
        },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Optionally refresh notifications immediately
      if (typeof onNotificationCreated === "function") {
        onNotificationCreated();
      }
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          await getNewToken();
          // Retry the request with new token
          const newToken = localStorage.getItem("token");
          await axios.post(
            `${process.env.REACT_APP_API_BASE_URL}/notifications/create`,
            {
              userId: user._id,
              type: "info",
              title: "Test Notification",
              message: "This is a test notification. Click to mark as read!",
              metadata: {
                timestamp: new Date().toISOString(),
                testData: "This is some test metadata",
              },
            },
            {
              withCredentials: true,
              headers: {
                Authorization: `Bearer ${newToken}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (retryError) {
          console.error("Error creating test notification:", retryError);
        }
      } else {
        console.error("Error creating test notification:", error);
      }
    }
  };

  return (
    <div className="dashboard-header">
      <div className="header-content">
        {/* Profile Section */}
        <div className="profile-section">
          <div className="avatar-container" onClick={toggleEditAvatar}>
            {!isEditingAvatar ? (
              <>
                {user.avatar ? (
                  <motion.img
                    src={user.avatar}
                    alt="Profile"
                    className="avatar"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  />
                ) : (
                  <motion.div
                    className="avatar-placeholder"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaUserCircle />
                  </motion.div>
                )}
                <div className="online-status">
                  <div
                    className={`status-dot ${isOnline ? "online" : "offline"}`}
                  />
                </div>
              </>
            ) : (
              <AvatarUpload
                user={user}
                setUser={setUser}
                setIsCropMode={setIsCropMode}
                toggleEditAvatar={toggleEditAvatar}
              />
            )}
          </div>
          <div className="user-info">
            <div className="user-info-main">
              <div className="name-group">
                <h1 className="display-name">
                  {user.firstName || user.username}
                </h1>
                <span className="username">@{user.username}</span>
              </div>
              <div className="user-stats">
                <div className="stat-item">
                  <span className="stat-value">2.4K</span> Friends
                </div>
                <div className="stat-divider">·</div>
                <div className="stat-item">
                  <span className="stat-value">847</span> Members
                </div>
                <div className="stat-divider">·</div>
                <div className="stat-item">
                  <span className="stat-value">23</span> Events
                </div>
              </div>
              <div className="user-bio">Event Manager at GuestCode 🎫</div>
            </div>
          </div>
        </div>

        {/* Event Section */}
        <div className="event-section">
          <motion.div
            className="event-selector"
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
          >
            <div className="event-logo">
              <img src="/image/logo.svg" alt="Event Logo" />
            </div>
            <h2 className="event-name">Afro Spiti</h2>
            <motion.div
              className="dropdown-icon"
              initial={false}
              whileHover={{ y: 2 }}
              transition={{ duration: 0.2 }}
            >
              <RiArrowDownSLine />
            </motion.div>
          </motion.div>
        </div>

        {/* Date Section */}
        <div className="date-section">
          <motion.div
            className="date-display"
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
          >
            <RiCalendarEventLine className="calendar-icon" />
            <span>23 Mar 2024</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
