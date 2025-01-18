// Navigation.js
import React from "react";
import "./Navigation.scss";
import { RiArrowLeftSLine, RiMailLine, RiMenuLine } from "react-icons/ri";
import NotificationPanel from "../NotificationPanel/NotificationPanel";
import { useNotificationDot } from "../../hooks/useNotificationDot";

const Navigation = ({ onBack, onMenuClick }) => {
  const hasMessages = useNotificationDot("message");
  const hasNotifications = useNotificationDot();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="navigation">
      {/* Message icon commented out for later */}
      {/* <div
        className={`nav-icon-wrapper ${hasMessages ? "has-notification" : ""}`}
        onClick={handleClick}
      >
        <RiMailLine className="icon" />
      </div> */}

      {/* Back arrow button */}
      <div className="nav-icon-wrapper" onClick={onBack}>
        <RiArrowLeftSLine className="icon" />
      </div>

      <div
        className={`nav-icon-wrapper ${
          hasNotifications ? "has-notification" : ""
        }`}
        onClick={handleClick}
      >
        <NotificationPanel />
      </div>

      <div className="nav-icon-wrapper" onClick={handleClick}>
        <RiMenuLine className="icon" />
      </div>
    </div>
  );
};

export default Navigation;
