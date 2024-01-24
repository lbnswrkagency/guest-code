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

const Dashboard = () => {
  const { user, setUser, loading } = useContext(AuthContext);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendsCode, setShowFriendsCode] = useState(false);
  const [showBackstageCode, setShowBackstageCode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showStatistic, setShowStatistic] = useState(false);
  const [imageSwitch, setImageSwitch] = useState(false);
  const [counts, setCounts] = useState({
    friendsCounts: [],
    backstageCounts: [],
    guestCounts: { total: 0, used: 0 },
  });

  const navigate = useNavigate();

  const startingEventString = "14012024"; // Your starting date in DDMMYYYY format
  const startingEventDate = moment(startingEventString, "DDMMYYYY");

  const findNextEventDate = (today, startEventDate) => {
    let nextEventDate = startEventDate.clone();

    while (
      nextEventDate.isBefore(today, "day") ||
      (nextEventDate.isSame(today, "day") && today.hour() < 6)
    ) {
      nextEventDate.add(1, "weeks");
    }

    return nextEventDate;
  };

  const getThisWeeksFriendsCount = () => {
    return counts.friendsCounts
      .filter((count) => count._id === user.name)
      .reduce((acc, curr) => acc + curr.total, 0);
  };

  const getThisWeeksBackstageCount = () => {
    return counts.backstageCounts
      .filter((count) => count._id === user.name)
      .reduce((acc, curr) => acc + curr.total, 0);
  };

  const [currentEventDate, setCurrentEventDate] = useState(
    findNextEventDate(moment(), startingEventDate)
  );
  const calculateDataInterval = (currentEvent, startEvent) => {
    let startDate, endDate;

    if (currentEvent.isSame(startEvent, "day")) {
      // For the first event, fetch all data from the beginning up to the day after the event at 6AM
      startDate = null;
      endDate = startEvent.clone().add(1, "days").hour(6);
    } else {
      // For subsequent events, fetch data from the Monday at 6AM of the previous week to the day after the event at 6AM
      startDate = currentEvent
        .clone()
        .subtract(1, "weeks")
        .day("Monday")
        .hour(6);
      endDate = currentEvent.clone().add(1, "days").hour(6);
    }

    return { startDate, endDate };
  };
  const [dataInterval, setDataInterval] = useState(
    calculateDataInterval(currentEventDate, startingEventDate)
  );
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
  }, [dataInterval, currentEventDate, user]); // Depend on user object and dataInterval

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  const handlePrevWeek = () => {
    if (!currentEventDate.isSame(startingEventDate, "day")) {
      const newEventDate = currentEventDate.clone().subtract(1, "weeks");
      setCurrentEventDate(newEventDate);
      setDataInterval(calculateDataInterval(newEventDate, startingEventDate));
    }
  };

  const refreshCounts = () => {
    fetchCounts();
  };

  const handleNextWeek = () => {
    const newEventDate = currentEventDate.clone().add(1, "weeks");

    setCurrentEventDate(newEventDate);
    setDataInterval(calculateDataInterval(newEventDate, startingEventDate));
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
              onClick={() => setShowBackstageCode(true)}
            >
              Backstage Code
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
