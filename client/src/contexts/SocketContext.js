import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import axiosInstance from "../utils/axiosConfig";

const SocketContext = createContext();
let socketInstance = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [attemptingReconnect, setAttemptingReconnect] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [connectionError, setConnectionError] = useState(null);
  const { user } = useAuth();

  const getAuthToken = useCallback(async () => {
    try {
      let token = localStorage.getItem("token");

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const isExpired = Date.now() >= payload.exp * 1000;

          if (isExpired) {
            token = null;
          }
        } catch (err) {
          token = null;
        }
      }

      if (!token) {
        try {
          const response = await axiosInstance.post("/auth/refresh-token");
          if (response.data.token) {
            token = response.data.token;
            localStorage.setItem("token", token);
            localStorage.setItem("refreshToken", response.data.refreshToken);
          }
        } catch (refreshError) {
          throw new Error("Failed to refresh authentication token");
        }
      }

      if (!token) {
        throw new Error("No auth token available");
      }

      return token;
    } catch (error) {
      throw error;
    }
  }, []);

  const connectSocket = useCallback(async () => {
    try {
      if (socketInstance?.connected) {
        return;
      }

      let token;
      try {
        token = await getAuthToken();
      } catch (tokenError) {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          throw new Error("Maximum reconnection attempts reached");
        }

        setTimeout(() => {
          reconnectAttempts++;
          connectSocket();
        }, RECONNECT_DELAY * Math.pow(2, reconnectAttempts));
        return;
      }

      const socketUrl = process.env.REACT_APP_API_BASE_URL.replace(
        /\/api$/,
        ""
      );

      socketInstance = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket"],
        reconnection: false,
        withCredentials: true,
        auth: {
          token,
          userId: user._id,
        },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      socketInstance.on("connect", () => {
        setIsConnected(true);
      });

      socketInstance.on("disconnect", () => {
        setIsConnected(false);
      });

      socketInstance.io.on("reconnect_attempt", () => {
        setAttemptingReconnect(true);
      });

      socketInstance.io.on("reconnect", () => {
        setAttemptingReconnect(false);
      });

      socketInstance.on("initial_online_users", (users) => {
        const userMap = new Map();
        users.forEach((user) => {
          if (user.userId && user.userData) {
            userMap.set(user.userId, user.userData);
          }
        });
        setOnlineUsers(userMap);
      });

      socketInstance.on("user_connected", ({ userId, userData }) => {
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.set(userId, userData);
          return newMap;
        });
      });

      socketInstance.on("user_disconnected", (userId) => {
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      });
    } catch (error) {
      setConnectionError(error.message);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(() => {
          connectSocket();
        }, RECONNECT_DELAY);
      }
    }
  }, [user?._id, getAuthToken]);

  useEffect(() => {
    if (!user?._id) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
        setOnlineUsers(new Map());
        reconnectAttempts = 0;
      }
      return;
    }

    const initializeSocket = async () => {
      try {
        await connectSocket();
      } catch (error) {
        // Silent catch
      }
    };

    initializeSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
        setOnlineUsers(new Map());
        reconnectAttempts = 0;
      }
    };
  }, [user?._id, connectSocket]);

  const value = {
    socket: socketInstance,
    isConnected,
    attemptingReconnect,
    onlineUsers,
    connectionError,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketContext;
