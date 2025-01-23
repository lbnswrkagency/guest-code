import React, { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiBellLine, RiCheckLine, RiCloseLine } from "react-icons/ri";
import axios from "axios";
import "./NotificationPanel.scss";
import { useNotifications } from "../../contexts/NotificationContext";
import AuthContext from "../../contexts/AuthContext";
import { useNotificationDot } from "../../hooks/useNotificationDot";

const NotificationPanel = ({ onClose }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    setNotifications,
    setUnreadCount,
    clearAll,
  } = useNotifications();
  const { user } = useContext(AuthContext);
  const hasNotifications = useNotificationDot();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user?._id) {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/notifications/user/${user._id}`,
            {
              withCredentials: true,
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          setNotifications(response.data);
          setUnreadCount(response.data.filter((n) => !n.read).length);
        } catch (error) {
          console.error("Error fetching notifications:", error);
        }
      }
    };

    fetchNotifications();
  }, [user?._id]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/${notificationId}/read`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      markAsRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      onClose();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return "🎉";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "color_change":
        return "🎨";
      default:
        return "📬";
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <motion.div
        className="notification-panel-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleOverlayClick}
      />
      <motion.div
        className="notification-panel-content open"
        initial={{
          opacity: 0,
          y: window.innerWidth <= 768 ? "100%" : -20,
          scale: window.innerWidth <= 768 ? 1 : 0.95,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: window.innerWidth <= 768 ? "100%" : -20,
          scale: window.innerWidth <= 768 ? 1 : 0.95,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="notification-panel-header">
          <h3>Notifications</h3>
          {notifications.length > 0 && (
            <button
              className="notification-panel-clear"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          )}
        </div>

        <div className="notification-panel-list">
          {notifications.length === 0 ? (
            <div className="notification-panel-empty">
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <motion.div
                key={notification._id}
                className={`notification-panel-item ${
                  !notification.read ? "unread" : ""
                }`}
                layout
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="notification-panel-item-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-panel-item-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                  <span className="notification-panel-item-time">
                    {getTimeAgo(notification.createdAt)}
                  </span>
                </div>
                {!notification.read && (
                  <button
                    className="notification-panel-item-mark-read"
                    onClick={() => handleMarkAsRead(notification._id)}
                  >
                    <RiCheckLine />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
};

export default NotificationPanel;
