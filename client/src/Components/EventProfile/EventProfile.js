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
  const [guestCode, setGuestCode] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [activeSection, setActiveSection] = useState("event");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState("");
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPax, setGuestPax] = useState(1);
  const [countdowns, setCountdowns] = useState({});
  const [generatingCode, setGeneratingCode] = useState(false);
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

    // Fallback to portrait
    if (event.flyer.portrait && event.flyer.portrait.full) {
      return event.flyer.portrait.full;
    }

    // Final fallback to square
    if (event.flyer.square && event.flyer.square.full) {
      return event.flyer.square.full;
    }

    return null;
  };

  // Generate guest code
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

      // Set generating state once at the beginning
      setGeneratingCode(true);

      // Use info toast to let the user know we're processing
      toast.showInfo("Processing your request...");

      const response = await axiosInstance.post("/guest-code/generate", {
        eventId: event._id,
        guestName: guestName,
        guestEmail: guestEmail,
        maxPax: guestPax,
      });

      // Only update state and show success once at the end
      if (response.data && response.data.code) {
        // Clear form fields
        setGuestName("");
        setGuestEmail("");
        setGuestPax(1);
        // Show success toast
        toast.showSuccess(`Guest code sent to ${guestEmail}`);
      }
    } catch (err) {
      toast.showError(
        err.response?.data?.message || "Failed to generate guest code"
      );
    } finally {
      // Always reset the generating state, regardless of success or failure
      setGeneratingCode(false);
    }
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

            <div className="eventProfile-details">
              <h1 className="event-title">{event.title}</h1>
              <div className="username">
                @
                {event.brand?.username ||
                  event.brand?.name.toLowerCase().replace(/\s+/g, "")}
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
          {/* Combined Event Section (Info + Lineup) */}
          {activeSection === "event" && (
            <motion.div
              className="event-section event-combined"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Event Info with Integrated Lineup */}
              <div className="event-info-section">
                <h3>Event Details</h3>

                {/* Minimalistic Lineup Section integrated with event info */}
                {lineups && lineups.length > 0 && (
                  <div className="lineup-mini-grid">
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
                              className="lineup-artist-mini"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 + index * 0.05 }}
                            >
                              <div className="artist-image-mini">
                                {artist.avatar && artist.avatar.medium ? (
                                  <img
                                    src={artist.avatar.medium}
                                    alt={artist.name}
                                  />
                                ) : (
                                  <div className="artist-placeholder-mini">
                                    {artist.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="artist-info-mini">
                                <h4>{artist.name}</h4>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="event-details">
                  <motion.div
                    className="detail-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <RiCalendarEventLine />
                    <div>
                      <h4>Date</h4>
                      <p>{formatDate(event.date)}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="detail-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <RiTimeLine />
                    <div>
                      <h4>Time</h4>
                      <p>
                        {event.startTime} - {event.endTime}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="detail-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <RiMapPinLine />
                    <div>
                      <h4>Location</h4>
                      <p>{event.location}</p>
                      {event.street && <p>{event.street}</p>}
                      {(event.postalCode || event.city) && (
                        <p>
                          {event.postalCode && event.postalCode}{" "}
                          {event.city && event.city}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </div>

                {event.description && (
                  <motion.div
                    className="event-description"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3>About This Event</h3>
                    <p>{event.description}</p>
                  </motion.div>
                )}
              </div>
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
              {ticketSettings && ticketSettings.length > 0 ? (
                <>
                  <div className="tickets-container">
                    {ticketSettings.map((ticket, index) => (
                      <motion.div
                        key={ticket._id}
                        className="ticket-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        style={{
                          borderColor: ticket.color || "#2196F3",
                        }}
                      >
                        <div className="ticket-header">
                          <h4>{ticket.name}</h4>
                          {ticket.originalPrice &&
                            ticket.originalPrice > ticket.price && (
                              <span className="ticket-discount">
                                {Math.round(
                                  ((ticket.originalPrice - ticket.price) /
                                    ticket.originalPrice) *
                                    100
                                )}
                                % OFF
                              </span>
                            )}
                        </div>

                        {/* Add countdown display for Early Bird tickets */}
                        {countdowns[ticket._id] && (
                          <div className="ticket-countdown">
                            <span className="countdown-text">
                              {countdowns[ticket._id].days > 0
                                ? `${countdowns[ticket._id].days}d `
                                : ""}
                              {countdowns[ticket._id].hours}h remaining
                            </span>
                          </div>
                        )}

                        <div className="ticket-price">
                          <span className="current-price">
                            {ticket.price.toFixed(2)}€
                          </span>
                          {ticket.originalPrice &&
                            ticket.originalPrice > ticket.price && (
                              <span className="original-price">
                                {ticket.originalPrice.toFixed(2)}€
                              </span>
                            )}
                        </div>

                        {ticket.description && (
                          <p className="ticket-description">
                            {ticket.description}
                          </p>
                        )}

                        {ticket.isLimited && (
                          <div className="ticket-availability">
                            <div className="availability-bar">
                              <div
                                className="availability-fill"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round(
                                      (ticket.soldCount / ticket.maxTickets) *
                                        100
                                    )
                                  )}%`,
                                }}
                              ></div>
                            </div>
                            <span className="availability-text">
                              {Math.max(
                                0,
                                ticket.maxTickets - ticket.soldCount
                              )}{" "}
                              tickets left
                            </span>
                          </div>
                        )}

                        <div className="ticket-quantity">
                          <button
                            className="quantity-btn"
                            onClick={() => handleQuantityChange(ticket._id, -1)}
                          >
                            -
                          </button>
                          <span className="quantity">
                            {ticketQuantities[ticket._id] || 0}
                          </span>
                          <button
                            className="quantity-btn"
                            onClick={() => handleQuantityChange(ticket._id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="checkout-summary">
                    <div className="selected-tickets">
                      {ticketSettings.map(
                        (ticket) =>
                          ticketQuantities[ticket._id] > 0 && (
                            <div
                              key={ticket._id}
                              className="selected-ticket-item"
                            >
                              <span>
                                {ticketQuantities[ticket._id]}x {ticket.name}
                              </span>
                              <span>
                                {(
                                  ticket.price * ticketQuantities[ticket._id]
                                ).toFixed(2)}
                                €
                              </span>
                            </div>
                          )
                      )}
                    </div>

                    <div className="total-amount">
                      <span>Total</span>
                      <span>{calculateTotal()}€</span>
                    </div>

                    {hasSelectedTickets && (
                      <div className="checkout-form">
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        <motion.button
                          className="checkout-button"
                          onClick={handleCheckout}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={!isFormValid()}
                        >
                          Buy Tickets
                        </motion.button>
                      </div>
                    )}
                  </div>
                </>
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
              className="event-section event-codes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Guest Code Request Section */}
              <motion.div
                className="codes-guest"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h4>Guest Code</h4>
                <p className="guest-code-description">
                  {codeSettings.find((cs) => cs.type === "guest")?.condition ||
                    "Request a code for this event"}
                </p>

                <div className="guest-code-form">
                  <div className="form-group">
                    <div className="input-icon">
                      <RiUserLine />
                    </div>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
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
                    >
                      {Array.from(
                        {
                          length:
                            codeSettings.find((cs) => cs.type === "guest")
                              ?.maxPax || 1,
                        },
                        (_, i) => i + 1
                      ).map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "Person" : "People"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <motion.button
                    className="guest-code-button"
                    onClick={handleGenerateGuestCode}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={
                      generatingCode || !guestName || !guestEmail || !guestPax
                    }
                  >
                    {generatingCode ? (
                      <>
                        <span className="loading-spinner-small"></span>
                        Generating...
                      </>
                    ) : (
                      <>Get Guest Code</>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Guest Code Dialog */}
        {showCodeDialog && (
          <ConfirmDialog
            isOpen={showCodeDialog}
            title="Your Guest Code"
            content={
              <div className="guest-code-display">
                <p>
                  Your guest code has been generated. Show this code at the
                  entrance:
                </p>
                <div className="code">{guestCode}</div>
                <p className="code-note">
                  This code is valid for {guestPax}{" "}
                  {guestPax === 1 ? "person" : "people"}.
                </p>
              </div>
            }
            confirmText="Copy Code"
            showCancel={false}
            onConfirm={() => {
              navigator.clipboard.writeText(guestCode);
              toast.showSuccess("Code copied to clipboard");
              setShowCodeDialog(false);
            }}
            type="default"
          />
        )}
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
