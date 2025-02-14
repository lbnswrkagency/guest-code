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

// Debug logging utility
const debugLog = (area, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[Socket:${area}] ${message}`;
  if (data) {
    console.log(logMessage, { ...data, timestamp });
  } else {
    console.log(logMessage, { timestamp });
  }
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [connectionError, setConnectionError] = useState(null);
  const { user } = useAuth();

  const getAuthToken = useCallback(async () => {
    try {
      debugLog("Auth", "Attempting to get auth token");

      // First try to get from localStorage
      let token = localStorage.getItem("token");

      // If token exists, verify if it's expired
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const isExpired = Date.now() >= payload.exp * 1000;

          if (isExpired) {
            debugLog("Auth", "Token is expired, attempting to refresh");
            token = null; // Force refresh
          }
        } catch (err) {
          debugLog("Auth", "Error parsing token, will attempt refresh", {
            error: err.message,
          });
          token = null; // Force refresh
        }
      }

      // If no valid token, try to refresh it
      if (!token) {
        debugLog("Auth", "No valid token, attempting to refresh");
        try {
          const response = await axiosInstance.post("/auth/refresh-token");
          debugLog("Auth", "Refresh token response received", {
            status: response.status,
            hasToken: !!response.data.token,
            tokenLength: response.data.token?.length,
          });

          if (response.data.token) {
            token = response.data.token;
            localStorage.setItem("token", token);
            localStorage.setItem("refreshToken", response.data.refreshToken);
            debugLog("Auth", "Successfully refreshed and stored tokens", {
              tokenLength: token.length,
              refreshTokenLength: response.data.refreshToken.length,
            });
          } else {
            debugLog("Auth", "No token in refresh response", {
              responseData: response.data,
            });
          }
        } catch (refreshError) {
          debugLog("Auth", "Failed to refresh token", {
            error: refreshError.message,
            response: refreshError.response?.data,
          });
          throw new Error("Failed to refresh authentication token");
        }
      }

      if (!token) {
        debugLog("Auth", "No token available after refresh attempt", {
          availableKeys: Object.keys(localStorage),
        });
        throw new Error("No auth token available");
      }

      debugLog("Auth", "Successfully retrieved token", {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + "...",
      });
      return token;
    } catch (error) {
      debugLog("Auth", "Error getting auth token", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }, []);

  const connectSocket = useCallback(async () => {
    try {
      if (socketInstance?.connected) {
        debugLog(
          "Connection",
          "Already connected, skipping connection attempt",
          {
            socketId: socketInstance.id,
          }
        );
        return;
      }

      debugLog("Connection", "Starting connection process", {
        userId: user?._id,
        reconnectAttempt: reconnectAttempts + 1,
      });

      let token;
      try {
        token = await getAuthToken();
      } catch (tokenError) {
        debugLog("Connection", "Failed to get token", {
          error: tokenError.message,
        });

        // If we've reached max attempts, throw the error
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          throw new Error("Maximum reconnection attempts reached");
        }

        // Otherwise schedule a retry
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

      debugLog("Connection", "Initializing socket with config", {
        socketUrl,
        userId: user._id,
        hasToken: !!token,
      });

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

      // Connection events
      socketInstance.on("connect", () => {
        debugLog("Event", "Connected successfully", {
          socketId: socketInstance.id,
          userId: user._id,
        });
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts = 0;

        socketInstance.emit("user_online", { userId: user._id });
      });

      socketInstance.on("disconnect", (reason) => {
        debugLog("Event", "Disconnected", {
          reason,
          socketId: socketInstance?.id,
          userId: user._id,
        });
        setIsConnected(false);
        setOnlineUsers(new Map());
      });

      socketInstance.on("connect_error", async (error) => {
        debugLog("Error", "Connection error occurred", {
          error: error.message,
          socketId: socketInstance?.id,
          userId: user._id,
          attempt: reconnectAttempts + 1,
        });

        setIsConnected(false);
        setConnectionError(error.message);

        if (socketInstance) {
          debugLog("Cleanup", "Cleaning up failed socket instance");
          socketInstance.disconnect();
          socketInstance = null;
        }

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);

          debugLog("Reconnect", "Scheduling reconnection attempt", {
            attempt: reconnectAttempts,
            delay,
            maxAttempts: MAX_RECONNECT_ATTEMPTS,
          });

          setTimeout(async () => {
            try {
              debugLog("Reconnect", "Executing reconnection attempt", {
                attempt: reconnectAttempts,
              });
              await connectSocket();
            } catch (error) {
              debugLog("Reconnect", "Reconnection attempt failed", {
                error: error.message,
                attempt: reconnectAttempts,
              });
            }
          }, delay);
        } else {
          debugLog("Error", "Max reconnection attempts reached", {
            attempts: reconnectAttempts,
          });
          setConnectionError(
            "Maximum reconnection attempts reached. Please refresh the page."
          );
        }
      });

      // User status events
      socketInstance.on("initial_online_users", (users) => {
        debugLog("Users", "Received initial online users", {
          count: users.length,
          userIds: users.map((u) => u.userId),
        });

        const userMap = new Map();
        users.forEach((user) => {
          if (user.userId && user.userData) {
            userMap.set(user.userId, user.userData);
          }
        });
        setOnlineUsers(userMap);
      });

      socketInstance.on("user_connected", ({ userId, userData }) => {
        debugLog("Users", "User connected", { userId });
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.set(userId, userData);
          return newMap;
        });
      });

      socketInstance.on("user_disconnected", (userId) => {
        debugLog("Users", "User disconnected", { userId });
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      });

      // Add handlers for socket middleware events
      socketInstance.on("error", (error) => {
        debugLog("Error", "Socket error event received", {
          error,
          socketId: socketInstance?.id,
        });
      });

      socketInstance.on("auth_error", (error) => {
        debugLog("Auth", "Authentication error received", {
          error,
          socketId: socketInstance?.id,
        });
      });
    } catch (error) {
      debugLog("Error", "Socket setup failed", {
        error: error.message,
        stack: error.stack,
      });
      setConnectionError(error.message);

      // Don't throw the error, just log it and let the reconnection handle it
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(() => {
          connectSocket();
        }, RECONNECT_DELAY);
      }
    }
  }, [user?._id, getAuthToken]);

  useEffect(() => {
    if (!user?._id) {
      debugLog("Lifecycle", "No user ID available, skipping connection");
      if (socketInstance) {
        debugLog(
          "Lifecycle",
          "Cleaning up existing socket due to user logout",
          {
            socketId: socketInstance.id,
          }
        );
        socketInstance.disconnect();
        socketInstance = null;
        setIsConnected(false);
        setOnlineUsers(new Map());
        reconnectAttempts = 0;
      }
      return;
    }

    debugLog("Lifecycle", "User ID available, initiating connection", {
      userId: user._id,
      hasExistingSocket: !!socketInstance,
      isConnected: socketInstance?.connected,
    });

    // Wrap the connectSocket call to prevent uncaught promise rejection
    const initializeSocket = async () => {
      try {
        await connectSocket();
      } catch (error) {
        debugLog("Lifecycle", "Failed to initialize socket", {
          error: error.message,
          userId: user._id,
        });
      }
    };

    initializeSocket();

    return () => {
      if (socketInstance) {
        debugLog("Lifecycle", "Cleaning up socket connection", {
          socketId: socketInstance.id,
          userId: user._id,
          reason: "Component unmount",
        });
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
    onlineUsers,
    connectionError,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketContext;
