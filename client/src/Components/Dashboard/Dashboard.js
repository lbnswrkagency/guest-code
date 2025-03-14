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

  // Get Redux store data
  const reduxUser = useSelector(selectUser);
  const brands = useSelector(selectAllBrands);

  // Get selections from UI Redux state
  const selectedBrand = useSelector(selectSelectedBrand);
  const selectedEvent = useSelector(selectSelectedEvent);
  const selectedDate = useSelector(selectSelectedDate);

  // Get brand context
  const { fetchUserBrands } = useBrands();

  // Redux store logging
  useEffect(() => {
    // Only log when we have both user and brands data
    if (reduxUser) {
      console.log("🔵 REDUX STORE DATA:", {
        timestamp: new Date().toISOString(),
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
                            color: setting.color || "#CCCCCC",
                            limit: setting.limit || 0,
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
                      color: cs.color || "#CCCCCC",
                      limit: cs.limit || 0,
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

  // Set default selected brand and event when Redux data is available
  useEffect(() => {
    if (brands && brands.length > 0 && !selectedBrand) {
      // Select the first brand by default
      const firstBrand = brands[0];
      dispatch(setSelectedBrand(firstBrand));

      // If this brand has events, select the first event
      if (
        firstBrand.events &&
        Array.isArray(firstBrand.events) &&
        firstBrand.events.length > 0
      ) {
        const firstEvent = firstBrand.events[0];
        dispatch(setSelectedEvent(firstEvent));
      } else if (
        firstBrand.events &&
        firstBrand.events.items &&
        firstBrand.events.items.length > 0
      ) {
        // Alternative structure if events are in a nested 'items' property
        const firstEvent = firstBrand.events.items[0];
        dispatch(setSelectedEvent(firstEvent));
      }
    }
  }, [brands, selectedBrand, dispatch]);

  // Fetch code settings for events based on permissions
  useEffect(() => {
    // Only proceed if we have a selected brand with appropriate permissions
    if (selectedBrand && selectedBrand.role?.permissions?.codes) {
      // Check if user has any code generation permissions
      const codesPermissions = selectedBrand.role.permissions.codes;
      const codePermissionEntries = Object.entries(codesPermissions).filter(
        ([key, value]) => typeof value === "object" && value.generate === true
      );

      const hasAnyCodePermission = codePermissionEntries.length > 0;

      if (hasAnyCodePermission) {
        // Get all events for the selected brand
        let brandEvents = [];
        if (Array.isArray(selectedBrand.events)) {
          brandEvents = selectedBrand.events;
        } else if (
          selectedBrand.events &&
          Array.isArray(selectedBrand.events.items)
        ) {
          brandEvents = selectedBrand.events.items;
        }

        // For each event, fetch code settings if not already fetched
        brandEvents.forEach(async (event) => {
          // Skip if event already has code settings
          if (event.codeSettings && event.codeSettings.length > 0) {
            return;
          }

          const eventId = event._id || event.id;
          if (!eventId) {
            return;
          }

          try {
            // Fetch code settings for this event using correct endpoint
            console.log(
              `Fetching code settings for event ${eventId} (${event.title})`
            );

            // Try the API route without /api prefix first
            const response = await axiosInstance.get(
              `/code-settings/events/${eventId}`
            );

            if (response.data && Array.isArray(response.data)) {
              // Add debugging to check what's coming from the API
              console.log(
                "📦 Raw code settings response:",
                JSON.stringify(response.data[0], null, 2)
              );

              // Filter for custom codes or codes that user has permission for
              const customCodeSettings = response.data.filter(
                (setting) =>
                  setting.type === "custom" ||
                  setting.type === "friends" ||
                  setting.type === "table" ||
                  setting.type === "backstage"
              );

              // If we found any relevant code settings, update the event in Redux
              if (customCodeSettings.length > 0) {
                console.log(
                  "🔍 Filtered code settings:",
                  JSON.stringify(customCodeSettings[0], null, 2)
                );

                // Update event with code settings
                dispatch(
                  updateEventInBrand({
                    brandId: selectedBrand._id,
                    eventId: eventId,
                    eventData: {
                      ...event,
                      codeSettings: customCodeSettings,
                    },
                  })
                );

                // Update selected event if it matches
                if (
                  selectedEvent &&
                  (selectedEvent._id === eventId ||
                    selectedEvent.id === eventId)
                ) {
                  dispatch(
                    setSelectedEvent({
                      ...selectedEvent,
                      codeSettings: customCodeSettings,
                    })
                  );
                }
              }
            }
          } catch (error) {
            // Try alternative endpoint with /api prefix if first attempt fails
            try {
              console.log(
                `Trying alternative endpoint /api/code-settings/events/${eventId}`
              );
              const alternativeResponse = await axiosInstance.get(
                `/api/code-settings/events/${eventId}`
              );

              if (
                alternativeResponse.data &&
                Array.isArray(alternativeResponse.data)
              ) {
                // Debug log
                console.log(
                  "📦 Raw code settings (alternative):",
                  JSON.stringify(alternativeResponse.data[0], null, 2)
                );

                const customCodeSettings = alternativeResponse.data.filter(
                  (setting) =>
                    setting.type === "custom" ||
                    setting.type === "friends" ||
                    setting.type === "table" ||
                    setting.type === "backstage"
                );

                if (customCodeSettings.length > 0) {
                  console.log(
                    "🔍 Filtered code settings (alternative):",
                    JSON.stringify(customCodeSettings[0], null, 2)
                  );

                  dispatch(
                    updateEventInBrand({
                      brandId: selectedBrand._id,
                      eventId: eventId,
                      eventData: {
                        ...event,
                        codeSettings: customCodeSettings,
                      },
                    })
                  );

                  if (
                    selectedEvent &&
                    (selectedEvent._id === eventId ||
                      selectedEvent.id === eventId)
                  ) {
                    dispatch(
                      setSelectedEvent({
                        ...selectedEvent,
                        codeSettings: customCodeSettings,
                      })
                    );
                  }
                }
              }
            } catch (alternativeError) {
              console.error(
                `Failed to fetch code settings from both endpoints:`,
                error.message,
                alternativeError.message
              );
              toast?.error(
                `Could not load code settings for this event: ${error.message}`
              );
            }
          }
        });
      }
    }
  }, [selectedBrand, selectedEvent, dispatch, toast]);

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

  // Add an effect to fetch events for each brand if needed
  useEffect(() => {
    const fetchEventsForBrands = async () => {
      // Only proceed if we have brands
      if (brands && brands.length > 0) {
        // Find brands with either no events property or empty events array
        const brandsToFetch = brands.filter(
          (brand) =>
            !brand.events ||
            (Array.isArray(brand.events) && brand.events.length === 0) ||
            (brand.events &&
              Array.isArray(brand.events.items) &&
              brand.events.items.length === 0)
        );

        if (brandsToFetch.length > 0) {
          for (const brand of brandsToFetch) {
            try {
              // Step 1: Fetch parent events first
              const url = `/events/brand/${brand._id}`;
              const response = await axiosInstance.get(url);

              if (response.data && Array.isArray(response.data)) {
                // Step 2: For each parent event that is weekly, fetch its child events
                const parentEvents = [...response.data];
                const allEvents = [...parentEvents];

                // Find weekly events that might have children
                const weeklyEvents = parentEvents.filter(
                  (event) => event.isWeekly
                );

                if (weeklyEvents.length > 0) {
                  // Fetch children for each weekly parent event
                  for (const weeklyEvent of weeklyEvents) {
                    try {
                      const childUrl = `/events/children/${weeklyEvent._id}`;
                      const childResponse = await axiosInstance.get(childUrl);

                      if (
                        childResponse.data &&
                        Array.isArray(childResponse.data)
                      ) {
                        // Add children to our events array
                        allEvents.push(...childResponse.data);
                      }
                    } catch (childError) {
                      console.error(
                        `Error fetching child events for event ${weeklyEvent._id}:`,
                        childError.message
                      );
                    }
                  }
                }

                // Now dispatch all events (parents and children) to Redux
                dispatch(
                  addEventsToBrand({
                    brandId: brand._id,
                    events: allEvents,
                  })
                );

                // If this is the currently selected brand or no brand is selected yet,
                // update the selected brand and default event
                if (
                  !selectedBrand ||
                  (selectedBrand && selectedBrand._id === brand._id)
                ) {
                  // Get the updated brand with events from the Redux store
                  const updatedBrands = store.getState().brand.allBrands;
                  const updatedBrand = updatedBrands.find(
                    (b) => b._id === brand._id
                  );

                  if (updatedBrand) {
                    dispatch(setSelectedBrand(updatedBrand));

                    // If this brand has events, select the first one
                    if (allEvents.length > 0) {
                      const firstEvent = allEvents[0];
                      dispatch(setSelectedEvent(firstEvent));
                    }
                  }
                }
              }
            } catch (error) {
              console.error(
                `Error fetching events for brand ${brand.name}:`,
                error.message
              );
            }
          }
        }
      }
    };

    fetchEventsForBrands();
  }, [brands, dispatch, selectedBrand]);

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

// Dashboard content component
const DashboardContent = ({ user, setUser }) => {
  const { isConnected } = useSocket();
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // UI state selectors from Redux
  const selectedBrand = useSelector(selectSelectedBrand);
  const selectedEvent = useSelector(selectSelectedEvent);
  const selectedDate = useSelector(selectSelectedDate);

  // Component state
  const [showSettings, setShowSettings] = useState(false);
  const [showDropFiles, setShowDropFiles] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showStatistic, setShowStatistic] = useState(false);
  const [codeType, setCodeType] = useState("");
  const [isCropMode, setIsCropMode] = useState(false);
  const [showTableSystem, setShowTableSystem] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [codeSettings, setCodeSettings] = useState([]);
  const [codePermissionsDetails, setCodePermissionsDetails] = useState([]);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  // Fetch code settings for selected event and update local state
  useEffect(() => {
    if (selectedEvent) {
      // Check if the event has code settings
      const eventCodeSettings = selectedEvent.codeSettings || [];
      if (eventCodeSettings.length > 0) {
        console.log("Event code settings for UI:", eventCodeSettings[0]);
      }
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
      }
    } else {
      // Reset when no event is selected
      setCodeSettings([]);
      setCodePermissionsDetails([]);
    }
  }, [selectedEvent, selectedBrand]);

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

  // Access summary state - can be derived from selectedBrand
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

  const handleCropModeToggle = (isInCropMode) => {
    setIsCropMode(isInCropMode);
  };

  useEffect(() => {
    if (codeType) {
      resetEventDateToToday();
    }
  }, [codeType, resetEventDateToToday]);

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
