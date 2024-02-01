// Dashboard.js
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import { logout } from "../AuthForm/Login/LoginFunction";
import "./Dashboard.scss";
import Settings from "../Settings/Settings";
import FriendsCode from "../FriendsCode/FriendsCode";
import BackstageCode from "../BackstageCode/BackstageCode";
import Scanner from "../Scanner/Scanner";
import axios from "axios";
import Statistic from "../Statistic/Statistic";
import moment from "moment";
import AvatarUpload from "../AvatarUpload/index";
import { useCurrentEvent } from "../CurrentEvent/CurrentEvent";
import CodeGenerator from "../CodeGenerator/CodeGenerator";

const Dashboard = () => {
  const { user, setUser, loading } = useContext(AuthContext);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendsCode, setShowFriendsCode] = useState(false);
  const [showBackstageCode, setShowBackstageCode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showStatistic, setShowStatistic] = useState(false);
  const [codeType, setCodeType] = useState("");
  const [imageSwitch, setImageSwitch] = useState(false);
  const [counts, setCounts] = useState({
    friendsCounts: [],
    backstageCounts: [],
    guestCounts: { total: 0, used: 0 },
  });
  const {
    startingEventDate,
    currentEventDate,
    dataInterval,
    handlePrevWeek,
    handleNextWeek,
  } = useCurrentEvent();

  const navigate = useNavigate();

  const getThisWeeksFriendsCount = () => {
    const filteredFriendsCounts = counts.friendsCounts.filter((count) => {
      return count._id === user.name;
    });

    const totalFriendsCount = filteredFriendsCounts.reduce(
      (acc, curr) => acc + curr.total,
      0
    );

    return totalFriendsCount;
  };

  const getThisWeeksBackstageCount = () => {
    // Use user.name for comparison as per your current requirement
    const filteredCounts = counts.backstageCounts.filter((count) => {
      return count._id === user.name; // Make sure this comparison is correct as per your data
    });

    const total = filteredCounts.reduce((acc, curr) => acc + curr.total, 0);

    return total;
  };

  const fetchCounts = async () => {
    try {
      const { startDate, endDate } = dataInterval;

      let params = {};

      if (startDate) {
        params.startDate = startDate.format("YYYY-MM-DD");
      }
      params.endDate = endDate.format("YYYY-MM-DD");

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/qr/counts`,
        { params }
      );

      setCounts(response.data);
    } catch (error) {
      console.error("Error fetching counts", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCounts();
    }
  }, [currentEventDate, user]); // Depend on user object and dataInterval

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  const refreshCounts = () => {
    fetchCounts();
  };

  if (loading || !user) {
    return <p>Loading...</p>;
  }

  if (showFriendsCode) {
    return (
      <FriendsCode
        user={user}
        onClose={() => setShowFriendsCode(false)}
        weeklyFriendsCount={getThisWeeksFriendsCount()}
        refreshCounts={refreshCounts}
      />
    );
  }
  if (showBackstageCode) {
    return (
      <BackstageCode
        user={user}
        onClose={() => setShowBackstageCode(false)}
        weeklyBackstageCount={getThisWeeksBackstageCount()}
        refreshCounts={refreshCounts}
      />
    );
  }

  if (codeType) {
    return (
      <CodeGenerator
        user={user}
        onClose={() => setCodeType("")}
        weeklyCount={
          codeType === "Friends"
            ? getThisWeeksFriendsCount()
            : getThisWeeksBackstageCount()
        }
        refreshCounts={refreshCounts}
        type={codeType}
      />
    );
  }

  if (showScanner) {
    return <Scanner user={user} onClose={() => setShowScanner(false)} />;
  }

  if (showStatistic) {
    return (
      <Statistic
        counts={counts}
        currentEventDate={currentEventDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
        onClose={() => setShowStatistic(false)}
        user={user}
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
          {/* <AvatarUpload
            user={user}
            setUser={setUser}
            setImageSwitch={setImageSwitch}
          /> */}

          <p className="dashboard-header-name">{user.name}</p>
          <p className="dashboard-header-email">{user.email}</p>
        </div>
      </div>
      <div className="dashboard-actions">
        {user.isDeveloper && (
          <>
            <button
              className="dashboard-actions-button"
              onClick={() => navigate("/events")}
            >
              Events
            </button>
            {/* <button
              className="dashboard-actions-button"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button> */}
          </>
        )}

        {user.isAdmin && (
          <>
            <button
              className="dashboard-actions-button"
              onClick={() => setShowStatistic(true)}
            >
              Statistic
            </button>
          </>
        )}
        {(user.isAdmin || user.isBackstage) && (
          <>
            <button
              className="dashboard-actions-button"
              onClick={() => setCodeType("Backstage")}
            >
              Backstage Code
            </button>
          </>
        )}

        {user.isPromoter && (
          <button
            className="dashboard-actions-button"
            onClick={() => setCodeType("Friends")}
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
