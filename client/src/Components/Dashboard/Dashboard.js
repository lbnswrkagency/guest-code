// Dashboard.js
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import { logout } from "../AuthForm/Login/LoginFunction";
import "./Dashboard.scss";
import Settings from "../Settings/Settings";
import FriendsCode from "../FriendsCode/FriendsCode";
import Scanner from "../Scanner/Scanner";
import axios from "axios";
import Statistic from "../Statistic/Statistic";

const Dashboard = () => {
  const { user, setUser, loading } = useContext(AuthContext);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendsCode, setShowFriendsCode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showStatistic, setShowStatistic] = useState(false);
  const [counts, setCounts] = useState({
    friendsCounts: [],
    guestCounts: { total: 0, used: 0 },
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/qr/counts`
        );
        setCounts(response.data);
      } catch (error) {
        console.error("Error fetching counts", error);
      }
    };

    // Ensure user is not null and has isAdmin property before fetching
    if (user && user.isAdmin) {
      fetchCounts();
    }
  }, [user]); // Depend on user object

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  if (loading || !user) {
    return <p>Loading...</p>;
  }

  if (showFriendsCode) {
    return (
      <FriendsCode user={user} onClose={() => setShowFriendsCode(false)} />
    );
  }

  if (showScanner) {
    return <Scanner user={user} onClose={() => setShowScanner(false)} />;
  }

  if (showStatistic) {
    return (
      <Statistic
        user={user}
        counts={counts}
        onClose={() => setShowStatistic(false)}
      />
    );
  }

  if (showSettings) {
    return <Settings />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-header-title">Dashboard</h1>
        <div className="user-info">
          {/* <img
            src="https://via.placeholder.com/50"
            alt="Profile"
            className="dashboard-header-picture"
          /> */}
          <p className="dashboard-header-name">{user.name}</p>
          <p className="dashboard-header-email">{user.email}</p>
        </div>
      </div>
      <div className="dashboard-actions">
        {user.isAdmin && (
          <>
            <button
              className="dashboard-actions-button"
              onClick={() => navigate("/events")}
            >
              Events
            </button>
            <button
              className="dashboard-actions-button"
              onClick={() => setShowStatistic(true)}
            >
              Statistic
            </button>
            <button
              className="dashboard-actions-button"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
          </>
        )}

        {user.isPromoter && (
          <button
            className="dashboard-actions-button"
            onClick={() => setShowFriendsCode(true)}
          >
            Friends Code
          </button>
        )}
        {user.isScanner && (
          <button
            className="dashboard-actions-button"
            onClick={() => setShowScanner(true)}
          >
            Scanner
          </button>
        )}
        <button
          className="dashboard-actions-button-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
