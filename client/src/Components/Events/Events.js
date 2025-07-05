import React, { useState, useEffect, useContext } from "react";
import "./Events.scss";
import { motion } from "framer-motion";
import {
  RiAddCircleLine,
  RiEditLine,
  RiSettings4Line,
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiTeamLine,
  RiGroupLine,
  RiAddLine,
  RiBroadcastLine,
  RiEyeLine,
  RiEyeOffLine,
  RiArrowLeftLine,
  RiSettings3Line,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiGlobalLine,
  RiRepeatLine,
} from "react-icons/ri";
import EventForm from "../EventForm/EventForm";
import EventSettings from "../EventSettings/EventSettings";
import Navigation from "../Navigation/Navigation";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectAllBrands } from "../../redux/brandSlice";
import { selectAllRoles } from "../../redux/rolesSlice";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import AuthContext from "../../contexts/AuthContext";
import ProgressiveImage from "../ProgressiveImage/ProgressiveImage";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

// Helper function to check if a user has permissions to edit an event
const hasEventPermissions = (event, user, userBrands) => {
  // If no user or event, permission denied
  if (!user || !event) {
    return false;
  }

  // Get the brand associated with this event
  const eventBrand = userBrands?.find(
    (b) =>
      b._id === event.brand ||
      (typeof event.brand === "object" && b._id === event.brand._id)
  );

  if (!eventBrand) {
    return false;
  }

  // If user is the brand owner, they have permission
  const ownerId =
    typeof eventBrand.owner === "object"
      ? eventBrand.owner._id
      : eventBrand.owner;
  const userId = user._id;

  if (ownerId === userId) {
    return true;
  }

  // Check if the brand has the user's role attached (from Redux resolution)
  if (eventBrand.role && eventBrand.role.permissions) {
    // Use the resolved role permissions
    return eventBrand.role.permissions.events?.edit === true;
  }

  // Fallback to the original logic for backward compatibility
  if (eventBrand.team && Array.isArray(eventBrand.team)) {
    // Find the team member by comparing user IDs
    const teamMember = eventBrand.team.find((member) => {
      const memberId =
        typeof member.user === "object" ? member.user._id : member.user;
      return memberId === userId;
    });

    if (teamMember) {
      // Parse permissions if they're a string
      let parsedPermissions = teamMember.permissions;

      // Check if permissions is a string and try to parse it
      if (typeof teamMember.permissions === "string") {
        try {
          parsedPermissions = JSON.parse(teamMember.permissions);
        } catch (error) {
          parsedPermissions = {};
        }
      }

      // Define roles that should have edit permissions by default
      const editRoles = [
        "OWNER",
        "ADMIN",
        "MANAGER",
        "HOST",
        "VERANSTALTER",
        "ORGANIZER",
        "EDITOR",
        "BOSS",
        "MEDIA MANAGER",
      ];

      // Check if the user's role is in the editRoles list (case insensitive)
      const hasEditRole =
        teamMember.role &&
        editRoles.some(
          (role) => role.toUpperCase() === teamMember.role.toUpperCase()
        );

      // If the role is in our editRoles list, grant permission
      if (hasEditRole) {
        return true;
      }

      // Check the permissions object
      if (parsedPermissions) {
        // Check if the team member has edit permissions for events
        const hasEditPermission = parsedPermissions?.events?.edit === true;

        // If the permissions object has events.edit defined, use that value
        if (typeof parsedPermissions?.events?.edit === "boolean") {
          return hasEditPermission;
        }
      }

      return false;
    }
  }

  return false;
};

const Events = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // Get Redux store data
  const brands = useSelector(selectAllBrands);
  const roles = useSelector(selectAllRoles);
  const userRoles = useSelector((state) => state.roles?.userRoles || {});
  
  const [userBrands, setUserBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEventForSettings, setSelectedEventForSettings] =
    useState(null);
  const toast = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0); // Track current week for navigation
  const [isLive, setIsLive] = useState(false); // Track live status
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [parentEventForForm, setParentEventForForm] = useState(null);

  // Prepare brand with events and role data (copied from Dashboard.js)
  const prepareBrandWithData = (brand) => {
    // Get user's role for this brand
    const userRoleId = userRoles[brand._id];
    const userRole = roles.find((role) => role._id === userRoleId);

    // Calculate team size
    const teamSize = (brand.team?.length || 0) + (brand.owner ? 1 : 0);

    return {
      ...brand,
      role: userRole,
      teamSize,
    };
  };

  // Use Redux brands and prepare them with role data
  const prepareBrands = () => {
    if (brands.length > 0) {
      const brandsWithData = brands.map(prepareBrandWithData);
      setUserBrands(brandsWithData);
      setBrandsLoaded(true);
      if (brandsWithData.length > 0 && !selectedBrand) {
        setSelectedBrand(brandsWithData[0]);
      }
    }
  };

  useEffect(() => {
    prepareBrands();
  }, [brands, roles, userRoles]);

  const fetchEvents = async () => {
    if (!selectedBrand?._id) return;

    try {
      const response = await axiosInstance.get(
        `${process.env.REACT_APP_API_BASE_URL}/events/brand/${selectedBrand._id}`
      );
      setEvents(response.data);
      setLoading(false);
    } catch (error) {
      toast.showError("Failed to load events");
      setEvents([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (selectedBrand?._id && isMounted) {
      fetchEvents();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedBrand?._id]);

  const handleEventClick = (
    eventToEdit,
    parentEventData = null,
    weekNumber = 0
  ) => {
    setSelectedEvent(eventToEdit);
    // Store the parent event data if provided (for new child events)
    setParentEventForForm(parentEventData);
    setCurrentWeek(weekNumber);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedEvent(null);
    // We don't reset currentWeek here to preserve the week navigation state
  };

  const handleBrandSelect = (brand) => {
    // Prepare the brand with role data if it doesn't already have it
    const brandWithData = brand.role ? brand : prepareBrandWithData(brand);
    setSelectedBrand(brandWithData);
    setIsDropdownOpen(false);
  };

  const handleSave = async (eventData) => {
    try {
      const loadingToast = toast.showLoading(
        selectedEvent ? "Updating event..." : "Creating event..."
      );
      let response;

      if (selectedEvent) {
        if (selectedEvent.parentEventId) {
          response = await axiosInstance.put(
            `${process.env.REACT_APP_API_BASE_URL}/events/${selectedEvent._id}`,
            eventData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
        } else {
          // Get the current week from the EventCard component if this is a weekly event
          // This is needed because the EventCard component might be showing a specific week
          const weekParam =
            selectedEvent.isWeekly && currentWeek > 0
              ? `?weekNumber=${currentWeek}`
              : "";

          response = await axiosInstance.put(
            `${process.env.REACT_APP_API_BASE_URL}/events/${selectedEvent._id}${weekParam}`,
            eventData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
        }
      } else {
        response = await axiosInstance.post(
          `${process.env.REACT_APP_API_BASE_URL}/events/brand/${selectedBrand._id}`,
          eventData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      // Update the events array
      setEvents((prev) => {
        if (selectedEvent) {
          // If we're updating an event
          if (selectedEvent.parentEventId) {
            // If this is a child event, update it directly
            return prev.map((e) =>
              e._id === selectedEvent._id ? response.data : e
            );
          } else if (selectedEvent.isWeekly && currentWeek > 0) {
            // If this is a weekly event and we're editing a specific week,
            // we need to add the child event to the events array if it's not already there
            const childEventExists = prev.some(
              (e) =>
                e.parentEventId === selectedEvent._id &&
                e.weekNumber === currentWeek
            );

            if (!childEventExists && response.data.parentEventId) {
              // Add the new child event to the array
              return [...prev, response.data];
            }

            // Update the child event if it exists
            return prev.map((e) =>
              e.parentEventId === selectedEvent._id &&
              e.weekNumber === currentWeek
                ? response.data
                : e
            );
          } else {
            // Regular update for parent event
            return prev.map((e) =>
              e._id === selectedEvent._id ? response.data : e
            );
          }
        } else {
          // New event creation
          return [...prev, response.data];
        }
      });

      // After updating the events array, fetch all events again to ensure we have the latest data
      await fetchEvents();

      toast.showSuccess(
        selectedEvent
          ? "Event updated successfully!"
          : "Event created successfully!"
      );

      // Don't reset the current week when closing the form
      // This ensures we stay on the same week after editing
      handleClose();
    } catch (error) {
      toast.showError(error.response?.data?.message || "Failed to save event");
    }
  };

  const handleBack = () => {
    navigate(`/@${user.username}`);
  };

  const handleSettingsClick = (event) => {
    // Check if this is a deletion result from EventCard
    if (event && event.action === "deleted") {
      // Remove the deleted event from the events array
      setEvents((prev) => prev.filter((e) => e._id !== event.eventId));
      toast.showSuccess("Event successfully deleted");
      return;
    }

    // Regular settings handling
    setSelectedEventForSettings(event);
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    setSelectedEventForSettings(null);
  };

  return (
    <div className="page-wrapper">
      <Navigation
        onBack={handleBack}
        onMenuClick={() => setIsNavigationOpen(true)}
      />

      <DashboardNavigation
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        currentUser={user}
      />

      <div className="events">
        <div className="events-header">
          <h1>Your Events</h1>
          <p>Create and manage your event portfolio</p>

          {userBrands && userBrands.length > 0 ? (
            <div className="brand-selector">
              <div
                className="selected-brand"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedBrand?.logo ? (
                  <img
                    src={selectedBrand.logo.thumbnail}
                    alt={selectedBrand.name}
                  />
                ) : (
                  <div className="brand-initial">{selectedBrand?.name[0]}</div>
                )}
                <span className="brand-name">{selectedBrand?.name}</span>
              </div>
              <div className={`brand-options ${isDropdownOpen ? "open" : ""}`}>
                {userBrands.map((brand) => (
                  <div
                    key={brand._id}
                    className={`brand-option ${
                      selectedBrand?._id === brand._id ? "selected" : ""
                    }`}
                    onClick={() => handleBrandSelect(brand)}
                  >
                    {brand.logo ? (
                      <img src={brand.logo.thumbnail} alt={brand.name} />
                    ) : (
                      <div className="brand-initial">{brand.name[0]}</div>
                    )}
                    <span className="brand-name">{brand.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="events-loading-container">
            <LoadingSpinner size="large" color="primary" />
          </div>
        )}

        {/* No Brands State - Only show when not loading and brands are loaded */}
        {!loading && brandsLoaded && userBrands.length === 0 && (
          <div className="no-content-container">
            <div className="no-content-card">
              <motion.div
                className="icon-container"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <RiGroupLine className="icon" />
              </motion.div>
              <motion.h3
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                No Brands Available
              </motion.h3>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                You need to create or join a brand before you can manage events
              </motion.p>
              <motion.button
                className="primary-button"
                onClick={() => navigate("/dashboard/brands/new")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <RiAddLine /> Create Brand
              </motion.button>
            </div>
          </div>
        )}

        {/* Events Grid - Only show when not loading and has brands */}
        {!loading && userBrands.length > 0 && (
          <div className="events-grid">
            {events.length > 0 ? (
              <>
                {events.map((event) => (
                  <EventCard
                    key={`${event._id}-${event.updatedAt || ""}`}
                    event={event}
                    onClick={handleEventClick}
                    onSettingsClick={handleSettingsClick}
                    userBrands={userBrands}
                  />
                ))}
                <div
                  className="event-card add-card"
                  onClick={() => setShowForm(true)}
                >
                  <RiAddCircleLine className="add-icon" />
                  <p>Create New Event</p>
                </div>
              </>
            ) : (
              <div
                className="event-card add-card"
                onClick={() => setShowForm(true)}
              >
                <RiAddCircleLine className="add-icon" />
                <p>No events found. Create your first event!</p>
              </div>
            )}
          </div>
        )}

        {showForm && (
          <EventForm
            event={selectedEvent}
            onClose={handleClose}
            onSave={handleSave}
            selectedBrand={selectedBrand}
            weekNumber={currentWeek}
            parentEventData={parentEventForForm}
          />
        )}
      </div>
    </div>
  );
};

const EventCard = ({ event, onClick, onSettingsClick, userBrands }) => {
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0); // Track current week for navigation
  const [currentEvent, setCurrentEvent] = useState(event); // Track the current event (parent or child)
  const [isLive, setIsLive] = useState(event.isLive || false); // Track live status
  const [lastFetchTime, setLastFetchTime] = useState(Date.now()); // Track when we last fetched data
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast(); // Add toast context
  const navigate = useNavigate();
  const { user } = useContext(AuthContext); // Get current user

  // Check if the user has permission to edit this event
  const hasPermission = hasEventPermissions(event, user, userBrands);

  useEffect(() => {
    // Reset the current event to the new event
    setCurrentEvent(event);

    // If this is a child event (has parentEventId and weekNumber), set currentWeek to event.weekNumber
    if (event.parentEventId && event.weekNumber) {
      setCurrentWeek(event.weekNumber);
    } else if (event.isWeekly && currentWeek > 0) {
      // Keep the current week number
    } else if (event.isWeekly) {
      // Auto-navigate to the next upcoming week for weekly events
      // Get the current date
      const now = new Date();

      // Get the event start date
      const eventStartDate = new Date(event.startDate || event.date);

      // If event start date is valid, calculate the next upcoming week
      if (!isNaN(eventStartDate.getTime())) {
        // Calculate the difference in days
        const diffTime = now.getTime() - eventStartDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Calculate the week number (how many weeks have passed)
        const weeksPassed = Math.floor(diffDays / 7);

        // If we've passed at least one week, update the current week
        if (weeksPassed > 0) {
          // Calculate the next upcoming week
          // If today is the same weekday as the event, use this week
          // Otherwise, use the next week
          const nextWeek =
            weeksPassed + (now.getDay() > eventStartDate.getDay() ? 1 : 0);

          // Set the current week to the next upcoming week
          setCurrentWeek(nextWeek);
        } else {
          setCurrentWeek(0); // Set to week 0 if we haven't passed a week yet
        }
      } else {
        setCurrentWeek(0); // Default to week 0 if date is invalid
      }
    } else {
      setCurrentWeek(0);
    }

    // Reset isLive to match the event's isLive status
    setIsLive(event.isLive || false);

    // Reset the last fetch time
    setLastFetchTime(Date.now());
  }, [event]);

  // When navigating weeks, check if a child event exists for that week
  useEffect(() => {
    if (!event.isWeekly || currentWeek === 0) {
      // If not weekly or we're on week 0, use the parent event
      setCurrentEvent(event);
      setIsLive(event.isLive || false);
      return;
    }

    // Check if we have a child event for this week in the events array
    const findChildEvent = async () => {
      if (!event || !event._id || !event.isWeekly || currentWeek === 0) {
        return;
      }

      try {
        setIsLoading(true);
        const response = await axiosInstance.get(
          `/events/${event._id}/weekly/${currentWeek}`
        );

        // Set the event data regardless of whether it's a real child or calculated occurrence
        const receivedEvent = {
          ...response.data,
          weekNumber: currentWeek,
        };

        // Update the current event with the data from the API
        setCurrentEvent(receivedEvent);
        setIsLive(receivedEvent.isLive || false);
      } catch (error) {
        // Create a fallback calculated occurrence
        const weekDate = new Date(event.startDate || event.date);

        if (isNaN(weekDate.getTime())) {
          throw new Error("Invalid date");
        }

        weekDate.setDate(weekDate.getDate() + currentWeek * 7);

        // Create a temporary event object with parent data but updated date
        const tempEvent = {
          ...event,
          _id: null, // NULL ID indicates it doesn't exist in DB yet
          parentEventId: event._id,
          weekNumber: currentWeek,
          date: weekDate.toISOString(),
          isLive: false,
          childExists: false, // Flag to indicate this is a calculated occurrence
        };

        setCurrentEvent(tempEvent);
        setIsLive(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Only try to find child events if we're not on week 0
    if (currentWeek > 0) {
      findChildEvent();
    }
  }, [event, currentWeek]);

  const getImageUrl = (imageObj) => {
    if (!imageObj) return null;
    if (typeof imageObj === "string") return imageObj;
    return imageObj.medium || imageObj.full || imageObj.thumbnail;
  };

  const getFlyerImage = (flyer) => {
    if (!flyer) return null;
    // Try landscape first
    if (flyer.landscape) {
      return getImageUrl(flyer.landscape);
    }
    // Try portrait second
    if (flyer.portrait) {
      return getImageUrl(flyer.portrait);
    }
    // Try square last
    if (flyer.square) {
      return getImageUrl(flyer.square);
    }
    return null;
  };


  const handleEditClick = (e) => {
    e.stopPropagation();

    // Check if this is a calculated occurrence (non-created child event)
    const isCalculatedOccurrence =
      currentEvent.childExists === false ||
      currentEvent._id === null ||
      (currentEvent.weekNumber > 0 && !currentEvent._id);

    // Get the week number from the currentEvent or state
    const weekNumber = currentEvent.weekNumber || currentWeek;

    // Pass the parent event data if this is a calculated/non-created occurrence
    const parentData = isCalculatedOccurrence ? event : null;


    // Call the main click handler with all the necessary data
    onClick(currentEvent, parentData, weekNumber);
  };

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    setShowSettingsPopup(true);
  };

  // Handle navigation to previous week
  const handlePrevWeek = (e) => {
    e.stopPropagation();
    if (currentWeek > 0) {
      const newWeek = currentWeek - 1;
      setCurrentWeek(newWeek);
    }
  };

  // Handle navigation to next week
  const handleNextWeek = (e) => {
    e.stopPropagation();
    const newWeek = currentWeek + 1;
    setCurrentWeek(newWeek);
  };

  // Update when currentWeek changes
  useEffect(() => {
    if (currentEvent.isWeekly && currentWeek > 0) {
      try {
        // Calculate the date for this week's occurrence
        const weekDate = new Date(event.startDate || event.date);

        // Check if the date is valid before proceeding
        if (isNaN(weekDate.getTime())) {
          return;
        }

        weekDate.setDate(weekDate.getDate() + currentWeek * 7);

        // Update the current event with the new week number and date
        setCurrentEvent((prev) => ({
          ...prev,
          weekNumber: currentWeek,
          startDate: weekDate.toISOString(),
          date: weekDate.toISOString(), // Update both date fields for compatibility
        }));
      } catch (error) {
      }
    }
  }, [currentWeek, event.startDate, event.date, currentEvent.isWeekly]);

  // Calculate the date for the current week
  const getWeeklyDate = (baseDate, weekOffset) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + weekOffset * 7);
    return date;
  };

  // Format date for display (09.04.25, 16.04.25, etc.)
  const formatDate = (date) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return "Invalid date";
      }

      // Add day of week and use dd.MM.yy format
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayOfWeek = days[d.getDay()];
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0"); // getMonth() is 0-based
      const year = d.getFullYear().toString().slice(-2); // Get last 2 digits of year

      return `${dayOfWeek}, ${day}.${month}.${year}`;
    } catch (error) {
      return "Invalid date";
    }
  };

  // Format date for weekly display with 2-digit year
  const formatWeeklyDate = (date) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return "Invalid date";
      }

      // Add day of week and format as DD.MM.YY to include 2-digit year
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayOfWeek = days[d.getDay()];
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0"); // getMonth() is 0-based
      const year = d.getFullYear().toString().slice(-2); // Get last 2 digits of year

      return `${dayOfWeek}, ${day}.${month}.${year}`;
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get the display date based on current event
  const displayDate = currentEvent.date || currentEvent.startDate;

  const handleGoLive = (e) => {
    e.stopPropagation();

    // Show loading toast
    const loadingToast = toast.showLoading("Updating event status...");

    // Use the weekNumber from the currentEvent if available, otherwise use the currentWeek state
    const weekToUse = currentEvent.weekNumber || currentWeek;

    // Check if we have a valid token before making the request
    const token = localStorage.getItem("token");
    if (!token) {
      toast.showError("Authentication required. Please log in again.");
      loadingToast.dismiss();
      return;
    }

    // If this is a calculated occurrence (not yet in DB), we'll need to create it
    const isCalculatedOccurrence = currentEvent.childExists === false;

    if (isCalculatedOccurrence) {
      // This is a calculated occurrence - a child event will be created in the database
    }

    // Call the API to toggle the live status
    // Include the current week number for weekly events
    axiosInstance
      .patch(
        `/events/${event._id}/toggle-live${
          event.isWeekly && weekToUse > 0 ? `?weekNumber=${weekToUse}` : ""
        }`
      )
      .then((response) => {
        // Update the local state
        setIsLive(response.data.isLive);

        // If a child event was included in the response, it means it was just created or updated
        if (response.data.childEvent) {
          setCurrentEvent({
            ...response.data.childEvent,
            weekNumber: weekToUse, // Ensure weekNumber is set correctly
          });
        } else {
          // Just update the isLive status
          setCurrentEvent((prev) => ({
            ...prev,
            isLive: response.data.isLive,
          }));
        }

        // Show success message
        toast.showSuccess(response.data.message);
        loadingToast.dismiss();
      })
      .catch((error) => {
        toast.showError("Failed to update event status");
        loadingToast.dismiss();
      });
  };

  return (
    <>
    <motion.div
      className={`event-card ${
        event.isWeekly ? "weekly-event" : ""
      } ${isLive ? "live-event" : ""} ${currentWeek > 0 ? "child-event" : ""}`}
    >
      {/* Main card content */}
      <div className="card-content">
        {/* Weekly Navigation */}
        {event.isWeekly && (
          <div className="weekly-navigation">
            <button
              className="nav-arrow prev"
              onClick={
                hasPermission ? handlePrevWeek : (e) => e.stopPropagation()
              }
              disabled={currentWeek === 0 || !hasPermission}
            >
              <RiArrowLeftLine />
            </button>
            <button
              className="nav-arrow next"
              onClick={
                hasPermission ? handleNextWeek : (e) => e.stopPropagation()
              }
              disabled={!hasPermission}
            >
              <RiArrowRightSLine />
            </button>
          </div>
        )}

        {/* Title/Subtitle area */}
        <div className="event-card-title-area">
          <h3>{currentEvent.title}</h3>
          {currentEvent.subTitle && (
            <span className="subtitle">{currentEvent.subTitle}</span>
          )}

          {/* Move card actions here */}
          {hasPermission && (
            <div className="card-actions">
              <motion.button
                className="action-button edit"
                onClick={handleEditClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RiEditLine />
              </motion.button>
              <motion.button
                className="action-button settings"
                onClick={handleSettingsClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RiSettings4Line />
              </motion.button>
            </div>
          )}
        </div>

        {/* Header with image and actions */}
        <div className="event-card-header">
          <div className="event-cover-image glassy-element">
            {currentEvent.flyer && (
              <ProgressiveImage
                thumbnailSrc={getFlyerImage(currentEvent.flyer)}
                mediumSrc={getFlyerImage(currentEvent.flyer)}
                fullSrc={getFlyerImage(currentEvent.flyer)}
                alt={`${currentEvent.title} cover`}
                className="cover-image"
              />
            )}
          </div>
        </div>

        {/* Content section now focuses on details */}
        <div className="event-card-content">
          {/* Move Go Live button here */}
          <div className="event-info">
            {hasPermission && (
              <motion.button
                className={`go-live-button ${isLive ? "live" : ""}`}
                onClick={handleGoLive}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLive ? (
                  <>
                    <RiEyeLine /> Live
                  </>
                ) : (
                  <>
                    <RiEyeOffLine /> Go Live
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Details (Date, Time, Location) */}
          <div className="event-details">
            {event.isWeekly ? (
              <div className="weekly-date-navigation">
                <div className="navigation-controls">
                  <div className="date-display">
                    <RiCalendarEventLine className="calendar-icon" />
                    {formatWeeklyDate(displayDate)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="detail-item">
                <RiCalendarEventLine />
                <span>{formatDate(currentEvent.date)}</span>
              </div>
            )}
            <div className="detail-item">
              <RiTimeLine />
              <span>
                {currentEvent.startTime} - {currentEvent.endTime}
              </span>
            </div>
            <div className="detail-item">
              <RiMapPinLine />
              <span>{currentEvent.location}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    
    {/* Settings Popup Modal */}
    {showSettingsPopup && hasPermission && (
      <div className="settings-popup-overlay" onClick={() => setShowSettingsPopup(false)}>
        <div className="settings-popup" onClick={(e) => e.stopPropagation()}>
          <EventSettings
            event={event}
            onClose={(result) => {
              setShowSettingsPopup(false);
              // If this was a deletion, notify the parent via onSettingsClick callback
              if (result && result.deleted) {
                onSettingsClick({ action: "deleted", eventId: result.eventId });
              }
            }}
          />
        </div>
      </div>
    )}
    
    {/* No Permission Modal */}
    {showSettingsPopup && !hasPermission && (
      <div className="settings-popup-overlay" onClick={() => setShowSettingsPopup(false)}>
        <div className="settings-popup" onClick={(e) => e.stopPropagation()}>
          <div className="no-permission-message">
            <h3>Access Restricted</h3>
            <p>You don't have permission to modify this event.</p>
            <button className="back-button" onClick={() => setShowSettingsPopup(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Events;
