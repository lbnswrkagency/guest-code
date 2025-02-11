import React from "react";
import { Link } from "react-router-dom";
import "./Footer.scss";

const Footer = () => {
  return (
    <footer className="home-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>GuestCode</h4>
          <p>The Future of Event Management</p>
        </div>
        <div className="footer-section">
          <h4>Links</h4>
          <Link to="/register">Sign Up</Link>
          <Link to="/login">Login</Link>
        </div>
        <div className="footer-section">
          <h4>Contact</h4>
          <a href="mailto:info@guest-code.com">info@guest-code.com</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} GuestCode. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
