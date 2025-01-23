// Dashboard.js
import React, { useContext, useEffect, useState } from "react";
import { useNavigate, Route, Routes, Outlet } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import { logout } from "../AuthForm/Login/LoginFunction";
import "./Dashboard.scss";
import Settings from "../Settings/Settings";
import FriendsCode from "../FriendsCode/FriendsCode";
import BackstageCode from "../BackstageCode/BackstageCode";
import TableCode from "../TableCode/TableCode";
import Scanner from "../Scanner/Scanner";
import Statistic from "../Statistic/Statistic";
import moment from "moment";
import axios from "axios";

import { useCurrentEvent } from "../CurrentEvent/CurrentEvent";
import CodeGenerator from "../CodeGenerator/CodeGenerator";
import Ranking from "../Ranking/Ranking";
import DropFiles from "../DropFiles/DropFiles";
import Footer from "../Footer/Footer";
import Navigation from "../Navigation/Navigation";
import DashboardStatus from "../DashboardStatus/DashboardStatus";
import DashboardHeader from "../DashboardHeader/DashboardHeader";
import DashboardMenu from "../DashboardMenu/DashboardMenu";
import SpitixBattle from "../SpitixBattle/SpitixBattle";
import TableSystem from "../TableSystem/TableSystem";
import Inbox from "../Inbox/Inbox";
import PersonalChat from "../PersonalChat/PersonalChat";
import GlobalChat from "../GlobalChat/GlobalChat";

import { SocketProvider, useSocket } from "../../contexts/SocketContext";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import Loader from "../Loader/Loader";

const Dashboard = () => {
  const { user, setUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  return (
    <SocketProvider user={user}>
      <DashboardContent user={user} setUser={setUser} />
    </SocketProvider>
  );
};

// Second part - all your existing code moves here
const DashboardContent = ({ user, setUser }) => {
  // NOW we can use useSocket because we're inside SocketProvider
  const { isConnected, socket } = useSocket();

  const [showSettings, setShowSettings] = useState(false);
  const [showDropFiles, setShowDropFiles] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showStatistic, setShowStatistic] = useState(false);
  const [userCounts, setUserCounts] = useState({});
  const [showRanking, setShowRanking] = useState(false);
  const [showSpitixBattle, setShowSpitixBattle] = useState(false);
  const [codeType, setCodeType] = useState("");
  const [imageSwitch, setImageSwitch] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [showTableSystem, setShowTableSystem] = useState(false);
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

  const navigate = useNavigate();

  const startingEventString = "15052024";
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
    // Use user.firstName for comparison as per your current requirement
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

  useEffect(() => {
    if (codeType) {
      resetEventDateToToday();
    }
  }, [codeType]);

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
        {
          params,
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setCounts(response.data);
    } catch (error) {
      // Keep error handling for production debugging
      console.error("Error fetching counts:", error);
    }
  };

  const fetchUserSpecificCounts = async () => {
    if (!user || !user._id) {
      console.error("User is undefined or User ID is undefined");
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/qr/user-counts`,
        {
          params: { userId: user._id },
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setUserCounts({
        totalGenerated: response.data.totalGenerated,
        totalChecked: response.data.totalChecked,
      });
    } catch (error) {
      console.error("Error fetching user-specific counts", error);
    }
  };

  useEffect(() => {
    if (user?.avatar) {
      setIsEditingAvatar(false);
    }
    if (user && user._id) {
      fetchCounts();
      fetchUserSpecificCounts();
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

  const [showGlobalChat, setShowGlobalChat] = useState(false);

  // New state for online users
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);

  // Update this useEffect to handle online users
  useEffect(() => {
    if (socket) {
      socket.on("initial_online_users", (users) => {
        setOnlineUsers(users);
        setOnlineCount(users.length);
      });

      socket.on("user_status", ({ userId, status }) => {
        setOnlineUsers((prevUsers) => {
          if (status === "online" && !prevUsers.includes(userId)) {
            return [...prevUsers, userId];
          } else if (status === "offline") {
            return prevUsers.filter((id) => id !== userId);
          }
          return prevUsers;
        });
      });

      return () => {
        socket.off("initial_online_users");
        socket.off("user_status");
      };
    }
  }, [socket]);

  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  if (codeType === "Table") {
    return (
      <TableSystem
        user={user}
        onClose={() => setCodeType("")}
        currentEventDate={currentEventDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
        counts={counts}
        refreshCounts={refreshCounts}
        dataInterval={dataInterval}
      />
    );
  } else if (codeType) {
    return (
      <CodeGenerator
        user={user}
        onClose={() => setCodeType("")}
        weeklyCount={
          codeType === "Friends"
            ? getThisWeeksFriendsCount()
            : codeType === "Backstage"
            ? getThisWeeksBackstageCount()
            : codeType === "Table"
            ? getThisWeeksTableCount()
            : 0
        }
        refreshCounts={refreshCounts}
        type={codeType}
        currentEventDate={currentEventDate}
        onPrevWeek={handlePrevWeek}
        isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
        onNextWeek={handleNextWeek}
        counts={counts}
        dataInterval={dataInterval}
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
          resetEventDateToToday();
        }}
        user={user}
      />
    );
  }

  if (showTableSystem) {
    return (
      <TableSystem
        user={user}
        onClose={() => setShowTableSystem(false)}
        weeklyCount={getThisWeeksTableCount()}
        refreshCounts={refreshCounts}
        currentEventDate={currentEventDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
        counts={counts}
        dataInterval={dataInterval}
      />
    );
  }

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

  const handleBack = () => {
    if (showSettings) {
      setShowSettings(false);
    } else if (showStatistic) {
      setShowStatistic(false);
    } else if (showScanner) {
      setShowScanner(false);
    } else if (showDropFiles) {
      setShowDropFiles(false);
    } else if (showTableSystem) {
      setShowTableSystem(false);
    } else {
      logout();
      setUser(null);
      navigate("/");
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-wrapper">
        <Navigation
          onBack={handleBack}
          onMenuClick={() => setIsNavigationOpen(true)}
        />

        <DashboardHeader
          user={user}
          isEditingAvatar={isEditingAvatar}
          toggleEditAvatar={() => setIsEditingAvatar(!isEditingAvatar)}
          setIsCropMode={setIsCropMode}
          isCropMode={isCropMode}
          setUser={setUser}
          isOnline={isConnected}
        />

        <DashboardStatus userCounts={userCounts} />

        <DashboardMenu
          user={user}
          setShowSettings={setShowSettings}
          setShowStatistic={setShowStatistic}
          setShowScanner={setShowScanner}
          setShowDropFiles={setShowDropFiles}
          setCodeType={setCodeType}
          setShowTableSystem={setShowTableSystem}
          setShowGlobalChat={setShowGlobalChat}
          isOnline={isConnected}
          onlineCount={onlineCount}
        />
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

      <Outlet />

      <Footer />

      {showGlobalChat && (
        <GlobalChat
          onClose={() => setShowGlobalChat(false)}
          user={user}
          socket={socket}
          onlineUsers={onlineUsers}
        />
      )}

      <DashboardNavigation
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        currentUser={user}
      />
    </div>
  );
};

export default Dashboard;
