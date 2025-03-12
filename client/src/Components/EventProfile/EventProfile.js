import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./EventProfile.scss";
import axios from "axios";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import Navigation from "../Navigation/Navigation";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import Tickets from "../Tickets/Tickets";
import EventDetails from "../EventDetails/EventDetails";
import GuestCode from "../GuestCode/GuestCode";
import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiTicketLine,
  RiUserLine,
  RiLinkM,
  RiShareLine,
  RiInformationLine,
  RiCodeSSlashLine,
  RiVipCrownLine,
  RiDoorLine,
  RiTableLine,
  RiUserAddLine,
  RiUserFollowLine,
  RiStarFill,
  RiStarLine,
  RiMailLine,
  RiUserStarLine,
} from "react-icons/ri";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

const EventProfile = () => {
  const { eventId, brandUsername, dateSlug, eventSlug, eventUsername } =
    useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user, setUser } = useAuth();

  const [currentEventId, setCurrentEventId] = useState(null);
  const [event, setEvent] = useState(null);
  const [lineups, setLineups] = useState([]);
  const [ticketSettings, setTicketSettings] = useState([]);
  const [codeSettings, setCodeSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("event");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState("");
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countdowns, setCountdowns] = useState({});
  const [hasFetchAttempted, setHasFetchAttempted] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  const { pathname } = location;

  // Add effect to log navigation state changes
  useEffect(() => {
    console.log("[EventProfile] DashboardNavigation isOpen:", isNavigationOpen);
  }, [isNavigationOpen]);

  // Extract URL parameters
  const {
    eventId: urlEventId,
    brandUsername: urlBrandUsername,
    eventUsername: urlEventUsername,
    dateSlug: urlDateSlug,
    eventSlug: urlEventSlug,
  } = useParams();

  // Special handling for the path parameters when using the new URL format
  const extractedParams = useMemo(() => {
    const pathParts = pathname.split("/").filter((p) => p);

    console.log(
      "[EventProfile] Extracting parameters from path parts:",
      pathParts
    );

    // For the special format /@username/@brandusername/XXYYZZ
    if (
      pathParts.length === 3 &&
      pathParts[0].startsWith("@") &&
      pathParts[1].startsWith("@") &&
      /^\d{6}(-\d+)?$/.test(pathParts[2])
    ) {
      const result = {
        userUsername: pathParts[0].substring(1), // Remove @ from first part
        brandUsername: pathParts[1].substring(1), // Remove @ from second part
        dateSlug: pathParts[2], // The date part
      };
      console.log(
        "[EventProfile] Extracted special format parameters:",
        result
      );
      return result;
    }

    // For the format /@brandUsername/XXYYZZ (e.g., /@afrospiti/030925)
    if (
      pathParts.length === 2 &&
      pathParts[0].startsWith("@") &&
      /^\d{6}(-\d+)?$/.test(pathParts[1])
    ) {
      const result = {
        brandUsername: pathParts[0].substring(1), // Remove @ from first part
        dateSlug: pathParts[1], // The date part
      };
      console.log("[EventProfile] Extracted simple format parameters:", result);
      return result;
    }

    // Default case - use URL parameters
    const result = {
      brandUsername: urlBrandUsername?.replace(/^@/, "") || "", // Remove @ if present
      dateSlug: urlDateSlug || urlEventUsername, // Use eventUsername as dateSlug for special format
      eventSlug: urlEventSlug || "", // Include eventSlug if available
    };
    console.log("[EventProfile] Using URL parameters:", result);
    return result;
  }, [pathname, urlBrandUsername, urlDateSlug, urlEventUsername, urlEventSlug]);

  // Helper function to format date for URL (MMDDYY)
  const formatDateForUrl = useCallback((date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(2);
    return `${month}${day}${year}`;
  }, []);

  // Format date
  const formatDate = useCallback((dateString) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }, []);

  // Extract parameters from the URL path
  const isSpecialFormat = useCallback(() => {
    const pathParts = pathname.split("/").filter((p) => p);

    // For URL pattern /@userUsername/@brandUsername/dateSlug
    return (
      pathParts.length >= 3 &&
      pathParts[0].startsWith("@") &&
      pathParts[1].startsWith("@") &&
      /^\d{6}(-\d+)?$/.test(pathParts[2])
    );
  }, [pathname]);

  // The original format check for new URL patterns
  const isNewUrlFormat = useCallback(() => {
    // Check for special format /@brandUsername/@eventUsername/dateSlug
    if (isSpecialFormat()) {
      return true;
    }

    // Check for simple format /@brandUsername/dateSlug
    const pathParts = pathname.split("/").filter((p) => p);
    if (
      pathParts.length >= 2 &&
      pathParts[0].startsWith("@") &&
      /^\d{6}(-\d+)?$/.test(pathParts[1])
    ) {
      return true;
    }

    // Check if we have the necessary parameters for any other format
    if (extractedParams.brandUsername && extractedParams.dateSlug) {
      return true;
    }

    return false;
  }, [extractedParams, pathname, isSpecialFormat]);

  // Fetch event data
  const fetchEventData = useCallback(async () => {
    console.log("[EventProfile] Starting fetchEventData with params:", {
      urlEventId: eventId,
      currentEventId,
      extractedParams,
      pathname,
    });

    try {
      setLoading(true);
      let response;
      let endpoint;

      // Special format: /@brandUsername/@eventUsername/dateSlug
      if (isSpecialFormat()) {
        const { brandUsername, dateSlug } = extractedParams;

        console.log(
          "[EventProfile] Using special format with extracted params:",
          {
            brandUsername, // Without @ symbol
            dateSlug,
            pathParts: pathname.split("/").filter((p) => p),
          }
        );

        // Validate parameters before constructing endpoint
        if (!brandUsername || !dateSlug) {
          console.error(
            "[EventProfile] Missing required parameters for special format:",
            {
              brandUsername,
              dateSlug,
            }
          );
          setError("Invalid URL parameters");
          setLoading(false);
          return;
        }

        // Use the date endpoint with clean params
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${brandUsername}/${dateSlug}`;
        console.log("[EventProfile] Fetching with new endpoint:", endpoint);

        response = await axiosInstance.get(endpoint);
        console.log(
          "[EventProfile] Special format API response:",
          response.status,
          response.data
        );
      } else if (isNewUrlFormat()) {
        // Using the cleaned brandUsername from extractedParams
        const { brandUsername, dateSlug } = extractedParams;

        console.log("[EventProfile] URL parameters for new format:", {
          brandUsername,
          dateSlug,
          pathParts: pathname.split("/").filter((p) => p),
          extractedParams,
        });

        // Only proceed if we have both parameters
        if (brandUsername && dateSlug && /^\d{6}(-\d+)?$/.test(dateSlug)) {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${brandUsername}/${dateSlug}`;
          console.log(
            `[EventProfile] Fetching data for simplified format: ${endpoint}`
          );

          response = await axiosInstance.get(endpoint);
        } else if (brandUsername && urlEventSlug) {
          console.log("[EventProfile] Using event slug format with:", {
            brandUsername,
            dateSlug,
            urlEventSlug,
          });

          endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/slug/${brandUsername}/${dateSlug}/${urlEventSlug}`;
          console.log(
            `[EventProfile] Fetching data for full slug format: ${endpoint}`
          );

          response = await axiosInstance.get(endpoint);
        } else {
          console.error(
            "[EventProfile] Missing required parameters for API call:",
            {
              brandUsername,
              dateSlug,
              urlEventSlug,
            }
          );
          setError("Invalid URL parameters");
          setLoading(false);
          return; // Early return to prevent further processing with invalid parameters
        }
      } else if (eventId || currentEventId) {
        // Use currentEventId if available, otherwise fall back to eventId from useParams
        const effectiveEventId = currentEventId || eventId;

        if (!effectiveEventId) {
          console.error("[EventProfile] No event ID available for fetching");
          setError("Missing event ID");
          setLoading(false);
          return;
        }

        endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${effectiveEventId}`;
        console.log(`[EventProfile] Fetching data for event ID: ${endpoint}`);

        response = await axiosInstance.get(endpoint);
      } else {
        console.log("[EventProfile] No valid format detected, skipping fetch");
        setError("Invalid URL format");
        setLoading(false);
        return; // Early return to prevent further processing
      }

      console.log("[EventProfile] API Response status:", response.status);
      console.log("[EventProfile] API Response data:", response.data);

      if (response && response.data) {
        // Check if we have a valid event in the response
        const eventData = response.data.event || response.data;

        if (!eventData || !eventData._id) {
          console.error(
            "[EventProfile] No valid event data in response:",
            response.data
          );
          setError("Event not found");
          setLoading(false);
          return;
        }

        console.log("[EventProfile] Successfully loaded event:", {
          eventId: eventData._id,
          title: eventData.title,
          date: eventData.date,
          brand: eventData.brand?.username || "unknown",
        });

        setEvent(eventData);

        // Explicitly set the related data with detailed logging
        if (response.data.lineups) {
          console.log(
            "[EventProfile] Setting lineups:",
            response.data.lineups.length,
            "items"
          );
          setLineups(response.data.lineups);
        } else {
          console.log("[EventProfile] No lineups data in response");
          setLineups([]);
        }

        if (response.data.ticketSettings) {
          console.log(
            "[EventProfile] Setting ticketSettings:",
            response.data.ticketSettings.length,
            "items"
          );
          setTicketSettings(response.data.ticketSettings);
        } else {
          console.log("[EventProfile] No ticketSettings data in response");
          setTicketSettings([]);
        }

        if (response.data.codeSettings) {
          console.log(
            "[EventProfile] Setting codeSettings:",
            response.data.codeSettings.length,
            "items"
          );
          setCodeSettings(response.data.codeSettings);
        } else {
          console.log("[EventProfile] No codeSettings data in response");
          setCodeSettings([]);
        }

        // If we found the event by ID but we have the new URL format available,
        // update the URL without reloading the page
        if (urlEventId && !isNewUrlFormat() && eventData.slug) {
          const { brand, date, slug } = eventData;
          if (brand && brand.username && date) {
            // Use the now properly defined formatDateForUrl
            const formattedDate = formatDateForUrl(new Date(date));
            const newPath = `/@${brand.username}/e/${formattedDate}/${slug}`;
            console.log(
              `[EventProfile] Updating URL to new format: ${newPath}`
            );
            navigate(newPath, { replace: true });
          }
        }
      } else {
        console.log("[EventProfile] API returned empty or invalid data");
        setError("Could not find event information");
        throw new Error("Failed to load event data");
      }
    } catch (error) {
      console.error("[EventProfile] Error fetching event data:", error);
      console.error("[EventProfile] Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });

      // Set appropriate error message based on the error
      if (error.response?.status === 404) {
        setError("Event not found");
        toast.showError("Event not found");
      } else {
        setError("Failed to load event information");
        // Show a user-friendly error message, but only once
        if (!hasFetchAttempted) {
          toast.showError("Failed to load event information");
        }
      }
    } finally {
      setLoading(false);
      // Mark that we've attempted to fetch data
      setHasFetchAttempted(true);
    }
  }, [
    eventId,
    currentEventId,
    extractedParams,
    pathname,
    isSpecialFormat,
    isNewUrlFormat,
    formatDateForUrl,
    navigate,
    toast,
    hasFetchAttempted,
    urlEventSlug,
  ]);

  // Fetch event data when URL parameters change
  useEffect(() => {
    if (hasFetchAttempted) {
      return;
    }

    // Only fetch for formats other than direct eventId (which is handled by the other useEffect)
    if (!eventId && (isNewUrlFormat() || isSpecialFormat())) {
      fetchEventData();
      setHasFetchAttempted(true);
    }
  }, [
    eventId,
    currentEventId,
    extractedParams,
    isSpecialFormat,
    isNewUrlFormat,
    fetchEventData,
    hasFetchAttempted,
  ]);

  // Initial data loading for ID-based URLs
  useEffect(() => {
    // If we have an ID directly from the URL, load the event
    if (eventId && !hasFetchAttempted) {
      fetchEventData();
      setHasFetchAttempted(true);
    }
  }, [eventId, fetchEventData, hasFetchAttempted]);

  // Get appropriate flyer image or fallback
  const getEventImage = () => {
    if (!event || !event.flyer) return null;

    // Check for landscape image first (best for desktop/event profile)
    if (event.flyer.landscape && event.flyer.landscape.full) {
      return event.flyer.landscape.full;
    }

    // Fallback to square
    if (event.flyer.square && event.flyer.square.full) {
      return event.flyer.square.full;
    }

    // Final fallback to portrait
    if (event.flyer.portrait && event.flyer.portrait.full) {
      return event.flyer.portrait.full;
    }

    return null;
  };

  // Share event
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: event.title,
          text: `Check out this event: ${event.title}`,
          url: window.location.href,
        })
        .then(() => {
          // Shared successfully
        })
        .catch((error) => {
          // Handle error silently
        });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.showSuccess("Event link copied to clipboard");
    }
  };

  // Handle ticket purchase
  const handleBuyTicket = (ticket) => {
    // Set the selected ticket and show the checkout form
    setSelectedTicket(ticket);
    setShowCheckoutForm(true);
  };

  // Handle follow event
  const handleFollow = () => {
    // Handle follow event logic
  };

  // Handle join request
  const handleJoinRequest = () => {
    // Handle join request logic
  };

  // Handle favorite event
  const handleFavorite = () => {
    // Handle favorite event logic
  };

  const getJoinButtonClass = () => {
    if (isMember) return "active";
    if (joinRequestStatus === "pending") return "pending";
    if (joinRequestStatus === "accepted") return "accepted";
    if (joinRequestStatus === "rejected") return "rejected";
    return "";
  };

  const getJoinButtonText = () => {
    if (isMember) return "Member";
    if (joinRequestStatus === "pending") return "Pending";
    if (joinRequestStatus === "accepted") return "Accepted";
    if (joinRequestStatus === "rejected") return "Rejected";
    return "Join";
  };

  const handleQuantityChange = (ticketId, change) => {
    setTicketQuantities((prev) => ({
      ...prev,
      [ticketId]: Math.max(0, (prev[ticketId] || 0) + change),
    }));
  };

  const calculateTotal = () => {
    return ticketSettings
      .reduce((total, ticket) => {
        return total + ticket.price * (ticketQuantities[ticket._id] || 0);
      }, 0)
      .toFixed(2);
  };

  const hasSelectedTickets = Object.values(ticketQuantities).some(
    (quantity) => quantity > 0
  );

  const isFormValid = () => {
    return (
      firstName &&
      lastName &&
      email &&
      email.includes("@") &&
      hasSelectedTickets
    );
  };

  const handleCheckout = async () => {
    try {
      const selectedTickets = [
        {
          ticketId: selectedTicket._id,
          name: selectedTicket.name,
          description: selectedTicket.description,
          price: selectedTicket.price,
          quantity: 1,
        },
      ];

      const response = await axiosInstance.post(
        `/stripe/create-checkout-session`,
        {
          firstName,
          lastName,
          email,
          eventId: event._id,
          tickets: selectedTickets,
        }
      );

      if (response.data.url) {
        window.location = response.data.url;
      } else {
        toast.showError("Invalid checkout response. Please try again.");
      }
    } catch (error) {
      toast.showError("Failed to process checkout. Please try again later.");
    }
  };

  // Add a new function to calculate remaining time for countdown
  const calculateRemainingTime = (endDate) => {
    if (!endDate) return null;

    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return { days, hours };
  };

  // Add a useEffect to update countdowns
  useEffect(() => {
    if (!ticketSettings || ticketSettings.length === 0) return;

    // Initialize countdowns
    const initialCountdowns = {};
    ticketSettings.forEach((ticket) => {
      if (
        ticket.hasCountdown &&
        ticket.endDate &&
        ticket.name.toLowerCase().includes("early")
      ) {
        const remaining = calculateRemainingTime(ticket.endDate);
        if (remaining) {
          initialCountdowns[ticket._id] = remaining;
        }
      }
    });

    setCountdowns(initialCountdowns);

    // Set up interval to update countdowns
    const intervalId = setInterval(() => {
      setCountdowns((prevCountdowns) => {
        const updatedCountdowns = {};

        ticketSettings.forEach((ticket) => {
          if (
            ticket.hasCountdown &&
            ticket.endDate &&
            ticket.name.toLowerCase().includes("early")
          ) {
            const remaining = calculateRemainingTime(ticket.endDate);
            if (remaining) {
              updatedCountdowns[ticket._id] = remaining;
            }
          }
        });

        return updatedCountdowns;
      });
    }, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, [ticketSettings]);

  // Set eventId when event is loaded
  useEffect(() => {
    if (event && event._id) {
      setCurrentEventId(event._id);

      // Set safety timeout for loading state
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [event]);

  // Fetch ticket settings and code settings if they're not included in the initial response
  useEffect(() => {
    const fetchMissingSettings = async () => {
      if (!event || !event._id) return;

      try {
        // Only fetch if we don't have the data yet
        if (ticketSettings.length === 0) {
          const ticketResponse = await axiosInstance.get(
            `${process.env.REACT_APP_API_BASE_URL}/ticket-settings/events/${event._id}`
          );

          if (ticketResponse.data && ticketResponse.data.ticketSettings) {
            setTicketSettings(ticketResponse.data.ticketSettings);
          }
        }

        if (codeSettings.length === 0) {
          const codeSettingsResponse = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/code-settings/events/${event._id}`
          );

          if (
            codeSettingsResponse.data &&
            codeSettingsResponse.data.codeSettings
          ) {
            setCodeSettings(codeSettingsResponse.data.codeSettings);
          }
        }
      } catch (error) {
        // Handle error silently
      }
    };

    fetchMissingSettings();
  }, [event, ticketSettings.length, codeSettings.length]);

  // Rendering logic with loading, error, and event states
  if (loading) {
    return (
      <div className="event-profile-loading">
        <LoadingSpinner size="large" color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-profile-error">
        <RiInformationLine size={48} />
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-profile-error">
        <RiInformationLine size={48} />
        <h2>Event Not Found</h2>
        <p>We couldn't find the event you're looking for.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  // Render the event content if we have event data
  return (
    <div className="page-wrapper">
      <Navigation
        onBack={() => navigate(-1)}
        onMenuClick={() => setIsNavigationOpen(true)}
      />

      <div className="event-profile">
        {/* Event Header Section */}
        <div className="event-header">
          <div className="event-cover">
            {getEventImage() ? (
              <img
                src={getEventImage()}
                alt={event.title}
                className="cover-image"
              />
            ) : (
              <div className="cover-placeholder" />
            )}
            <div className="cover-gradient"></div>
          </div>

          <div className="event-info">
            <div className="brand-logo">
              {event.brand?.logo && event.brand.logo.medium ? (
                <img src={event.brand.logo.medium} alt={event.brand.name} />
              ) : (
                <div className="logo-placeholder">
                  {event.brand?.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="event-header-content">
              <div className="eventProfile-details">
                <h1 className="event-title">{event.title}</h1>
                {event.subTitle && (
                  <h2 className="event-subtitle">{event.subTitle}</h2>
                )}
                <div className="event-date">
                  {(() => {
                    const date = new Date(event.date);
                    const day = date.getDate();
                    const month = date
                      .toLocaleString("en-US", { month: "short" })
                      .toUpperCase();
                    const year = date.getFullYear();
                    return `${day} ${month} ${year}`;
                  })()}
                </div>
                <div
                  className="brand-link"
                  onClick={() => navigate(`/@${event.brand?.username}`)}
                >
                  @
                  {event.brand?.username ||
                    event.brand?.name.toLowerCase().replace(/\s+/g, "")}
                </div>
              </div>
            </div>

            <div className="header-actions">
              <motion.button
                className="action-button"
                onClick={handleShare}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RiShareLine />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="event-nav">
          <button
            className={activeSection === "event" ? "active" : ""}
            onClick={() => setActiveSection("event")}
          >
            <RiCalendarEventLine />
            Event
          </button>
          <button
            className={activeSection === "tickets" ? "active" : ""}
            onClick={() => setActiveSection("tickets")}
          >
            <RiTicketLine />
            Tickets
          </button>
          <button
            className={activeSection === "codes" ? "active" : ""}
            onClick={() => setActiveSection("codes")}
          >
            <RiDoorLine />
            Codes
          </button>
        </div>

        {/* Main Content Area */}
        <div className="event-content">
          {/* Event Section with EventDetails */}
          {activeSection === "event" && (
            <motion.div
              className="event-section event-combined"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* EventDetails Component */}
              <EventDetails
                event={event}
                scrollToTickets={() => {
                  setActiveSection("tickets");
                }}
                scrollToGuestCode={() => {
                  setActiveSection("codes");
                }}
              />

              {/* Lineup Section */}
              {lineups && lineups.length > 0 && (
                <div className="lineup-section">
                  <h3>Lineup</h3>
                  <div className="lineup-grid">
                    {/* Group lineups by category */}
                    {Object.entries(
                      lineups.reduce((groups, artist) => {
                        const category = artist.category || "Other";
                        if (!groups[category]) {
                          groups[category] = [];
                        }
                        groups[category].push(artist);
                        return groups;
                      }, {})
                    ).map(([category, artists]) => (
                      <div key={category} className="lineup-category-section">
                        <h4 className="lineup-category-title">{category}</h4>
                        <div className="lineup-category-artists">
                          {artists.map((artist, index) => (
                            <motion.div
                              key={artist._id || index}
                              className="lineup-artist"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 + index * 0.05 }}
                            >
                              <div className="artist-image">
                                {artist.avatar && artist.avatar.medium ? (
                                  <img
                                    src={artist.avatar.medium}
                                    alt={artist.name}
                                  />
                                ) : (
                                  <div className="artist-placeholder">
                                    {artist.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="artist-info">
                                <h4>{artist.name}</h4>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Tickets Section */}
          {activeSection === "tickets" && (
            <motion.div
              className="event-section event-tickets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3>Tickets</h3>
              {event &&
              (event.ticketsAvailable || ticketSettings.length > 0) ? (
                <Tickets
                  eventId={event._id}
                  eventTitle={event.title}
                  eventDate={event.date}
                  fetchTicketSettings={async (eventId) => {
                    try {
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
                      } else if (event.parentEventId) {
                        // If this is a child event and no ticket settings were found, check parent event
                        try {
                          const parentEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${event.parentEventId}`;
                          const parentResponse = await axiosInstance.get(
                            parentEndpoint
                          );

                          if (
                            parentResponse.data &&
                            parentResponse.data.ticketSettings &&
                            parentResponse.data.ticketSettings.length > 0
                          ) {
                            ticketSettings = parentResponse.data.ticketSettings;
                          }
                        } catch (parentError) {
                          console.error(
                            "Error fetching parent ticket settings:",
                            parentError
                          );
                        }
                      }

                      return ticketSettings;
                    } catch (error) {
                      console.error("Error fetching ticket settings:", error);
                      return [];
                    }
                  }}
                />
              ) : (
                <div className="no-tickets">
                  <p>No tickets available for this event.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Codes Section */}
          {activeSection === "codes" && (
            <motion.div
              className="event-codes-wrapper"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Use the GuestCode component with merged event and codeSettings */}
              <GuestCode
                event={{
                  ...event,
                  codeSettings:
                    event.codeSettings && event.codeSettings.length > 0
                      ? event.codeSettings
                      : codeSettings,
                }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Only render DashboardNavigation for authenticated users */}
      {user && (
        <DashboardNavigation
          isOpen={isNavigationOpen}
          onClose={() => setIsNavigationOpen(false)}
          currentUser={user}
          setUser={setUser}
        />
      )}
    </div>
  );
};

export default EventProfile;
