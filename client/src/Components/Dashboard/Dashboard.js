// Dashboard.js
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.scss";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import { selectAllBrands } from "../../redux/brandSlice";
import { selectAllEvents } from "../../redux/eventsSlice";
import { selectAllRoles, selectUserRoleForBrand } from "../../redux/rolesSlice";
import {
  selectAllCodeSettings,
  selectCodeSettingsByEventId,
} from "../../redux/codeSettingsSlice";
import { selectAllLineups } from "../../redux/lineupSlice";
import { store } from "../../redux/store";
import { logout } from "../AuthForm/Login/LoginFunction";
import Navigation from "../Navigation/Navigation";
import DashboardHeader from "../DashboardHeader/DashboardHeader";
import DashboardMenu from "../DashboardMenu/DashboardMenu";
import DashboardFeed from "../DashboardFeed/DashboardFeed";
import CodeGenerator from "../CodeGenerator/CodeGenerator";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import TableSystem from "../TableSystem/TableSystem";
import Scanner from "../Scanner/Scanner";
import Analytics from "../Analytics/Analytics";
import { motion } from "framer-motion";
import { RiArrowUpSLine } from "react-icons/ri";

const Dashboard = () => {
  const navigate = useNavigate();
  const hasLoggedStore = useRef(false);

  // Get Redux store data
  const user = useSelector(selectUser);
  const brands = useSelector(selectAllBrands);
  const events = useSelector(selectAllEvents);
  const roles = useSelector(selectAllRoles);
  const codeSettings = useSelector(selectAllCodeSettings);
  const lineups = useSelector(selectAllLineups);
  const userRoles = useSelector((state) => state.roles?.userRoles || {});

  // State for selected brand and date
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // State for menu functionality
  const [showStatistic, setShowStatistic] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [codeType, setCodeType] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showDropFiles, setShowDropFiles] = useState(false);
  const [showTableSystem, setShowTableSystem] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [shouldRefreshNav, setShouldRefreshNav] = useState(false);

  // Add debug logger for navigation state
  const toggleNavigation = (isOpen) => {
    // Broadcast navigation state change to other components
    window.dispatchEvent(
      new CustomEvent("navigationStateChanged", {
        detail: { isOpen },
      })
    );

    setIsNavigationOpen(isOpen);
  };

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      navigate("/login");
      return;
    }

    // Mark data as loaded
    if (!hasLoggedStore.current) {
      hasLoggedStore.current = true;
    }
  }, [user, brands, events, roles, codeSettings, navigate]);

  // Listen for alpha access granted event
  useEffect(() => {
    const handleAlphaAccessGranted = (event) => {
      if (
        event.detail.userId === user?._id ||
        event.detail.userId === user?.id
      ) {
        // Get the latest user from Redux store
        const latestUser = store.getState().user;

        // Double-check that the Redux store has the updated isAlpha status
        if (!latestUser.isAlpha) {
          // Force the Redux store update if somehow it wasn't updated
          store.dispatch({
            type: "user/updateUser",
            payload: { ...latestUser, isAlpha: true },
          });
        }

        // Close the navigation menu first
        setIsNavigationOpen(false);

        // Set refresh flag to force complete re-render of navigation
        setShouldRefreshNav((prevState) => !prevState);

        // Wait for closing animation to complete, then reopen with updated state
        setTimeout(() => {
          setIsNavigationOpen(true);
        }, 500);
      }
    };

    window.addEventListener("alphaAccessGranted", handleAlphaAccessGranted);

    return () => {
      window.removeEventListener(
        "alphaAccessGranted",
        handleAlphaAccessGranted
      );
    };
  }, [user]);

  // Reset refresh flag after render
  useEffect(() => {
    if (shouldRefreshNav) {
      setShouldRefreshNav(false);
    }
  }, [shouldRefreshNav]);

  // Find the next upcoming event date or the most recent past event if no upcoming events
  const findNextUpcomingEventDate = (brandEvents) => {
    if (!brandEvents || brandEvents.length === 0) return null;

    const now = new Date();

    // Filter for upcoming and ongoing events
    const upcomingEvents = brandEvents.filter((event) => {
      // Skip events with no date information
      if (!event.startDate && !event.date) return false;

      // Get the event date and time - prioritize startDate over date
      const eventDate = event.startDate
        ? new Date(event.startDate)
        : new Date(event.date);

      // Parse end time (HH:MM format) or use end of day
      let eventEndDateTime = new Date(eventDate);
      if (event.endTime) {
        const [hours, minutes] = event.endTime.split(":").map(Number);
        eventEndDateTime.setHours(hours, minutes, 0, 0);

        // If end time is earlier than start time, it's the next day
        if (event.startTime) {
          const [startHours, startMinutes] = event.startTime
            .split(":")
            .map(Number);
          if (
            hours < startHours ||
            (hours === startHours && minutes < startMinutes)
          ) {
            eventEndDateTime.setDate(eventEndDateTime.getDate() + 1);
          }
        }
      } else {
        // Default to end of day
        eventEndDateTime.setHours(23, 59, 59, 999);
      }

      // An event is upcoming if it hasn't ended yet
      return eventEndDateTime > now;
    });

    // Sort upcoming events by date (ascending)
    if (upcomingEvents.length > 0) {
      upcomingEvents.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date(a.date);
        const dateB = b.startDate ? new Date(b.startDate) : new Date(b.date);
        return dateA - dateB;
      });

      // Get the most imminent event
      const nextEvent = upcomingEvents[0];
      const nextEventDate = nextEvent.startDate || nextEvent.date;
      return new Date(nextEventDate).toISOString().split("T")[0];
    }

    // If no upcoming events, find the most recent past event
    const pastEvents = brandEvents.filter((event) => {
      if (!event.startDate && !event.date) return false;
      const eventDate = event.startDate
        ? new Date(event.startDate)
        : new Date(event.date);
      return eventDate <= now;
    });

    if (pastEvents.length > 0) {
      // Sort by date descending to get the most recent
      pastEvents.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date(a.date);
        const dateB = b.startDate ? new Date(b.startDate) : new Date(b.date);
        return dateB - dateA;
      });

      const recentEvent = pastEvents[0];
      return new Date(recentEvent.startDate || recentEvent.date)
        .toISOString()
        .split("T")[0];
    }

    return null;
  };

  // Find the brand with the most imminent upcoming event
  const findBrandWithNextEvent = () => {
    if (brands.length === 0) return null;

    const now = new Date();
    let nextEventBrand = null;
    let nextEventDate = null;
    let closestTimeDiff = Infinity;

    // Check each brand for their next upcoming event
    for (const brand of brands) {
      const brandWithData = prepareBrandWithData(brand);
      const brandEvents = brandWithData.events || [];

      // Skip if brand has no events
      if (brandEvents.length === 0) continue;

      // First check for active events (ongoing right now)
      const activeEvents = brandEvents.filter((event) => {
        // Skip events without any date information
        if (!event.startDate && !event.date) return false;

        // Get the event date - prioritize startDate
        const eventDate = event.startDate
          ? new Date(event.startDate)
          : new Date(event.date);

        // Calculate end date/time
        let eventEndDateTime;
        if (event.endDate) {
          // If event has explicit end date, use it
          eventEndDateTime = new Date(event.endDate);

          // If there's an endTime, set it on the end date
          if (event.endTime) {
            const [hours, minutes] = event.endTime.split(":").map(Number);
            eventEndDateTime.setHours(hours, minutes, 0, 0);
          }
        } else if (event.endTime && eventDate) {
          // If only endTime exists, calculate endDate based on eventDate
          eventEndDateTime = new Date(eventDate);
          const [hours, minutes] = event.endTime.split(":").map(Number);

          // If end time is earlier than start time, it means it ends the next day
          if (event.startTime) {
            const [startHours, startMinutes] = event.startTime
              .split(":")
              .map(Number);
            if (
              hours < startHours ||
              (hours === startHours && minutes < startMinutes)
            ) {
              eventEndDateTime.setDate(eventEndDateTime.getDate() + 1);
            }
          }

          eventEndDateTime.setHours(hours, minutes, 0, 0);
        } else {
          // If no end date/time info, assume event ends same day at 23:59
          eventEndDateTime = new Date(eventDate);
          eventEndDateTime.setHours(23, 59, 59, 999);
        }

        // An event is active if it has started but not ended yet
        return eventDate <= now && eventEndDateTime >= now;
      });

      // If we found active events, prioritize them over future events
      if (activeEvents.length > 0) {
        // Sort active events by end time (soonest ending first)
        const sortedActiveEvents = activeEvents.sort((a, b) => {
          const getEndDate = (event) => {
            const baseDate = event.endDate
              ? new Date(event.endDate)
              : event.startDate
              ? new Date(event.startDate)
              : new Date(event.date);

            if (event.endTime) {
              const [hours, minutes] = event.endTime.split(":").map(Number);
              baseDate.setHours(hours, minutes, 0, 0);

              // If end time is earlier than start time, it's the next day
              if (event.startTime) {
                const [startHours, startMinutes] = event.startTime
                  .split(":")
                  .map(Number);
                if (
                  hours < startHours ||
                  (hours === startHours && minutes < startMinutes)
                ) {
                  baseDate.setDate(baseDate.getDate() + 1);
                }
              }
            }
            return baseDate;
          };

          return getEndDate(a) - getEndDate(b);
        });

        // Use the active event with the soonest end time
        const activeEvent = sortedActiveEvents[0];
        nextEventBrand = brandWithData;
        nextEventDate = new Date(activeEvent.startDate || activeEvent.date)
          .toISOString()
          .split("T")[0];

        // This is active, so it has the highest priority
        return { brand: nextEventBrand, date: nextEventDate };
      }

      // If no active events, filter for upcoming events
      const upcomingEvents = brandEvents.filter((event) => {
        // Skip events without any date information
        if (!event.startDate && !event.date) return false;

        // Get the event date - prioritize startDate
        const eventDate = event.startDate
          ? new Date(event.startDate)
          : new Date(event.date);

        // Include time information for more accurate comparison
        return eventDate > now;
      });

      // Sort by date (ascending)
      const sortedEvents = upcomingEvents.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date(a.date);
        const dateB = b.startDate ? new Date(b.startDate) : new Date(b.date);
        return dateA - dateB;
      });

      if (sortedEvents.length > 0) {
        // Find the event closest to now
        const closestEvent = sortedEvents[0];
        const eventDate = closestEvent.startDate
          ? new Date(closestEvent.startDate)
          : new Date(closestEvent.date);
        const timeDiff = eventDate - now;

        // Set as next event date if it's closer than current closest
        if (timeDiff < closestTimeDiff) {
          closestTimeDiff = timeDiff;
          nextEventBrand = brandWithData;
          nextEventDate = new Date(closestEvent.startDate || closestEvent.date)
            .toISOString()
            .split("T")[0];
        }
      }
    }

    // If no upcoming events found across all brands, use the first brand
    if (!nextEventBrand) {
      nextEventBrand = prepareBrandWithData(brands[0]);
      // Find the most recent past event for this brand
      nextEventDate = findNextUpcomingEventDate(nextEventBrand.events);
    }

    return { brand: nextEventBrand, date: nextEventDate };
  };

  // Set initial selected brand when brands are loaded
  useEffect(() => {
    if (brands.length > 0 && !selectedBrand) {
      // Find the brand with the next upcoming event
      const { brand, date } = findBrandWithNextEvent();

      if (brand) {
        setSelectedBrand(brand);
        if (date) {
          setSelectedDate(date);
        }
      } else {
        // Fallback to first brand if no brand with events found
        const firstBrand = prepareBrandWithData(brands[0]);
        setSelectedBrand(firstBrand);
      }
    }
  }, [brands]);

  // Update selected event when brand or date changes
  useEffect(() => {
    if (selectedBrand && selectedDate) {
      // Find event for the selected date
      const brandEvents = selectedBrand.events || [];
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];

      const eventForDate = brandEvents.find((event) => {
        if (!event.startDate && !event.date) return false;

        // Format date for comparison - prioritize startDate
        const eventDateStr = event.startDate
          ? new Date(event.startDate).toISOString().split("T")[0]
          : new Date(event.date).toISOString().split("T")[0];

        return eventDateStr === formattedDate;
      });

      setSelectedEvent(eventForDate || null);
    } else {
      setSelectedEvent(null);
    }
  }, [selectedBrand, selectedDate]);

  // Prepare brand with events and role data
  const prepareBrandWithData = (brand) => {
    // Get user's role for this brand
    const userRoleId = userRoles[brand._id];
    const userRole = roles.find((role) => role._id === userRoleId);

    // Get events for this brand
    const brandEvents = events.filter((event) => event.brand === brand._id);

    // Get lineups for this brand
    const brandLineups = lineups.filter(
      (lineup) => lineup.brandId === brand._id
    );

    // Calculate team size
    const teamSize = (brand.team?.length || 0) + (brand.owner ? 1 : 0);

    return {
      ...brand,
      role: userRole,
      events: brandEvents,
      lineups: brandLineups,
      teamSize,
    };
  };

  // Get code settings for the selected brand
  const getCodeSettingsForBrand = () => {
    if (!selectedBrand) return [];

    // Get events for this brand
    const brandEvents = selectedBrand.events || [];

    // Get all code settings for these events
    const brandCodeSettings = brandEvents.flatMap((event) => {
      return codeSettings.filter((setting) => setting.eventId === event._id);
    });

    return brandCodeSettings;
  };

  // Get code settings for the selected event
  const getCodeSettingsForSelectedEvent = () => {
    if (!selectedEvent) return [];

    // Filter code settings for the selected event
    return codeSettings.filter(
      (setting) => setting.eventId === selectedEvent._id
    );
  };

  // Get user's role permissions for the selected brand
  const getUserRolePermissions = () => {
    if (!selectedBrand || !selectedBrand.role) return null;
    return selectedBrand.role.permissions;
  };

  // Prepare code permissions based on the user's role
  const prepareCodePermissions = () => {
    const permissions = getUserRolePermissions();
    if (!permissions || !permissions.codes) return [];

    // Convert the codes Map to an array of objects
    return Object.entries(permissions.codes).map(([name, permission]) => ({
      name,
      type: name,
      generate: permission.generate || false,
      limit: permission.limit || 0,
      unlimited: permission.unlimited || false,
    }));
  };

  // Prepare access summary for the DashboardMenu
  const prepareAccessSummary = () => {
    const permissions = getUserRolePermissions();
    if (!permissions) return {};

    return {
      canCreateCodes:
        permissions.codes &&
        Object.values(permissions.codes).some((p) => p.generate),
      canReadCodes: true, // Assuming read access is always granted if they have any code permissions
      canEditCodes: false, // These would need to be determined based on your app's logic
      canDeleteCodes: false,
    };
  };

  // Prepare all brands with data
  const brandsWithData = brands.map(prepareBrandWithData);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleBack = () => {
    handleLogout();
  };

  // Handle brand selection
  const handleSelectBrand = (brand) => {
    // Prepare the brand with events data
    const brandWithData = prepareBrandWithData(brand);
    setSelectedBrand(brandWithData);

    // Find the next upcoming event date for the newly selected brand
    const nextEventDate = findNextUpcomingEventDate(brandWithData.events);

    if (nextEventDate) {
      setSelectedDate(nextEventDate);
    } else {
      setSelectedDate(null); // No upcoming events for this brand
    }

    setSelectedEvent(null); // Reset event when brand changes
  };

  // Handle date selection
  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  // Add a helper function to force the navigation to render properly
  const forceNavigationRender = () => {
    // Force a re-render cycle for the navigation
    setIsNavigationOpen(false);
    setTimeout(() => setIsNavigationOpen(true), 50);
  };

  // Add effect to handle component transitions
  useEffect(() => {
    // When any of these states change, it means we're switching views
    if (codeType || showScanner || showStatistic || showTableSystem) {
      // If a new component is shown and navigation was open, ensure it stays open
      if (isNavigationOpen) {
        // Short delay to ensure state propagation
        setTimeout(() => {
          setIsNavigationOpen(true);
        }, 100);
      }
    }
  }, [codeType, showScanner, showStatistic, showTableSystem, isNavigationOpen]);

  // Add global navigation event handlers
  useEffect(() => {
    // Handle menu button clicks from any Navigation component
    const handleGlobalMenuClick = (event) => {
      toggleNavigation(true);
    };

    // Listen for the custom navigation events
    window.addEventListener("navigationMenuClick", handleGlobalMenuClick);

    // Broadcast that Dashboard is the active controller
    window.dispatchEvent(
      new CustomEvent("dashboardMounted", {
        detail: { navigationController: true },
      })
    );

    return () => {
      window.removeEventListener("navigationMenuClick", handleGlobalMenuClick);
    };
  }, []);

  // Add listener for table system open requests
  useEffect(() => {
    const handleOpenTableSystem = (e) => {
      if (e.detail && e.detail.event) {
        // Set the selected event if needed
        if (!selectedEvent || selectedEvent._id !== e.detail.event._id) {
          // Find the event in the events list
          const targetEvent = events.find(
            (event) => event._id === e.detail.event._id
          );

          if (targetEvent) {
            setSelectedEvent(targetEvent);
          }
        }

        // Open the table system
        setShowTableSystem(true);
      }
    };

    window.addEventListener("openTableSystem", handleOpenTableSystem);

    return () => {
      window.removeEventListener("openTableSystem", handleOpenTableSystem);
    };
  }, [selectedEvent, events, setSelectedEvent, setShowTableSystem]);

  if (!user) return null;

  // Get the user's role for the selected brand
  const userRoleForSelectedBrand = selectedBrand?.role
    ? [selectedBrand.role]
    : [];
  const brandCodeSettings = getCodeSettingsForBrand();
  const codePermissions = prepareCodePermissions();
  const accessSummary = prepareAccessSummary();

  // Check if user has no brands
  const hasNoBrands = brands.length === 0;

  return (
    <div className="dashboard">
      <Navigation
        onBack={handleBack}
        onMenuClick={() => {
          toggleNavigation(true);

          // Dispatch a global event to ensure all components are notified
          window.dispatchEvent(
            new CustomEvent("navigationMenuClick", {
              detail: { source: "dashboard" },
            })
          );
        }}
        onLogout={handleLogout}
      />
      <div className="dashboard-content">
        {codeType ? (
          <CodeGenerator
            user={user}
            onClose={() => {
              setCodeType("");
              // Preserve navigation state when closing
              if (isNavigationOpen)
                setTimeout(() => setIsNavigationOpen(true), 50);
            }}
            type={codeType}
            codeSettings={getCodeSettingsForSelectedEvent()}
            codePermissions={codePermissions}
            accessSummary={accessSummary}
            selectedBrand={selectedBrand}
            selectedEvent={selectedEvent}
            refreshCounts={() => {
              // Force a refresh of the dashboard data if needed
              store.dispatch({ type: "FORCE_REFRESH" });
            }}
            onEventDataUpdate={(updatedEvent) => {
              // Event data updated handler
            }}
          />
        ) : showScanner ? (
          <Scanner
            user={user}
            onClose={() => {
              setShowScanner(false);
              // Preserve navigation state when closing
              if (isNavigationOpen)
                setTimeout(() => setIsNavigationOpen(true), 50);
            }}
            selectedEvent={selectedEvent}
            selectedBrand={selectedBrand}
          />
        ) : showStatistic ? (
          <Analytics
            user={user}
            onClose={() => {
              setShowStatistic(false);
              // Preserve navigation state when closing
              if (isNavigationOpen)
                setTimeout(() => setIsNavigationOpen(true), 50);
            }}
            selectedBrand={selectedBrand}
            selectedEvent={selectedEvent}
          />
        ) : showTableSystem ? (
          <TableSystem
            user={user}
            userRoles={userRoleForSelectedBrand}
            onClose={() => {
              setShowTableSystem(false);
              // Preserve navigation state when closing
              if (isNavigationOpen)
                setTimeout(() => setIsNavigationOpen(true), 50);
            }}
            refreshCounts={() => {
              // Force refresh
              store.dispatch({ type: "FORCE_REFRESH" });
            }}
            selectedEvent={selectedEvent}
            selectedBrand={selectedBrand}
            counts={{ tableCounts: [] }}
          />
        ) : (
          <>
            {/* Golden Arrow Guide for new users with no brands */}

            <DashboardHeader
              user={user}
              brandsCount={brands.length}
              eventsCount={events.length}
              brands={brandsWithData}
              selectedBrand={selectedBrand}
              setSelectedBrand={handleSelectBrand}
              selectedDate={selectedDate}
              setSelectedDate={handleSelectDate}
            />
            <DashboardMenu
              userRoles={userRoleForSelectedBrand}
              user={user}
              selectedBrand={selectedBrand}
              selectedEvent={selectedEvent}
              codeSettings={brandCodeSettings}
              codePermissions={codePermissions}
              accessSummary={accessSummary}
              setShowStatistic={setShowStatistic}
              setShowScanner={setShowScanner}
              setCodeType={setCodeType}
              setShowSettings={setShowSettings}
              setShowDropFiles={setShowDropFiles}
              setShowTableSystem={setShowTableSystem}
              isOnline={true}
            />
            <DashboardFeed
              selectedBrand={selectedBrand}
              selectedDate={selectedDate}
              selectedEvent={selectedEvent}
            />
          </>
        )}
      </div>

      <DashboardNavigation
        isOpen={isNavigationOpen}
        onClose={() => {
          toggleNavigation(false);
        }}
        currentUser={user}
        setUser={(updatedUser) => {
          store.dispatch({
            type: "user/updateUser",
            payload: updatedUser,
          });
        }}
      />
    </div>
  );
};

export default Dashboard;
