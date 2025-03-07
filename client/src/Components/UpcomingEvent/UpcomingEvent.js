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

  // Ticket settings state
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Action buttons refs for scrolling
  const guestCodeSectionRef = useRef(null);
  const ticketSectionRef = useRef(null);

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

      console.log(
        "[UpcomingEvent] Processing code settings for event:",
        currentEvent._id,
        "with title:",
        currentEvent.title
      );

      // Try to get the max pax from code settings
      if (currentEvent.codeSettings && currentEvent.codeSettings.length > 0) {
        console.log(
          "[UpcomingEvent] Code settings found:",
          currentEvent.codeSettings.map((cs) => ({
            type: cs.type,
            name: cs.name,
            condition: cs.condition,
            maxPax: cs.maxPax,
            isEnabled: cs.isEnabled,
          }))
        );

        const guestCodeSetting = currentEvent.codeSettings.find(
          (cs) => cs.type === "guest"
        );

        console.log("[UpcomingEvent] Guest code setting:", guestCodeSetting);

        if (guestCodeSetting) {
          // Check if we have all the necessary data
          const hasCompleteData =
            guestCodeSetting.maxPax !== undefined &&
            guestCodeSetting.condition !== undefined;

          console.log(
            "[UpcomingEvent] Guest code setting has complete data:",
            hasCompleteData
          );

          // Set maxPax if available
          if (guestCodeSetting.maxPax) {
            console.log(
              "[UpcomingEvent] Setting maxPax to:",
              guestCodeSetting.maxPax
            );
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
              fetchCompleteCodeSettings(currentEvent._id);
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
        console.log(
          "[UpcomingEvent] Received code settings from event profile:",
          response.data.codeSettings
        );

        // Find the guest code setting
        const guestCodeSetting = response.data.codeSettings.find(
          (cs) => cs.type === "guest"
        );

        if (guestCodeSetting) {
          console.log(
            "[UpcomingEvent] Guest code setting from event profile:",
            guestCodeSetting
          );

          // Update the events array with the complete code settings
          setEvents((prevEvents) => {
            const updatedEvents = [...prevEvents];
            const currentEvent = updatedEvents[currentIndex];

            // Find the index of the guest code setting in the current event
            const settingIndex = currentEvent.codeSettings.findIndex(
              (cs) => cs.type === "guest"
            );

            if (settingIndex !== -1) {
              // Update the guest code setting with all the complete data
              currentEvent.codeSettings[settingIndex] = {
                ...currentEvent.codeSettings[settingIndex],
                condition: guestCodeSetting.condition || "",
                maxPax: guestCodeSetting.maxPax || 1,
                limit: guestCodeSetting.limit || 0,
                isEnabled:
                  guestCodeSetting.isEnabled !== undefined
                    ? guestCodeSetting.isEnabled
                    : false,
                isEditable:
                  guestCodeSetting.isEditable !== undefined
                    ? guestCodeSetting.isEditable
                    : false,
              };

              // Also update the maxPax state
              if (guestCodeSetting.maxPax) {
                setMaxPax(guestCodeSetting.maxPax);
              }

              console.log(
                "[UpcomingEvent] Updated guest code setting in event:",
                currentEvent.codeSettings[settingIndex]
              );
            }

            return updatedEvents;
          });
        }
      } else {
        console.log(
          "[UpcomingEvent] No code settings found in event profile response"
        );
      }
    } catch (error) {
      console.error(
        "[UpcomingEvent] Error fetching from event profile endpoint:",
        error
      );

      // Log more details about the error
      if (error.response) {
        console.error("[UpcomingEvent] Error response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        console.error("[UpcomingEvent] Error request:", error.request);
      } else {
        console.error("[UpcomingEvent] Error message:", error.message);
      }
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
    console.log("[UpcomingEvent] Creating sample ticket for testing");
    return [
      {
        _id: `sample-${eventId}`,
        name: "General Admission",
        description: "Standard entry ticket",
        price: 25.0,
        originalPrice: 30.0,
        isLimited: true,
        maxTickets: 100,
        soldCount: 20,
        hasCountdown: false,
        eventId: eventId,
      },
      {
        _id: `early-${eventId}`,
        name: "Early Bird",
        description: "Limited early bird discount",
        price: 15.0,
        originalPrice: 25.0,
        isLimited: true,
        maxTickets: 50,
        soldCount: 35,
        hasCountdown: true,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
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

      try {
        const response = await axiosInstance.get(endpoint);
        console.log(`[UpcomingEvent] Response from ${endpoint}:`, response);

        if (
          response.data &&
          response.data.ticketSettings &&
          Array.isArray(response.data.ticketSettings)
        ) {
          console.log(
            `[UpcomingEvent] Successfully fetched tickets from event profile:`,
            response.data.ticketSettings
          );
          setTicketSettings(response.data.ticketSettings);
          return;
        } else {
          console.log(
            "[UpcomingEvent] No ticket settings found in event profile response"
          );
        }
      } catch (error) {
        console.error(
          `[UpcomingEvent] Error fetching from event profile endpoint:`,
          error.message
        );
      }

      // Fallback to ticket-settings endpoint if event profile doesn't have ticket settings
      const ticketEndpoint = `${process.env.REACT_APP_API_BASE_URL}/ticket-settings/events/${eventId}`;
      console.log(
        `[UpcomingEvent] Trying ticket settings endpoint: ${ticketEndpoint}`
      );

      try {
        const response = await axiosInstance.get(ticketEndpoint);

        if (response.data) {
          let ticketsData = null;

          if (Array.isArray(response.data)) {
            ticketsData = response.data;
          } else if (
            response.data.ticketSettings &&
            Array.isArray(response.data.ticketSettings)
          ) {
            ticketsData = response.data.ticketSettings;
          } else if (
            response.data.tickets &&
            Array.isArray(response.data.tickets)
          ) {
            ticketsData = response.data.tickets;
          }

          if (ticketsData && ticketsData.length > 0) {
            console.log(
              `[UpcomingEvent] Successfully fetched tickets from ticket settings endpoint:`,
              ticketsData
            );
            setTicketSettings(ticketsData);
            return;
          }
        }
      } catch (error) {
        console.log(
          `[UpcomingEvent] Ticket settings endpoint failed:`,
          error.message
        );
      }

      // If we get here, no tickets were found
      console.log(
        "[UpcomingEvent] No valid ticket data found from any endpoint"
      );
      setTicketSettings([]);
    } catch (error) {
      console.error("[UpcomingEvent] Error fetching ticket settings:", error);
      console.error("[UpcomingEvent] Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      setTicketSettings([]);
      toast.showError("Failed to load ticket information");
    } finally {
      setLoadingTickets(false);
    }
  };

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

  // Add console log to check code settings
  console.log(
    "[UpcomingEvent] Current event code settings:",
    currentEvent?.codeSettings
  );

  // Add more detailed logging for guest code settings
  if (currentEvent?.codeSettings) {
    const guestCodeSetting = currentEvent.codeSettings.find(
      (cs) => cs.type === "guest"
    );
    console.log("[UpcomingEvent] Guest code setting:", guestCodeSetting);
    console.log(
      "[UpcomingEvent] Guest code condition:",
      guestCodeSetting?.condition
    );
  }

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

            {/* Ticket Purchase Section */}
            <div ref={ticketSectionRef} className="ticket-section">
              {currentEvent && currentEvent.ticketsAvailable && (
                <>
                  <h3>Buy Tickets</h3>
                  <p className="ticket-info">
                    Purchase tickets for {currentEvent.title} on{" "}
                    {formatDate(currentEvent.date)}.
                  </p>

                  {console.log("[UpcomingEvent] Ticket section rendering:", {
                    hasTicketSettings: !!ticketSettings,
                    ticketSettingsLength: ticketSettings?.length || 0,
                    ticketSettingsData: ticketSettings,
                    loadingTickets,
                    timestamp: new Date().toISOString(),
                  })}

                  {ticketSettings && ticketSettings.length > 0 ? (
                    <>
                      {console.log(
                        "[UpcomingEvent] Rendering Stripe component with:",
                        {
                          ticketCount: ticketSettings.length,
                          eventId: currentEvent._id,
                          timestamp: new Date().toISOString(),
                        }
                      )}
                      <Stripe
                        ticketSettings={ticketSettings}
                        eventId={currentEvent._id}
                        colors={{
                          primary: "#ffc807",
                          secondary: "#2196F3",
                          background: "rgba(255, 255, 255, 0.05)",
                        }}
                        onCheckoutComplete={(result) => {
                          console.log(
                            "[UpcomingEvent] Checkout completed:",
                            result
                          );
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
