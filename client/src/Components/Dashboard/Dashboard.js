// Dashboard.js
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import { logout } from "../AuthForm/Login/LoginFunction";
import "./Dashboard.scss";
import Settings from "../Settings/Settings";
import FriendsCode from "../FriendsCode/FriendsCode";
import BackstageCode from "../BackstageCode/BackstageCode";
import TableCode from "../TableCode/TableCode";
import Scanner from "../Scanner/Scanner";
import axios from "axios";
import Statistic from "../Statistic/Statistic";
import moment from "moment";
import AvatarUpload from "../AvatarUpload/index";
import { useCurrentEvent } from "../CurrentEvent/CurrentEvent";
import CodeGenerator from "../CodeGenerator/CodeGenerator";
import Ranking from "../Ranking/Ranking";
import DropFiles from "../DropFiles/DropFiles";

const Dashboard = () => {
  const { user, setUser, loading } = useContext(AuthContext);
  const [showSettings, setShowSettings] = useState(false);
  const [showDropFiles, setShowDropFiles] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showStatistic, setShowStatistic] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [codeType, setCodeType] = useState("");
  const [imageSwitch, setImageSwitch] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [counts, setCounts] = useState({
    friendsCounts: [],
    backstageCounts: [],
    guestCounts: { total: 0, used: 0 },
  });

  const {
    currentEventDate,
    dataInterval,
    handlePrevWeek,
    handleNextWeek,
    resetEventDateToToday,
  } = useCurrentEvent();

  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  // Toggle function to switch between edit and view mode
  const toggleEditAvatar = () => {
    setIsEditingAvatar(!isEditingAvatar);
  };

  const navigate = useNavigate();

  const startingEventString = "14012024";
  const startingEventDate = moment(startingEventString, "DDMMYYYY");

  const handleCropModeToggle = (isInCropMode) => {
    setIsCropMode(isInCropMode);
  };
  const getThisWeeksFriendsCount = () => {
    const filteredFriendsCounts = counts.friendsCounts.filter((count) => {
      return count._id === user._id;
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
      return count._id === user._id; // Make sure this comparison is correct as per your data
    });

    const total = filteredCounts.reduce((acc, curr) => acc + curr.total, 0);

    return total;
  };
  const getThisWeeksTableCount = () => {
    // Ensure counts.tableCounts includes date information

    const totalTables = counts.tableCounts.filter((table) => {
      const reservationDate = moment(table.createdAt); // assuming table reservations have a 'createdAt' field
      return reservationDate.isBetween(
        dataInterval.startDate,
        dataInterval.endDate,
        undefined,
        "[]"
      ); // '[]' includes the bounds
    }).length;

    return totalTables;
  };

  const fetchCounts = async () => {
    try {
      const { startDate, endDate } = dataInterval;

      let params = {};

      if (startDate) {
        params.startDate = startDate.format("YYYY-MM-DDTHH:mm:ss");
      }
      params.endDate = endDate.format("YYYY-MM-DDTHH:mm:ss");

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
    if (user?.avatar) {
      setIsEditingAvatar(false); // Resets editing state when a new avatar URL is detected.
    }
    if (user) {
      fetchCounts();
    }
  }, [currentEventDate, user]);

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

  if (codeType) {
    return (
      <CodeGenerator
        user={user}
        onClose={() => setCodeType("")}
        weeklyCount={
          codeType === "Friends"
            ? getThisWeeksFriendsCount()
            : codeType === "Backstage"
            ? getThisWeeksBackstageCount()
            : getThisWeeksTableCount() // Added condition for Table codes
        }
        refreshCounts={refreshCounts}
        type={codeType}
        currentEventDate={currentEventDate}
        onPrevWeek={handlePrevWeek}
        isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
        onNextWeek={handleNextWeek}
        counts={counts}
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
        onClose={() => {
          setShowStatistic(false);
          resetEventDateToToday(); // Reset event date to today
        }}
        user={user}
      />
    );
  }

  // if (showRanking) {
  //   return (
  //     <Ranking
  //       counts={counts}
  //       currentEventDate={currentEventDate}
  //       onPrevWeek={handlePrevWeek}
  //       onNextWeek={handleNextWeek}
  //       isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
  //       onClose={() => {
  //         setShowRanking(false);
  //         resetEventDateToToday(); // Reset event date to today
  //       }}
  //       user={user}
  //     />
  //   );
  // }

  if (showDropFiles) {
    return (
      <DropFiles
        onClose={() => {
          setShowDropFiles(false);
        }}
        user={user}
      />
    );
  }

  if (showSettings) {
    return <Settings />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-navigation">
        <div className="login-back-arrow" onClick={() => navigate("/")}>
          <img src="/image/back-icon.svg" alt="" />
        </div>

        <img
          src="/image/inbox.svg"
          alt=""
          className="dashboard-navigation-inbox"
        />

        <h1 className="dashboard-navigation-title">Member Area</h1>

        <img
          src="/image/bell.svg"
          alt=""
          className="dashboard-navigation-bell"
        />

        <img
          src="/image/menu.svg"
          alt=""
          className="dashboard-navigation-menu"
        />

        {/* <img className="dashboard-logo" src="/image/logo.svg" alt="" /> */}
      </div>

      <div className="dashboard-header">
        <div className="dashboard-header-avatar">
          {!isEditingAvatar && user.avatar && (
            <div className="dashboard-header-avatar-wrapper">
              <img
                src="/image/share-icon.svg" // Path to your edit icon
                alt="Edit Avatar"
                className="share-icon"
                onClick={toggleEditAvatar}
              />

              <img src={user.avatar} alt="Profile" className="profile-icon" />
              <img
                src="/image/edit-icon2.svg" // Path to your edit icon
                alt="Edit Avatar"
                className="edit-icon"
                onClick={toggleEditAvatar}
              />
            </div>
          )}

          {(isEditingAvatar || !user.avatar) && (
            <>
              <AvatarUpload
                user={user}
                setUser={setUser}
                setImageSwitch={setImageSwitch}
                onCropModeChange={handleCropModeToggle} // Pass this prop to AvatarUpload
              />

              {user.avatar && !isCropMode && (
                <img
                  src="/image/cancel-icon_w.svg"
                  alt="Cancel Edit"
                  className="avatar-cancel-icon avatar-icon"
                  onClick={toggleEditAvatar}
                />
              )}
            </>
          )}
        </div>

        <div className="dashboard-header-info">
          <p className="dashboard-header-info-greeting">Hallo,</p>
          <p className="dashboard-header-info-name">{user.name}</p>
          <p className="dashboard-header-info-role">Event Host</p>
        </div>

        <div className="dashboard-header-selection">
          <div className="dashboard-header-selection-event">
            <span className="dashboard-header-selection-event-image">
              <img src="/image/logo.svg" alt="" />
            </span>
            <h2 className="dashboard-header-selection-event-name">
              Afro Spiti
            </h2>
            <img
              src="/image/dropdown-icon.svg"
              alt=""
              className="dashboard-header-selection-event-dropdown"
            />
          </div>
        </div>
      </div>

      <div className="dashboard-status">
        <div className="dashboard-status-point">
          <span className="dashboard-status-point-wrapper">
            <img
              className="dashboard-status-point-wrapper-icon"
              src="/image/status-calender.svg"
              alt=""
            />
            <p className="dashboard-status-point-wrapper-name">Events</p>
          </span>
          <p className="dashboard-status-point-value">12</p>
        </div>

        <div className="dashboard-status-point">
          <span className="dashboard-status-point-wrapper">
            <img
              className="dashboard-status-point-wrapper-icon"
              src="/image/status-tickets.svg"
              alt=""
            />
            <p className="dashboard-status-point-wrapper-name">Tickets</p>
          </span>
          <p className="dashboard-status-point-value">110</p>
        </div>

        <div className="dashboard-status-point">
          <span className="dashboard-status-point-wrapper">
            <img
              className="dashboard-status-point-wrapper-icon"
              src="/image/status-Codes.svg"
              alt=""
            />
            <p className="dashboard-status-point-wrapper-name">Codes</p>
          </span>
          <p className="dashboard-status-point-value">320</p>
        </div>
      </div>

      <div className="dashboard-menu">
        {user.isDeveloper && (
          <div className="dashboard-menu-button">
            <button onClick={() => navigate("/events")}>
              <img
                src="/image/event-icon.svg"
                alt=""
                className="dashboard-menu-button-icon"
              />
            </button>
            <p className="dashboard-menu-button-title">Events</p>
          </div>
        )}

        {/* <button
              className="dashboard-menu-button"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button> */}

        {user.isAdmin && (
          <div className="dashboard-menu-button">
            <button onClick={() => setShowStatistic(true)}>
              <img
                src="/image/event-icon.svg"
                alt=""
                className="dashboard-menu-button-icon"
              />
            </button>
            <p className="dashboard-menu-button-title">Statistic</p>
          </div>
        )}

        {(user.isAdmin || user.isBackstage) && (
          <div className="dashboard-menu-button">
            <button onClick={() => setCodeType("Backstage")}>
              {" "}
              <img
                src="/image/codes-icon.svg"
                alt=""
                className="dashboard-menu-button-icon"
              />
            </button>
            <p className="dashboard-menu-button-title"> Codes</p>
          </div>
        )}

        {(user.isAdmin || user.isBackstage) && (
          <div className="dashboard-menu-button">
            <button onClick={() => setCodeType("Backstage")}>
              {" "}
              <img
                src="/image/event-icon.svg"
                alt=""
                className="dashboard-menu-button-icon"
              />
            </button>
            <p className="dashboard-menu-button-title">Backstage Code</p>
          </div>
        )}

        {(user.isAdmin || user.isTable) && (
          <div className="dashboard-menu-button">
            <button onClick={() => setCodeType("Table")}>
              {" "}
              <img
                src="/image/table-icon.svg"
                alt=""
                className="dashboard-menu-button-icon"
              />
            </button>
            <p className="dashboard-menu-button-title">Table Code</p>
          </div>
        )}

        {user.isPromoter && (
          <div className="dashboard-menu-button">
            <button onClick={() => setCodeType("Friends")}>
              <img
                src="/image/friends-icon.svg"
                alt=""
                className="dashboard-menu-button-icon"
              />
            </button>
            <p className="dashboard-menu-button-title"> Friends Code</p>
          </div>
        )}
        {/* {user.isPromoter && (
          <button
            className="dashboard-menu-button"
            onClick={() => setShowRanking(true)}
          >
            Ranking
          </button>
        )} */}

        {user.isAdmin && (
          <div className="dashboard-menu-button">
            <button onClick={() => setShowDropFiles(true)}>
              {" "}
              <img
                src="/image/dropped-icon.svg"
                alt=""
                className="dashboard-menu-button-icon"
              />
            </button>
            <p className="dashboard-menu-button-title"> Dropped Files</p>
          </div>
        )}

        {user.isScanner && (
          <div className="dashboard-menu-button">
            <button onClick={() => setShowScanner(true)}>
              <img
                src="/image/scanner-icon.svg"
                alt=""
                className="dashboard-menu-button-icon"
              />
            </button>
            <p className="dashboard-menu-button-title">Scanner</p>
          </div>
        )}
      </div>

      <div className="dashboard-logout">
        <button className="dashboard-logout-button" onClick={handleLogout}>
          <img
            src="/image/logout-icon.svg"
            alt=""
            className="dashboard-button-icon"
          />
        </button>
        <p className="dashboard-button-title">Logout</p>
      </div>
    </div>
  );
};

export default Dashboard;
