import React from "react";
import "./UnderConstruction.scss";

const UnderConstruction = () => {
  return (
    <div className="under-construction-overlay">
      <div className="under-construction-content">
        <div className="icon-container">
          <i className="fas fa-hard-hat"></i>
          <i className="fas fa-tools"></i>
        </div>
        <h1>Under Construction</h1>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default UnderConstruction;
