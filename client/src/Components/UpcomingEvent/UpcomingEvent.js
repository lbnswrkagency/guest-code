import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./UpcomingEvent.scss";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../../Components/Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import Stripe from "../Stripe/Stripe";
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

const UpcomingEvent = ({ brandId, brandUsername, limit = 5 }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // Guest code form state
  const [showGuestCodeForm, setShowGuestCodeForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPax, setGuestPax] = useState(1);
  const [maxPax, setMaxPax] = useState(5);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Ticket settings state
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketQuantities, setTicketQuantities] = useState({});

  // Action buttons refs for scrolling
  const guestCodeSectionRef = useRef(null);
  const ticketSectionRef = useRef(null);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    // Initialize component
    setLoading(true);
    setError(null);
    setEvents([]);
    setCurrentIndex(0);
    setTicketSettings([]);
    setLoadingTickets(false);
    setShowGuestCodeForm(false);
    setSuccessMessage(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPax(1);
    setGeneratingCode(false);

    fetchUpcomingEvents();
  }, [brandId, brandUsername]);

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

          // Set maxPax if available
          if (guestCodeSetting.maxPax) {
            setMaxPax(guestCodeSetting.maxPax);
          } else {
            console.warn(
              "[UpcomingEvent] maxPax is missing or invalid:",
              guestCodeSetting.maxPax
            );
          }

          // Check if condition is empty or missing
          if (!guestCodeSetting.condition && guestCodeSetting.condition !== 0) {
            console.warn(
              "[UpcomingEvent] Guest code condition is empty or missing, should be populated from DB"
            );

            // If we have an event ID, fetch the complete code settings
            if (currentEvent._id) {
              console.log(
                "[UpcomingEvent] Attempting to fetch complete code settings for event:",
                currentEvent._id
              );

              // Create an async function to fetch and update settings
              const fetchAndUpdateSettings = async () => {
                // Fetch the complete code settings and update the state
                const completeSettings = await fetchCompleteCodeSettings(
                  currentEvent._id
                );

                if (completeSettings) {
                  console.log(
                    "[UpcomingEvent] Received complete code settings:",
                    completeSettings
                  );

                  // Update the events array with the complete code settings
                  setEvents((prevEvents) => {
                    const updatedEvents = [...prevEvents];
                    const currentEvent = updatedEvents[currentIndex];

                    // Update the code settings in the current event
                    currentEvent.codeSettings = completeSettings;

                    // Find the guest code setting
                    const guestCodeSetting = completeSettings.find(
                      (cs) => cs.type === "guest"
                    );

                    if (guestCodeSetting && guestCodeSetting.maxPax) {
                      setMaxPax(guestCodeSetting.maxPax);
                    }

                    return updatedEvents;
                  });
                } else {
                  console.log(
                    "[UpcomingEvent] Failed to fetch complete code settings or no settings found"
                  );
                }
              };

              // Execute the async function
              fetchAndUpdateSettings();
            }
          } else {
            console.log(
              "[UpcomingEvent] Guest code condition is present:",
              guestCodeSetting.condition
            );
          }

          return;
        } else {
          console.log(
            "[UpcomingEvent] No guest code setting found in event code settings"
          );
        }
      } else {
        console.log("[UpcomingEvent] No code settings found for event");
      }

      // Default max pax if no settings are found
      console.log("[UpcomingEvent] Using default maxPax: 4");
      setMaxPax(4);
    }
  }, [currentIndex, events]);

  // Function to fetch complete code settings for an event
  const fetchCompleteCodeSettings = async (eventId) => {
    try {
      console.log(
        `[UpcomingEvent] Fetching complete code settings for event: ${eventId}`
      );

      // Use the event profile endpoint which has optional authentication
      const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${eventId}`;
      console.log(`[UpcomingEvent] Using event profile endpoint: ${endpoint}`);

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
        console.log(
          "[UpcomingEvent] ticketsAvailable property is undefined, setting default to true"
        );
        currentEvent.ticketsAvailable = true; // Default to true if not specified
      }

      console.log(
        "[UpcomingEvent] Current event changed, fetching ticket settings:",
        {
          eventId: currentEvent._id,
          eventTitle: currentEvent.title,
          ticketsAvailable: currentEvent.ticketsAvailable,
          hasTicketsAvailableProperty: "ticketsAvailable" in currentEvent,
          timestamp: new Date().toISOString(),
        }
      );

      // Only fetch ticket settings if the event has tickets available
      if (currentEvent.ticketsAvailable) {
        fetchTicketSettings(currentEvent._id);
      } else {
        console.log(
          "[UpcomingEvent] Skipping ticket settings fetch - event does not have tickets available"
        );
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
      console.log(
        "[UpcomingEvent] Current event changed, fetching ticket settings:",
        {
          eventId: eventId,
          eventTitle: events[currentIndex]?.title,
          ticketsAvailable: events[currentIndex]?.ticketsAvailable,
          hasTicketsAvailableProperty:
            "ticketsAvailable" in events[currentIndex],
          timestamp: new Date().toISOString(),
        }
      );

      // Try the event profile endpoint which has optional authentication
      const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${eventId}`;
      console.log(`[UpcomingEvent] Using event profile endpoint: ${endpoint}`);

      const response = await axiosInstance.get(endpoint);

      if (response.data && response.data.ticketSettings) {
        setTicketSettings(response.data.ticketSettings);
      } else {
        // No ticket settings found
        setTicketSettings([]);
      }
    } catch (error) {
      // Handle error silently
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
          const parentEvents = events.filter((event) => event.isParentEvent);

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
              // Handle child events error silently
            }
          }
        } catch (error) {
          if (error.response && error.response.status === 401) {
            // Not authenticated, try using brandUsername as fallback
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
                // Handle username error silently
                events = [];
              }
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
          } else {
            events = [];
          }
        } catch (err) {
          // Handle error silently
          events = [];
        }
      }

      // Filter out past events and sort by date
      const now = new Date();
      const upcomingEvents = events
        .filter((event) => {
          // Get event date
          const eventDate = new Date(event.date);

          // Create a date object for the event's end time on the next day
          const eventEndDate = new Date(eventDate);

          // If event has endTime, parse it and set it for the end date
          if (event.endTime) {
            // Parse hours and minutes from endTime (format: "HH:MM")
            const [hours, minutes] = event.endTime.split(":").map(Number);

            // If hours are less than 12, it's likely ending the next day (like "06:00" meaning 6 AM next day)
            if (hours < 12) {
              eventEndDate.setDate(eventEndDate.getDate() + 1);
            }

            eventEndDate.setHours(hours, minutes, 0, 0);
          } else {
            // If no endTime specified, default to end of day
            eventEndDate.setHours(23, 59, 59, 999);
          }

          // Event is upcoming if its end date/time is in the future
          return eventEndDate >= now;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setEvents(upcomingEvents);

      if (upcomingEvents.length > 0) {
        // Preload the first event's image
        const firstEvent = upcomingEvents[0];
        if (
          firstEvent.media &&
          firstEvent.media.images &&
          firstEvent.media.images.length > 0
        ) {
          const img = new Image();
          img.src = firstEvent.media.images[0].url;
        }

        // Fetch ticket settings for the first event
        fetchTicketSettings(firstEvent._id);
      }

      setLoading(false);
    } catch (err) {
      // Handle error silently
      setEvents([]);
      setError("Failed to load upcoming events");
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
    const eventDate = new Date(event.date);
    const dateSlug = `${String(eventDate.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(eventDate.getDate()).padStart(2, "0")}${String(
      eventDate.getFullYear()
    ).slice(-2)}`;

    // If user is logged in, navigate to the user-specific route
    if (user) {
      console.log(
        `[UpcomingEvent] Navigating to user event: /@${user.username}/@${brandUser}/${dateSlug}`
      );
      navigate(`/@${user.username}/@${brandUser}/${dateSlug}`);
    } else {
      // If no user, use the public route
      console.log(
        `[UpcomingEvent] Navigating to public event: /@${brandUser}/${dateSlug}`
      );
      navigate(`/@${brandUser}/${dateSlug}`);
    }
  };

  const handleGenerateGuestCode = async () => {
    try {
      // Validate guest name and email
      if (
        !guestName.trim() ||
        !guestEmail.trim() ||
        !guestEmail.includes("@")
      ) {
        toast.showError("Please enter a valid name and email");
        return;
      }

      // Set generating state
      setGeneratingCode(true);

      // Use info toast to let the user know we're processing
      toast.showInfo("Processing your request...");

      // Make sure we're using the current event ID
      const eventId = events[currentIndex]._id;
      console.log("[UpcomingEvent] Generating guest code for event:", eventId);
      console.log("[UpcomingEvent] Guest details:", {
        name: guestName,
        email: guestEmail,
        pax: guestPax,
        isAuthenticated: !!user,
      });

      const response = await axiosInstance.post("/guest-code/generate", {
        eventId: eventId,
        guestName: guestName,
        guestEmail: guestEmail,
        maxPax: guestPax,
      });

      console.log(
        "[UpcomingEvent] Guest code generated and sent:",
        response.data
      );

      // Check if the response contains a success property or code property
      if (response.data && (response.data.success || response.data.code)) {
        // Clear form fields
        setGuestName("");
        setGuestEmail("");
        setGuestPax(1);

        // Show success message
        setSuccessMessage(
          `Guest code sent to ${guestEmail}. Please check your email.`
        );
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000); // Clear the message after 5 seconds

        // Show success toast
        toast.showSuccess("Guest code generated and sent successfully");
      } else {
        // If response doesn't have expected success properties, show an error
        toast.showError(
          response.data?.message || "Failed to generate guest code"
        );
      }
    } catch (err) {
      console.error("[UpcomingEvent] Error generating guest code:", err);

      // Handle specific error cases
      if (err.response?.status === 401) {
        toast.showError("Please log in to generate guest codes");
      } else if (err.response?.status === 403) {
        toast.showError(
          "You don't have permission to generate guest codes for this event"
        );
      } else {
        toast.showError(
          err.response?.data?.message || "Failed to generate guest code"
        );
      }
    } finally {
      setGeneratingCode(false);
    }
  };

  const toggleGuestCodeForm = () => {
    setShowGuestCodeForm((prev) => !prev);
  };

  // Function to determine which flyer image to use
  const getEventImage = () => {
    if (!events[currentIndex]?.flyer) return null;

    // Check different formats in order of preference
    if (
      events[currentIndex].flyer.landscape &&
      (events[currentIndex].flyer.landscape.medium ||
        events[currentIndex].flyer.landscape.thumbnail)
    ) {
      return (
        events[currentIndex].flyer.landscape.medium ||
        events[currentIndex].flyer.landscape.thumbnail
      );
    }

    if (
      events[currentIndex].flyer.portrait &&
      (events[currentIndex].flyer.portrait.medium ||
        events[currentIndex].flyer.portrait.thumbnail)
    ) {
      return (
        events[currentIndex].flyer.portrait.medium ||
        events[currentIndex].flyer.portrait.thumbnail
      );
    }

    if (
      events[currentIndex].flyer.square &&
      (events[currentIndex].flyer.square.medium ||
        events[currentIndex].flyer.square.thumbnail)
    ) {
      return (
        events[currentIndex].flyer.square.medium ||
        events[currentIndex].flyer.square.thumbnail
      );
    }

    return null;
  };

  // Render lineup artists
  const renderLineups = (lineups) => {
    if (!lineups || !Array.isArray(lineups) || lineups.length === 0) {
      return null;
    }

    // Group lineups by category
    const groupedLineups = lineups.reduce((groups, artist) => {
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

  // Check if we have a current event to display
  if (loading) {
    return (
      <div className="upcoming-event-container loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="upcoming-event-container error">
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
      <div className="upcoming-event-container empty">
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>No upcoming events found</p>
          <span className="empty-state-subtext">
            Check back later for new events
          </span>
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

  return (
    <div className="upcoming-event-container">
      <div className="event-navigation">
        <button
          className={`nav-button prev ${currentIndex === 0 ? "disabled" : ""}`}
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

      <AnimatePresence mode="wait">
        <motion.div
          key={currentEvent._id}
          className="event-card"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="event-image-container"
            onClick={() => handleViewEvent(currentEvent)}
          >
            {eventImage ? (
              <img
                src={eventImage}
                alt={currentEvent.title}
                className="event-image"
              />
            ) : (
              <div className="no-image">
                <RiImageLine />
                <span>No image available</span>
              </div>
            )}
          </div>

          <div className="event-details">
            <h3
              className="event-title"
              onClick={() => handleViewEvent(currentEvent)}
            >
              {currentEvent.title}
            </h3>
            {currentEvent.subTitle && (
              <p className="event-subtitle">{currentEvent.subTitle}</p>
            )}

            <div className="event-info">
              <div className="info-item">
                <RiCalendarEventLine />
                <span>{formatDate(currentEvent.date)}</span>
              </div>
              <div className="info-item">
                <RiTimeLine />
                <span>{currentEvent.startTime || "TBA"}</span>
              </div>
              <div className="info-item">
                <RiMapPinLine />
                <span>{currentEvent.location || "TBA"}</span>
              </div>
              {currentEvent.ticketsAvailable && (
                <div className="info-item ticket">
                  <RiTicketLine />
                  <span>Tickets Available</span>
                </div>
              )}
              {currentEvent.codeSettings &&
                currentEvent.codeSettings.find((cs) => cs.type === "guest") && (
                  <div className="info-item guest-code">
                    <RiVipCrownLine />
                    <span>
                      Guest Code Available
                      {(() => {
                        const guestCodeSetting = currentEvent.codeSettings.find(
                          (cs) => cs.type === "guest"
                        );
                        if (guestCodeSetting && guestCodeSetting.condition) {
                          return (
                            <span className="condition-text">
                              {" "}
                              - {guestCodeSetting.condition}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </span>
                  </div>
                )}
              {currentEvent.music && (
                <div className="info-item music">
                  <RiMusic2Line />
                  <span>{currentEvent.music}</span>
                </div>
              )}
            </div>

            {/* Action Buttons - Minimalistic style */}
            <div className="action-buttons">
              <button
                className="action-button guest-code-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGuestCodeForm(true);
                  if (guestCodeSectionRef.current) {
                    guestCodeSectionRef.current.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }}
              >
                GENERATE GUEST CODE
              </button>

              <button
                className="action-button buy-ticket-button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Fetch ticket settings if not already loaded
                  if (ticketSettings.length === 0 && !loadingTickets) {
                    fetchTicketSettings(currentEvent._id);
                  }
                  if (ticketSectionRef.current) {
                    ticketSectionRef.current.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }}
              >
                BUY TICKET
              </button>
            </div>

            {/* Lineup section */}
            {currentEvent.lineups &&
              currentEvent.lineups.length > 0 &&
              renderLineups(currentEvent.lineups)}

            {/* Content sections wrapper for responsive layout */}
            <div className="content-sections">
              {/* Ticket Purchase Section */}
              <div ref={ticketSectionRef} className="ticket-section">
                {currentEvent && currentEvent.ticketsAvailable && (
                  <>
                    <h3>Buy Tickets</h3>
                    <p className="ticket-info">
                      Purchase tickets for {currentEvent.title} on{" "}
                      {formatDate(currentEvent.date)}.
                    </p>

                    {ticketSettings && ticketSettings.length > 0 ? (
                      <>
                        <Stripe
                          ticketSettings={ticketSettings}
                          eventId={currentEvent._id}
                          colors={{
                            primary: "#ffc807",
                            secondary: "#2196F3",
                            background: "rgba(255, 255, 255, 0.05)",
                          }}
                          onCheckoutComplete={(result) => {
                            toast.showSuccess("Redirecting to checkout...");
                            setLoadingTickets(false);
                          }}
                        />
                      </>
                    ) : (
                      <div className="no-tickets-message">
                        {loadingTickets ? (
                          <div className="loading-tickets">
                            <LoadingSpinner />
                            <span>Loading ticket information...</span>
                          </div>
                        ) : (
                          <>
                            <p>
                              No tickets are currently available for this event.
                            </p>
                            <div className="ticket-actions">
                              <button
                                className="retry-button"
                                onClick={() =>
                                  fetchTicketSettings(currentEvent._id)
                                }
                              >
                                <RiRefreshLine /> Retry
                              </button>
                              {user && user.isAdmin && (
                                <button
                                  className="sample-button"
                                  onClick={() =>
                                    setTicketSettings(
                                      createSampleTicket(currentEvent._id)
                                    )
                                  }
                                >
                                  <RiTestTubeLine /> Use Sample Tickets
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Show the guest code section for all users */}
              <div ref={guestCodeSectionRef} className="guest-code-section">
                <h4>Request Guest Code</h4>

                {/* Condition text from code settings if available */}
                {currentEvent.codeSettings &&
                currentEvent.codeSettings.find((cs) => cs.type === "guest")
                  ?.condition ? (
                  <p className="condition-text">
                    {(() => {
                      const guestCodeSetting = currentEvent.codeSettings.find(
                        (cs) => cs.type === "guest"
                      );
                      console.log(
                        "[UpcomingEvent] Displaying condition in guest code section:",
                        guestCodeSetting.condition
                      );
                      return guestCodeSetting.condition;
                    })()}
                  </p>
                ) : (
                  <p className="condition-text">
                    Fill in your details below to request a guest code for this
                    event.
                  </p>
                )}

                {/* Success message */}
                {successMessage && (
                  <div className="success-message">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="success-content"
                    >
                      {successMessage}
                    </motion.div>
                  </div>
                )}

                {/* Always show the form, removing the conditional rendering */}
                <div
                  className="guest-code-form"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="form-group">
                    <div className="input-icon">
                      <RiUserLine />
                    </div>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="form-group">
                    <div className="input-icon">
                      <RiMailLine />
                    </div>
                    <input
                      type="email"
                      placeholder="Your Email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="form-group">
                    <div className="input-icon">
                      <RiUserLine />
                    </div>
                    <select
                      value={guestPax}
                      onChange={(e) => setGuestPax(Number(e.target.value))}
                      className="pax-selector"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {Array.from({ length: maxPax }, (_, i) => i + 1).map(
                        (num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? "Person" : "People"}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="form-buttons">
                    <motion.button
                      className="submit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateGuestCode();
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={
                        generatingCode ||
                        !guestName ||
                        !guestEmail ||
                        !guestEmail.includes("@")
                      }
                    >
                      {generatingCode ? (
                        <>
                          <span className="loading-spinner-small"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <RiCodeSSlashLine /> Get Guest Code
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add See Full Event button after the guest code section */}
            <button
              className="see-full-event-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleViewEvent(currentEvent);
              }}
            >
              See Full Event <RiArrowRightLine />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default UpcomingEvent;
