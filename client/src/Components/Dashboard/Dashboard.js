// Dashboard.js
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import { logout } from "../AuthForm/Login/LoginFunction";
import "./Dashboard.scss";
import Settings from "../Settings/Settings";
import FriendsCode from "../FriendsCode/FriendsCode";

const Dashboard = () => {
  const { user, setUser, loading } = useContext(AuthContext);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendsCode, setShowFriendsCode] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  if (loading || !user) {
    return <p>Loading...</p>;
  }

  if (showFriendsCode) {
    return <FriendsCode user={user} />;
  }

  if (showSettings) {
    return <Settings />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="user-info">
          <img
            src="https://via.placeholder.com/50"
            alt="Profile"
            className="profile-picture"
          />
          <p>{user.name}</p>
          <p>{user.email}</p>
        </div>
      </div>
      <div className="dashboard-actions">
        {user.isAdmin && (
          <>
            <button
              className="event-button"
              onClick={() => navigate("/events")}
            >
              Events
            </button>
            <button
              className="settings-button"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
          </>
        )}
        {user.isPromoter && (
          <button
            className="friends-code-button"
            onClick={() => setShowFriendsCode(true)}
          >
            Friends Code
          </button>
        )}
        {user.isScanner && (
          <button
            className="scanner-button"
            onClick={() => navigate("/scanner")}
          >
            Scanner
          </button>
        )}
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
