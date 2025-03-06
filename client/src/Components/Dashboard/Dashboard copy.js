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
              "Found codeSettings array in response.data:",
              response.data.codeSettings.length
            );
            setCodeSettings(response.data.codeSettings);
          } else if (response.data && Array.isArray(response.data)) {
            // Handle case where the response might be an array directly
            console.log("Found direct array response:", response.data.length);
            setCodeSettings(response.data);
          } else {
            console.warn(
              "%c⚠️ No code settings found in response - creating defaults from permissions",
              "color: #FFC107; font-weight: bold;"
            );

            // Debug permissions details
            console.log(
              "%c🔍 Available code permissions for default settings:",
              "color: #9C27B0; font-weight: bold;",
              { codePermissionsDetails }
            );

            // Log all permissions from all roles
            console.log("All user roles:", userRoles);

            // Force create settings from permissions regardless of API response
            if (codePermissionsDetails && codePermissionsDetails.length > 0) {
              console.log(
                "%c🔧 Creating default settings from permissions",
                "color: #009688; font-weight: bold;"
              );

              // Create default code settings from permissions
              const defaultSettings = codePermissionsDetails.map((perm) => ({
                type: perm.type,
                codeType: perm.type,
                name: `${perm.type} Code`,
                isEnabled: true,
                limit: perm.limit || 0,
                unlimited: perm.unlimited || false,
                // Add additional fields that might be expected by the components
                _id: `temp_${perm.type}_${Date.now()}`, // Generate a temporary ID
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }));

              console.log(
                "%c✅ Created default settings from permissions:",
                "color: #4CAF50; font-weight: bold;",
                defaultSettings
              );

              // Important: Set the code settings with our generated defaults
              setCodeSettings(defaultSettings);
            } else {
              console.warn(
                "%c❌ No permissions found to create default settings",
                "color: #F44336; font-weight: bold;",
                {
                  codePermissionsDetails,
                  userRoles,
                }
              );

              // Create minimal default settings based on just the ROLEX role
              if (
                userRoles.some(
                  (role) => role.name === "ROLEX" || role.name === "OWNER"
                )
              ) {
                console.log(
                  "%c🔧 Creating emergency fallback settings",
                  "color: #E91E63; font-weight: bold;"
                );

                const emergencySettings = [
                  {
                    type: "Special Code",
                    codeType: "Special Code",
                    name: "Special Code",
                    isEnabled: true,
                    limit: 18,
                    unlimited: false,
                    _id: `temp_special_code_${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ];

                console.log(
                  "%c✅ Created emergency fallback settings:",
                  "color: #4CAF50; font-weight: bold;",
                  emergencySettings
                );

                setCodeSettings(emergencySettings);
              } else {
                // Failsafe: Create an empty array to avoid undefined errors
                setCodeSettings([]);
              }
            }
          }
        }
      } catch (error) {
        console.error(
          "%c❌ Error fetching code settings:",
          "color: #F44336; font-weight: bold;",
          error
        );

        // Even on error, try to create settings from permissions as a fallback
        if (codePermissionsDetails && codePermissionsDetails.length > 0) {
          console.log(
            "%c🔧 Creating settings from permissions after fetch error",
            "color: #009688; font-weight: bold;"
          );
          const defaultSettings = codePermissionsDetails.map((perm) => ({
            type: perm.type,
            codeType: perm.type,
            name: `${perm.type} Code`,
            isEnabled: true,
            limit: perm.limit || 0,
            unlimited: perm.unlimited || false,
            _id: `temp_${perm.type}_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          console.log(
            "%c✅ Created default settings after error:",
            "color: #4CAF50; font-weight: bold;",
            defaultSettings
          );
          setCodeSettings(defaultSettings);
        } else {
          console.warn(
            "%c❌ Could not create settings from permissions",
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
          specialCode: role.permissions?.["Special Code"],
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
                  limit: permissions.limit || 0,
                  unlimited: permissions.unlimited || false,
                  role: role.name,
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

        // METHOD 2: Process direct Special Code object at the root level
        // Some roles (like ROLEX) have Special Code directly in permissions
        if (
          role.permissions?.["Special Code"] &&
          typeof role.permissions["Special Code"] === "object"
        ) {
          const specialCodePerms = role.permissions["Special Code"];

          console.log(
            `Found direct Special Code permissions for role ${role.name}:`,
            specialCodePerms
          );

          if (specialCodePerms.generate) {
            const permKey = `Special Code:${specialCodePerms.limit || 0}:${
              specialCodePerms.unlimited || false
            }:${role.name}`;

            // Skip if already processed
            if (!processedPermissions.has(permKey)) {
              allCodePermissions["Special Code"] = true;

              newCodePermissionsDetails.push({
                type: "Special Code",
                limit: specialCodePerms.limit || 0,
                unlimited: specialCodePerms.unlimited || false,
                role: role.name,
              });

              // Mark as processed
              processedPermissions.add(permKey);
              console.log(
                `Added Special Code permission from role ${role.name}`
              );
            }
          }
        }

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
              limit: role.permissions.codes.limit || 0,
              unlimited: role.permissions.codes.unlimited || false,
              role: role.name,
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
                source: setting.generatedClientSide
                  ? `Generated from ${setting.generatedFromRole} role`
                  : "API",
              })),
            }
          : "No code settings available";

      // Calculate Access Summary based on user roles and their permissions
      const accessSummary = {
        // Check for code creation permission
        canCreateCodes: brandRoles.some(
          (r) =>
            // Direct generate permission in codes object
            r.permissions?.codes?.generate ||
            // Generate permission in any code type object
            Object.entries(r.permissions?.codes || {}).some(
              ([codeType, codePerms]) => codePerms?.generate
            ) ||
            // Special Code permission from Special Code object
            r.permissions?.["Special Code"]?.generate
        ),

        // Check for read permissions
        canReadCodes: brandRoles.some(
          (r) =>
            // Direct view/read permission in codes object
            r.permissions?.codes?.view ||
            r.permissions?.codes?.read ||
            // View/read permission in any code type object
            Object.entries(r.permissions?.codes || {}).some(
              ([codeType, codePerms]) => codePerms?.view || codePerms?.read
            ) ||
            // Special Code has view/read permission
            r.permissions?.["Special Code"]?.view ||
            r.permissions?.["Special Code"]?.read ||
            // Events-level permissions (if they can view events, they likely can view codes)
            r.permissions?.events?.view
        ),

        // Check for edit permissions
        canEditCodes: brandRoles.some(
          (r) =>
            // Direct edit permission
            r.permissions?.codes?.edit ||
            // Edit permission in any code type object
            Object.entries(r.permissions?.codes || {}).some(
              ([codeType, codePerms]) => codePerms?.edit
            ) ||
            // Special Code has edit permission
            r.permissions?.["Special Code"]?.edit ||
            // If user has events edit permissions, they can likely edit codes
            r.permissions?.events?.edit
        ),

        // Check for delete permissions
        canDeleteCodes: brandRoles.some(
          (r) =>
            // Direct delete permission
            r.permissions?.codes?.delete ||
            // Delete permission in any code type object
            Object.entries(r.permissions?.codes || {}).some(
              ([codeType, codePerms]) => codePerms?.delete
            ) ||
            // Special Code has delete permission
            r.permissions?.["Special Code"]?.delete ||
            // If user has events delete permissions, they can likely delete codes
            r.permissions?.events?.delete
        ),

        // User is owner if they have the OWNER role
        isOwner: brandRoles.some((r) => r.name === "OWNER"),

        // User is a member if they have any role for this brand
        isMember: brandRoles.length > 0,

        // Add additional permissions from ROLEX role
        hasEventsPermission: brandRoles.some(
          (r) =>
            r.permissions?.events?.create ||
            r.permissions?.events?.edit ||
            r.permissions?.events?.delete ||
            r.permissions?.events?.view
        ),

        hasTeamPermission: brandRoles.some(
          (r) => r.permissions?.team?.manage || r.permissions?.team?.view
        ),

        hasAnalyticsPermission: brandRoles.some(
          (r) => r.permissions?.analytics?.view
        ),

        hasScannerPermission: brandRoles.some(
          (r) => r.permissions?.scanner?.use
        ),
      };

      // Save code permissions to state
      setCodePermissions(newCodePermissionsDetails);

      // Log all of this nicely formatted
      console.log("🏢 BRAND DASHBOARD:", selectedBrand.name);
      console.log("📋 Brand Details:", brandDetails);
      console.log("👑 User Role in Brand:", roleInfo);
      console.log("🔑 Code Permissions:", codePermissionSummary);
      console.log("⚙️ Code Settings:", codeSettingsSummary);
      console.log("🔍 Access Summary:", {
        ...accessSummary,
        permissions: {
          codes: {
            create: accessSummary.canCreateCodes,
            read: accessSummary.canReadCodes,
            edit: accessSummary.canEditCodes,
            delete: accessSummary.canDeleteCodes,
          },
          events: accessSummary.hasEventsPermission,
          team: accessSummary.hasTeamPermission,
          analytics: accessSummary.hasAnalyticsPermission,
          scanner: accessSummary.hasScannerPermission,
        },
      });
    }
  }, [selectedBrand, userRoles, codeSettings, user]);

  // Special useEffect to create code settings from permissions when permissions change
  useEffect(() => {
    // Only run if we have permissions but no code settings
    const hasRolexOrOwner = userRoles.some(
      (role) => role.name === "ROLEX" || role.name === "OWNER"
    );
    const needsSettings = !codeSettings || codeSettings.length === 0;

    if (
      needsSettings &&
      (codePermissionsDetails?.length > 0 || hasRolexOrOwner)
    ) {
      console.log(
        "%c🔄 Creating settings from permissions - current details:",
        "color: #009688; font-weight: bold;",
        {
          permissionDetails: JSON.parse(JSON.stringify(codePermissionsDetails)),
          hasRolexRole: hasRolexOrOwner,
        }
      );

      // Initialize settings array
      let settingsFromPermissions = [];

      // Check if we have permission details
      if (codePermissionsDetails?.length > 0) {
        // Create code settings objects from permissions based on the CodeSettings model structure
        settingsFromPermissions = codePermissionsDetails.map((perm) => {
          // Map permission types to standard code types
          let codeType = perm.type;

          // Map "Special Code" to a valid type from enum
          if (codeType === "Special Code") {
            codeType = "guest"; // Map to guest type as default
          } else if (
            codeType === "friends" ||
            codeType === "table" ||
            codeType === "backstage"
          ) {
            // These are already valid types
          } else {
            // Default to custom for any other types
            codeType = "custom";
          }

          return {
            // Required fields from CodeSettings model
            type: codeType, // Required enum value
            name: `${perm.type} Code`, // Required string
            eventId: "temp_event_placeholder", // Required ObjectId (placeholder)

            // Fields to match our permission attributes
            codeType: perm.type, // Original permission type
            isEnabled: true,
            limit: perm.limit || 0,
            unlimited: perm.unlimited || false,

            // Additional required/optional fields from model
            condition: "",
            maxPax: 1,
            isEditable: false,
            color: "#2196F3",

            // Client-side only fields for tracking
            _id: `temp_${perm.type}_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            generatedFromRole: perm.role,
            generatedClientSide: true, // Flag to indicate this is a client-side generation
          };
        });
      }
      // If no permissions were found, but user has ROLEX/OWNER role, create a default Special Code
      else if (hasRolexOrOwner && settingsFromPermissions.length === 0) {
        console.log(
          "%c🎭 Creating default Special Code settings for ROLEX/OWNER",
          "color: #FF9800; font-weight: bold;"
        );

        // Add a default Special Code (mapped to guest type)
        settingsFromPermissions.push({
          type: "guest",
          name: "Special Code",
          eventId: "temp_event_placeholder",
          codeType: "Special Code",
          isEnabled: true,
          limit: 18, // Default from what we saw in permissions
          unlimited: false,
          condition: "",
          maxPax: 1,
          isEditable: false,
          color: "#2196F3",
          _id: `temp_special_code_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          generatedFromRole: "ROLEX",
          generatedClientSide: true,
        });
      }

      console.log(
        "%c✅ Generated model-compatible settings from permissions:",
        "color: #4CAF50; font-weight: bold;",
        settingsFromPermissions
      );

      // Set the code settings state
      setCodeSettings(settingsFromPermissions);

      // Log important diagnostics for debugging
      console.log("Current state:", {
        selectedBrand: selectedBrand?._id,
        userRolesCount: userRoles.length,
        permissionsCount: codePermissionsDetails?.length || 0,
        newSettingsCount: settingsFromPermissions.length,
      });
    }
  }, [codePermissionsDetails, codeSettings, selectedBrand, userRoles]);

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
        codeSettings={codeSettings}
        selectedBrand={selectedBrand}
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
