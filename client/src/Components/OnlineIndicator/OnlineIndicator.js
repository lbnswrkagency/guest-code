import React from "react";
import { useSocket } from "../../contexts/SocketContext";
import "./OnlineIndicator.scss";

const OnlineIndicator = ({ userId, size = "medium", className = "" }) => {
  const { isConnected, onlineUsers } = useSocket();

  // If no userId is provided, use the connection status directly
  const isOnline = userId ? onlineUsers.has(userId) : isConnected;

  const sizeClasses = {
    small: "size-small",
    medium: "size-medium",
    large: "size-large",
  };

  return (
    <div
      className={`online-indicator ${sizeClasses[size]} ${
        isOnline ? "online" : "offline"
      } ${className}`}
      title={isOnline ? "Online" : "Offline"}
    />
  );
};

export default OnlineIndicator;
