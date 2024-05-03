// Navigation.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./Navigation.scss";

const Navigation = () => {
  const navigate = useNavigate();

  return (
    <div className="navigation">
      <div className="login-back-arrow" onClick={() => navigate("/")}>
        <img src="/image/back-icon.svg" alt="" />
      </div>

      <img src="/image/inbox.svg" alt="" className="navigation-inbox" />

      <h1 className="navigation-title">Member Area</h1>

      <img src="/image/bell.svg" alt="" className="navigation-bell" />

      <img src="/image/menu.svg" alt="" className="navigation-menu" />

      {/* <img className="logo" src="/image/logo.svg" alt="" /> */}
    </div>
  );
};

export default Navigation;
