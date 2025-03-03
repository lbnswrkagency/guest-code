// Dashboard.js
import React, { useContext, useEffect, useState } from "react";
import {
  useNavigate,
  Route,
  Routes,
  Outlet,
  useParams,
} from "react-router-dom";
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
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";

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
// import Inbox from "../Inbox/Inbox";  // Commented out chat functionality
// import PersonalChat from "../PersonalChat/PersonalChat";  // Commented out chat functionality
// import GlobalChat from "../GlobalChat/GlobalChat";  // Commented out chat functionality

import { SocketProvider, useSocket } from "../../contexts/SocketContext";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import Loader from "../Loader/Loader";
import DashboardFeed from "../DashboardFeed/DashboardFeed";
import { useAuth } from "../../contexts/AuthContext";

const Dashboard = () => {
  const { user, setUser, loading } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Remove @ from username parameter
  const cleanUsername = username?.replace("@", "");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (!cleanUsername) {
      navigate(`/@${user.username}`);
      return;
    }

    // Only redirect if we're viewing a user profile (not a brand or event)
    // Check if the path has more segments after the username
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const isViewingNestedRoute = pathSegments.length > 1;

    if (!isViewingNestedRoute) {
      // Case-insensitive comparison to check if viewing own profile
      const isOwnProfile =
        cleanUsername.toLowerCase() === user.username.toLowerCase();

      if (!isOwnProfile) {
        navigate(`/@${user.username}`);
        return;
      }
    }
  }, [loading, user, navigate, cleanUsername]);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  // If it's not the user's own profile, we'll show the public view
  // (but for now we're redirecting in the useEffect)
  // TODO: Implement and use UserProfile component
  // if (!isOwnProfile) {
  //   return <UserProfile username={cleanUsername} />;
  // }

  // If it is the user's own profile, show the dashboard
  return (
    <SocketProvider user={user}>
      <DashboardContent user={user} setUser={setUser} />
    </SocketProvider>
  );
};

// New component for public profile view
const PublicProfileView = ({ username }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get(`/users/profile/${username}`);
        setProfileData(response.data);
      } catch (error) {
        toast.showError("Failed to load profile");
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return <Loader />;
  }

  if (!profileData) {
    return <div className="not-found">Profile not found</div>;
  }

  return (
    <div className="public-profile">
      {/* Public profile view - will implement later */}
      <h1>@{username}'s Profile</h1>
      {/* Add public profile content here */}
    </div>
  );
};

// Second part - all your existing code moves here
const DashboardContent = ({ user, setUser }) => {
  const { isConnected, socket } = useSocket();
  const toast = useToast();

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
  const [userRoles, setUserRoles] = useState([]);
  const [codeSettings, setCodeSettings] = useState([]);
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

  // Add state for selected brand and date to pass to DashboardFeed
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

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

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user || !user._id) return;

      try {
        console.log("[Dashboard] Fetching user roles for user:", user._id);

        // Use axiosInstance instead of axios directly for consistency
        const response = await axiosInstance.get(`/users/roles`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        console.log("[Dashboard] User roles fetched:", response.data);

        // Check if the response data is valid and has the expected format
        if (Array.isArray(response.data)) {
          // Log each role structure to check if brandIds are properly formatted
          response.data.forEach((role) => {
            console.log(`[Dashboard] Loaded role: ${role.name}`, {
              roleBrandId: role.brandId,
              roleId: role._id,
              permissionsPresent: !!role.permissions,
            });
          });

          setUserRoles(response.data);
        } else {
          console.error("[Dashboard] Invalid role data format:", response.data);
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching user roles:", error);
      }
    };

    const fetchCodeSettings = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/code-settings`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setCodeSettings(response.data);
      } catch (error) {
        // Error handling with no console log
      }
    };

    fetchUserRoles();
    fetchCodeSettings();
  }, [user]);

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  const refreshCounts = () => {
    fetchCounts();
  };

  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  const handleDelete = async (brandId) => {
    if (window.confirm("Are you sure you want to delete this brand?")) {
      try {
        toast.showLoading("Deleting brand...");
        await axios.delete(
          `${process.env.REACT_APP_API_BASE_URL}/brands/${brandId}`,
          {
            withCredentials: true,
          }
        );
        toast.showSuccess("Brand deleted successfully!");
        fetchCounts();
      } catch (error) {
        toast.showError("Failed to delete brand");
      }
    }
  };

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
      <Navigation
        onBack={handleBack}
        onMenuClick={() => setIsNavigationOpen(true)}
        onLogout={handleLogout}
      />

      <div className="dashboard-content">
        <DashboardHeader
          user={user}
          isEditingAvatar={isEditingAvatar}
          toggleEditAvatar={() => setIsEditingAvatar(!isEditingAvatar)}
          setIsCropMode={setIsCropMode}
          isCropMode={isCropMode}
          setUser={setUser}
          isOnline={isConnected}
          selectedBrand={selectedBrand}
          setSelectedBrand={setSelectedBrand}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          userRoles={userRoles}
        />

        <DashboardMenu
          user={user}
          setShowSettings={setShowSettings}
          setShowStatistic={setShowStatistic}
          setShowScanner={setShowScanner}
          setShowDropFiles={setShowDropFiles}
          setCodeType={setCodeType}
          setShowTableSystem={setShowTableSystem}
          isOnline={isConnected}
          userRoles={userRoles}
          codeSettings={codeSettings}
          selectedBrand={selectedBrand}
        />

        <Routes>
          <Route
            index
            element={
              <DashboardFeed
                selectedBrand={selectedBrand}
                selectedDate={selectedDate}
              />
            }
          />
          {/* Commented out chat routes
          <Route
            path="chat"
            element={<PersonalChat user={user} socket={socket} />}
          />
          <Route
            path="global-chat"
            element={
              <GlobalChat
                user={user}
                socket={socket}
                onlineUsers={onlineUsers}
              />
            }
          />
          */}
        </Routes>
      </div>

      <DashboardNavigation
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        currentUser={user}
        setUser={setUser}
      />
    </div>
  );
};

export default Dashboard;
