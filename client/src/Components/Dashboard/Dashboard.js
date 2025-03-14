// Dashboard.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Route, Routes, useParams } from "react-router-dom";
import { logout } from "../AuthForm/Login/LoginFunction";
import "./Dashboard.scss";
import Settings from "../Settings/Settings";
import Scanner from "../Scanner/Scanner";
import Statistic from "../Statistic/Statistic";
import moment from "moment";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import {
  selectAllBrands,
  addEventsToBrand,
  updateEventInBrand,
} from "../../redux/brandSlice";
import { useBrands } from "../../contexts/BrandContext";

import { useCurrentEvent } from "../CurrentEvent/CurrentEvent";
import CodeGenerator from "../CodeGenerator/CodeGenerator";
import DropFiles from "../DropFiles/DropFiles";
import Navigation from "../Navigation/Navigation";
import DashboardHeader from "../DashboardHeader/DashboardHeader";
import DashboardMenu from "../DashboardMenu/DashboardMenu";
import TableSystem from "../TableSystem/TableSystem";
import { SocketProvider, useSocket } from "../../contexts/SocketContext";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import Loader from "../Loader/Loader";
import DashboardFeed from "../DashboardFeed/DashboardFeed";
import { useAuth } from "../../contexts/AuthContext";
import {
  selectSelectedBrand,
  selectSelectedEvent,
  selectSelectedDate,
  setSelectedBrand,
  setSelectedEvent,
  setSelectedDate,
} from "../../redux/uiSlice";
import { store } from "../../redux/store";

const Dashboard = () => {
  const { user, setUser, loading } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  // Move ALL state declarations to the top of the component to avoid reference errors
  const [showSettings, setShowSettings] = useState(false);
  const [showDropFiles, setShowDropFiles] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showStatistic, setShowStatistic] = useState(false);
  const [showTableSystem, setShowTableSystem] = useState(false);
  const [codeType, setCodeType] = useState("");
  const [isCropMode, setIsCropMode] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [codeSettings, setCodeSettings] = useState([]);
  const [codePermissionsDetails, setCodePermissionsDetails] = useState([]);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [accessSummary, setAccessSummary] = useState({
    canCreateCodes: false,
    canReadCodes: false,
    canEditCodes: false,
    canDeleteCodes: false,
    isFounder: false,
    isMember: false,
    hasEventsPermission: false,
    hasTeamPermission: false,
    hasAnalyticsPermission: false,
    hasScannerPermission: false,
    permissions: {},
  });

  // Get Redux store data
  const reduxUser = useSelector(selectUser);
  const brands = useSelector(selectAllBrands);

  // Get selections from UI Redux state
  const selectedBrand = useSelector(selectSelectedBrand);
  const selectedEvent = useSelector(selectSelectedEvent);
  const selectedDate = useSelector(selectSelectedDate);

  // Get brand context
  const { fetchUserBrands } = useBrands();

  // Current event context
  const {
    currentEventDate,
    dataInterval,
    handlePrevWeek,
    handleNextWeek,
    resetEventDateToToday,
  } = useCurrentEvent();

  const startingEventString = "15052024";
  const startingEventDate = moment(startingEventString, "DDMMYYYY");

  // Create a helper function to create a clean copy of brand data
  const createCleanBrandCopy = (brand) => {
    // First check if this brand has events
    if (!brand || !brand.events) {
      console.log(
        "[Dashboard] WARNING: Attempted to clean a brand with no events:",
        brand?.name
      );
      return brand; // Return as is if no events
    }

    // Create a clean copy with events properly handled
    const cleanBrand = { ...brand };

    // Handle both possible event structures
    if (Array.isArray(brand.events)) {
      // If events is an array, create a new array with the same events
      cleanBrand.events = [...brand.events];
      console.log(
        "[Dashboard] Created clean brand copy with",
        cleanBrand.events.length,
        "events (array format)"
      );
    } else if (brand.events && brand.events.items) {
      // If events is an object with items, create a new object with the same structure
      cleanBrand.events = {
        ...brand.events,
        items: [...brand.events.items],
      };
      console.log(
        "[Dashboard] Created clean brand copy with",
        cleanBrand.events.items.length,
        "events (object format)"
      );
    } else {
      // If events is in an unknown format, log it
      console.log("[Dashboard] Unknown events format in brand:", {
        eventsType: typeof brand.events,
        eventsKeys: Object.keys(brand.events),
      });
    }

    return cleanBrand;
  };

  // Add a direct access function to get brand from Redux store
  const getDirectBrandFromStore = (brandId) => {
    const storeState = store.getState();
    const allBrands = storeState.brand?.allBrands || [];

    const storeBrand = allBrands.find((b) => b._id === brandId);

    if (storeBrand) {
      console.log("[Dashboard] Found brand directly in store:", {
        brandId: storeBrand._id,
        name: storeBrand.name,
        eventsCount: Array.isArray(storeBrand.events)
          ? storeBrand.events.length
          : storeBrand.events?.items?.length || 0,
      });
    } else {
      console.log(
        "[Dashboard] Failed to find brand directly in store with ID:",
        brandId
      );
    }

    return storeBrand;
  };

  // Refactored effect to ensure proper sequence of setting selected brand, event and date
  useEffect(() => {
    // This effect runs when brands are loaded but no brand is selected
    if (brands && brands.length > 0 && !selectedBrand) {
      console.log(
        "[Dashboard] Setting initial brand from Redux (no brand selected)"
      );

      // Get the first brand
      const firstBrand = brands[0];

      // Get events immediately to find the best event to select
      let brandEvents = [];

      // Handle both possible event structures
      if (Array.isArray(firstBrand.events)) {
        brandEvents = firstBrand.events;
      } else if (
        firstBrand.events &&
        firstBrand.events.items &&
        firstBrand.events.items.length > 0
      ) {
        brandEvents = firstBrand.events.items;
      }

      console.log("[Dashboard] First brand has events:", {
        brandId: firstBrand._id,
        brandName: firstBrand.name,
        eventsCount: brandEvents.length,
      });

      // Find the best event to select (next upcoming or most recent past)
      let eventToSelect = null;
      let dateToSelect = null;

      if (brandEvents.length > 0) {
        const now = new Date();

        // First try to find the next future event
        eventToSelect = brandEvents.find((event) => {
          if (!event.date) return false;
          const eventDate = new Date(event.date);
          return eventDate > now;
        });

        // If no future events, get the most recent past event
        if (!eventToSelect) {
          const pastEvents = brandEvents
            .filter((event) => event.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

          if (pastEvents.length > 0) {
            eventToSelect = pastEvents[0]; // Most recent past event
          }
        }

        // If still no event, just use the first one
        if (!eventToSelect) {
          eventToSelect = brandEvents[0];
        }

        // Set date if we have an event
        if (eventToSelect && eventToSelect.date) {
          dateToSelect = new Date(eventToSelect.date);
        }
      }

      // Now set everything in order, but in a single render cycle
      // First set the brand
      console.log("[Dashboard] Setting selected brand:", firstBrand.name);
      setSelectedBrandWithLogging(firstBrand);

      // Then immediately set the event and date if available
      if (eventToSelect) {
        console.log("[Dashboard] Setting selected event:", eventToSelect.title);
        dispatch(setSelectedEvent(eventToSelect));

        if (dateToSelect) {
          console.log(
            "[Dashboard] Setting selected date:",
            dateToSelect.toISOString()
          );
          dispatch(setSelectedDate(dateToSelect));
        }
      }
    }
  }, [brands, selectedBrand, dispatch]);

  // One-time setup effect that runs once when component mounts to ensure we have event data
  useEffect(() => {
    // DEBUG - log the Redux store directly with full event details
    const reduxState = store.getState();
    console.log("[Dashboard] INITIAL RENDER - Redux Store FULL DETAILS:", {
      brands: reduxState.brand?.allBrands?.map((brand) => ({
        id: brand._id,
        name: brand.name,
        eventsType: brand.events
          ? Array.isArray(brand.events)
            ? "array"
            : "object"
          : "none",
        eventsCount: Array.isArray(brand.events)
          ? brand.events.length
          : brand.events?.items?.length || 0,
        hasEvents: !!brand.events,
        eventsKeys: brand.events ? Object.keys(brand.events) : [],
      })),
      selectedBrandId: reduxState.ui?.selectedBrand?._id || null,
      selectedEventId:
        reduxState.ui?.selectedEvent?._id ||
        reduxState.ui?.selectedEvent?.id ||
        null,
    });
  }, []);

  // Add a direct access to Redux store for debugging
  useEffect(() => {
    // This effect runs to check if there are any disconnects between our local variables and the store
    if (selectedBrand) {
      const currentStoreState = store.getState();
      const storeSelectedBrand = currentStoreState.ui?.selectedBrand;

      console.log("[Dashboard] STORE VS HOOKS COMPARISON:", {
        // Check if our local hook is the same as the store
        localSelectedBrandId: selectedBrand._id,
        storeSelectedBrandId: storeSelectedBrand?._id,
        sameReference: selectedBrand === storeSelectedBrand,

        // Check events specifically
        localEventsType: selectedBrand.events
          ? Array.isArray(selectedBrand.events)
            ? "array"
            : "object"
          : "none",
        storeEventsType: storeSelectedBrand?.events
          ? Array.isArray(storeSelectedBrand.events)
            ? "array"
            : "object"
          : "none",

        localEventsCount: Array.isArray(selectedBrand.events)
          ? selectedBrand.events.length
          : selectedBrand.events?.items?.length || 0,

        storeEventsCount: Array.isArray(storeSelectedBrand?.events)
          ? storeSelectedBrand.events.length
          : storeSelectedBrand?.events?.items?.length || 0,
      });
    }
  }, [selectedBrand, selectedEvent]);

  // Update the setSelectedBrandWithLogging function to use the clean copy
  const setSelectedBrandWithLogging = (brand) => {
    // Create a clean copy to avoid reference issues
    const cleanBrand = createCleanBrandCopy(brand);

    console.log("[Dashboard] DISPATCHING setSelectedBrand:", {
      brandId: cleanBrand._id,
      brandName: cleanBrand.name,
      hasEvents: !!cleanBrand.events,
      eventsType: cleanBrand.events
        ? Array.isArray(cleanBrand.events)
          ? "array"
          : "object"
        : "none",
      eventsKeys: cleanBrand.events ? Object.keys(cleanBrand.events) : [],
      eventsCount: Array.isArray(cleanBrand.events)
        ? cleanBrand.events.length
        : cleanBrand.events?.items?.length || 0,
    });

    dispatch(setSelectedBrand(cleanBrand));
  };

  // Add a more robust effect to ensure selected brand, event and date are always consistent
  useEffect(() => {
    // If we have a selected brand but it doesn't have events data
    // or the events data isn't structured properly, log a warning
    if (selectedBrand) {
      // Check if the brand has events data
      const hasValidEvents =
        (Array.isArray(selectedBrand.events) &&
          selectedBrand.events.length > 0) ||
        (selectedBrand.events?.items &&
          Array.isArray(selectedBrand.events.items) &&
          selectedBrand.events.items.length > 0);

      console.log("[Dashboard] Selected brand events validation:", {
        brandId: selectedBrand._id,
        brandName: selectedBrand.name,
        hasValidEvents,
        eventsFormat: Array.isArray(selectedBrand.events) ? "array" : "object",
        eventsCount: Array.isArray(selectedBrand.events)
          ? selectedBrand.events.length
          : selectedBrand.events?.items?.length || 0,
      });

      // If there are no valid events, try to get a fresh copy directly from the store
      if (!hasValidEvents) {
        const freshBrand = getDirectBrandFromStore(selectedBrand._id);

        if (freshBrand) {
          const freshHasEvents =
            (Array.isArray(freshBrand.events) &&
              freshBrand.events.length > 0) ||
            (freshBrand.events?.items && freshBrand.events.items.length > 0);

          if (freshHasEvents) {
            console.log(
              "[Dashboard] Fresh brand from store HAS events. Updating selected brand..."
            );
            // Create a clean copy and update Redux
            const cleanFreshBrand = createCleanBrandCopy(freshBrand);
            setSelectedBrandWithLogging(cleanFreshBrand);
            return; // Exit early since we're updating the brand
          } else {
            console.log(
              "[Dashboard] Fresh brand from store still has no events"
            );
          }
        }
      }

      // Continue with normal event selection if we have valid events
      if (hasValidEvents && !selectedEvent) {
        const brandEvents = Array.isArray(selectedBrand.events)
          ? selectedBrand.events
          : selectedBrand.events.items;

        if (brandEvents.length > 0) {
          const now = new Date();

          // First try to find the next future event
          let eventToSelect = brandEvents.find((event) => {
            if (!event.date) return false;
            return new Date(event.date) > now;
          });

          // If no future events, get the most recent past event
          if (!eventToSelect) {
            const pastEvents = brandEvents
              .filter((event) => event.date)
              .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (pastEvents.length > 0) {
              eventToSelect = pastEvents[0]; // Most recent past event
            }
          }

          // If still no event, just use the first one
          if (!eventToSelect) {
            eventToSelect = brandEvents[0];
          }

          // CRITICAL: Set these immediately one after another
          if (eventToSelect) {
            console.log(
              "[Dashboard] Auto-selecting event:",
              eventToSelect.title
            );
            dispatch(setSelectedEvent(eventToSelect));
            if (eventToSelect.date) {
              dispatch(setSelectedDate(new Date(eventToSelect.date)));
            }
          }
        }
      }
    }
  }, [selectedBrand, selectedEvent, dispatch]);

  // Redux store logging - focus on this for now
  useEffect(() => {
    // Only log when we have both user and brands data
    if (reduxUser) {
      // Reduce log frequency by only logging when important values change
      const loggingKey = `${brands?.length || 0}-${
        selectedBrand?._id || "none"
      }-${selectedEvent?._id || "none"}-${selectedDate?.toString() || "none"}`;

      console.log("🔵 REDUX STORE DATA:", {
        timestamp: new Date().toISOString(),
        loggingKey,
        user: {
          // Basic user info
          id: reduxUser._id,
          username: reduxUser.username,
          email: reduxUser.email,
          firstName: reduxUser.firstName,
          lastName: reduxUser.lastName,
        },
        brands: {
          count: brands?.length || 0,
          items:
            brands?.map((brand) => {
              // Get role information directly from the brand object
              const brandRole = brand.role || null;
              const brandRoleId = brand.roleId || brand.userRole;

              // Prepare events data if available
              const eventsData = brand.events
                ? {
                    count: Array.isArray(brand.events)
                      ? brand.events.length
                      : brand.events.items?.length || 0,
                    items: (Array.isArray(brand.events)
                      ? brand.events
                      : brand.events?.items || []
                    ).map((event) => {
                      // Format event data for logging
                      const eventData = {
                        id: event._id || event.id,
                        title: event.title,
                        date: event.date,
                        location: event.location,
                        startTime: event.startTime,
                        endTime: event.endTime,
                        isLive: event.isLive,
                      };

                      // Include code settings if available
                      if (event.codeSettings && event.codeSettings.length > 0) {
                        eventData.codeSettings = event.codeSettings.map(
                          (setting) => ({
                            id: setting._id || "",
                            name: setting.name || "",
                            type: setting.type || "",
                            isEnabled: setting.isEnabled || false,
                            isEditable: setting.isEditable || false,
                            maxPax: setting.maxPax || 1,
                            condition: setting.condition || "",
                            color: setting.color || "#2196F3", // Changed from #CCCCCC
                            limit: setting.limit || 0,
                            unlimited: setting.unlimited || false,
                          })
                        );
                      }
                      return eventData;
                    }),
                  }
                : { count: 0, items: [] };

              return {
                id: brand._id,
                name: brand.name,
                username: brand.username,
                roleId: brandRoleId || "Unknown",
                roleName: brandRole?.name || "Unknown",
                isFounder: brandRole?.isFounder || false,
                permissions: brand.role?.permissions || {},
                teamSize: brand.team?.length || brand.memberCount || 0,
                events: eventsData,
              };
            }) || [],
        },
        ui: {
          selectedBrand: selectedBrand
            ? {
                id: selectedBrand._id,
                name: selectedBrand.name,
                username: selectedBrand.username,
              }
            : null,
          selectedEvent: selectedEvent
            ? {
                id: selectedEvent._id || selectedEvent.id,
                title: selectedEvent.title,
                codeSettings: selectedEvent.codeSettings
                  ? selectedEvent.codeSettings.map((cs) => ({
                      id: cs._id || "",
                      name: cs.name || "",
                      type: cs.type || "",
                      isEnabled: cs.isEnabled || false,
                      isEditable: cs.isEditable || false,
                      maxPax: cs.maxPax || 1,
                      condition: cs.condition || "",
                      color: cs.color || "#2196F3", // Changed from #CCCCCC
                      limit: cs.limit || 0,
                      unlimited: cs.unlimited || false,
                    }))
                  : [],
              }
            : null,
          selectedDate: selectedDate
            ? new Date(selectedDate).toISOString()
            : null,
        },
      });
    }
  }, [reduxUser, brands, selectedBrand, selectedEvent, selectedDate]);

  // Fetch code settings from selected event in Redux store
  useEffect(() => {
    if (selectedEvent) {
      // Get code settings directly from the selected event in Redux
      const eventCodeSettings = selectedEvent.codeSettings || [];
      setCodeSettings(eventCodeSettings);

      // Transform permissions from the brand role into codePermissionsDetails format
      if (selectedBrand && selectedBrand.role?.permissions?.codes) {
        const codePerms = selectedBrand.role.permissions.codes;
        const permissionsArray = Object.entries(codePerms)
          .filter(
            ([name, perm]) =>
              perm && typeof perm === "object" && perm.generate === true
          )
          .map(([name, perm]) => ({
            name,
            type: name.toLowerCase().includes("friends")
              ? "friends"
              : name.toLowerCase().includes("backstage")
              ? "backstage"
              : name.toLowerCase().includes("table")
              ? "table"
              : "custom",
            generate: perm.generate,
            limit: perm.limit || 0,
            unlimited: perm.unlimited || perm.limit === 0,
          }));

        setCodePermissionsDetails(permissionsArray);
      } else {
        setCodePermissionsDetails([]);
      }
    } else {
      // Reset when no event is selected
      setCodeSettings([]);
      setCodePermissionsDetails([]);
    }
  }, [selectedEvent, selectedBrand]);

  const handleCropModeToggle = (isInCropMode) => {
    setIsCropMode(isInCropMode);
  };

  // Temporarily comment out this effect as it was causing the reference error
  /*
  useEffect(() => {
    if (codeType) {
      resetEventDateToToday();
    }
  }, [codeType, resetEventDateToToday]);
  */

  // Simplified role management - just store roles locally
  useEffect(() => {
    if (selectedBrand && selectedBrand.role) {
      setUserRoles([selectedBrand.role]);
    } else {
      setUserRoles([]);
    }
  }, [selectedBrand]);

  // Simplified permissions effect - only calculate from Redux store data
  useEffect(() => {
    if (selectedBrand && selectedBrand.role) {
      // Get permissions directly from the selected brand's role in Redux
      const role = selectedBrand.role;

      // Calculate simple access permissions from role
      const newAccessSummary = {
        canCreateCodes: !!role?.permissions?.codes?.generate,
        canReadCodes: true,
        canEditCodes: true,
        canDeleteCodes: true,
        isFounder: !!role?.isFounder,
        isMember: true,
        hasEventsPermission: !!role?.permissions?.events,
        hasTeamPermission: !!role?.permissions?.team,
        hasAnalyticsPermission: !!role?.permissions?.analytics,
        hasScannerPermission: !!role?.permissions?.scanner,
        permissions: {},
      };

      setAccessSummary(newAccessSummary);
    }
  }, [selectedBrand]);

  // Clean username to remove '@' if present
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

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  // Add a handler function to update the selected event data
  const handleEventDataUpdate = (updatedEvent) => {
    // Update the selected event with the new data
    dispatch(setSelectedEvent(updatedEvent));
  };

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  // Temporarily modify the render conditions to avoid using codeType directly
  return (
    <SocketProvider user={user}>
      <DashboardContent
        user={user}
        setUser={setUser}
        codeType={codeType}
        setCodeType={setCodeType}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showDropFiles={showDropFiles}
        setShowDropFiles={setShowDropFiles}
        showScanner={showScanner}
        setShowScanner={setShowScanner}
        showStatistic={showStatistic}
        setShowStatistic={setShowStatistic}
        showTableSystem={showTableSystem}
        setShowTableSystem={setShowTableSystem}
        handleCropModeToggle={handleCropModeToggle}
        userRoles={userRoles}
        codeSettings={codeSettings}
        codePermissionsDetails={codePermissionsDetails}
        accessSummary={accessSummary}
        isNavigationOpen={isNavigationOpen}
        setIsNavigationOpen={setIsNavigationOpen}
      />
    </SocketProvider>
  );
};

// Dashboard content component
const DashboardContent = ({
  user,
  setUser,
  codeType,
  setCodeType,
  showSettings,
  setShowSettings,
  showDropFiles,
  setShowDropFiles,
  showScanner,
  setShowScanner,
  showStatistic,
  setShowStatistic,
  showTableSystem,
  setShowTableSystem,
  handleCropModeToggle,
  userRoles,
  codeSettings,
  codePermissionsDetails,
  accessSummary,
  isNavigationOpen,
  setIsNavigationOpen,
}) => {
  const { isConnected } = useSocket();
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // UI state selectors from Redux
  const selectedBrand = useSelector(selectSelectedBrand);
  const selectedEvent = useSelector(selectSelectedEvent);
  const selectedDate = useSelector(selectSelectedDate);

  // Current event context
  const {
    currentEventDate,
    dataInterval,
    handlePrevWeek,
    handleNextWeek,
    resetEventDateToToday,
  } = useCurrentEvent();

  const startingEventString = "15052024";
  const startingEventDate = moment(startingEventString, "DDMMYYYY");

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  // Add a handler function to update the selected event data
  const handleEventDataUpdate = (updatedEvent) => {
    // Update the selected event with the new data
    dispatch(setSelectedEvent(updatedEvent));
  };

  // Simplified conditional rendering based on props
  if (codeType === "Table") {
    return (
      <TableSystem
        user={user}
        onClose={() => setCodeType("")}
        currentEventDate={currentEventDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
        refreshCounts={() => {}}
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
        currentEventDate={currentEventDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        isStartingEvent={currentEventDate.isSame(startingEventDate, "day")}
        refreshCounts={() => {}}
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
          setUser={setUser}
          userRoles={userRoles}
          isOnline={isConnected}
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
