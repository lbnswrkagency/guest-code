import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./UpcomingEvent.scss";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../../Components/Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import Stripe from "../Stripe/Stripe";
import Tickets from "../Tickets/Tickets";
import EventDetails from "../EventDetails/EventDetails";
import GuestCode from "../GuestCode/GuestCode";
import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiTicketLine,
  RiImageLine,
  RiUserLine,
  RiMailLine,
  RiCodeSSlashLine,
  RiInformationLine,
  RiMusic2Line,
  RiArrowRightLine,
  RiVipCrownLine,
  RiRefreshLine,
  RiTestTubeLine,
} from "react-icons/ri";

const LoadingSpinner = ({ size = "default", color = "#ffc807" }) => {
  const spinnerSize = size === "small" ? "16px" : "24px";
  return (
    <div
      className="spinner"
      style={{
        width: spinnerSize,
        height: spinnerSize,
        borderColor: `${color}40`,
        borderTopColor: color,
      }}
    ></div>
  );
};

const UpcomingEvent = ({
  brandId,
  brandUsername,
  limit = 5,
  seamless = false,
  events: providedEvents,
  initialEventIndex = 0,
  hideNavigation = false,
  onEventsLoaded = () => {},
}) => {
  const [events, setEvents] = useState(
    providedEvents ? [...providedEvents] : []
  );
  const [loading, setLoading] = useState(!providedEvents);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(initialEventIndex);
  const [totalEvents, setTotalEvents] = useState(
    providedEvents ? providedEvents.length : 0
  );
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // Only keep the showGuestCodeForm state for toggling visibility
  const [showGuestCodeForm, setShowGuestCodeForm] = useState(false);

  // Ticket settings state
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketQuantities, setTicketQuantities] = useState({});

  // Action buttons refs for scrolling
  const guestCodeSectionRef = useRef(null);
  const ticketSectionRef = useRef(null);

  useEffect(() => {
    // If events are provided directly, use them
    if (providedEvents && providedEvents.length > 0) {
      // Create a deep copy of providedEvents and ensure lineups are valid
      const processedEvents = providedEvents.map((event) => {
        // Create a copy of the event
        const eventCopy = { ...event };

        // If the event has lineups, validate them
        if (eventCopy.lineups && Array.isArray(eventCopy.lineups)) {
          // Check if lineups is an array of strings (IDs)
          if (
            eventCopy.lineups.length > 0 &&
            typeof eventCopy.lineups[0] === "string"
          ) {
            // We can't process string IDs here, so set lineups to null
            // The DashboardFeed component should handle this case
            eventCopy.lineups = null;
          } else {
            // Filter out invalid lineups and ensure required properties
            eventCopy.lineups = eventCopy.lineups
              .filter((lineup) => lineup && (lineup._id || lineup.id))
              .map((lineup) => ({
                _id: lineup._id || lineup.id,
                name: lineup.name || "Unknown Artist",
                category: lineup.category || "Other",
                avatar: lineup.avatar || null,
                events: lineup.events || [],
                isActive:
                  lineup.isActive !== undefined ? lineup.isActive : true,
              }));

            // If no valid lineups remain, set to null
            if (eventCopy.lineups.length === 0) {
              eventCopy.lineups = null;
            }
          }
        }

        return eventCopy;
      });

      setEvents(processedEvents);
      setTotalEvents(processedEvents.length);
      setLoading(false);

      // Notify parent of the number of events
      onEventsLoaded(processedEvents.length);

      // Preload the first event's image if available
      if (processedEvents[currentIndex]?.flyer) {
        preloadEventImage(processedEvents[currentIndex]);
      }
      return;
    }

    // Otherwise, initialize component and fetch events
    setLoading(true);
    setError(null);
    setEvents([]);
    setCurrentIndex(initialEventIndex);
    setTicketSettings([]);
    setLoadingTickets(false);
    setShowGuestCodeForm(false);

    fetchUpcomingEvents();
  }, [brandId, brandUsername, providedEvents]);

  // Fetch the code settings when the current event changes
  useEffect(() => {
    if (events.length > 0) {
      const currentEvent = events[currentIndex];

      // Try to get the max pax from code settings
      if (currentEvent.codeSettings && currentEvent.codeSettings.length > 0) {
        const guestCodeSetting = currentEvent.codeSettings.find(
          (cs) => cs.type === "guest"
        );

        if (guestCodeSetting) {
          // Check if we have all the necessary data
          const hasCompleteData =
            guestCodeSetting.maxPax !== undefined &&
            guestCodeSetting.condition !== undefined;

          // Check if condition is empty or missing
          if (!guestCodeSetting.condition && guestCodeSetting.condition !== 0) {
            // If we have an event ID, fetch the complete code settings
            if (currentEvent._id) {
              // Create an async function to fetch and update settings
              const fetchAndUpdateSettings = async () => {
                // Fetch the complete code settings and update the state
                const completeSettings = await fetchCompleteCodeSettings(
                  currentEvent._id
                );

                if (completeSettings) {
                  // Update the events array with the complete code settings
                  setEvents((prevEvents) => {
                    const updatedEvents = [...prevEvents];
                    const updatedEvent = {
                      ...updatedEvents[currentIndex],
                      codeSettings: completeSettings,
                    };
                    updatedEvents[currentIndex] = updatedEvent;

                    return updatedEvents;
                  });
                }
              };

              // Execute the async function
              fetchAndUpdateSettings();
            }
          }

          return;
        }
      }
    }
  }, [currentIndex, events]);

  // Function to fetch complete code settings for an event
  const fetchCompleteCodeSettings = async (eventId) => {
    try {
      // Use the event profile endpoint which has optional authentication
      const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${eventId}`;

      const response = await axiosInstance.get(endpoint);

      if (response.data && response.data.codeSettings) {
        return response.data.codeSettings;
      }

      return null;
    } catch (error) {
      // Handle error silently
      return null;
    }
  };

  // Fetch ticket settings when the current event changes
  useEffect(() => {
    if (events.length > 0) {
      const currentEvent = events[currentIndex];

      // Ensure ticketsAvailable property exists
      if (currentEvent.ticketsAvailable === undefined) {
        // Create a copy of the events array to avoid modifying the original
        const updatedEvents = [...events];
        const updatedEvent = {
          ...updatedEvents[currentIndex],
          ticketsAvailable: true,
        };
        updatedEvents[currentIndex] = updatedEvent;

        // Update the state with the new array
        setEvents(updatedEvents);

        // If this is a child event, check if parent event has tickets available
        if (currentEvent.parentEventId && currentEvent.isWeekly === false) {
          // Find the parent event in the events array
          const parentEvent = events.find(
            (event) =>
              event._id === currentEvent.parentEventId ||
              (event.isWeekly && event.weekNumber === 0)
          );

          if (parentEvent && parentEvent.ticketsAvailable !== undefined) {
            // Update the copy again with the parent's value
            const updatedEventsWithParent = [...updatedEvents];
            updatedEventsWithParent[currentIndex] = {
              ...updatedEventsWithParent[currentIndex],
              ticketsAvailable: parentEvent.ticketsAvailable,
            };
            setEvents(updatedEventsWithParent);
          }
        }

        // Skip the rest of this effect run since we've updated the state
        // The effect will run again with the updated events array
        return;
      }

      // Only fetch ticket settings if the event has tickets available
      if (currentEvent.ticketsAvailable) {
        fetchTicketSettings(currentEvent._id);
      } else {
        setTicketSettings([]);
      }
    }
  }, [currentIndex, events]);

  // Function to create a sample ticket for testing if no tickets are found
  const createSampleTicket = (eventId) => {
    // Create a sample ticket for testing
    return [
      {
        _id: `sample-${Math.random().toString(36).substring(2, 9)}`,
        name: "Standard Ticket",
        description: "General admission ticket",
        price: 25,
        originalPrice: 30,
        isLimited: true,
        maxTickets: 100,
        soldCount: 45,
        hasCountdown: true,
        endDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
        eventId: eventId,
      },
      {
        _id: `sample-${Math.random().toString(36).substring(2, 9)}`,
        name: "VIP Ticket",
        description: "VIP access with special perks",
        price: 50,
        isLimited: true,
        maxTickets: 50,
        soldCount: 15,
        eventId: eventId,
      },
    ];
  };

  // Function to fetch ticket settings for the current event
  const fetchTicketSettings = async (eventId) => {
    setLoadingTickets(true);
    try {
      const currentEvent = events[currentIndex];

      // Try the event profile endpoint which has optional authentication
      const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${eventId}`;

      const response = await axiosInstance.get(endpoint);
      let ticketSettings = [];

      if (
        response.data &&
        response.data.ticketSettings &&
        response.data.ticketSettings.length > 0
      ) {
        ticketSettings = response.data.ticketSettings;
      } else {
        // If this is a child event (has parentEventId) and no ticket settings were found,
        // try to get ticket settings from the parent event
        if (currentEvent?.parentEventId) {
          try {
            const parentEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${currentEvent.parentEventId}`;
            const parentResponse = await axiosInstance.get(parentEndpoint);

            if (
              parentResponse.data &&
              parentResponse.data.ticketSettings &&
              parentResponse.data.ticketSettings.length > 0
            ) {
              ticketSettings = parentResponse.data.ticketSettings;
            } else {
              ticketSettings = [];
            }
          } catch (parentError) {
            console.error(
              "[UpcomingEvent] Error fetching parent event ticket settings:",
              parentError
            );
            ticketSettings = [];
          }
        } else {
          ticketSettings = [];
        }
      }

      setTicketSettings(ticketSettings);
    } catch (error) {
      console.error("[UpcomingEvent] Error fetching ticket settings:", error);
      setTicketSettings([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint;
      let events = [];

      // Try to fetch by brandId first if available
      if (brandId) {
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/brand/${brandId}`;

        try {
          const response = await axiosInstance.get(endpoint);

          if (response.data && Array.isArray(response.data)) {
            events = response.data;
          }

          // If we have parent events, fetch their children too
          const parentEvents = events.filter((event) => event.isWeekly);

          for (const parentEvent of parentEvents) {
            try {
              const childrenResponse = await axiosInstance.get(
                `${process.env.REACT_APP_API_BASE_URL}/events/children/${parentEvent._id}`
              );

              if (
                childrenResponse.data &&
                Array.isArray(childrenResponse.data)
              ) {
                events = [...events, ...childrenResponse.data];
              }
            } catch (childError) {
              console.warn(
                `[UpcomingEvent] Error fetching child events:`,
                childError.message
              );
            }
          }
        } catch (error) {
          console.warn(
            `[UpcomingEvent] Error fetching events by brandId:`,
            error.message
          );

          // Fall back to using brandUsername for any error, not just 401/403
          if (brandUsername) {
            const cleanUsername = brandUsername.replace(/^@/, "");
            endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${cleanUsername}`;

            try {
              const response = await axiosInstance.get(endpoint);
              if (response.data && Array.isArray(response.data)) {
                events = response.data;
              } else {
                events = [];
              }
            } catch (usernameError) {
              console.warn(
                `[UpcomingEvent] Error fetching events by username:`,
                usernameError.message
              );
              events = [];
            }
          }
        }
      } else if (brandUsername) {
        // No brandId, try using brandUsername
        const cleanUsername = brandUsername.replace(/^@/, "");
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${cleanUsername}`;

        try {
          const response = await axiosInstance.get(endpoint);

          if (response.data && Array.isArray(response.data)) {
            events = response.data;

            // If we have parent events, fetch their children too
            const parentEvents = events.filter((event) => event.isWeekly);

            for (const parentEvent of parentEvents) {
              try {
                // Fetch all child events that already exist for this parent
                const childrenResponse = await axiosInstance.get(
                  `${process.env.REACT_APP_API_BASE_URL}/events/children/${parentEvent._id}`
                );

                if (
                  childrenResponse.data &&
                  Array.isArray(childrenResponse.data)
                ) {
                  events = [...events, ...childrenResponse.data];
                }
              } catch (childError) {
                console.warn(
                  `[UpcomingEvent] Error fetching child events:`,
                  childError.message
                );
              }
            }
          } else {
            events = [];
          }
        } catch (err) {
          console.warn(
            `[UpcomingEvent] Error fetching events by username:`,
            err.message
          );
          events = [];
        }
      }

      // Simplified filtering logic for upcoming events
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to start of day for fair comparison

      const upcomingEvents = events
        .filter((event) => {
          try {
            // First check for startDate (preferred) then fall back to date
            const eventDate = event.startDate
              ? new Date(event.startDate)
              : new Date(event.date);

            // Keep full time information for better comparison
            // Don't reset hours to 0 since we want to use the actual start time

            // Current date with hours for better comparison
            const currentDate = new Date();

            // For weekly events
            if (event.isWeekly) {
              if (event.weekNumber === 0 || !event.weekNumber) {
                // For parent events, show if date is today or future
                return eventDate >= currentDate;
              }
            }

            // For regular events or weekly child events
            return eventDate >= currentDate;
          } catch (err) {
            console.error("[UpcomingEvent] Error filtering event:", err, event);
            return false;
          }
        })
        .sort((a, b) => {
          // Sort by startDate if available, otherwise fall back to date
          const dateA = a.startDate ? new Date(a.startDate) : new Date(a.date);
          const dateB = b.startDate ? new Date(b.startDate) : new Date(b.date);
          return dateA - dateB;
        });

      console.log("[UpcomingEvent] Filtered upcoming events:", {
        totalEvents: events.length,
        upcomingEvents: upcomingEvents.length,
        firstEventDate: upcomingEvents[0]?.startDate || upcomingEvents[0]?.date,
        now: new Date().toISOString(),
      });

      setEvents(upcomingEvents);
      setTotalEvents(upcomingEvents.length);

      // Notify parent of the number of events
      onEventsLoaded(upcomingEvents.length);

      if (upcomingEvents.length > 0) {
        // Set the first event as the current event
        setCurrentIndex(0);

        // Preload the first event's image if available
        if (upcomingEvents[0].flyer) {
          preloadEventImage(upcomingEvents[0]);
        }
      } else {
        setCurrentIndex(-1);
      }
    } catch (error) {
      console.error("[UpcomingEvent] Error fetching events:", error);
      setError("Failed to load events");
      setEvents([]);
      setCurrentIndex(-1);
      onEventsLoaded(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevEvent = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setShowGuestCodeForm(false); // Hide form when changing events
  };

  const handleNextEvent = () => {
    setCurrentIndex((prev) => (prev < events.length - 1 ? prev + 1 : prev));
    setShowGuestCodeForm(false); // Hide form when changing events
  };

  // Helper function to get the best date field (prioritizing startDate over date)
  const getEventDate = (event) => {
    return event.startDate || event.date;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  const handleViewEvent = (event) => {
    // Get the brand username either from the event or from props
    let brandUser = "";

    if (
      event.brand &&
      typeof event.brand === "object" &&
      event.brand.username
    ) {
      // If brand is populated as an object
      brandUser = event.brand.username.replace("@", "");
    } else if (brandUsername) {
      // Use the prop if available
      brandUser = brandUsername.replace("@", "");
    }

    // Generate date slug from event date
    const eventDate = new Date(getEventDate(event));
    const dateSlug = `${String(eventDate.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(eventDate.getDate()).padStart(2, "0")}${String(
      eventDate.getFullYear()
    ).slice(-2)}`;

    // Extract section to navigate to if it exists on the clicked event item
    const section = event.navigateToSection || "";
    const sectionParam = section ? `?section=${section}` : "";

    // If user is logged in, navigate to the user-specific route
    if (user) {
      navigate(`/@${user.username}/@${brandUser}/${dateSlug}${sectionParam}`);
    } else {
      // If no user, use the public route
      navigate(`/@${brandUser}/${dateSlug}${sectionParam}`);
    }
  };

  // Simplified toggle function for guest code form visibility
  const toggleGuestCodeForm = () => {
    setShowGuestCodeForm((prev) => !prev);
  };

  // Function to determine which flyer image to use
  const getEventImage = () => {
    const event = events[currentIndex];
    if (!event?.flyer) return null;

    // Try formats in order of preference: landscape, portrait, square
    // For each format, prefer full > medium > thumbnail for quality

    // First check landscape (highest priority)
    if (event.flyer.landscape) {
      return (
        event.flyer.landscape.full ||
        event.flyer.landscape.medium ||
        event.flyer.landscape.thumbnail
      );
    }

    // Next check square (second priority)
    if (event.flyer.square) {
      return (
        event.flyer.square.full ||
        event.flyer.square.medium ||
        event.flyer.square.thumbnail
      );
    }

    // Finally check portrait (lowest priority)
    if (event.flyer.portrait) {
      return (
        event.flyer.portrait.full ||
        event.flyer.portrait.medium ||
        event.flyer.portrait.thumbnail
      );
    }

    // If we have a flyer object but none of the expected formats,
    // check if there's a direct URL in the object
    if (typeof event.flyer === "string") {
      return event.flyer;
    }

    // Last resort: return null if no suitable image was found
    return null;
  };

  // Render lineup artists
  const renderLineups = (lineups) => {
    if (!lineups || !Array.isArray(lineups) || lineups.length === 0) {
      return null;
    }

    // If lineups is an array of strings (IDs), we can't render it
    if (lineups.length > 0 && typeof lineups[0] === "string") {
      return null;
    }

    // Check if lineup data is valid (has required properties)
    const validLineups = lineups.filter(
      (artist) => artist && artist.name && artist._id
    );

    if (validLineups.length === 0) {
      return null;
    }

    // Group lineups by category
    const groupedLineups = validLineups.reduce((groups, artist) => {
      const category = artist.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(artist);
      return groups;
    }, {});

    // Sort categories to ensure consistent order (with DJ and Headliner at the top)
    const sortedCategories = Object.keys(groupedLineups).sort((a, b) => {
      if (a === "DJ") return -1;
      if (b === "DJ") return 1;
      if (a === "Headliner") return -1;
      if (b === "Headliner") return 1;
      return a.localeCompare(b);
    });

    return (
      <div className="event-lineups">
        <h5>Lineup</h5>
        <div className="lineup-artists-container">
          {sortedCategories.map((category, categoryIndex) => (
            <motion.div
              key={category}
              className="lineup-category-group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
            >
              <h5 className="category-title">
                {category}
                <span className="artist-count">
                  ({groupedLineups[category].length})
                </span>
              </h5>
              <div className="lineup-artists">
                {groupedLineups[category].map((artist, index) => (
                  <motion.div
                    key={artist._id || index}
                    className="artist"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + categoryIndex * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {artist.avatar && artist.avatar.thumbnail ? (
                      <div className="artist-avatar">
                        <img src={artist.avatar.thumbnail} alt={artist.name} />
                      </div>
                    ) : (
                      <div className="artist-avatar placeholder">
                        {artist.name
                          ? artist.name.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                    )}
                    <div className="artist-info">
                      <span className="artist-name">{artist.name}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  // Add the preloadEventImage function
  const preloadEventImage = (event) => {
    if (!event) return;

    // Preload the event image if available
    if (event.flyer) {
      // Try to preload in priority order: landscape, square, portrait
      if (event.flyer.landscape?.medium) {
        const img = new Image();
        img.src = event.flyer.landscape.medium;
      } else if (event.flyer.square?.medium) {
        const img = new Image();
        img.src = event.flyer.square.medium;
      } else if (event.flyer.portrait?.medium) {
        const img = new Image();
        img.src = event.flyer.portrait.medium;
      }
    }
  };

  // Determine the aspect ratio of the current event's flyer
  const determineAspectRatioClass = () => {
    if (!events[currentIndex] || !events[currentIndex].flyer) return "";

    // Check if landscape exists and should be prioritized
    if (events[currentIndex].flyer.landscape) {
      return "has-landscape-flyer";
    }

    // Next check for square format (second priority)
    if (events[currentIndex].flyer.square) {
      return "has-square-flyer";
    }

    // Finally check portrait format (lowest priority)
    if (events[currentIndex].flyer.portrait) {
      return "has-portrait-flyer";
    }

    return "";
  };

  // Add state to track image loading
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handler for image load event
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Handler for image error
  const handleImageError = () => {
    setImageLoaded(true); // Still mark as loaded so UI doesn't wait indefinitely
  };

  const handleTicketsClick = (event, e) => {
    e.stopPropagation(); // Prevent the main event click handler from firing

    // In BrandProfile context, scroll to the ticket section instead of navigating
    if (seamless) {
      // Scroll to the ticket section if ref exists
      if (ticketSectionRef.current) {
        ticketSectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      return;
    }

    // Default behavior for other contexts: navigate to event profile
    const eventWithSection = {
      ...event,
      navigateToSection: "tickets",
    };

    // Call the view event handler with our modified event object
    handleViewEvent(eventWithSection);
  };

  const handleGuestCodeClick = (event, e) => {
    e.stopPropagation(); // Prevent the main event click handler from firing

    // In BrandProfile context, scroll to the guest code section instead of navigating
    if (seamless) {
      // Scroll to the guest code section if ref exists
      if (guestCodeSectionRef.current) {
        guestCodeSectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      return;
    }

    // Default behavior for other contexts: navigate to event profile
    const eventWithSection = {
      ...event,
      navigateToSection: "codes",
    };

    // Call the view event handler with our modified event object
    handleViewEvent(eventWithSection);
  };

  // Check if we have a current event to display
  if (loading) {
    return (
      <div
        className={`upcoming-event-container loading ${
          seamless ? "seamless" : ""
        }`}
      >
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`upcoming-event-container error ${
          seamless ? "seamless" : ""
        }`}
      >
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <p>{error}</p>
          <button className="retry-button" onClick={fetchUpcomingEvents}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div
        className={`upcoming-event-container empty ${
          seamless ? "seamless" : ""
        }`}
      >
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>No Upcoming Events yet, come back again later.</p>
        </div>
      </div>
    );
  }

  const currentEvent = events[currentIndex];
  const eventImage = getEventImage();
  const hasSelectedTickets = Object.values(ticketQuantities).some(
    (quantity) => quantity > 0
  );

  // Get guest code setting if available
  const guestCodeSetting = currentEvent.codeSettings?.find(
    (cs) => cs.type === "guest"
  );

  // Only show navigation when there's more than one event
  const showNavigation = !hideNavigation && events.length > 1;

  return (
    <div className={`upcoming-event-container ${seamless ? "seamless" : ""}`}>
      {showNavigation && (
        <div className="event-navigation">
          <button
            className={`nav-button prev ${
              currentIndex === 0 ? "disabled" : ""
            }`}
            onClick={handlePrevEvent}
            disabled={currentIndex === 0}
          >
            <RiArrowLeftSLine />
          </button>
          <div className="navigation-indicator">
            {events.map((_, index) => (
              <div
                key={index}
                className={`indicator-dot ${
                  index === currentIndex ? "active" : ""
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
          <button
            className={`nav-button next ${
              currentIndex === events.length - 1 ? "disabled" : ""
            }`}
            onClick={handleNextEvent}
            disabled={currentIndex === events.length - 1}
          >
            <RiArrowRightSLine />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentEvent?._id || `event-${currentIndex}`}
          className={`event-card ${determineAspectRatioClass()}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <div className="event-image-wrapper">
            <div className="event-image-container">
              {eventImage ? (
                <img
                  src={eventImage}
                  alt={currentEvent.title}
                  className="event-image"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div className="no-image">
                  <RiImageLine />
                  <span>No image available</span>
                </div>
              )}
            </div>
          </div>

          <div className="event-details">
            <div className="event-header">
              <h3 className="event-title">{currentEvent.title}</h3>
              {currentEvent.subTitle && (
                <p className="event-subtitle">{currentEvent.subTitle}</p>
              )}

              {/* Event Description */}
              {currentEvent.description && (
                <div className="event-description-container">
                  <p className="event-description">
                    {currentEvent.description}
                  </p>
                </div>
              )}
            </div>

            {/* EventDetails Component with integrated action buttons */}
            <div className="event-details-section">
              <EventDetails
                event={currentEvent}
                scrollToTickets={(e) => {
                  e.stopPropagation();
                  // Use the new handler with navigation integration
                  handleTicketsClick(currentEvent, e);
                }}
                scrollToGuestCode={(e) => {
                  e.stopPropagation();
                  // Use the new handler with navigation integration
                  handleGuestCodeClick(currentEvent, e);
                }}
              />
            </div>

            {/* Lineup section */}
            {currentEvent.lineups && currentEvent.lineups.length > 0 && (
              <>{renderLineups(currentEvent.lineups)}</>
            )}

            {/* Content sections wrapper for responsive layout */}
            <div className="content-sections">
              {/* Ticket Purchase Section */}
              <div ref={ticketSectionRef} className="ticket-section full-width">
                {currentEvent &&
                  (currentEvent.ticketsAvailable ||
                    ticketSettings.length > 0) && (
                    <Tickets
                      eventId={currentEvent._id}
                      eventTitle={currentEvent.title}
                      eventDate={currentEvent.date}
                      seamless={seamless}
                      fetchTicketSettings={async (eventId) => {
                        try {
                          const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${eventId}`;

                          const response = await axiosInstance.get(endpoint);
                          let ticketSettings = [];

                          if (
                            response.data &&
                            response.data.ticketSettings &&
                            response.data.ticketSettings.length > 0
                          ) {
                            ticketSettings = response.data.ticketSettings;
                          } else if (currentEvent.parentEventId) {
                            // If this is a child event and no ticket settings were found, check parent event
                            try {
                              const parentEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${currentEvent.parentEventId}`;
                              const parentResponse = await axiosInstance.get(
                                parentEndpoint
                              );

                              if (
                                parentResponse.data &&
                                parentResponse.data.ticketSettings &&
                                parentResponse.data.ticketSettings.length > 0
                              ) {
                                ticketSettings =
                                  parentResponse.data.ticketSettings;
                              }
                            } catch (parentError) {
                              console.error(
                                "[UpcomingEvent] Error fetching parent ticket settings:",
                                parentError
                              );
                            }
                          }

                          return ticketSettings;
                        } catch (error) {
                          console.error(
                            "[UpcomingEvent] Error fetching ticket settings:",
                            error
                          );
                          return [];
                        }
                      }}
                    />
                  )}
              </div>

              {/* GuestCode component section */}
              <div ref={guestCodeSectionRef} className="guest-code-section">
                {currentEvent && <GuestCode event={currentEvent} />}
              </div>
            </div>
          </div>

          {/* Add See Full Event button */}
          <button
            className="see-full-event-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleViewEvent(currentEvent);
            }}
          >
            See Full Event <RiArrowRightLine />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default UpcomingEvent;
