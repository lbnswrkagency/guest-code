import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./EventProfile.scss";
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
  const [redirectToLogin, setRedirectToLogin] = useState(false);

  // Check for section parameter in URL
  useEffect(() => {
    // Get the section from the URL search parameters
    const searchParams = new URLSearchParams(location.search);
    const sectionParam = searchParams.get("section");

    // Set active section if the parameter exists and is valid
    if (sectionParam && ["event", "tickets", "codes"].includes(sectionParam)) {
      setActiveSection(sectionParam);
      console.log(
        `[EventProfile] Setting active section from URL: ${sectionParam}`
      );
    }
  }, [location.search]);

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
    if (event.flyer.landscape) {
      return (
        event.flyer.landscape.full ||
        event.flyer.landscape.medium ||
        event.flyer.landscape.thumbnail
      );
    }

    // Fallback to portrait
    if (event.flyer.portrait) {
      return (
        event.flyer.portrait.full ||
        event.flyer.portrait.medium ||
        event.flyer.portrait.thumbnail
      );
    }

    // Final fallback to square
    if (event.flyer.square) {
      return (
        event.flyer.square.full ||
        event.flyer.square.medium ||
        event.flyer.square.thumbnail
      );
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

      console.log("[EventProfile] fetchMissingSettings for event:", event._id);

      try {
        // Only fetch ticket settings if we don't have them yet
        if (ticketSettings.length === 0) {
          // Use the public event profile endpoint instead of protected ticket-settings endpoint
          const publicEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${event._id}`;
          console.log(
            "[EventProfile] Fetching public event profile for ticket settings:",
            publicEndpoint
          );

          const response = await axiosInstance.get(publicEndpoint);

          if (
            response.data &&
            response.data.ticketSettings &&
            response.data.ticketSettings.length > 0
          ) {
            console.log(
              "[EventProfile] Got ticket settings from profile endpoint:",
              response.data.ticketSettings.length
            );
            setTicketSettings(response.data.ticketSettings);
          } else if (event.parentEventId) {
            // If this is a child event and no ticket settings were found, check parent event
            console.log(
              "[EventProfile] Checking parent event for tickets:",
              event.parentEventId
            );
            try {
              const parentEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${event.parentEventId}`;
              const parentResponse = await axiosInstance.get(parentEndpoint);

              if (
                parentResponse.data &&
                parentResponse.data.ticketSettings &&
                parentResponse.data.ticketSettings.length > 0
              ) {
                console.log(
                  "[EventProfile] Got ticket settings from parent:",
                  parentResponse.data.ticketSettings.length
                );
                setTicketSettings(parentResponse.data.ticketSettings);
              }
            } catch (parentError) {
              console.error(
                "Error fetching parent ticket settings:",
                parentError
              );
            }
          }
        }

        // Only fetch code settings if we don't have them yet
        if (codeSettings.length === 0) {
          // Use the same public profile endpoint for code settings as well
          const publicEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${event._id}`;
          console.log(
            "[EventProfile] Fetching public event profile for code settings:",
            publicEndpoint
          );

          // Only make a second request if we didn't already get the data above
          if (!ticketSettings.length) {
            const response = await axiosInstance.get(publicEndpoint);

            if (
              response.data &&
              response.data.codeSettings &&
              response.data.codeSettings.length > 0
            ) {
              console.log(
                "[EventProfile] Got code settings from profile endpoint:",
                response.data.codeSettings.length
              );
              setCodeSettings(response.data.codeSettings);
            }
          }
        }
      } catch (error) {
        console.error(
          "[EventProfile] Error in fetchMissingSettings:",
          error.message
        );
      }
    };

    fetchMissingSettings();
  }, [event, ticketSettings.length, codeSettings.length]);

  // Modify the useEffect that fetches event data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        await fetchEventData();
      } catch (err) {
        console.error("[EventProfile] Error in main fetchData effect:", err);
      } finally {
        setLoading(false);
        setHasFetchAttempted(true);
      }
    };

    // Only fetch if we haven't already and if the component is actually visible
    if (!hasFetchAttempted) {
      fetchData();
    }
  }, [hasFetchAttempted, fetchEventData]);

  // Add this to protect against unwanted redirects
  useEffect(() => {
    // For EventProfile, we want to allow public access
    // Only redirect if user is explicitly required for this specific functionality
    const isAccessingRestrictedFeature = false; // Only set true for member-only features

    if (!user && isAccessingRestrictedFeature) {
      navigate("/login", { state: { from: location.pathname } });
    }
  }, [user, navigate, location]);

  // Rendering logic moved outside of useEffect
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
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                  e.target.parentNode.querySelector(
                    ".cover-placeholder"
                  ).style.display = "block";
                }}
              />
            ) : (
              <div className="cover-placeholder" />
            )}
            <div className="cover-gradient"></div>
          </div>

          <div className="event-header-container">
            <div className="event-brand-info">
              <div className="brand-logo">
                {event.brand?.logo && event.brand.logo.medium ? (
                  <img src={event.brand.logo.medium} alt={event.brand.name} />
                ) : (
                  <div className="logo-placeholder">
                    {event.brand?.name
                      ? event.brand.name.charAt(0).toUpperCase()
                      : "E"}
                  </div>
                )}
              </div>

              <div
                className="brand-username-container"
                onClick={() => navigate(`/@${event.brand?.username}`)}
              >
                <span className="brand-username">
                  @
                  {event.brand?.username ||
                    event.brand?.name.toLowerCase().replace(/\s+/g, "")}
                </span>
              </div>
            </div>

            <div className="event-meta">
              <div className="event-date">
                <span className="event-date-icon">
                  <RiCalendarEventLine />
                </span>
                {new Date(event.startDate)
                  .toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </div>

              <div className="header-actions">
                <motion.button
                  className="action-button"
                  onClick={handleShare}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Share event"
                >
                  <RiShareLine />
                </motion.button>
              </div>
            </div>

            <div className="event-title-container">
              <h1 className="event-title">{event.title}</h1>
              {event.subTitle && (
                <h2 className="event-subtitle">{event.subTitle}</h2>
              )}
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
              {event ? (
                <Tickets
                  eventId={event._id}
                  eventTitle={event.title}
                  eventDate={event.startDate || event.date}
                  event={event}
                  ticketSettings={ticketSettings}
                  fetchTicketSettings={async (eventId) => {
                    try {
                      console.log(
                        "[EventProfile] Fetching ticket settings for:",
                        eventId
                      );

                      // If we already have ticket settings, return them
                      if (ticketSettings && ticketSettings.length > 0) {
                        console.log(
                          "[EventProfile] Using cached ticket settings:",
                          ticketSettings.length
                        );
                        return ticketSettings;
                      }

                      // Try public endpoint first (same as in UpcomingEvent)
                      const publicEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${eventId}`;
                      console.log(
                        "[EventProfile] Trying public endpoint:",
                        publicEndpoint
                      );

                      const response = await axiosInstance.get(publicEndpoint);
                      let settings = [];

                      if (
                        response.data &&
                        response.data.ticketSettings &&
                        response.data.ticketSettings.length > 0
                      ) {
                        console.log(
                          "[EventProfile] Got ticket settings from public endpoint:",
                          response.data.ticketSettings.length
                        );
                        settings = response.data.ticketSettings;
                      } else if (event.parentEventId) {
                        // If this is a child event and no ticket settings were found, check parent event
                        console.log(
                          "[EventProfile] Checking parent event for tickets:",
                          event.parentEventId
                        );
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
                            console.log(
                              "[EventProfile] Got ticket settings from parent:",
                              parentResponse.data.ticketSettings.length
                            );
                            settings = parentResponse.data.ticketSettings;
                          }
                        } catch (parentError) {
                          console.error(
                            "Error fetching parent ticket settings:",
                            parentError
                          );
                        }
                      }

                      // Update state if we found settings
                      if (settings.length > 0) {
                        setTicketSettings(settings);
                      }

                      return settings;
                    } catch (error) {
                      console.error(
                        "[EventProfile] Error fetching ticket settings:",
                        error
                      );
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
              {/* Use the GuestCode component with the correct codeSettings priority */}
              <GuestCode
                event={{
                  ...event,
                  codeSettings:
                    // Prioritize the dedicated codeSettings array from the API
                    codeSettings && codeSettings.length > 0
                      ? codeSettings
                      : event.codeSettings && event.codeSettings.length > 0
                      ? event.codeSettings
                      : [],
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
