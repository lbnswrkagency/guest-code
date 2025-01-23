// DashboardHeader.js
import React, { useEffect } from "react";
import AvatarUpload from "../AvatarUpload/AvatarUpload.";
import "./DashboardHeader.scss";
import { FaUserCircle } from "react-icons/fa";
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

  useEffect(() => {}, [isOnline]);

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
    <div className="headerDashboard">
      <div className="headerDashboard-avatar">
        {!isEditingAvatar ? (
          <div className="headerDashboard-avatar-wrapper">
            <img
              src="/image/share-icon.svg"
              alt="Edit Avatar"
              className="share-icon"
              onClick={toggleEditAvatar}
            />
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" className="profile-icon" />
            ) : (
              <div className="profile-icon-placeholder">
                <FaUserCircle />
              </div>
            )}
            <img
              src="/image/edit-icon2.svg"
              alt="Edit Avatar"
              className="edit-icon"
              onClick={toggleEditAvatar}
            />
          </div>
        ) : (
          <>
            <AvatarUpload
              user={user}
              setUser={setUser}
              setIsCropMode={setIsCropMode}
              toggleEditAvatar={toggleEditAvatar}
            />
            {!isCropMode && (
              <img
                src="/image/cancel-icon_w.svg"
                alt="Cancel Edit"
                className="avatar-cancel-icon avatar-icon"
                onClick={toggleEditAvatar}
              />
            )}
          </>
        )}
      </div>

      <div className="headerDashboard-info">
        <p className="headerDashboard-info-name">
          {user.firstName ? `${user.firstName}` : `@${user.username}`}
        </p>
        <button
          className="headerDashboard-test-notification"
          onClick={createTestNotification}
        >
          Test Notification
        </button>
      </div>

      <div className="headerDashboard-selection">
        <div className="headerDashboard-selection-event">
          <span className="headerDashboard-selection-event-image">
            <img src="/image/logo.svg" alt="" />
          </span>
          <h2 className="headerDashboard-selection-event-name">Afro Spiti</h2>
          <img
            src="/image/dropdown-icon.svg"
            alt=""
            className="headerDashboard-selection-event-dropdown"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
