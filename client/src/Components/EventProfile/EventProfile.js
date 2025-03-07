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

  // Add effect to log navigation state changes
  useEffect(() => {
    console.log("[EventProfile] DashboardNavigation isOpen:", isNavigationOpen);
  }, [isNavigationOpen]);

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        console.log(`[EventProfile] Fetching data for event ID: ${eventId}`);

        // Fetch all event data in a single request
        const response = await axiosInstance.get(`/events/profile/${eventId}`);
        console.log("[EventProfile] Received event data:", response.data);

        if (response.data.success) {
          // Set all data from the single response
          setEvent(response.data.event);
          setLineups(response.data.lineups || []);
          setTicketSettings(response.data.ticketSettings || []);
          setCodeSettings(response.data.codeSettings || []);

          // Set user status values only if user is logged in
          if (user) {
            setIsFollowing(response.data.isFollowing || false);
            setIsFavorited(response.data.isFavorited || false);
            setIsMember(response.data.isMember || false);
            setJoinRequestStatus(response.data.joinRequestStatus || "");
          } else {
            // Set default values for anonymous users
            setIsFollowing(false);
            setIsFavorited(false);
            setIsMember(false);
            setJoinRequestStatus("");
          }
        } else {
          throw new Error(response.data.message || "Failed to load event data");
        }
      } catch (err) {
        console.error("[EventProfile] Error fetching event data:", err);
        setError("Failed to load event information");
        toast.showError("Failed to load event information");
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventData();
    }
  }, [eventId, toast, user]);

  // Extract URL parameters
  const {
    eventId: urlEventId,
    brandUsername: urlBrandUsername,
    eventUsername: urlEventUsername,
    dateSlug: urlDateSlug,
    eventSlug: urlEventSlug,
  } = useParams();

  const { pathname } = location;

  // Special handling for the path parameters when using the new URL format
  const extractedParams = useMemo(() => {
    const pathParts = pathname.split("/").filter((p) => p);

    // For the special format /@username/@brandusername/XXYYZZ
    if (
      pathParts.length === 3 &&
      pathParts[0].startsWith("@") &&
      pathParts[1].startsWith("@") &&
      /^\d{6}(-\d+)?$/.test(pathParts[2])
    ) {
      return {
        userUsername: pathParts[0].substring(1), // Remove @ from first part
        brandUsername: pathParts[1].substring(1), // Remove @ from second part
        dateSlug: pathParts[2], // The date part
      };
    }

    // For the format /@brandUsername/XXYYZZ (e.g., /@afrospiti/030925)
    if (
      pathParts.length === 2 &&
      pathParts[0].startsWith("@") &&
      /^\d{6}(-\d+)?$/.test(pathParts[1])
    ) {
      return {
        brandUsername: pathParts[0].substring(1), // Remove @ from first part
        dateSlug: pathParts[1], // The date part
      };
    }

    return {
      brandUsername: urlBrandUsername?.replace(/^@/, "") || "", // Remove @ if present
      dateSlug: urlDateSlug || urlEventUsername, // Use eventUsername as dateSlug for special format
    };
  }, [pathname, urlBrandUsername, urlDateSlug, urlEventUsername]);

  console.log("[EventProfile] URL parameters:", {
    urlEventId,
    urlBrandUsername,
    urlEventUsername,
    urlDateSlug,
    urlEventSlug,
    pathname,
    extractedParams,
  });

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

  // Create stable versions of the format checking functions
  const isSpecialFormat = useCallback(() => {
    const pathParts = pathname.split("/").filter((p) => p);
    console.log(
      "[EventProfile] Path parts for special format check:",
      pathParts
    );

    // For URL pattern /@userUsername/@brandUsername/dateSlug
    // Example: /@hendricks/@whitechocolate/032225
    return (
      pathParts.length === 3 &&
      pathParts[0].startsWith("@") &&
      pathParts[1].startsWith("@") &&
      /^\d{6}(-\d+)?$/.test(pathParts[2])
    );
  }, [pathname]);

  // The original format check for new URL patterns
  const isNewUrlFormat = useCallback(() => {
    console.log("[EventProfile] Checking URL format:", {
      extractedParams,
      pathname,
    });

    // Check for special format /@brandUsername/@eventUsername/dateSlug
    if (isSpecialFormat()) {
      console.log(
        "[EventProfile] Detected special format /@userUsername/@brandUsername/dateSlug"
      );
      return true;
    }

    // Check for simple format /@brandUsername/dateSlug (e.g., /@afrospiti/030925)
    const pathParts = pathname.split("/").filter((p) => p);
    if (
      pathParts.length === 2 &&
      pathParts[0].startsWith("@") &&
      /^\d{6}(-\d+)?$/.test(pathParts[1])
    ) {
      console.log(
        "[EventProfile] Detected simple format /@brandUsername/dateSlug"
      );
      return true;
    }

    // Check if we have the necessary parameters for any other format
    if (extractedParams.brandUsername && extractedParams.dateSlug) {
      console.log(
        "[EventProfile] Detected parameters for date-based URL format"
      );
      return true;
    }

    console.log("[EventProfile] No recognized format detected");
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
          }
        );

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

        if (dateSlug && /^\d{6}(-\d+)?$/.test(dateSlug)) {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${brandUsername}/${dateSlug}`;
          console.log(
            `[EventProfile] Fetching data for simplified format: ${endpoint}`
          );

          response = await axiosInstance.get(endpoint);
        } else if (urlEventSlug) {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/slug/${brandUsername}/${dateSlug}/${urlEventSlug}`;
          console.log(
            `[EventProfile] Fetching data for full slug format: ${endpoint}`
          );

          response = await axiosInstance.get(endpoint);
        } else {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${brandUsername}/${dateSlug}`;
          console.log(
            `[EventProfile] Fetching data with simplified format: ${endpoint}`
          );

          response = await axiosInstance.get(endpoint);
        }
      } else if (eventId || currentEventId) {
        // Use currentEventId if available, otherwise fall back to eventId from useParams
        const effectiveEventId = currentEventId || eventId;
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${effectiveEventId}`;
        console.log(`[EventProfile] Fetching data for event ID: ${endpoint}`);

        response = await axiosInstance.get(endpoint);
      } else {
        console.log("[EventProfile] No valid format detected, skipping fetch");
        setLoading(false);
        return; // Early return to prevent further processing
      }

      console.log("[EventProfile] API Response status:", response.status);
      console.log("[EventProfile] API Response data:", response.data);

      if (response && response.data && response.data.success) {
        setEvent(response.data.event);
        console.log(
          "[EventProfile] Event data loaded successfully:",
          response.data.event
        );

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
        if (urlEventId && !isNewUrlFormat() && response.data.event.slug) {
          const { brand, date, slug } = response.data.event;
          // Use the now properly defined formatDateForUrl
          const formattedDate = formatDateForUrl(new Date(date));
          const newPath = `/@${brand.username}/e/${formattedDate}/${slug}`;
          console.log(`[EventProfile] Updating URL to new format: ${newPath}`);
          navigate(newPath, { replace: true });
        }
      } else {
        console.log(
          "[EventProfile] API returned success:false or invalid data"
        );
        setError("Could not find event information");
        throw new Error(response.data.message || "Failed to load event data");
      }
    } catch (error) {
      console.log("[EventProfile] Error fetching event data:", error);
      console.log("[EventProfile] Error details:", {
        message: error.message,
        response: error.response,
        stack: error.stack,
      });
      setError("Failed to load event information");

      // Show a user-friendly error message, but only once
      if (toast && toast.showError && !hasFetchAttempted) {
        toast.showError("Failed to load event information");
      }
    } finally {
      setLoading(false);
    }
  }, [
    eventId,
    currentEventId,
    extractedParams,
    pathname,
    isSpecialFormat,
    isNewUrlFormat,
    setEvent,
    setLoading,
    setError,
    navigate,
    formatDateForUrl,
    toast,
    hasFetchAttempted,
  ]);

  // Fetch event data when URL parameters change
  useEffect(() => {
    console.log("[EventProfile] URL parameters changed, checking format:", {
      eventId,
      currentEventId,
      extractedParams,
      isSpecialFormat: isSpecialFormat(),
      isNewUrlFormat: isNewUrlFormat(),
    });

    if (hasFetchAttempted) {
      console.log("[EventProfile] Already attempted fetch, skipping");
      return;
    }

    // Only fetch for formats other than direct eventId (which is handled by the other useEffect)
    if (!eventId && (isNewUrlFormat() || isSpecialFormat())) {
      console.log(
        "[EventProfile] Fetching event data due to valid format parameters"
      );
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
      console.log(`[EventProfile] Loading event with direct ID: ${eventId}`);
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

      console.log("[EventProfile] Generating guest code for event:", event._id);

      const response = await axiosInstance.post("/guest-code/generate", {
        eventId: event._id,
        guestName: guestName,
        guestEmail: guestEmail,
        maxPax: guestPax,
      });

      console.log(
        "[EventProfile] Guest code generated and sent:",
        response.data
      );

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
      console.error("[EventProfile] Error generating guest code:", err);
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
        .then(() => console.log("Shared successfully"))
        .catch((error) => console.log("Error sharing:", error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.showSuccess("Event link copied to clipboard");
    }
  };

  // Handle ticket purchase
  const handleBuyTicket = (ticket) => {
    console.log("[EventProfile] Buy ticket clicked:", ticket);

    // Check if ticket is available
    if (ticket.isLimited && ticket.soldCount >= ticket.maxTickets) {
      toast.showError("Sorry, this ticket is sold out");
      return;
    }

    if (
      ticket.hasCountdown &&
      ticket.endDate &&
      new Date() > new Date(ticket.endDate)
    ) {
      toast.showError("Sorry, this ticket sale has ended");
      return;
    }

    // If user is not logged in, redirect to login
    if (!user) {
      toast.showInfo("Please log in to purchase tickets");
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }

    // Here you would typically redirect to a checkout page or open a modal
    // For now, we'll just show a toast message
    toast.showSuccess(
      `Ticket purchase flow for ${ticket.name} would start here`
    );
  };

  // Handle follow event
  const handleFollow = () => {
    console.log("[EventProfile] Handle follow event");
    // Implementation of handleFollow function
  };

  // Handle join request
  const handleJoinRequest = () => {
    console.log("[EventProfile] Handle join request");
    // Implementation of handleJoinRequest function
  };

  // Handle favorite event
  const handleFavorite = () => {
    console.log("[EventProfile] Handle favorite event");
    // Implementation of handleFavorite function
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
      const selectedTickets = ticketSettings
        .filter((ticket) => ticketQuantities[ticket._id] > 0)
        .map((ticket) => ({
          ticketId: ticket._id,
          name: ticket.name,
          description: ticket.description,
          price: ticket.price,
          quantity: ticketQuantities[ticket._id],
        }));

      const response = await axiosInstance.post(
        `/api/stripe/create-checkout-session`,
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
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.showError("Failed to process checkout");
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
      console.log(
        "[EventProfile] Setting eventId from loaded event:",
        event._id
      );
      setCurrentEventId(event._id);

      // Set safety timeout for loading state
      console.log("[EventProfile] Setting safety timeout for loading state");
      const timeoutId = setTimeout(() => {
        console.log(
          "[EventProfile] Safety timeout triggered - resetting loading state"
        );
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
          console.log(
            "[EventProfile] Fetching missing ticket settings for event:",
            event._id
          );
          const ticketResponse = await axiosInstance.get(
            `${process.env.REACT_APP_API_BASE_URL}/ticket-settings/events/${event._id}`
          );

          if (ticketResponse.data && ticketResponse.data.ticketSettings) {
            console.log(
              "[EventProfile] Loaded ticket settings:",
              ticketResponse.data.ticketSettings.length,
              "items"
            );
            setTicketSettings(ticketResponse.data.ticketSettings);
          }
        }

        if (codeSettings.length === 0) {
          console.log(
            "[EventProfile] Fetching missing code settings for event:",
            event._id
          );
          const codeSettingsResponse = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/code-settings/events/${event._id}`
          );

          if (
            codeSettingsResponse.data &&
            codeSettingsResponse.data.codeSettings
          ) {
            console.log(
              "[EventProfile] Loaded code settings:",
              codeSettingsResponse.data.codeSettings.length,
              "items"
            );
            setCodeSettings(codeSettingsResponse.data.codeSettings);
          }
        }
      } catch (error) {
        console.error("[EventProfile] Error fetching missing settings:", error);
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

        {/* Add a debugging section visible in development */}
        {process.env.NODE_ENV === "development" && (
          <div
            className="debug-info"
            style={{
              marginTop: "20px",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "#f5f5f5",
            }}
          >
            <h3>Debug Information:</h3>
            <pre style={{ overflow: "auto" }}>
              {JSON.stringify(
                {
                  path: pathname,
                  params: {
                    urlEventId,
                    urlBrandUsername,
                    urlEventUsername,
                    urlDateSlug,
                    urlEventSlug,
                  },
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
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
