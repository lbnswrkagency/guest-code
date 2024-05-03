// DashboardMenu.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardMenu.scss";

const DashboardMenu = ({
  user,
  setShowSettings,
  setShowStatistic,
  setShowScanner,
  setShowDropFiles,
  setCodeType,
}) => {
  const navigate = useNavigate();

  return (
    <div className="menuDashboard">
      {user.isDeveloper && (
        <div className="menuDashboard-button">
          <button onClick={() => navigate("/events")}>
            <img
              src="/image/event-icon.svg"
              alt=""
              className="menuDashboard-button-icon"
            />
          </button>
          <p className="menuDashboard-button-title">Events</p>
        </div>
      )}

      {user.isAdmin && (
        <div className="menuDashboard-button">
          <button onClick={() => setShowStatistic(true)}>
            <img
              src="/image/event-icon.svg"
              alt=""
              className="menuDashboard-button-icon"
            />
          </button>
          <p className="menuDashboard-button-title">Statistic</p>
        </div>
      )}

      {(user.isAdmin || user.isBackstage) && (
        <div className="menuDashboard-button">
          <button onClick={() => setCodeType("Backstage")}>
            <img
              src="/image/event-icon.svg"
              alt=""
              className="menuDashboard-button-icon"
            />
          </button>
          <p className="menuDashboard-button-title">Backstage Code</p>
        </div>
      )}

      {(user.isAdmin || user.isTable) && (
        <div className="menuDashboard-button">
          <button onClick={() => setCodeType("Table")}>
            <img
              src="/image/table-icon.svg"
              alt=""
              className="menuDashboard-button-icon"
            />
          </button>
          <p className="menuDashboard-button-title">Table Code</p>
        </div>
      )}

      {user.isPromoter && (
        <div className="menuDashboard-button">
          <button onClick={() => setCodeType("Friends")}>
            <img
              src="/image/friends-icon.svg"
              alt=""
              className="menuDashboard-button-icon"
            />
          </button>
          <p className="menuDashboard-button-title">Friends Code</p>
        </div>
      )}

      {user.isAdmin && (
        <div className="menuDashboard-button">
          <button onClick={() => setShowDropFiles(true)}>
            <img
              src="/image/dropped-icon.svg"
              alt=""
              className="menuDashboard-button-icon"
            />
          </button>
          <p className="menuDashboard-button-title">Dropped Files</p>
        </div>
      )}

      {user.isScanner && (
        <div className="menuDashboard-button">
          <button onClick={() => setShowScanner(true)}>
            <img
              src="/image/scanner-icon.svg"
              alt=""
              className="menuDashboard-button-icon"
            />
          </button>
          <p className="menuDashboard-button-title">Scanner</p>
        </div>
      )}
    </div>
  );
};

export default DashboardMenu;
