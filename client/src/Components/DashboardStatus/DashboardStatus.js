// DashboardStatus.js
import React from "react";
import "./DashboardStatus.scss";

const DashboardStatus = () => {
  return (
    <div className="statusDashboard">
      <div className="statusDashboard-point">
        <span className="statusDashboard-point-wrapper">
          <img
            className="statusDashboard-point-wrapper-icon"
            src="/image/status-calender.svg"
            alt="Calendar Icon"
          />
          <p className="statusDashboard-point-wrapper-name">Events</p>
        </span>
        <p className="statusDashboard-point-value">12</p>
      </div>

      <div className="statusDashboard-point">
        <span className="statusDashboard-point-wrapper">
          <img
            className="statusDashboard-point-wrapper-icon"
            src="/image/status-tickets.svg"
            alt="Tickets Icon"
          />
          <p className="statusDashboard-point-wrapper-name">Tickets</p>
        </span>
        <p className="statusDashboard-point-value">110</p>
      </div>

      <div className="statusDashboard-point">
        <span className="statusDashboard-point-wrapper">
          <img
            className="statusDashboard-point-wrapper-icon"
            src="/image/status-codes.svg"
            alt="Codes Icon"
          />
          <p className="statusDashboard-point-wrapper-name">Codes</p>
        </span>
        <p className="statusDashboard-point-value">320</p>
      </div>
    </div>
  );
};

export default DashboardStatus;
