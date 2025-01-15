import React from "react";
import "./Loader.scss";

const Loader = () => {
  return (
    <div className="loader-container">
      <div className="loader">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    </div>
  );
};

export default Loader;
