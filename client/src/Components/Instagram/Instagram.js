import React from "react";
import "./Instagram.scss";

function Instagram() {
  const handleInstagramClick = () => {
    window.open("https://www.instagram.com/afrospiti/", "_blank");
  };

  const handleTikTokClick = () => {
    window.open("https://www.tiktok.com/@afrospiti/", "_blank");
  };

  return (
    <div className="instagram">
      <h1 className="instagram-title">@AFROSPITI</h1>
      <img
        src="./image/ig.svg"
        alt="Instagram Icon"
        className="instagram-image"
      />
      <div className="instagram-button">
        <button
          className="instagram-button-instagram"
          onClick={handleInstagramClick}
        >
          <img src="./image/ig_button.svg" alt="" />

          <p> Follow on Instagram </p>
        </button>
        <button className="instagram-button-tiktok" onClick={handleTikTokClick}>
          <img src="./image/tiktok_button.svg" alt="" />

          <p> Follow on TikTok</p>
        </button>
      </div>
    </div>
  );
}

export default Instagram;
