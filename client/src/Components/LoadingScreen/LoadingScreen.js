import React from "react";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import "./LoadingScreen.scss";

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <LoadingSpinner size="large" color="primary" />
        <p>Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
