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
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import { selectAllBrands, selectSelectedBrand } from "../../redux/brandSlice";
import { useBrands } from "../../contexts/BrandContext";

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
import CodeManagement from "../CodeManagement/CodeManagement";

// Replace the visual ReduxDebug component with a Dashboard hook that logs store data
const Dashboard = () => {
  const { user, setUser, loading } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Get Redux store data
  const reduxUser = useSelector(selectUser);

  // Get brand data from Redux
  const brands = useSelector(selectAllBrands);
  const selectedBrand = useSelector(selectSelectedBrand);

  // Get brand context
  const { fetchUserBrands } = useBrands();

  // Log Redux store data when component mounts or reduxUser/brands change
  useEffect(() => {
    if (reduxUser) {
      console.log("🔵 REDUX STORE DATA:", {
        timestamp: new Date().toISOString(),
        reduxUser: {
          // Basic user info
          id: reduxUser._id,
          username: reduxUser.username,
          email: reduxUser.email,
          firstName: reduxUser.firstName,
          lastName: reduxUser.lastName,
          birthday: reduxUser.birthday,

          // Avatar data (full object with all URLs)
          avatar: reduxUser.avatar,

          // User roles and permissions
          isAdmin: reduxUser.isAdmin,
          isDeveloper: reduxUser.isDeveloper,
          isVerified: reduxUser.isVerified,
          isAlpha: reduxUser.isAlpha,
          isScanner: reduxUser.isScanner,
          isPromoter: reduxUser.isPromoter,
          isStaff: reduxUser.isStaff,
          isBackstage: reduxUser.isBackstage,
          isSpitixBattle: reduxUser.isSpitixBattle,
          isTable: reduxUser.isTable,

          // Other important fields
          events: reduxUser.events?.length || 0,
          createdAt: reduxUser.createdAt,
          updatedAt: reduxUser.updatedAt,
          lastLogin: reduxUser.lastLogin,
          lastSyncedAt: reduxUser.lastSyncedAt,
        },
        status: "Current Redux store state in Dashboard",
      });
    }
  }, [reduxUser]);

  // Add a new effect to log brand data
  useEffect(() => {
    if (brands && brands.length > 0) {
      console.log("🔵 REDUX BRAND DATA:", {
        timestamp: new Date().toISOString(),
        brandsCount: brands.length,
        brands: brands.map((brand) => ({
          id: brand._id,
          name: brand.name,
          username: brand.username,
          role: brand.userRole || "Unknown", // Assuming user role is stored here
          logo: brand.logo?.thumbnail ? "✓" : "✗",
          isOwner: brand.owner === reduxUser?._id,
        })),
        selectedBrand: selectedBrand
          ? {
              id: selectedBrand._id,
              name: selectedBrand.name,
              username: selectedBrand.username,
            }
          : null,
        status: "Current brand data in Redux store",
      });
    }
  }, [brands, selectedBrand, reduxUser?._id]);

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

  // Add an effect to trigger brand data fetch when component mounts
  useEffect(() => {
    // If we have a user but no brands, fetch brands
    if (user && (!brands || brands.length === 0)) {
      fetchUserBrands();
    }
  }, [user, brands, fetchUserBrands]);

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
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, toast]);

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
  const [codePermissions, setCodePermissions] = useState([]);
  const [codePermissionsDetails, setCodePermissionsDetails] = useState([]);
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
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Add a useEffect to log selectedEvent changes
  useEffect(() => {
    // Removed console logs
  }, [selectedEvent, selectedBrand, selectedDate]);

  // Add a state variable to store the access summary
  const [accessSummary, setAccessSummary] = useState({
    canCreateCodes: false,
    canReadCodes: false,
    canEditCodes: false,
    canDeleteCodes: false,
    isOwner: false,
    isMember: false,
    hasEventsPermission: false,
    hasTeamPermission: false,
    hasAnalyticsPermission: false,
    hasScannerPermission: false,
    permissions: {},
  });

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
  }, [codeType, resetEventDateToToday]);

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
      // Error handling without console.log
    }
  };

  const fetchUserSpecificCounts = async () => {
    if (!user || !user._id) {
      // Error handling without console.log
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
      // Error handling without console.log
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
      try {
        if (!user || !selectedBrand?._id) return;

        const response = await axiosInstance.get(
          `/roles/brands/${selectedBrand._id}/user-roles`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (Array.isArray(response.data)) {
          setUserRoles(response.data);
        } else {
          setUserRoles([]);
        }
      } catch (error) {
        setUserRoles([]);
      }
    };

    const fetchCodeSettings = async () => {
      try {
        // First check if we have a selected event
        if (selectedBrand?._id) {
          // Try to fetch all code settings for the user's brand
          // Make sure we're using the correct API path
          let baseUrl = process.env.REACT_APP_API_BASE_URL;

          // Strip trailing slash if present
          if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.slice(0, -1);
          }

          // Determine if we need to add /api prefix
          let apiUrl;
          if (baseUrl.includes("/api")) {
            // API already in URL
            apiUrl = `${baseUrl}/code-settings/brands/${selectedBrand._id}`;
          } else {
            // Need to add /api
            apiUrl = `${baseUrl}/api/code-settings/brands/${selectedBrand._id}`;
          }

          const response = await axios.get(apiUrl, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          // Handle different response formats
          if (response.data && Array.isArray(response.data.codeSettings)) {
            // Filter out standard code types that aren't editable unless they're enabled custom types
            const filteredSettings = response.data.codeSettings.filter(
              (setting) => {
                // Keep all custom types that are enabled
                if (setting.type === "custom" && setting.isEnabled) {
                  return true;
                }

                // Keep standard types only if they're editable and enabled
                return setting.isEditable && setting.isEnabled;
              }
            );

            setCodeSettings(filteredSettings);
          } else if (response.data && Array.isArray(response.data)) {
            // Handle case where the response might be an array directly
            // Filter out standard code types that aren't editable unless they're enabled custom types
            const filteredSettings = response.data.filter((setting) => {
              // Keep all custom types that are enabled
              if (setting.type === "custom" && setting.isEnabled) {
                return true;
              }

              // Keep standard types only if they're editable and enabled
              return setting.isEditable && setting.isEnabled;
            });

            setCodeSettings(filteredSettings);
          } else {
            // Only attempt to create settings if we have real permission details
            if (codePermissionsDetails && codePermissionsDetails.length > 0) {
              // Create default code settings from permissions
              const defaultSettings = codePermissionsDetails.map((perm) => ({
                type: perm.type,
                codeType: perm.type,
                name: `${perm.type} Code`,
                isEnabled: true,
                limit: perm.limit || 0,
                unlimited:
                  perm.unlimited !== undefined
                    ? perm.unlimited
                    : perm.limit === 0,
                // Don't hardcode maxPax and condition, use default values that won't override API values
                maxPax: perm.maxPax || 1,
                condition: perm.condition || "",
                isEditable: true, // Make client-generated settings editable
                // Add additional fields that might be expected by the components
                _id: `temp_${perm.type}_${Date.now()}`, // Generate a temporary ID
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                generatedClientSide: true,
                generatedFromRole: perm.role || "Unknown role",
              }));

              // Important: Set the code settings with our generated defaults
              setCodeSettings(defaultSettings);
            } else {
              // Set empty code settings if no permissions are found
              setCodeSettings([]);
            }
          }
        }
      } catch (error) {
        // Only use real permission data on error
        if (codePermissionsDetails && codePermissionsDetails.length > 0) {
          const permissionSettings = codePermissionsDetails.map((perm) => ({
            type: "custom", // Default to custom as the most flexible type
            codeType: perm.type,
            name: `${perm.type} Code`,
            isEnabled: true,
            limit: perm.limit || 0,
            unlimited:
              perm.unlimited !== undefined ? perm.unlimited : perm.limit === 0,
            maxPax: perm.maxPax || 1,
            condition: perm.condition || "",
            isEditable: true,
            _id: `temp_${perm.type}_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            generatedClientSide: true,
            generatedFromRole: perm.role || "Unknown",
          }));

          setCodeSettings(permissionSettings);
        } else {
          setCodeSettings([]);
        }
      }
    };

    fetchUserRoles();
    fetchCodeSettings();
  }, [user, selectedBrand, codePermissionsDetails]);

  // Create a brand-specific dashboard summary when selectedBrand changes
  useEffect(() => {
    if (selectedBrand && userRoles.length > 0) {
      // Extract roles specific to this brand
      const brandRoles = userRoles;

      // Find highest role (prioritize custom roles over default)
      let highestRole = null;
      let highestRoleIsCustom = false;

      // First look for custom roles (isDefault !== true)
      for (const role of brandRoles) {
        if (role.isDefault !== true) {
          highestRole = role.name;
          highestRoleIsCustom = true;
          break;
        }
      }

      // If no custom role found, look for OWNER
      if (!highestRole) {
        for (const role of brandRoles) {
          if (role.name === "OWNER") {
            highestRole = role.name;
            break;
          }
        }
      }

      // If still no role found, look for MEMBER
      if (!highestRole) {
        for (const role of brandRoles) {
          if (role.name === "MEMBER") {
            highestRole = role.name;
            break;
          }
        }
      }

      // Extract all code permissions from all roles
      const allCodePermissions = {};
      const newCodePermissionsDetails = [];
      const processedPermissions = new Set(); // Track processed permission types to avoid duplicates

      brandRoles.forEach((role) => {
        // METHOD 1: Process standard codes object with nested code types
        if (
          role.permissions?.codes &&
          typeof role.permissions.codes === "object"
        ) {
          // Check if codes is an object with code types as keys
          Object.entries(role.permissions.codes).forEach(
            ([codeType, permissions]) => {
              // Skip if not a valid code type or permissions
              if (
                codeType === "generate" ||
                codeType === "view" ||
                codeType === "edit" ||
                codeType === "delete"
              ) {
                // These are permissions directly on the codes object, not code types
                return;
              }

              // Skip if permissions is not an object
              if (!permissions || typeof permissions !== "object") return;

              // Create a unique key for this permission to avoid duplicates
              const permKey = `${codeType}:${permissions.limit || 0}:${
                permissions.unlimited || false
              }:${role.name}`;

              // Skip if already processed
              if (processedPermissions.has(permKey)) return;

              // Check for generate permission
              if (permissions.generate) {
                allCodePermissions[codeType] = true;

                // Add detailed permission
                newCodePermissionsDetails.push({
                  type: codeType,
                  name: codeType,
                  limit: permissions.limit || 0,
                  unlimited: permissions.unlimited || false,
                  role: role.name,
                  generate: permissions.generate || false,
                });

                // Mark as processed
                processedPermissions.add(permKey);
              }
            }
          );
        }

        // METHOD 2: Process direct code type objects at the root level
        // Some roles may have code types directly in the permissions object
        Object.entries(role.permissions || {}).forEach(([key, value]) => {
          // Skip non-code permissions and standard permissions objects
          if (
            key === "codes" ||
            key === "events" ||
            key === "analytics" ||
            key === "team" ||
            key === "scanner" ||
            typeof value !== "object"
          ) {
            return;
          }

          // Check if this object has a generate property - if so, it might be a code type
          if (value.generate) {
            const permKey = `${key}:${value.limit || 0}:${
              value.unlimited || false
            }:${role.name}`;

            // Skip if already processed
            if (!processedPermissions.has(permKey)) {
              allCodePermissions[key] = true;

              newCodePermissionsDetails.push({
                type: key,
                name: key,
                limit: value.limit || 0,
                unlimited: value.unlimited || false,
                role: role.name,
                generate: value.generate || false,
              });

              // Mark as processed
              processedPermissions.add(permKey);
            }
          }
        });

        // METHOD 3: Check for top-level codes permissions (generate, view, etc.)
        // Some roles might have direct permissions on the codes object
        if (role.permissions?.codes?.generate) {
          // If there's a direct generate permission, but no specific code types
          // Create a generic "Code" permission
          const permKey = `Code:${role.permissions.codes.limit || 0}:${
            role.permissions.codes.unlimited || false
          }:${role.name}`;

          if (!processedPermissions.has(permKey)) {
            allCodePermissions["Code"] = true;

            newCodePermissionsDetails.push({
              type: "Code",
              name: "Code",
              limit: role.permissions.codes.limit || 0,
              unlimited: role.permissions.codes.unlimited || false,
              role: role.name,
              generate: role.permissions.codes.generate || false,
            });

            processedPermissions.add(permKey);
          }
        }
      });

      // Sort permissions by type for better readability
      newCodePermissionsDetails.sort((a, b) => a.type.localeCompare(b.type));

      // Update the state with the new permissions details
      setCodePermissionsDetails(newCodePermissionsDetails);

      // Determine member count from various sources
      let memberCount = "Unknown";

      if (selectedBrand.members?.length) {
        memberCount = selectedBrand.members.length;
      } else if (selectedBrand.memberIds?.length) {
        memberCount = selectedBrand.memberIds.length;
      } else if (selectedBrand.memberCount) {
        memberCount = selectedBrand.memberCount;
      } else if (selectedBrand.users?.length) {
        memberCount = selectedBrand.users.length;
      }

      // Calculate Access Summary based on user roles and their permissions
      const newAccessSummary = {
        // Check for code creation permission
        canCreateCodes: brandRoles.some((r) => {
          // Check for direct generate permission in codes object
          if (r.permissions?.codes?.generate) return true;

          // Check for generate permission in any code type object within codes
          if (r.permissions?.codes && typeof r.permissions.codes === "object") {
            const hasGenerateInCodeTypes = Object.values(
              r.permissions.codes
            ).some((perm) => perm && typeof perm === "object" && perm.generate);
            if (hasGenerateInCodeTypes) return true;
          }

          return false;
        }),
        canReadCodes: true,
        canEditCodes: true,
        canDeleteCodes: true,
        isOwner: brandRoles.some((r) => r.name === "OWNER"),
        isMember: brandRoles.some((r) => r.name === "MEMBER"),
        hasEventsPermission: brandRoles.some((r) => r.permissions?.events),
        hasTeamPermission: brandRoles.some((r) => r.permissions?.team),
        hasAnalyticsPermission: brandRoles.some(
          (r) => r.permissions?.analytics
        ),
        hasScannerPermission: brandRoles.some((r) => r.permissions?.scanner),
        permissions: allCodePermissions,
      };

      setAccessSummary(newAccessSummary);
    }
  }, [selectedBrand, userRoles, codeSettings, user]);

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

  // Add a handler function to update the selected event data
  const handleEventDataUpdate = (updatedEvent) => {
    // Update the selected event with the new data
    setSelectedEvent(updatedEvent);
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
        onClose={() => {
          setCodeType("");
          resetEventDateToToday();
        }}
        type={codeType}
        currentEventDate={currentEventDate}
        onPrevWeek={handlePrevWeek}
        isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
        onNextWeek={handleNextWeek}
        counts={counts}
        dataInterval={dataInterval}
        codeSettings={codeSettings}
        codePermissions={codePermissionsDetails}
        accessSummary={accessSummary}
        selectedBrand={selectedBrand}
        selectedEvent={selectedEvent}
        onEventDataUpdate={handleEventDataUpdate}
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
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
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
          codePermissions={codePermissionsDetails}
          accessSummary={accessSummary}
        />

        <Routes>
          <Route
            index
            element={
              <DashboardFeed
                selectedBrand={selectedBrand}
                selectedDate={selectedDate}
                selectedEvent={selectedEvent}
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
