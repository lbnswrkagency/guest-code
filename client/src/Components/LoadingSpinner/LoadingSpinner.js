import React from "react";
import "./LoadingSpinner.scss";

const LoadingSpinner = ({ size = "medium", color = "primary" }) => (
  <div className={`loading-spinner ${size} ${color}`}>
    <div className="spinner"></div>
  </div>
);

export default LoadingSpinner;
