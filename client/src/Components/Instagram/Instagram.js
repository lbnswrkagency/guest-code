import React from "react";
import "./Instagram.scss";

function Instagram() {
  const handleInstagramClick = () => {
    window.open("https://www.instagram.com/afrospiti/", "_blank");
  };

  return (
    <div className="instagram">
      <div className="instagram-container">
        <h1 className="instagram-container-title">@AFROSPITI</h1>
        <img
          src="https://guest-code.s3.eu-north-1.amazonaws.com/server/instagram.svg"
          alt="Instagram Icon"
          className="instagram-container-svg"
        />
        <p className="instagram-container-text">
          This Sunday, every Sunday.
          <br />
          Afro Beats & Bites.
          <br />8 PM
        </p>
        <button
          className="instagram-container-button"
          onClick={handleInstagramClick}
        >
          FOLLOW US ON INSTAGRAM
        </button>
      </div>
    </div>
  );
}

export default Instagram;
