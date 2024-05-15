import React from "react";
import "./Footer.scss";

export default function Footer() {
  return (
    <div className="footer">
      <h2 className="footer-title">Socials</h2>

      <div className="footer-links">
        <a
          href="https://www.tiktok.com/@afrospiti"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          <img
            src="/image/tiktok.svg"
            alt="TikTok"
            className="footer-link-image"
          />
        </a>
        <a
          href="https://www.instagram.com/afrospiti/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          <img
            src="/image/instagram.svg"
            alt="Instagram"
            className="footer-link-image"
          />
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=61552703249997"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          <img
            src="/image/facebook.svg"
            alt="Facebook"
            className="footer-link-image"
          />
        </a>
      </div>
    </div>
  );
}
