// Dashboard.js
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import { logout } from "../AuthForm/Login/LoginFunction";
import "./Dashboard.scss";

const Dashboard = () => {
  const { user, setUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Clear user data and token
    setUser(null); // Set the user state to null
    navigate("/"); // Redirect to the home page
  };

  if (loading || !user) {
    return <p>Loading...</p>;
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
        <button className="event-button" onClick={() => navigate("/events")}>
          Events
        </button>
        <button className="settings-button" onClick={() => {}}>
          Settings
        </button>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
