import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./UpcomingEvent.scss";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../../Components/Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
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
  const [generatingCode, setGeneratingCode] = useState(false);
  const [maxPax, setMaxPax] = useState(1);
  const [codeSettings, setCodeSettings] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (brandId || brandUsername) {
      console.log("[UpcomingEvent] Initializing with:", {
        brandId,
        brandUsername,
        limit,
      });
      fetchUpcomingEvents();
    }
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
        if (guestCodeSetting && guestCodeSetting.maxPax) {
          setMaxPax(guestCodeSetting.maxPax);
          return;
        }
      }

      // Default max pax if no settings are found
      setMaxPax(4);
    }
  }, [currentIndex, events]);

  const fetchUpcomingEvents = async () => {
    setLoading(true);
    try {
      let endpoint;
      let events = [];

      console.log("[UpcomingEvent] Fetching with params:", {
        brandId,
        brandUsername,
        isAuthenticated: !!user,
        timestamp: new Date().toISOString(),
      });

      // If we only have brandUsername (public view or authenticated without brandId)
      if (brandUsername && !brandId) {
        // If we use the public endpoint, remove @ if present
        const cleanUsername = brandUsername.replace(/^@/, "");
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${cleanUsername}`;

        console.log(`[UpcomingEvent] Using username endpoint: ${endpoint}`);

        try {
          const response = await axiosInstance.get(endpoint);
          if (response.data && Array.isArray(response.data)) {
            events = response.data;
            console.log(
              `[UpcomingEvent] Successfully fetched ${events.length} events from username endpoint`
            );
          } else {
            console.log("[UpcomingEvent] No events returned from API");
            events = [];
          }
        } catch (error) {
          console.error(
            "[UpcomingEvent] Error fetching events from username endpoint:",
            error
          );
          if (error.response && error.response.status === 404) {
            // Brand not found
            setError("Brand not found");
          } else {
            // Other errors
            setError("Failed to fetch upcoming events");
          }
          setLoading(false);
          return;
        }
      }
      // If we have brandId (authenticated view)
      else if (brandId) {
        // First fetch parent events
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/brand/${brandId}`;
        console.log(`[UpcomingEvent] Fetching parent events from: ${endpoint}`);

        try {
          const parentResponse = await axiosInstance.get(endpoint);

          // Get all parent events
          const parentEvents = parentResponse.data;
          events = [...parentEvents];

          // Now fetch child events for each weekly parent event
          for (const parentEvent of parentEvents) {
            if (parentEvent.isWeekly) {
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
                console.error(
                  `[UpcomingEvent] Error fetching child events for parent ${parentEvent._id}:`,
                  childError
                );
              }
            }
          }
        } catch (error) {
          console.error(
            "[UpcomingEvent] Error fetching events by brandId:",
            error
          );
          if (error.response && error.response.status === 401) {
            // Not authenticated, try using brandUsername as fallback
            if (brandUsername) {
              console.log(
                "[UpcomingEvent] Authentication failed, falling back to public endpoint"
              );
              const cleanUsername = brandUsername.replace(/^@/, "");
              endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${cleanUsername}`;

              try {
                const response = await axiosInstance.get(endpoint);
                if (response.data && Array.isArray(response.data)) {
                  events = response.data;
                } else {
                  events = [];
                }
              } catch (fallbackError) {
                console.error(
                  "[UpcomingEvent] Error with fallback endpoint:",
                  fallbackError
                );
                setError("Failed to fetch upcoming events");
                setLoading(false);
                return;
              }
            } else {
              setError("Authentication required");
              setLoading(false);
              return;
            }
          } else {
            setError("Failed to fetch upcoming events");
            setLoading(false);
            return;
          }
        }
      } else {
        throw new Error("Either brandId or brandUsername must be provided");
      }

      console.log(
        "[UpcomingEvent] Total events before filtering:",
        events.length
      );

      // Filter for upcoming events and sort by date
      const now = new Date();
      const upcomingEvents = events
        .filter((event) => new Date(event.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, limit);

      console.log(
        "[UpcomingEvent] Filtered upcoming events:",
        upcomingEvents.length
      );

      setEvents(upcomingEvents);
    } catch (err) {
      console.error("[UpcomingEvent] Error fetching upcoming events:", err);
      setError("Failed to fetch upcoming events");
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

      if (response.data && response.data.code) {
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
        toast.showSuccess(`Guest code sent to ${guestEmail}`);
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
          <RiCalendarEventLine className="empty-icon" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="upcoming-event-container empty">
        <div className="empty-state">
          <RiCalendarEventLine className="empty-icon" />
          <p>No upcoming events scheduled at this time</p>
          <p className="empty-state-subtext">Check back later for new events</p>
        </div>
      </div>
    );
  }

  const currentEvent = events[currentIndex];
  const eventImage = getEventImage();

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
                <span>{currentEvent.startTime}</span>
              </div>
              <div className="info-item">
                <RiMapPinLine />
                <span>{currentEvent.location}</span>
              </div>
              {currentEvent.music && (
                <div className="info-item">
                  <RiMusic2Line />
                  <span>{currentEvent.music}</span>
                </div>
              )}
              {currentEvent.ticketCode && (
                <div className="info-item ticket">
                  <RiTicketLine />
                  <span>Tickets available</span>
                </div>
              )}
            </div>

            {/* Lineup Section */}
            {currentEvent.lineups &&
              currentEvent.lineups.length > 0 &&
              renderLineups(currentEvent.lineups)}

            {/* Show the guest code section for all users */}
            <div className="guest-code-section">
              <h4>Request Guest Code</h4>

              {/* Condition text from code settings if available */}
              {currentEvent.codeSettings &&
                currentEvent.codeSettings.find((cs) => cs.type === "guest")
                  ?.condition && (
                  <p className="condition-text">
                    {
                      currentEvent.codeSettings.find(
                        (cs) => cs.type === "guest"
                      ).condition
                    }
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
