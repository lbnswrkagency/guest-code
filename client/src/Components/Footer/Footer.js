import React from "react";
import "./Footer.scss";

export default function Footer() {
  return (
    <div className="footer">
      <h2 className="footer-title">Socials</h2>

      <div className="footer-links">
        <a href="" className="footer-link">
          <img src="/image/tiktok.svg" alt="" className="footer-link-image" />
        </a>
        <a href="" className="footer-link">
          <img
            src="/image/instagram.svg"
            alt=""
            className="footer-link-image"
          />
        </a>
        <a href="" className="footer-link">
          <img src="/image/facebook.svg" alt="" className="footer-link-image" />
        </a>
      </div>
    </div>
  );
}
