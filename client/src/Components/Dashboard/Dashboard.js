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

const Dashboard = () => {
  const { user, setUser, loading } = useContext(AuthContext);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendsCode, setShowFriendsCode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
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

    if (user.isAdmin) {
      fetchCounts();
    }
  }, [user.isAdmin]);
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

  if (showScanner) {
    return <Scanner user={user} />;
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
        {user.isAdmin && (
          <div className="dashboard-count">
            <h2>FriendsCodes</h2>
            {counts.friendsCounts.map((count) => (
              <div key={count._id} className="dashboard-count-each">
                {" "}
                <p className="dashboard-count-each-name">{count._id}</p>
                <p className="dashboard-count-each-number">{count.total}</p>
              </div>
            ))}
            <h2>GuestCodes</h2>
            <div className="dashboard-count-each">
              <p className="dashboard-count-each-name">Total</p>
              <p className="dashboard-count-each-number">
                {counts.guestCounts.total}
              </p>
            </div>
            <div className="dashboard-count-each">
              <p className="dashboard-count-each-name">Used</p>
              <p className="dashboard-count-each-number">
                {counts.guestCounts.used}
              </p>
            </div>
          </div>
        )}
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
            onClick={() => setShowScanner(true)}
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
