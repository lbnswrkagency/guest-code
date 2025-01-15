import React, { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";
import axios from "axios";
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
  const { getNewToken, user } = useAuth();

  const axiosWithAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("[Auth] No token found");
      throw new Error("No authentication token");
    }

    return axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });
  };

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
    });

    return () => {
      if (socket) {
        socket.off("new_notification");
        socket.off("notification_updated");
      }
    };
  }, [socket]);

  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
    }
  }, [user?._id]);

  const markAsRead = async (notificationId) => {
    try {
      const api = await axiosWithAuth();
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          await getNewToken();
          const api = await axiosWithAuth();
          await api.put(`/notifications/${notificationId}/read`);
          setNotifications((prev) =>
            prev.map((n) =>
              n._id === notificationId ? { ...n, read: true } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (retryError) {
          console.error("Error marking notification as read:", retryError);
        }
      } else {
        console.error("Error marking notification as read:", error);
      }
    }
  };

  const clearAll = async () => {
    try {
      await Promise.all(
        notifications.map((n) =>
          axios.delete(
            `${process.env.REACT_APP_API_BASE_URL}/notifications/${n._id}`
          )
        )
      );
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  };

  const fetchNotifications = async () => {
    if (user?._id) {
      try {
        const api = await axiosWithAuth();
        const response = await api.get(`/notifications/user/${user._id}`);
        setNotifications(response.data);
        setUnreadCount(response.data.filter((n) => !n.read).length);
      } catch (error) {
        console.error("[Notification] Error fetching:", error.message);
      }
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    setNotifications,
    setUnreadCount,
    clearAll,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
