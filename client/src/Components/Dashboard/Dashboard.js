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
import CodeManagement from "../CodeManagement/CodeManagement";

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
    console.group("🔍 DASHBOARD: Selected Event Changed");
    console.log(
      "Selected Event:",
      selectedEvent
        ? {
            _id: selectedEvent._id,
            name: selectedEvent.name,
            date: selectedEvent.date,
            user: selectedEvent.user,
            brand: selectedEvent.brand,
            // Log the entire object for debugging
            fullObject: selectedEvent,
          }
        : "undefined"
    );
    console.log(
      "Selected Brand:",
      selectedBrand
        ? {
            _id: selectedBrand._id,
            name: selectedBrand.name,
          }
        : "undefined"
    );
    console.log("Selected Date:", selectedDate);
    console.groupEnd();
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
      try {
        if (!user || !selectedBrand?._id) return;

        console.log("[Dashboard] Fetching roles for brand:", selectedBrand._id);

        const response = await axiosInstance.get(
          `/roles/brands/${selectedBrand._id}/user-roles`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (Array.isArray(response.data)) {
          console.log("[Dashboard] Fetched roles:", response.data);
          // Log each role with its permissions
          response.data.forEach((role) => {
            console.log(
              `[Dashboard] Role ${role.name} permissions:`,
              role.permissions
            );
          });
          setUserRoles(response.data);
        } else {
          console.error("[Dashboard] Invalid roles data:", response.data);
          setUserRoles([]);
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching roles:", error);
        setUserRoles([]);
      }
    };

    const fetchCodeSettings = async () => {
      try {
        console.log(
          "%c⚙️ Starting code settings fetch",
          "color: #3F51B5; font-weight: bold;"
        );

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

          console.log(
            "%c🔍 Fetching code settings from:",
            "color: #FF5722; font-weight: bold;",
            apiUrl
          );

          const response = await axios.get(apiUrl, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          console.log(
            "%c✅ Code settings API response:",
            "color: #4CAF50; font-weight: bold;",
            response.data
          );

          // Handle different response formats
          if (response.data && Array.isArray(response.data.codeSettings)) {
            console.log(
              "%c✅ Found codeSettings array in response.data:",
              "color: #4CAF50; font-weight: bold;",
              response.data.codeSettings.length
            );

            // Log detailed settings data
            response.data.codeSettings.forEach((setting) => {
              console.log(
                `🧩 Code setting from API: ${setting.name || setting.type}:`,
                {
                  maxPax: setting.maxPax,
                  condition: setting.condition,
                  type: setting.type,
                  limit: setting.limit,
                  unlimited: setting.unlimited || setting.limit === 0,
                  isEditable: setting.isEditable,
                  isEnabled: setting.isEnabled,
                }
              );
            });

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

            console.log(
              "%c🧹 Filtered code settings (removed non-editable standard types):",
              "color: #FF9800; font-weight: bold;",
              filteredSettings.length
            );

            setCodeSettings(filteredSettings);
          } else if (response.data && Array.isArray(response.data)) {
            // Handle case where the response might be an array directly
            console.log(
              "%c✅ Found direct array response:",
              "color: #4CAF50; font-weight: bold;",
              response.data.length
            );

            // Log detailed settings data
            response.data.forEach((setting) => {
              console.log(
                `🧩 Code setting from API: ${setting.name || setting.type}:`,
                {
                  maxPax: setting.maxPax,
                  condition: setting.condition,
                  type: setting.type,
                  limit: setting.limit,
                  unlimited: setting.unlimited || setting.limit === 0,
                  isEditable: setting.isEditable,
                  isEnabled: setting.isEnabled,
                }
              );
            });

            // Filter out standard code types that aren't editable unless they're enabled custom types
            const filteredSettings = response.data.filter((setting) => {
              // Keep all custom types that are enabled
              if (setting.type === "custom" && setting.isEnabled) {
                return true;
              }

              // Keep standard types only if they're editable and enabled
              return setting.isEditable && setting.isEnabled;
            });

            console.log(
              "%c🧹 Filtered code settings (removed non-editable standard types):",
              "color: #FF9800; font-weight: bold;",
              filteredSettings.length
            );

            setCodeSettings(filteredSettings);
          } else {
            console.warn(
              "%c⚠️ No code settings found in response - creating defaults from permissions",
              "color: #FFC107; font-weight: bold;"
            );

            // Debug permissions details
            console.log(
              "%c🔍 Available code permissions for codes:",
              "color: #2196F3; font-weight: bold;",
              { codePermissionsDetails }
            );

            // Log all permissions from all roles
            console.log("All user roles:", userRoles);

            // Only attempt to create settings if we have real permission details
            if (codePermissionsDetails && codePermissionsDetails.length > 0) {
              console.log(
                "%c🔧 Creating settings based only on real permission data",
                "color: #009688; font-weight: bold;"
              );

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

              console.log(
                "%c✅ Created settings from real permission data:",
                "color: #4CAF50; font-weight: bold;",
                defaultSettings
              );

              // Important: Set the code settings with our generated defaults
              setCodeSettings(defaultSettings);
            } else {
              console.warn(
                "%c⚠️ No permissions found for codes",
                "color: #FF9800; font-weight: bold;"
              );

              // Set empty code settings if no permissions are found
              setCodeSettings([]);
            }
          }
        }
      } catch (error) {
        console.error(
          "%c❌ Error fetching code settings:",
          "color: #F44336; font-weight: bold;",
          error
        );

        // Only use real permission data on error
        if (codePermissionsDetails && codePermissionsDetails.length > 0) {
          console.log(
            "%c🔧 Creating settings from real permissions after fetch error",
            "color: #009688; font-weight: bold;"
          );
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

          console.log(
            "%c✅ Created settings from permissions:",
            "color: #4CAF50; font-weight: bold;",
            permissionSettings
          );
          setCodeSettings(permissionSettings);
        } else {
          console.warn(
            "%c⚠️ No permissions available to create settings",
            "color: #F44336; font-weight: bold;"
          );
          setCodeSettings([]);
        }
      }
    };

    fetchUserRoles();
    fetchCodeSettings();

    // Comprehensive logging of user data for debugging
    if (user) {
      console.group(
        "%c🧑‍💻 USER DATA SUMMARY",
        "font-size: 14px; font-weight: bold; color: #4CAF50;"
      );

      console.log("%c👤 User Details:", "font-weight: bold; color: #2196F3;", {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar
          ? typeof user.avatar === "string"
            ? `${user.avatar.substring(0, 20)}...`
            : "Not a string"
          : "None",
        isVerified: user.isVerified,
      });

      console.log(
        "%c🏢 Selected Brand:",
        "font-weight: bold; color: #9C27B0;",
        selectedBrand || "None selected"
      );

      console.log(
        "%c👑 User Roles:",
        "font-weight: bold; color: #FF9800;",
        userRoles
      );

      console.log(
        "%c⚙️ Code Settings:",
        "font-weight: bold; color: #E91E63;",
        codeSettings
      );

      console.log("%c📊 User Counts:", "font-weight: bold; color: #009688;", {
        friends: getThisWeeksFriendsCount(),
        backstage: getThisWeeksBackstageCount(),
        guestCodes: counts.guestCounts,
      });

      console.groupEnd();
    }
  }, [user, selectedBrand]);

  // Create a brand-specific dashboard summary when selectedBrand changes
  useEffect(() => {
    if (selectedBrand && userRoles.length > 0) {
      // Extract roles specific to this brand
      const brandRoles = userRoles;

      // Find highest role (prioritize custom roles over default)
      let highestRole = null;
      let highestRoleIsCustom = false;

      // Debug: log all roles
      console.log(
        "All user roles for this brand:",
        brandRoles.map((r) => r.name)
      );

      // Log full role data for debugging
      console.log("Full role data:", brandRoles);

      // First look for custom roles (isDefault !== true)
      for (const role of brandRoles) {
        if (role.isDefault !== true) {
          console.log(`Found custom role: ${role.name}`);
          highestRole = role.name;
          highestRoleIsCustom = true;
          break;
        }
      }

      // If no custom role found, look for OWNER
      if (!highestRole) {
        for (const role of brandRoles) {
          if (role.name === "OWNER") {
            console.log("Found OWNER role");
            highestRole = role.name;
            break;
          }
        }
      }

      // If still no role found, look for MEMBER
      if (!highestRole) {
        for (const role of brandRoles) {
          if (role.name === "MEMBER") {
            console.log("Found MEMBER role");
            highestRole = role.name;
            break;
          }
        }
      }

      // Extract all code permissions from all roles
      const allCodePermissions = {};
      const newCodePermissionsDetails = [];
      const processedPermissions = new Set(); // Track processed permission types to avoid duplicates

      // Debug roles structure
      console.log("Processing role permissions for brand:", selectedBrand.name);

      brandRoles.forEach((role) => {
        console.log(`Processing role: ${role.name}`, {
          permissions: role.permissions,
          codePerms: role.permissions?.codes,
          customCodeTypes: Object.keys(role.permissions || {}).filter(
            (key) =>
              typeof role.permissions[key] === "object" &&
              !["codes", "events", "team", "analytics", "scanner"].includes(key)
          ),
        });

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

              console.log(
                `Found code type in codes object: ${codeType}`,
                permissions
              );

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
                console.log(
                  `Added permission for ${codeType} from role ${role.name}`
                );
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
            console.log(
              `Found potential code type at root level: ${key}`,
              value
            );

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
              console.log(`Added ${key} permission from role ${role.name}`);
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
            console.log(`Added generic Code permission from role ${role.name}`);
          }
        }
      });

      // Sort permissions by type for better readability
      newCodePermissionsDetails.sort((a, b) => a.type.localeCompare(b.type));

      // Update the state with the new permissions details
      setCodePermissionsDetails(newCodePermissionsDetails);

      // Determine member count from various sources
      let memberCount = "Unknown";
      console.log("Member count data sources:", {
        "selectedBrand.members": selectedBrand.members,
        "selectedBrand.memberIds": selectedBrand.memberIds,
        "selectedBrand.memberCount": selectedBrand.memberCount,
        "selectedBrand.users": selectedBrand.users,
        "full brand object": selectedBrand,
      });

      if (selectedBrand.members?.length) {
        memberCount = selectedBrand.members.length;
      } else if (selectedBrand.memberIds?.length) {
        memberCount = selectedBrand.memberIds.length;
      } else if (selectedBrand.memberCount) {
        memberCount = selectedBrand.memberCount;
      } else if (selectedBrand.users?.length) {
        memberCount = selectedBrand.users.length;
      }

      // Summarize brand details
      const brandDetails = {
        id: selectedBrand._id,
        name: selectedBrand.name,
        username: selectedBrand.username,
        isVerified: selectedBrand.isVerified || false,
        memberCount: memberCount,
      };

      // Summarize user roles
      const roleInfo = {
        primaryRole: highestRole || "None",
        allRoles: brandRoles.map((r) => r.name),
        totalRoles: brandRoles.length,
        highestRoleIsCustom,
      };

      // Summarize code permissions
      const codePermissionSummary =
        newCodePermissionsDetails.length > 0
          ? newCodePermissionsDetails.map(
              (p) =>
                `${p.type} (limit: ${
                  p.unlimited ? "unlimited" : p.limit
                }, role: ${p.role})`
            )
          : "No code permissions";

      // Create a summary of code settings for logging
      const codeSettingsSummary =
        codeSettings && codeSettings.length > 0
          ? {
              totalSettings: codeSettings.length,
              types: codeSettings.map(
                (s) =>
                  `${s.name || s.type} ${
                    s.generatedClientSide ? "(client-generated)" : "(from API)"
                  }`
              ),
              bySource: {
                fromAPI: codeSettings.filter((s) => !s.generatedClientSide)
                  .length,
                clientGenerated: codeSettings.filter(
                  (s) => s.generatedClientSide
                ).length,
              },
              details: codeSettings.map((setting) => ({
                type: setting.type || setting.codeType,
                name: setting.name,
                isEnabled: setting.isEnabled,
                limit: setting.limit,
                unlimited: setting.unlimited,
                // Don't set defaults based on name, just pass through the values as they are
                maxPax: setting.maxPax || 1,
                condition: setting.condition || "",
                source: setting.generatedClientSide
                  ? `Generated from ${setting.generatedFromRole} role`
                  : "API",
              })),
            }
          : "No code settings available";

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
    console.log("🔄 Dashboard: Updating event data with:", {
      id: updatedEvent._id,
      name: updatedEvent.name,
      logo: updatedEvent.logo ? "Available" : "Not available",
      primaryColor: updatedEvent.primaryColor,
    });

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
