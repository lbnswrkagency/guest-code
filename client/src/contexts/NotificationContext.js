import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useSocket } from "./SocketContext";
import axiosInstance from "../utils/axiosConfig";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user?._id) {
      console.log("[Notification] No user ID available, skipping fetch");
      return;
    }

    try {
      console.log("[Notification] Fetching notifications for user:", user._id);
      const response = await axiosInstance.get(
        `/notifications/user/${user._id}`
      );
      console.log(
        "[Notification] Fetched notifications:",
        response.data.length
      );

      setNotifications(response.data);
      setUnreadCount(response.data.filter((n) => !n.read).length);
    } catch (error) {
      console.error("[Notification] Error fetching:", error.message);
    }
  }, [user?._id]);

  useEffect(() => {
    if (!socket) return;

    console.log("[Notification] Setting up socket listeners");

    socket.on("new_notification", (notification) => {
      console.log(
        "[Notification] Received new notification:",
        notification._id
      );
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on("notification_updated", (updatedNotification) => {
      console.log(
        "[Notification] Notification updated:",
        updatedNotification._id
      );
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === updatedNotification._id ? updatedNotification : notif
        )
      );
      if (updatedNotification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    socket.on("notification_deleted", (notificationId) => {
      console.log("[Notification] Notification deleted:", notificationId);
      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId)
      );
      setNotifications((prev) => {
        const newUnreadCount = prev.filter((n) => !n.read).length;
        setUnreadCount(newUnreadCount);
        return prev;
      });
    });

    return () => {
      console.log("[Notification] Cleaning up socket listeners");
      socket.off("new_notification");
      socket.off("notification_updated");
      socket.off("notification_deleted");
    };
  }, [socket]);

  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
    }
  }, [user?._id, fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      console.log("[Notification] Marking as read:", notificationId);
      await axiosInstance.put(`/notifications/${notificationId}/read`);

      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("[Notification] Error marking as read:", error.message);
    }
  };

  const clearAll = async () => {
    try {
      console.log("[Notification] Clearing all notifications");
      await axiosInstance.delete(`/notifications/user/${user._id}/all`);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error(
        "[Notification] Error clearing notifications:",
        error.message
      );
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
