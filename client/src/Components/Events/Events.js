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
  const toast = useToast(); // Add toast context

  useEffect(() => {
    // Reset to the parent event when the event prop changes
    setCurrentEvent(event);
    setCurrentWeek(0);
    setIsLive(event.isLive || false); // Reset isLive state to match parent event
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
      try {
        console.log(`[Weekly Events] Fetching data for week ${currentWeek}`);

        // Check if we have a valid token before making the request
        const token = localStorage.getItem("token");
        if (!token) {
          console.log(
            "[Weekly Events] No auth token available, using fallback"
          );
          throw new Error("No auth token");
        }

        // Try to fetch the child event for this week
        const response = await axiosInstance.get(
          `/events/${event._id}/weekly/${currentWeek}?_t=${Date.now()}`
        );

        if (response.data) {
          // If we found a child event, use it
          console.log(
            `[Weekly Events] Found child event for week ${currentWeek}`,
            response.data
          );
          setCurrentEvent(response.data);
          setIsLive(response.data.isLive || false); // Set isLive based on child event
          setLastFetchTime(Date.now()); // Update last fetch time
        }
      } catch (error) {
        // Handle 404 errors gracefully - this just means the child event doesn't exist yet
        if (error.response && error.response.status === 404) {
          console.log(
            `[Weekly Events] No child event exists yet for week ${currentWeek}`
          );

          // Check if we have parent event data in the error response
          if (error.response?.data?.parentEvent) {
            const parentEvent = error.response.data.parentEvent;
            // Calculate the date for this week based on the parent event
            const weeklyDate = getWeeklyDate(parentEvent.date, currentWeek);

            // Create a temporary event object with the calculated date
            // but keep all other properties from the parent event
            const tempEvent = {
              ...parentEvent,
              date: weeklyDate,
              weekNumber: currentWeek,
              isLive: false, // Child events start as not live
              // Don't override subtitle if not needed
            };

            setCurrentEvent(tempEvent);
            setIsLive(false);
            setLastFetchTime(Date.now()); // Update last fetch time
          } else {
            // Fallback to using the parent event with calculated date
            const weeklyDate = getWeeklyDate(event.date, currentWeek);
            setCurrentEvent({
              ...event,
              date: weeklyDate,
              weekNumber: currentWeek,
              isLive: false, // Child events start as not live
            });
            setIsLive(false);
            setLastFetchTime(Date.now()); // Update last fetch time
          }
        } else {
          // For 401 or any other errors, just use the parent event data with calculated date
          // This prevents showing error messages for auth issues which are expected in some cases
          console.log(
            `[Weekly Events] Using fallback for week ${currentWeek} due to error:`,
            error.message
          );

          // Create a temporary event with the calculated date based on parent event
          const weeklyDate = getWeeklyDate(event.date, currentWeek);
          const tempEvent = {
            ...event,
            date: weeklyDate,
            weekNumber: currentWeek,
            isLive: false, // Child events start as not live
          };

          setCurrentEvent(tempEvent);
          setIsLive(false);
          setLastFetchTime(Date.now()); // Update last fetch time
        }
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
      weekNumber: currentWeek,
    });

    // Pass the currentEvent (which could be parent or child) and the current week number
    onClick(currentEvent, currentWeek);
  };

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    setIsFlipped(true);
  };

  // Weekly event navigation handlers
  const handlePrevWeek = (e) => {
    e.stopPropagation();
    if (currentWeek > 0) {
      console.log(
        `[Weekly Navigation] Moving from week ${currentWeek} to week ${
          currentWeek - 1
        }`
      );
      setCurrentWeek((prev) => prev - 1);
    }
  };

  const handleNextWeek = (e) => {
    e.stopPropagation();
    console.log(
      `[Weekly Navigation] Moving from week ${currentWeek} to week ${
        currentWeek + 1
      }`
    );
    // Store the current week number to prevent jumping back to week 1
    setCurrentWeek((prev) => prev + 1);
  };

  // Calculate the date for the current week
  const getWeeklyDate = (baseDate, weekOffset) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + weekOffset * 7);
    return date;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format date for weekly display (Mar 22, 2025)
  const formatWeeklyDate = (date) => {
    const d = new Date(date);
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  // Get the display date based on current event
  const displayDate = currentEvent.date;

  const handleGoLive = (e) => {
    e.stopPropagation();

    // Show loading toast
    const loadingToast = toast.showLoading("Updating event status...");

    console.log(
      `[Go Live] Toggling live status for event ${event._id}, week ${currentWeek}`
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
          event.isWeekly && currentWeek > 0 ? `?weekNumber=${currentWeek}` : ""
        }`
      )
      .then((response) => {
        console.log(`[Go Live] Response:`, response.data);

        // Update the local state
        setIsLive(response.data.isLive);

        // If this is a child event that was just created, update the currentEvent
        if (currentWeek > 0 && response.data.childEvent) {
          console.log(`[Go Live] Updating current event with child event data`);
          setCurrentEvent(response.data.childEvent);
        } else if (currentWeek === 0) {
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
