// Navigation.js
import React from "react";
import "./Navigation.scss";
import { Link } from "react-router-dom";

const Navigation = ({ onBack }) => {
  return (
    <div className="navigation">
      <div className="login-back-arrow" onClick={onBack}>
        <img src="/image/back-icon.svg" alt="Back" />
      </div>

      <Link to="/inbox">
        <img src="/image/inbox.svg" alt="Inbox" className="navigation-inbox" />
      </Link>

      <h1 className="navigation-title">Member Area</h1>

      <img
        src="/image/bell.svg"
        alt="Notifications"
        className="navigation-bell"
      />

      <img src="/image/menu.svg" alt="Menu" className="navigation-menu" />
    </div>
  );
};

export default Navigation;
