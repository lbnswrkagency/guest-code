// Navigation.js
import React, { useState } from "react";
import "./Navigation.scss";
import {
  RiArrowLeftSLine,
  RiMailLine,
  RiMenuLine,
  RiBellLine,
} from "react-icons/ri";
import NotificationPanel from "../NotificationPanel/NotificationPanel";
import { useNotificationDot } from "../../hooks/useNotificationDot";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../contexts/NotificationContext";

const Navigation = ({ onBack, onMenuClick }) => {
  const navigate = useNavigate();
  const hasMessages = useNotificationDot("message");
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="navigation">
      {/* Back arrow button */}
      <div className="nav-icon-wrapper" onClick={onBack}>
        <RiArrowLeftSLine className="icon" />
      </div>

      {/* Messages/Inbox */}
      <div
        className={`nav-icon-wrapper ${hasMessages ? "has-notification" : ""}`}
        onClick={() => navigate("/inbox")}
      >
        <RiMailLine className="icon" />
      </div>

      {/* Notifications */}
      <div
        className={`nav-icon-wrapper ${
          unreadCount > 0 ? "has-notification" : ""
        }`}
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <RiBellLine className="icon" />
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount}</span>
        )}
        {showNotifications && (
          <NotificationPanel onClose={() => setShowNotifications(false)} />
        )}
      </div>

      {/* Menu */}
      <div className="nav-icon-wrapper" onClick={onMenuClick}>
        <RiMenuLine className="icon" />
      </div>
    </div>
  );
};

export default Navigation;
