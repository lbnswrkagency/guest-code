// Navigation.js
import React from "react";
import "./Navigation.scss";
import { Link } from "react-router-dom";
import { RiArrowLeftSLine, RiMailLine, RiMenuLine } from "react-icons/ri";
import NotificationPanel from "../NotificationPanel/NotificationPanel";
import { useNotificationDot } from "../../hooks/useNotificationDot";

const Navigation = ({ onBack, onMenuClick }) => {
  const hasMessages = useNotificationDot("message");
  const hasNotifications = useNotificationDot();

  return (
    <div className="navigation">
      <Link
        to="/inbox"
        className={`nav-icon-wrapper ${hasMessages ? "has-notification" : ""}`}
      >
        <RiMailLine className="icon" />
      </Link>

      <div
        className={`nav-icon-wrapper ${
          hasNotifications ? "has-notification" : ""
        }`}
      >
        <NotificationPanel />
      </div>

      <div className="nav-icon-wrapper" onClick={onMenuClick}>
        <RiMenuLine className="icon" />
      </div>
    </div>
  );
};

export default Navigation;
