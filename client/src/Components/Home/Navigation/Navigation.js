import React from "react";
import { Link } from "react-router-dom";
import "./Navigation.scss";

const Navigation = () => {
  return (
    <nav className="home-navigation">
      <div className="nav-content">
        <Link to="/" className="nav-logo">
          GuestCode
        </Link>
        <div className="nav-links">
          <Link to="/register" className="nav-link">
            Sign Up
          </Link>
          <Link to="/login" className="nav-link">
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
