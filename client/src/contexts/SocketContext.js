import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import io from "socket.io-client";
import { getToken } from "../utils/authUtils";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // Using Map to store user details
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (!user?._id) {
      console.log("[Socket] No user, skipping connection");
      return;
    }

    let socketInstance;

    const connectSocket = async () => {
      try {
        const token = await getToken();
        console.log(
          "[Socket:Setup] Starting connection with token:",
          token.substring(0, 20) + "..."
        );
        const socketUrl = process.env.REACT_APP_API_BASE_URL.replace(
          /\/api$/,
          ""
        );
        console.log("[Socket:Setup] Connecting to:", socketUrl);

        socketInstance = io(socketUrl, {
          query: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
          auth: {
            token,
          },
        });

        console.log("[Socket:Setup] Socket instance created");

        // Connection events
        socketInstance.on("connect", () => {
          console.log("[Socket] Connected successfully");
          setIsConnected(true);
          setConnectionError(null);
        });

        socketInstance.on("disconnect", () => {
          console.log("[Socket] Disconnected");
          setIsConnected(false);
        });

        socketInstance.on("connect_error", (error) => {
          console.error("[Socket:Error] Connection error:", error.message);

          if (
            error.message.includes("Token expired") ||
            error.message.includes("Authentication failed")
          ) {
            socketInstance.disconnect();
            socketInstance.close();
          }

          setIsConnected(false);
          setConnectionError(error.message);
        });

        // User status events
        socketInstance.on("initial_online_users", (users) => {
          console.log("[Socket] Received initial online users:", users);
          const userMap = new Map();
          users.forEach((user) => {
            if (user.userId && user.userData) {
              userMap.set(user.userId, user.userData);
            }
          });
          setOnlineUsers(userMap);
        });

        socketInstance.on("user_status", ({ userId, status, userData }) => {
          console.log("[Socket] User status update:", {
            userId,
            status,
            userData,
          });
          setOnlineUsers((prev) => {
            const newUsers = new Map(prev);
            if (status === "online" && userData) {
              newUsers.set(userId, userData);
            } else if (status === "offline") {
              newUsers.delete(userId);
            }
            return newUsers;
          });
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error("[Socket] Setup error:", error);
        setConnectionError(error.message);
      }
    };

    connectSocket();

    return () => {
      if (socketInstance) {
        console.log("[Socket] Cleaning up connection");
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers(new Map());
      }
    };
  }, [user?._id]);

  const value = {
    socket,
    isConnected,
    connectionError,
    onlineUsers: Array.from(onlineUsers.values()),
    isUserOnline: useCallback(
      (userId) => onlineUsers.has(userId),
      [onlineUsers]
    ),
    getOnlineCount: useCallback(() => onlineUsers.size, [onlineUsers]),
    getCurrentUserStatus: useCallback(() => isConnected, [isConnected]),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketContext;
