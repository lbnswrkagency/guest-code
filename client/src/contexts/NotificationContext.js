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
      return;
    }

    try {
      const response = await axiosInstance.get(
        `/notifications/user/${user._id}`
      );

      setNotifications(response.data);
      setUnreadCount(response.data.filter((n) => !n.read).length);
    } catch (error) {
      // Silent error
    }
  }, [user?._id]);

  useEffect(() => {
    if (!socket) return;

    socket.on("new_notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on("notification_updated", (updatedNotification) => {
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
      await axiosInstance.put(`/notifications/${notificationId}/read`);

      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      // Silent error
    }
  };

  const clearAll = async () => {
    try {
      await axiosInstance.delete(`/notifications/user/${user._id}/all`);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      // Silent error
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
