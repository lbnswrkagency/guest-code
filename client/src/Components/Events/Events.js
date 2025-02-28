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
} from "react-icons/ri";
import EventForm from "../EventForm/EventForm";
import EventSettings from "../EventSettings/EventSettings";
import Navigation from "../Navigation/Navigation";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import AuthContext from "../../contexts/AuthContext";
import ProgressiveImage from "../ProgressiveImage/ProgressiveImage";

const Events = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
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

  const fetchBrands = async () => {
    try {
      const response = await axiosInstance.get("/brands");
      if (Array.isArray(response.data)) {
        setUserBrands(response.data);
        if (response.data.length > 0 && !selectedBrand) {
          setSelectedBrand(response.data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast.showError("Failed to load brands");
      setUserBrands([]);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchEvents = async () => {
    if (!selectedBrand?._id) return;

    const loadingToast = toast.showLoading("Loading events...");
    try {
      console.log("Fetching events for brand:", selectedBrand._id);
      const response = await axiosInstance.get(
        `${process.env.REACT_APP_API_BASE_URL}/events/brand/${selectedBrand._id}`
      );
      setEvents(response.data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.showError("Failed to load events");
      setEvents([]);
    } finally {
      setLoading(false);
      loadingToast.dismiss();
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

  const handleEventClick = (event, weekNumber = 0) => {
    setSelectedEvent(event);
    setCurrentWeek(weekNumber);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedEvent(null);
    // We don't reset currentWeek here to preserve the week navigation state
  };

  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
    setIsDropdownOpen(false);
  };

  const handleSave = async (eventData) => {
    try {
      const loadingToast = toast.showLoading(
        selectedEvent ? "Updating event..." : "Creating event..."
      );
      let response;

      console.log("[Event Operation] Attempting to create/update event:", {
        isUpdate: !!selectedEvent,
        eventData,
        selectedBrandId: selectedBrand._id,
        weekNumber: currentWeek,
        isChildEvent: selectedEvent?.parentEventId ? true : false,
      });

      if (selectedEvent) {
        console.log(`[Event Update] Updating event ${selectedEvent._id}`);

        // If this is a child event, use its ID directly
        if (selectedEvent.parentEventId) {
          console.log(
            `[Event Update] This is a child event with parentEventId: ${selectedEvent.parentEventId}`
          );

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
        console.log(
          `[Event Creation] Creating new event for brand ${selectedBrand._id}`
        );
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

      console.log("[Event Operation] Server response:", {
        status: response.status,
        data: response.data,
      });

      // Update the events array
      setEvents((prev) => {
        if (selectedEvent) {
          // If we're updating an event
          if (selectedEvent.parentEventId) {
            // If this is a child event, update it directly
            console.log("[Event Update] Updating child event in events array");
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
              console.log(
                "[Event Update] Adding new child event to events array:",
                response.data
              );
              return [...prev, response.data];
            }

            // Update the child event if it exists
            console.log(
              "[Event Update] Updating existing child event in events array"
            );
            return prev.map((e) =>
              e.parentEventId === selectedEvent._id &&
              e.weekNumber === currentWeek
                ? response.data
                : e
            );
          } else {
            // Regular update for parent event
            console.log("[Event Update] Updating parent event in events array");
            return prev.map((e) =>
              e._id === selectedEvent._id ? response.data : e
            );
          }
        } else {
          // New event creation
          console.log("[Event Creation] Adding new event to events array");
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
      console.error("[Event Operation Error]", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
      });
      toast.showError(error.response?.data?.message || "Failed to save event");
    }
  };

  const handleBack = () => {
    navigate(`/@${user.username}`);
  };

  const handleSettingsClick = (event) => {
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
          ) : (
            <div className="no-brands-message">
              <h2>Create Your First Brand</h2>
              <p>To create an Event you need to join or create a brand</p>
              <button
                className="brand-button"
                onClick={() => navigate("/brands")}
              >
                Brands
              </button>
            </div>
          )}
        </div>

        {userBrands && userBrands.length > 0 && (
          <div className="events-grid">
            {loading ? (
              <div className="loading-state">Loading events...</div>
            ) : events.length > 0 ? (
              <>
                {events.map((event) => (
                  <EventCard
                    key={`${event._id}-${event.updatedAt || ""}`}
                    event={event}
                    onClick={handleEventClick}
                    onSettingsClick={handleSettingsClick}
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
          />
        )}
      </div>
    </div>
  );
};

const EventCard = ({ event, onClick, onSettingsClick }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBackContent, setShowBackContent] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0); // Track current week for navigation
  const [currentEvent, setCurrentEvent] = useState(event); // Track the current event (parent or child)
  const [isLive, setIsLive] = useState(event.isLive || false); // Track live status
  const [lastFetchTime, setLastFetchTime] = useState(Date.now()); // Track when we last fetched data
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast(); // Add toast context
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[EventCard] Event prop changed:", event);

    // Reset the current event to the new event
    setCurrentEvent(event);

    // If this is a child event (has parentEventId and weekNumber), set currentWeek to event.weekNumber
    // Otherwise, if we're already on a specific week, maintain that week number
    if (event.parentEventId && event.weekNumber) {
      console.log(
        `[EventCard] Setting currentWeek to ${event.weekNumber} from child event`
      );
      setCurrentWeek(event.weekNumber);
    } else if (event.isWeekly && currentWeek > 0) {
      console.log(
        `[EventCard] Maintaining current week ${currentWeek} for weekly event`
      );
      // Keep the current week number
    } else {
      console.log(`[EventCard] Resetting currentWeek to 0 for parent event`);
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

      console.log(
        `[findChildEvent] Finding child event for parent ${event._id}, week ${currentWeek}`
      );

      try {
        setIsLoading(true);
        const response = await axiosInstance.get(
          `/events/${event._id}/weekly/${currentWeek}`
        );

        if (response.data) {
          console.log(`[findChildEvent] Child event found:`, response.data);

          // Ensure the weekNumber is set on the child event
          const childEvent = {
            ...response.data,
            weekNumber: currentWeek,
          };

          setCurrentEvent(childEvent);
          setIsLive(childEvent.isLive);
        } else {
          console.log(
            `[findChildEvent] No child event found for week ${currentWeek}, using parent event data`
          );

          try {
            // Calculate the date for this week's occurrence
            const weekDate = new Date(event.startDate || event.date);

            // Check if the date is valid before proceeding
            if (isNaN(weekDate.getTime())) {
              console.error(
                "[findChildEvent] Invalid date:",
                event.startDate || event.date
              );
              throw new Error("Invalid date");
            }

            weekDate.setDate(weekDate.getDate() + currentWeek * 7);

            // Create a temporary event object with parent data but updated date
            const tempEvent = {
              ...event,
              _id: event._id, // Keep the parent ID for API calls
              parentEventId: event._id, // Mark this as a child event
              weekNumber: currentWeek, // Set the week number
              startDate: weekDate.toISOString(), // Update the startDate
              date: weekDate.toISOString(), // Update the date for compatibility
              isLive: false, // Child events start as not live
            };

            setCurrentEvent(tempEvent);
            setIsLive(false);
          } catch (error) {
            console.error(
              "[findChildEvent] Error creating temporary event:",
              error
            );
            // Just use the parent event without date modification as fallback
            setCurrentEvent({
              ...event,
              weekNumber: currentWeek,
              parentEventId: event._id,
            });
            setIsLive(false);
          }
        }
      } catch (error) {
        console.error("[findChildEvent] Error fetching child event:", error);
        toast.showError("Failed to fetch event details");
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

  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => setShowBackContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowBackContent(false);
    }
  }, [isFlipped]);

  const handleEditClick = (e) => {
    e.stopPropagation();
    console.log("[Event Edit] Editing event:", {
      eventId: currentEvent._id,
      isChildEvent: currentEvent.parentEventId ? true : false,
      weekNumber: currentEvent.weekNumber || currentWeek,
    });

    // Pass the currentEvent (which could be parent or child) and the current week number
    // Use the weekNumber from the currentEvent if available, otherwise use the currentWeek state
    onClick(currentEvent, currentEvent.weekNumber || currentWeek);
  };

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    setIsFlipped(true);
  };

  // Handle navigation to previous week
  const handlePrevWeek = (e) => {
    e.stopPropagation();
    if (currentWeek > 0) {
      const newWeek = currentWeek - 1;
      console.log(`[Weekly Navigation] Moving to previous week: ${newWeek}`);
      setCurrentWeek(newWeek);
    }
  };

  // Handle navigation to next week
  const handleNextWeek = (e) => {
    e.stopPropagation();
    const newWeek = currentWeek + 1;
    console.log(`[Weekly Navigation] Moving to next week: ${newWeek}`);
    setCurrentWeek(newWeek);
  };

  // Update when currentWeek changes
  useEffect(() => {
    if (currentEvent.isWeekly && currentWeek > 0) {
      console.log(`[Weekly Navigation] Week changed to ${currentWeek}`);

      try {
        // Calculate the date for this week's occurrence
        const weekDate = new Date(event.startDate || event.date);

        // Check if the date is valid before proceeding
        if (isNaN(weekDate.getTime())) {
          console.error(
            "[Weekly Navigation] Invalid date:",
            event.startDate || event.date
          );
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
        console.error("[Weekly Navigation] Error updating date:", error);
      }
    }
  }, [currentWeek, event.startDate, event.date, currentEvent.isWeekly]);

  // Calculate the date for the current week
  const getWeeklyDate = (baseDate, weekOffset) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + weekOffset * 7);
    return date;
  };

  const formatDate = (date) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        console.error("[formatDate] Invalid date:", date);
        return "Invalid date";
      }
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (error) {
      console.error("[formatDate] Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Format date for weekly display (Mar 22, 2025)
  const formatWeeklyDate = (date) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        console.error("[formatWeeklyDate] Invalid date:", date);
        return "Invalid date";
      }
      const month = d.toLocaleString("en-US", { month: "short" });
      const day = d.getDate();
      const year = d.getFullYear();
      return `${month} ${day}, ${year}`;
    } catch (error) {
      console.error("[formatWeeklyDate] Error formatting date:", error);
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

    console.log(
      `[Go Live] Toggling live status for event ${event._id}, week ${weekToUse}`
    );

    // Check if we have a valid token before making the request
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("[Go Live] No auth token available");
      toast.showError("Authentication required. Please log in again.");
      loadingToast.dismiss();
      return;
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
        console.log(`[Go Live] Response:`, response.data);

        // Update the local state
        setIsLive(response.data.isLive);

        // If this is a child event that was just created, update the currentEvent
        if (weekToUse > 0 && response.data.childEvent) {
          console.log(`[Go Live] Updating current event with child event data`);
          setCurrentEvent(response.data.childEvent);
        } else if (weekToUse === 0) {
          // If this is the parent event, update it
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
        console.error("[Go Live] Error toggling live status:", error);

        // Handle 401 errors specifically
        if (error.response && error.response.status === 401) {
          toast.showError("Authentication required. Please log in again.");
        } else {
          toast.showError("Failed to update event status");
        }

        loadingToast.dismiss();
      });
  };

  return (
    <motion.div
      className={`event-card ${isFlipped ? "flipped" : ""} ${
        event.isWeekly ? "weekly-event" : ""
      } ${isLive ? "live-event" : ""} ${currentWeek > 0 ? "child-event" : ""}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
    >
      {/* Front side */}
      <div
        className="card-front"
        style={{
          backfaceVisibility: "hidden",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          zIndex: isFlipped ? 0 : 1,
          position: "absolute",
          inset: 0,
          transformOrigin: "center",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="event-card-header">
          <div className="event-cover-image">
            {event.flyer && (
              <ProgressiveImage
                thumbnailSrc={getFlyerImage(event.flyer)}
                mediumSrc={getFlyerImage(event.flyer)}
                fullSrc={getFlyerImage(event.flyer)}
                alt={`${currentEvent.title} cover`}
                className="cover-image"
              />
            )}
          </div>
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
        </div>

        <div className="event-card-content">
          <div className="event-info">
            <div className="title-container">
              <h3>{currentEvent.title}</h3>
              {currentEvent.subTitle && (
                <span className="subtitle">{currentEvent.subTitle}</span>
              )}
            </div>
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
          </div>

          <div className="event-details">
            {event.isWeekly ? (
              <div className="weekly-date-navigation">
                <div className="navigation-controls">
                  <button
                    className="nav-arrow prev"
                    onClick={handlePrevWeek}
                    disabled={currentWeek === 0}
                  >
                    ←
                  </button>
                  <div className="date-display">
                    <RiCalendarEventLine className="calendar-icon" />
                    {formatWeeklyDate(displayDate)}
                  </div>
                  <button className="nav-arrow next" onClick={handleNextWeek}>
                    →
                  </button>
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

          <div className="event-features">
            {currentEvent.guestCode && (
              <span className="feature">Guest Code</span>
            )}
            {currentEvent.friendsCode && (
              <span className="feature">Friends Code</span>
            )}
            {currentEvent.ticketCode && (
              <span className="feature">Ticket Code</span>
            )}
            {currentEvent.tableCode && (
              <span className="feature">Table Code</span>
            )}
            {event.isWeekly && (
              <span className="feature weekly-badge">Weekly</span>
            )}
            {isLive && <span className="feature live-badge">Live</span>}
          </div>
        </div>
      </div>

      {/* Back side */}
      <div
        className="card-back"
        style={{
          backfaceVisibility: "hidden",
          transform: `rotateY(${isFlipped ? 0 : -180}deg) scaleX(-1)`,
          zIndex: isFlipped ? 1 : 0,
          position: "absolute",
          inset: 0,
          transformOrigin: "center",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {showBackContent && (
          <EventSettings event={event} onClose={() => setIsFlipped(false)} />
        )}
      </div>
    </motion.div>
  );
};

export default Events;
