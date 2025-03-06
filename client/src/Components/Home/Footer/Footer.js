import React from "react";
import { Link } from "react-router-dom";
import "./Footer.scss";

const Footer = () => {
  return (
    <footer className="home-footer">
      {/* <div className="footer-content">
        <div className="footer-section">
          <h4>GuestCode</h4>
          <p>The Future of Event Management</p>
        </div>
        <div className="footer-section">
          <h4>Links</h4>
          <div className="footer-links">
            <Link to="/register">Sign Up</Link>
            <Link to="/login">Login</Link>
          </div>
        </div>
        <div className="footer-section">
          <h4>Contact</h4>
          <a href="mailto:info@guest-code.com">info@guest-code.com</a>
        </div>
      </div> */}
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} GuestCode</p>
      </div>
    </footer>
  );
};

export default Footer;
