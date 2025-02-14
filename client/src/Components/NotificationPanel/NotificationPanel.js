import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiCloseLine, RiCheckLine, RiTimeLine } from "react-icons/ri";
import { useNotifications } from "../../contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import "./NotificationPanel.scss";

const getNotificationEmoji = (type) => {
  const emojis = {
    info: "📬", // Mailbox for general info
    success: "🌟", // Star for success
    warning: "🚨", // Siren for warnings
    error: "🔥", // Fire for errors
    event: "🎪", // Circus tent for events
    message: "💌", // Love letter for messages
    friend: "🤝", // Handshake for friend activities
    system: "🛠️", // Tools for system notifications
    update: "🚀", // Rocket for updates
    achievement: "🏆", // Trophy for achievements
    reminder: "⏰", // Alarm clock for reminders
    default: "📢", // Megaphone for default cases
  };
  return emojis[type] || emojis.default;
};

const NotificationPanel = ({ onClose }) => {
  const { notifications, markAsRead, fetchNotifications } = useNotifications();

  useEffect(() => {
    console.log("[NotificationPanel] Fetching notifications on mount");
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      console.log(
        "[NotificationPanel] Marking notification as read:",
        notification._id
      );
      await markAsRead(notification._id);
    }
  };

  return (
    <motion.div
      className="notification-panel"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="notification-header">
        <h3>Notifications</h3>
        <button className="close-button" onClick={onClose}>
          <RiCloseLine size={20} />
        </button>
      </div>

      <div className="notification-list">
        <AnimatePresence>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <motion.div
                key={notification._id}
                className={`notification-item ${
                  !notification.read ? "unread" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="notification-content">
                  <div className="notification-emoji">
                    {getNotificationEmoji(notification.type)}
                  </div>
                  <div className="notification-text">
                    <div className="notification-title">
                      {notification.title}
                    </div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                  </div>
                </div>
                <div className="notification-meta">
                  <span className="notification-time">
                    <RiTimeLine />
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {!notification.read ? (
                    <span className="unread-indicator">New</span>
                  ) : (
                    <span className="read-indicator">
                      <RiCheckLine /> Read
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              className="no-notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="empty-emoji">🔔</span>
              <p>No notifications yet</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NotificationPanel;
