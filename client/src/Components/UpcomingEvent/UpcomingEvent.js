import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./UpcomingEvent.scss";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../../Components/Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import Tickets from "../Tickets/Tickets";
import EventDetails from "../EventDetails/EventDetails";
import GuestCode from "../GuestCode/GuestCode";
import TableSystem from "../TableSystem/TableSystem";
import LineUpView from "../LineUpView/LineUpView";
import Spotify from "../Spotify/Spotify";
import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiTicketLine,
  RiImageLine,
  RiInformationLine,
  RiMusic2Line,
  RiVipCrownLine,
  RiRefreshLine,
  RiTableLine,
  RiArrowUpLine,
  RiStarLine,
} from "react-icons/ri";

const LoadingSpinner = ({ size = "default", color = "#ffc807" }) => {
  const spinnerSize = size === "small" ? "16px" : "24px";
  return (
    <div
      className="upcomingEvent-spinner"
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
  hideTableBooking = false,
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

  // Add state for table bookings
  const [showTableBooking, setShowTableBooking] = useState(false);

  // Ticket settings state
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Action buttons refs for scrolling
  const guestCodeSectionRef = useRef(null);
  const ticketSectionRef = useRef(null);
  const tableBookingSectionRef = useRef(null);

  // Add a ticket settings cache
  const [ticketSettingsCache, setTicketSettingsCache] = useState({});

  // Filter ticket settings to only include visible ones
  const visibleTicketSettings = useMemo(() => {
    // Ensure ticketSettings exists and is an array before filtering
    if (!Array.isArray(ticketSettings)) {
      return [];
    }
    // Filter out tickets where isVisible is explicitly false
    return ticketSettings.filter((ticket) => ticket.isVisible !== false);
  }, [ticketSettings]);

  useEffect(() => {
    // If events are provided directly, use them
    if (providedEvents && providedEvents.length > 0) {
      // Create a deep copy of providedEvents and ensure lineups are valid
      const processedEvents = providedEvents.map((event) => {
        // Create a copy of the event
        const eventCopy = { ...event };

        // Make sure ticketsAvailable is set - set to true by default
        if (eventCopy.ticketsAvailable === undefined) {
          eventCopy.ticketsAvailable = true;
        }

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
                subtitle: lineup.subtitle || null,
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

      // OPTIMIZATION: Preload ticket settings for ALL events at once
      processedEvents.forEach((event) => {
        if (event._id && event.ticketsAvailable !== false) {
          // Queue the ticket fetch with a slight delay to avoid overwhelming the server
          setTimeout(() => {
            fetchTicketSettings(event._id);
          }, 100);
        }
      });

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

  // Function to fetch ticket settings for the current event - wrap in useCallback to prevent issues
  const fetchTicketSettings = useCallback(
    async (eventId) => {
      if (!eventId) {
        return;
      }

      setLoadingTickets(true);

      try {
        // Check if we already have this event's ticket settings in cache
        if (ticketSettingsCache[eventId]) {
          setTicketSettings(ticketSettingsCache[eventId]);
          setLoadingTickets(false);
          return;
        }

        // Find current event by ID in case currentIndex has changed
        const currentEvent = events.find((e) => e._id === eventId);
        if (!currentEvent) {
          setLoadingTickets(false);
          return;
        }

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
            // Check if parent event ticket settings are in cache
            if (ticketSettingsCache[currentEvent.parentEventId]) {
              ticketSettings = ticketSettingsCache[currentEvent.parentEventId];
            } else {
              try {
                const parentEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${currentEvent.parentEventId}`;
                const parentResponse = await axiosInstance.get(parentEndpoint);

                if (
                  parentResponse.data &&
                  parentResponse.data.ticketSettings &&
                  parentResponse.data.ticketSettings.length > 0
                ) {
                  ticketSettings = parentResponse.data.ticketSettings;

                  // Cache the parent's ticket settings too
                  setTicketSettingsCache((prev) => ({
                    ...prev,
                    [currentEvent.parentEventId]: ticketSettings,
                  }));
                } else {
                  ticketSettings = [];
                }
              } catch (parentError) {
                ticketSettings = [];
              }
            }
          } else {
            ticketSettings = [];
          }
        }

        // Cache the ticket settings for this event
        setTicketSettingsCache((prev) => ({
          ...prev,
          [eventId]: ticketSettings,
        }));

        setTicketSettings(ticketSettings);
      } catch (error) {
        setTicketSettings([]);
      } finally {
        setLoadingTickets(false);
      }
    },
    [events, ticketSettingsCache]
  );

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
              // Warning removed
            }
          }
        } catch (error) {
          // Warning removed

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
              // Warning removed
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
                // Warning removed
              }
            }
          } else {
            events = [];
          }
        } catch (err) {
          // Warning removed
          events = [];
        }
      }

      // Simplified filtering logic for upcoming events
      const now = new Date();
      // Don't reset hours to 0 since we need exact time for comparison

      // Process events to calculate end dates/times
      const processedEvents = events
        .map((event) => {
          // Skip events with no date information
          if (!event.startDate && !event.date) return null;

          // Get the start date (prioritize startDate over date)
          const startDate = event.startDate
            ? new Date(event.startDate)
            : new Date(event.date);

          // Calculate end date/time
          let endDate;

          if (event.endDate) {
            // If event has explicit end date, use it
            endDate = new Date(event.endDate);

            // If there's an endTime, set it on the end date
            if (event.endTime) {
              const [hours, minutes] = event.endTime.split(":").map(Number);
              endDate.setHours(hours, minutes, 0, 0);
            }
          } else if (event.endTime && startDate) {
            // If only endTime exists, calculate endDate based on startDate
            endDate = new Date(startDate);
            const [hours, minutes] = event.endTime.split(":").map(Number);

            // If end time is earlier than start time, it means it ends the next day
            if (event.startTime) {
              const [startHours, startMinutes] = event.startTime
                .split(":")
                .map(Number);
              if (
                hours < startHours ||
                (hours === startHours && minutes < startMinutes)
              ) {
                endDate.setDate(endDate.getDate() + 1);
              }
            }

            endDate.setHours(hours, minutes, 0, 0);
          } else {
            // If no end date/time info, assume event ends same day at 23:59
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
          }

          // Apply start time if available
          if (event.startTime && startDate) {
            const [startHours, startMinutes] = event.startTime
              .split(":")
              .map(Number);
            startDate.setHours(startHours, startMinutes || 0, 0);
          }

          // Determine event status
          let status;
          if (now >= startDate && now <= endDate) {
            status = "active"; // Event is happening now
          } else if (now < startDate) {
            status = "upcoming"; // Event is in the future
          } else {
            status = "past"; // Event has ended
          }

          return {
            ...event,
            calculatedStartDate: startDate,
            calculatedEndDate: endDate,
            status,
          };
        })
        .filter(Boolean); // Remove null events

      // Filter for active and upcoming events (not past)
      const relevantEvents = processedEvents.filter((event) => {
        // First, check if event is live - only show events that are set to live
        if (!event.isLive) {
          return false;
        }

        // For weekly events, handle them differently
        if (event.isWeekly) {
          if (event.weekNumber === 0 || !event.weekNumber) {
            // For parent events, always show if active or upcoming
            return event.status === "active" || event.status === "upcoming";
          }
        }

        // For regular events or weekly child events
        return event.status === "active" || event.status === "upcoming";
      });

      // Sort with active events first, then upcoming events by start date
      const upcomingEvents = relevantEvents.sort((a, b) => {
        // First prioritize active events
        if (a.status !== b.status) {
          if (a.status === "active") return -1;
          if (b.status === "active") return 1;
        }

        // Then sort by start date
        return a.calculatedStartDate - b.calculatedStartDate;
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
      // Error handling removed
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
    // If we have calculated fields from our processing, use those
    if (event.calculatedStartDate) {
      return event.calculatedStartDate;
    }
    return event.startDate || event.date;
  };

  // Helper function to check if an event is active
  const isActive = (event) => {
    // If we have processed the event and have a status
    if (event.status) {
      return event.status === "active";
    }

    // Fallback if status is not available - calculate it
    const now = new Date();
    const startDate = event.startDate
      ? new Date(event.startDate)
      : event.date
      ? new Date(event.date)
      : null;

    if (!startDate) return false;

    // Calculate end date/time
    let endDate;
    if (event.endDate) {
      endDate = new Date(event.endDate);
      if (event.endTime) {
        const [hours, minutes] = event.endTime.split(":").map(Number);
        endDate.setHours(hours, minutes, 0, 0);
      }
    } else if (event.endTime && startDate) {
      endDate = new Date(startDate);
      const [hours, minutes] = event.endTime.split(":").map(Number);

      if (event.startTime) {
        const [startHours, startMinutes] = event.startTime
          .split(":")
          .map(Number);
        if (
          hours < startHours ||
          (hours === startHours && minutes < startMinutes)
        ) {
          endDate.setDate(endDate.getDate() + 1);
        }
      }

      endDate.setHours(hours, minutes, 0, 0);
    } else {
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }

    // Apply start time
    if (event.startTime && startDate) {
      const [startHours, startMinutes] = event.startTime.split(":").map(Number);
      startDate.setHours(startHours, startMinutes || 0, 0);
    }

    return now >= startDate && now <= endDate;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
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

  // Add function to toggle table booking system
  const toggleTableBooking = () => {
    setShowTableBooking(!showTableBooking);
    setShowGuestCodeForm(false); // Close guest code form if open
  };

  // Utility function to check if event supports table booking
  const supportsTableBooking = (event) => {
    // Check all possible formats
    return (
      // Special event ID
      event._id === "6807c197d4455638731dbda6" ||
      // Brand as object with _id property
      (event.brand && event.brand._id === "67d737d6e1299b18afabf4f4") ||
      (event.brand && event.brand._id === "67ba051873bd89352d3ab6db") ||
      // Brand as string ID directly
      event.brand === "67d737d6e1299b18afabf4f4" ||
      event.brand === "67ba051873bd89352d3ab6db" ||
      // Brand ID in other properties
      event.brandId === "67d737d6e1299b18afabf4f4" ||
      event.brandId === "67ba051873bd89352d3ab6db"
    );
  };

  // Check if Spotify is configured for this brand
  const isSpotifyConfigured = (event) => {
    // Check different ways the brand could be referenced
    if (event && event.brand) {
      // If brand is a full object
      if (typeof event.brand === "object" && event.brand !== null) {
        return (
          event.brand.spotifyClientId &&
          event.brand.spotifyClientSecret &&
          event.brand.spotifyPlaylistId
        );
      }

      // If we only have a brand ID, we need to rely on a special check
      // This is a simple approach - we can make this more sophisticated later
      // by checking through known brands with Spotify configured
      return (
        // Add brand IDs of brands known to have Spotify configured
        event.brand === "67d737d6e1299b18afabf4f4" || // Example ID
        event.brand === "67ba051873bd89352d3ab6db" // Example ID
      );
    }

    return false;
  };

  // Modify the handleTableBookingClick to toggle the view without scrolling
  const handleTableBookingClick = (event, e) => {
    e.stopPropagation(); // Prevent the main event click handler from firing

    // If table booking section is hidden (when inside dashboard), trigger dashboard's table system
    if (hideTableBooking) {
      // Dispatch a custom event that Dashboard will listen for
      window.dispatchEvent(
        new CustomEvent("openTableSystem", {
          detail: {
            event: event,
          },
        })
      );
      return;
    }

    // For regular (public) view, continue with the normal flow
    // Force the table section to be rendered
    setShowTableBooking(true);

    // Short delay to ensure the component renders before scrolling
    setTimeout(() => {
      // Scroll to the table booking section using ID for more reliability
      const tableSectionElement = document.getElementById(
        "table-booking-section"
      );

      if (tableSectionElement) {
        // Use classic scrolling as fallback
        tableSectionElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        // Add highlight effect
        tableSectionElement.classList.add("highlight-section");
        setTimeout(() => {
          if (tableSectionElement) {
            tableSectionElement.classList.remove("highlight-section");
          }
        }, 1500);
      } else if (tableBookingSectionRef.current) {
        // Use ref scrolling as backup
        tableBookingSectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        tableBookingSectionRef.current.classList.add("highlight-section");
        setTimeout(() => {
          if (tableBookingSectionRef.current) {
            tableBookingSectionRef.current.classList.remove(
              "highlight-section"
            );
          }
        }, 1500);
      }
    }, 300);
  };

  // Initialize ticketsAvailable property and fetch ticket settings immediately
  useEffect(() => {
    if (events.length > 0 && currentIndex >= 0) {
      const currentEvent = events[currentIndex];

      // Set ticketsAvailable to true by default if not explicitly false
      if (currentEvent.ticketsAvailable === undefined) {
        const updatedEvents = [...events];
        updatedEvents[currentIndex] = {
          ...updatedEvents[currentIndex],
          ticketsAvailable: true,
        };
        setEvents(updatedEvents);
      }

      // IMPORTANT: Directly call fetchTicketSettings here to ensure it runs
      if (currentEvent._id) {
        fetchTicketSettings(currentEvent._id);
      }
    }
  }, [currentIndex, fetchTicketSettings, events]);

  // Initialize the component state on mount and when events or current event changes
  useEffect(() => {
    if (events.length > 0 && currentIndex >= 0) {
      const currentEvent = events[currentIndex];

      // If this is an event that supports table booking, make sure the DOM element exists
      if (supportsTableBooking(currentEvent)) {
        // Force the table section to be rendered by setting this state
        setShowTableBooking(true);
      }
    }
  }, [events, currentIndex]);

  // Add a function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Check if we have a current event to display
  if (loading) {
    return (
      <div
        className={`upcomingEvent-container loading ${
          seamless ? "seamless" : ""
        }`}
      >
        <div className="upcomingEvent-loader">
          <LoadingSpinner size="large" color="#ffc807" />
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`upcomingEvent-container error ${
          seamless ? "seamless" : ""
        }`}
      >
        <div className="upcomingEvent-error">
          <div className="upcomingEvent-error-content">
            <RiInformationLine size={48} />
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <button
              onClick={fetchUpcomingEvents}
              className="upcomingEvent-retry-button"
            >
              <RiRefreshLine /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div
        className={`upcomingEvent-container empty ${
          seamless ? "seamless" : ""
        }`}
      >
        <div className="premium-empty-state">
          <div className="premium-empty-inner">
            <div className="top-accent-line">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="icon-container">
              <div className="icon-glow-outer"></div>
              <div className="icon-glow-inner"></div>
              <div className="icon-wrapper">
                <div className="icon-ring"></div>
                <RiCalendarEventLine className="calendar-icon" />
              </div>
              <div className="pulse-circle"></div>
            </div>

            <h2 className="empty-title">No upcoming events</h2>

            <div className="empty-divider">
              <div className="divider-line"></div>
              <div className="divider-diamond"></div>
              <div className="divider-line"></div>
            </div>

            <p className="empty-message">Check back later for new events</p>

            <div className="empty-decoration">
              <div className="decoration-dot"></div>
              <div className="decoration-line"></div>
              <div className="decoration-dot"></div>
            </div>

            <div className="bottom-accent">
              <div className="bottom-accent-line"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentEvent = events[currentIndex];
  const eventImage = getEventImage();

  // Get guest code setting if available
  const guestCodeSetting = currentEvent.codeSettings?.find(
    (cs) => cs.type === "guest"
  );

  // Only show navigation when there's more than one event
  const showNavigation = !hideNavigation && events.length > 1;

  return (
    <div
      className={`upcomingEvent-container ${
        seamless ? "upcomingEvent-seamless" : ""
      } ${loading ? "upcomingEvent-loading" : ""}`}
    >
      {showNavigation && (
        <div className="upcomingEvent-navigation">
          <button
            className={`upcomingEvent-nav-button ${
              currentIndex === 0 ? "upcomingEvent-disabled" : ""
            }`}
            onClick={handlePrevEvent}
            disabled={currentIndex === 0}
          >
            <RiArrowLeftSLine />
          </button>
          <div className="upcomingEvent-navigation-indicator">
            {events.map((_, index) => (
              <div
                key={index}
                className={`upcomingEvent-indicator-dot ${
                  index === currentIndex ? "upcomingEvent-active" : ""
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
          <button
            className={`upcomingEvent-nav-button ${
              currentIndex === events.length - 1 ? "upcomingEvent-disabled" : ""
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
          className={`upcomingEvent-card ${determineAspectRatioClass()}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <div className="upcomingEvent-image-wrapper">
            <div className="upcomingEvent-image-container">
              {eventImage ? (
                <img
                  src={eventImage}
                  alt={currentEvent.title}
                  className="upcomingEvent-event-image"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div className="upcomingEvent-no-image">
                  <RiImageLine />
                  <span>No image available</span>
                </div>
              )}
            </div>
          </div>

          <div className="upcomingEvent-details">
            <div className="upcomingEvent-header">
              <h3 className="upcomingEvent-event-title">
                {currentEvent.title}
              </h3>
              {currentEvent.subTitle && (
                <p className="upcomingEvent-event-subtitle">
                  {currentEvent.subTitle}
                </p>
              )}

              {/* Event Description */}
              {currentEvent.description && (
                <div className="upcomingEvent-description-container">
                  <p className="upcomingEvent-event-description">
                    {currentEvent.description}
                  </p>
                </div>
              )}
            </div>

            {/* EventDetails Component with integrated action buttons */}
            <div className="upcomingEvent-details-section">
              <EventDetails
                event={currentEvent}
                scrollToTickets={(e) => {
                  e.stopPropagation();
                  // Use the handler with navigation integration
                  handleTicketsClick(currentEvent, e);
                }}
                scrollToGuestCode={(e) => {
                  e.stopPropagation();
                  // Use the handler with navigation integration
                  handleGuestCodeClick(currentEvent, e);
                }}
                scrollToTableBooking={(e) => {
                  e.stopPropagation();
                  // Use the new handler for table booking
                  handleTableBookingClick(currentEvent, e);
                }}
                hasTickets={visibleTicketSettings.length > 0}
                ticketPaymentMethod={
                  visibleTicketSettings.length > 0
                    ? visibleTicketSettings[0].paymentMethod
                    : "online"
                }
              />
            </div>

            {/* Lineup section - MOVED UP BEFORE TICKETS */}
            {currentEvent.lineups && currentEvent.lineups.length > 0 && (
              <LineUpView lineups={currentEvent.lineups} />
            )}

            {/* Content sections wrapper for responsive layout */}
            <div className="upcomingEvent-content-sections">
              {/* Ticket Purchase Section - Render only if there are VISIBLE tickets */}
              {currentEvent &&
                currentEvent.ticketsAvailable !== false &&
                visibleTicketSettings.length > 0 && (
                  <div
                    ref={ticketSectionRef}
                    className="upcomingEvent-ticket-section full-width"
                  >
                    {loadingTickets ? (
                      <div className="upcomingEvent-ticket-loading">
                        <LoadingSpinner color="#ffc807" />
                        <p>Loading tickets...</p>
                      </div>
                    ) : (
                      // No need to check length again here, already done above
                      <Tickets
                        eventId={currentEvent._id}
                        eventTitle={currentEvent.title}
                        eventDate={currentEvent.date}
                        seamless={seamless}
                        event={currentEvent} // Pass the full event data
                        // Pass the fetch function so Tickets can potentially refresh if needed internally
                        // NOTE: Tickets component might need adjustment if it directly uses a ticketSettings prop
                        fetchTicketSettings={fetchTicketSettings}
                      />
                    )}
                  </div>
                )}

              {/* GuestCode component section - MOVED AFTER TICKETS */}
              <div
                ref={guestCodeSectionRef}
                className="upcomingEvent-guest-code-section"
              >
                {currentEvent && <GuestCode event={currentEvent} />}
              </div>

              {/* Table booking section - KEPT AS LAST SECTION */}
              {currentEvent && !hideTableBooking && (
                <>
                  {supportsTableBooking(currentEvent) && showTableBooking && (
                    <div
                      ref={tableBookingSectionRef}
                      className="upcomingEvent-table-booking-section"
                      id="table-booking-section"
                    >
                      {/* <h3 className="section-title">Table Booking</h3> */}
                      <div className="upcomingEvent-table-container">
                        <TableSystem
                          selectedEvent={currentEvent}
                          selectedBrand={currentEvent.brand}
                          isPublic={true} // Mark as public
                          onClose={toggleTableBooking}
                        />
                      </div>
                    </div>
                  )}

                  {/* Fallback check for specific brand IDs - in case brand is stored differently */}
                  {!supportsTableBooking(currentEvent) &&
                    currentEvent.brand &&
                    (currentEvent.brand === "67d737d6e1299b18afabf4f4" ||
                      currentEvent.brand === "67ba051873bd89352d3ab6db") &&
                    showTableBooking && (
                      <div
                        ref={tableBookingSectionRef}
                        className="upcomingEvent-table-booking-section"
                        id="table-booking-section"
                      >
                        {/* <h3 className="section-title">Table Booking</h3> */}
                        <div className="upcomingEvent-table-container">
                          <TableSystem
                            selectedEvent={currentEvent}
                            selectedBrand={currentEvent.brand}
                            isPublic={true} // Mark as public
                            onClose={toggleTableBooking}
                          />
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Spotify Integration - Show before footer if configured */}
      {currentEvent && isSpotifyConfigured(currentEvent) && (
        <div className="upcomingEvent-spotify-section">
          <Spotify
            brandUsername={
              typeof currentEvent.brand === "object" &&
              currentEvent.brand?.username
                ? currentEvent.brand.username
                : brandUsername // Fall back to the prop if the brand object doesn't have a username
            }
          />
        </div>
      )}

      {/* Footer Section */}
      <motion.div
        className="upcomingEvent-footer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="upcomingEvent-footer-content">
          <div className="upcomingEvent-footer-info">
            <div className="upcomingEvent-footer-logo">
              <RiStarLine className="logo-icon" />
              <span className="logo-text">
                <span className="brand-guest">Guest</span>
                <span className="brand-code">Code</span>
              </span>
            </div>

            {currentEvent && (
              <div className="upcomingEvent-footer-event-info">
                <h4 className="event-title">{currentEvent.title}</h4>
                <div className="event-details">
                  <div className="detail-item">
                    <RiCalendarEventLine className="detail-icon" />
                    <span>{formatDate(getEventDate(currentEvent))}</span>
                  </div>
                  {currentEvent.location && (
                    <div className="detail-item">
                      <RiMapPinLine className="detail-icon" />
                      <span>{currentEvent.location}</span>
                    </div>
                  )}
                  {currentEvent.startTime && (
                    <div className="detail-item">
                      <RiTimeLine className="detail-icon" />
                      <span>
                        {currentEvent.startTime}
                        {currentEvent.endTime && ` - ${currentEvent.endTime}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="event-meta">
                  {visibleTicketSettings.length > 0 && (
                    <div className="meta-tag tickets">
                      <RiTicketLine />
                      <span>Tickets Available</span>
                    </div>
                  )}
                  {currentEvent.codeSettings?.find(
                    (cs) => cs.type === "guest"
                  ) && (
                    <div className="meta-tag guest-code">
                      <RiVipCrownLine />
                      <span>Guest Code</span>
                    </div>
                  )}
                  {currentEvent.lineups && currentEvent.lineups.length > 0 && (
                    <div className="meta-tag lineup">
                      <RiMusic2Line />
                      <span>Lineup</span>
                    </div>
                  )}
                  {supportsTableBooking(currentEvent) && (
                    <div className="meta-tag tables">
                      <RiTableLine />
                      <span>Table Booking</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="upcomingEvent-divider"></div>

          <button
            className="upcomingEvent-back-to-top"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <div className="arrow-animation">
              <RiArrowUpLine />
            </div>
            <span className="tooltip">Back to top</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UpcomingEvent;
