import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./UpcomingEvent.scss";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../../Components/Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import Tickets from "../Tickets/Tickets";
import EventDetails from "../EventDetails/EventDetails";
import GuestCode from "../GuestCode/GuestCode";
import TableSystem from "../TableSystem/TableSystem";
import LineUpView from "../LineUpView/LineUpView";
import Spotify from "../Spotify/Spotify";
import BattleSign from "../BattleSign/BattleSign";
import EventGallery from "../EventGallery/EventGallery";
import GalleryCarousel from "../GalleryCarousel/GalleryCarousel";
import VideoCarousel from "../VideoCarousel/VideoCarousel";
import VideoGallery from "../VideoGallery/VideoGallery";
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
  RiArrowLeftLine,
  RiArrowRightLine,
  RiSwordLine,
  RiFilmLine,
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
  onEventChange = () => {},
  initialDateHint = null,
  brandHasGalleries: brandHasGalleriesProp = null,
  brandHasVideoGalleries: brandHasVideoGalleriesProp = null,
  onGalleryStatusChange,
  onVideoStatusChange,
}) => {
  // Component optimized - renders reduced from 100s to ~10

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
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();

  // Only keep the showGuestCodeForm state for toggling visibility
  const [showGuestCodeForm, setShowGuestCodeForm] = useState(false);

  // Add state for table bookings
  const [showTableBooking, setShowTableBooking] = useState(false);

  // Add state for battle signup
  const [showBattleSignup, setShowBattleSignup] = useState(false);

  // Brand gallery state (photos)
  // Use prop if provided (from BrandProfile), otherwise use internal state
  const [brandHasGalleriesState, setBrandHasGalleries] = useState(false);
  const brandHasGalleries =
    brandHasGalleriesProp !== null
      ? brandHasGalleriesProp
      : brandHasGalleriesState;
  const [checkingGalleries, setCheckingGalleries] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Brand video gallery state
  const [brandHasVideoGalleriesState, setBrandHasVideoGalleries] =
    useState(false);
  const brandHasVideoGalleries =
    brandHasVideoGalleriesProp !== null
      ? brandHasVideoGalleriesProp
      : brandHasVideoGalleriesState;
  const [checkingVideoGalleries, setCheckingVideoGalleries] = useState(false);
  const [showVideoGallery, setShowVideoGallery] = useState(false);
  const [videoGalleryVideos, setVideoGalleryVideos] = useState([]);
  const [videoGalleryInitialIndex, setVideoGalleryInitialIndex] = useState(0);

  // Ticket settings state
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Action buttons refs for scrolling
  const guestCodeSectionRef = useRef(null);
  const ticketSectionRef = useRef(null);
  const tableBookingSectionRef = useRef(null);
  const battleSignupSectionRef = useRef(null);
  const gallerySectionRef = useRef(null);

  // Add a ticket settings cache
  const [ticketSettingsCache, setTicketSettingsCache] = useState({});

  // Add flag to prevent infinite loops in URL navigation
  const [hasNavigatedFromURL, setHasNavigatedFromURL] = useState(false);

  // Event preview carousel state
  const [previewScrollIndex, setPreviewScrollIndex] = useState(0);
  const maxVisiblePreviews = 4; // Reduced for larger cards
  const cardWidth = 120; // 120px + gap
  const cardGap = 12; // 0.75rem = 12px
  const totalCardWidth = cardWidth + cardGap;

  // Filter ticket settings to only include visible ones
  const visibleTicketSettings = useMemo(() => {
    // Ensure ticketSettings exists and is an array before filtering
    if (!Array.isArray(ticketSettings)) {
      return [];
    }
    // Filter out tickets where isVisible is explicitly false
    return ticketSettings.filter((ticket) => ticket.isVisible !== false);
  }, [ticketSettings]);

  // Memoize provided events to prevent unnecessary effect runs
  const memoizedProvidedEvents = useMemo(
    () => providedEvents,
    [providedEvents]
  );

  useEffect(() => {
    // If events are provided directly, use them
    if (memoizedProvidedEvents && memoizedProvidedEvents.length > 0) {
      // Create a deep copy of memoizedProvidedEvents and ensure lineups are valid
      const processedEvents = memoizedProvidedEvents.map((event) => {
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

      // OPTIMIZATION: If we have cached ticket settings from comprehensive endpoint, no need to fetch
      if (Object.keys(ticketSettingsCache).length > 0) {
        // Set ticket settings for current event if available
        if (
          processedEvents[currentIndex]?._id &&
          ticketSettingsCache[processedEvents[currentIndex]._id]
        ) {
          setTicketSettings(
            ticketSettingsCache[processedEvents[currentIndex]._id]
          );
        }
      } else {
        // Fallback: Preload ticket settings for ALL events at once
        processedEvents.forEach((event) => {
          if (event._id && event.ticketsAvailable !== false) {
            // Queue the ticket fetch with a slight delay to avoid overwhelming the server
            setTimeout(() => {
              fetchTicketSettings(event._id);
            }, 100);
          }
        });
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
    setHasNavigatedFromURL(false); // Reset URL navigation flag

    fetchUpcomingEvents();
  }, [brandId, brandUsername, memoizedProvidedEvents]);

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

  // Notify parent when current event changes (prevent callback loops)
  useEffect(() => {
    const currentEvent =
      events.length > 0 && currentIndex >= 0 && currentIndex < events.length
        ? events[currentIndex]
        : null;
    onEventChange(currentEvent);
  }, [currentIndex, events]); // Removed onEventChange from deps to prevent loops

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
        // OPTIMIZATION: Check if we already have this event's ticket settings in cache (from comprehensive endpoint)
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

  // Helper function to extract dateSlug from URL and find matching event
  const navigateToEventFromURL = useCallback(() => {
    if (!events || events.length === 0 || hasNavigatedFromURL) return;

    // Extract dateSlug from URL path - look for pattern like /@brandusername/270625
    const pathParts = location.pathname.split("/");
    let dateSlug = null;

    // Find the dateSlug in the path - it should be after the brand username
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      // Check if this part matches date format (6 digits, optionally followed by -number)
      if (/^\d{6}(-\d+)?$/.test(part)) {
        dateSlug = part.split("-")[0]; // Remove any suffix like -1, -2
        break;
      }
    }

    if (!dateSlug) {
      setHasNavigatedFromURL(true); // Mark as processed even if no dateSlug
      return;
    }

    // Parse the dateSlug (MMDDYY format to match handleViewEvent logic)
    const month = parseInt(dateSlug.substring(0, 2), 10);
    const day = parseInt(dateSlug.substring(2, 4), 10);
    const year = 2000 + parseInt(dateSlug.substring(4, 6), 10);

    // Create target date
    const targetDate = new Date(year, month - 1, day); // month is 0-indexed

    // Find matching event
    const matchingEventIndex = events.findIndex((event) => {
      const eventDate = getEventDate(event);
      if (!eventDate) return false;

      const eventDateObj = new Date(eventDate);

      // Compare dates (ignore time)
      return (
        eventDateObj.getFullYear() === targetDate.getFullYear() &&
        eventDateObj.getMonth() === targetDate.getMonth() &&
        eventDateObj.getDate() === targetDate.getDate()
      );
    });

    // Mark as processed regardless of whether we found a match
    setHasNavigatedFromURL(true);

    if (matchingEventIndex !== -1 && matchingEventIndex !== currentIndex) {
      // Use a slight delay to ensure this happens after other state updates
      setTimeout(() => {
        setCurrentIndex(matchingEventIndex);
      }, 100);
    }
  }, [events, location.pathname, hasNavigatedFromURL]);

  // Reset navigation flag when URL changes
  useEffect(() => {
    setHasNavigatedFromURL(false);
  }, [location.pathname]);

  // Effect to navigate to event based on URL when events load or path changes
  useEffect(() => {
    // Add a small delay to ensure this runs after fetchUpcomingEvents completes
    const timer = setTimeout(() => {
      navigateToEventFromURL();
    }, 200);

    return () => clearTimeout(timer);
  }, [navigateToEventFromURL]);

  const fetchUpcomingEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      let events = []; // Declare events variable at function scope

      // Use the comprehensive endpoint that fetches ALL data in one request
      const endpoint = `${process.env.REACT_APP_API_BASE_URL}/all/upcoming-event-data`;
      const params = new URLSearchParams();

      if (brandId) {
        params.append("brandId", brandId);
      } else if (brandUsername) {
        const cleanUsername = brandUsername.replace(/^@/, "");
        params.append("brandUsername", cleanUsername);
      }

      params.append("limit", limit.toString());

      const fullEndpoint = `${endpoint}?${params.toString()}`;

      const response = await axiosInstance.get(fullEndpoint);

      if (response.data && response.data.success && response.data.data) {
        const {
          events: responseEvents,
          ticketSettings,
          codeSettings,
          tableData,
          brand,
        } = response.data.data;

        // Store all related data for later use
        if (ticketSettings) {
          setTicketSettingsCache(ticketSettings);
        }

        // Store code settings globally (you might want to add state for this)
        if (codeSettings) {
          window.upcomingEventCodeSettingsCache = codeSettings;
        }

        // Store table data globally (you might want to add state for this)
        if (tableData) {
          window.upcomingEventTableDataCache = tableData;
        }

        // Use the events from comprehensive response
        events = responseEvents || [];
      } else {
        console.warn(
          "❌ [UpcomingEvent] Comprehensive endpoint failed, falling back to individual calls"
        );

        // Fallback to individual API calls if comprehensive endpoint fails
        events = []; // Remove 'let' since events is already declared above

        // Try to fetch by brandId first if available
        if (brandId) {
          const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/brand/${brandId}`;

          try {
            const response = await axiosInstance.get(endpoint);

            if (response.data && Array.isArray(response.data)) {
              events = response.data;
            }

            // If we have parent events, fetch their children too (optimized with Promise.all)
            const parentEvents = events.filter((event) => event.isWeekly);

            if (parentEvents.length > 0) {
              try {
                const childrenPromises = parentEvents.map(
                  (parentEvent) =>
                    axiosInstance
                      .get(
                        `${process.env.REACT_APP_API_BASE_URL}/events/children/${parentEvent._id}`
                      )
                      .catch(() => ({ data: [] })) // Return empty array on error
                );

                const childrenResponses = await Promise.all(childrenPromises);

                // Flatten all children responses
                const allChildren = childrenResponses
                  .filter(
                    (response) => response.data && Array.isArray(response.data)
                  )
                  .flatMap((response) => response.data);

                events = [...events, ...allChildren];
              } catch (error) {
                // Continue without children if there's an error
              }
            }
          } catch (error) {
            // Fall back to using brandUsername for any error, not just 401/403
            if (brandUsername) {
              const cleanUsername = brandUsername.replace(/^@/, "");
              const fallbackEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${cleanUsername}`;

              try {
                const response = await axiosInstance.get(fallbackEndpoint);
                if (response.data && Array.isArray(response.data)) {
                  events = response.data;
                } else {
                  events = [];
                }
              } catch (usernameError) {
                events = [];
              }
            }
          }
        } else if (brandUsername) {
          // No brandId, try using brandUsername
          const cleanUsername = brandUsername.replace(/^@/, "");
          const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/date/${cleanUsername}`;

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
                  // Continue without children
                }
              }
            } else {
              events = [];
            }
          } catch (err) {
            events = [];
          }
        }
      }

      // Simplified filtering logic for upcoming events
      const now = new Date();
      // Don't reset hours to 0 since we need exact time for comparison

      // Process events to calculate end dates/times
      const processedEvents = events
        .map((event) => {
          // Skip events with no date information
          if (!event.startDate) return null;

          // Get the start date
          const startDate = new Date(event.startDate);

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
        let targetIndex = 0; // Default to first event

        // Handle date navigation if we have a date hint and haven't processed it yet
        if (initialDateHint && !hasNavigatedFromURL) {
          // Parse the date hint
          let targetDate = null;
          if (initialDateHint.length === 6) {
            // DDMMYY format
            const day = parseInt(initialDateHint.substring(0, 2));
            const month = parseInt(initialDateHint.substring(2, 4)) - 1;
            const year = parseInt("20" + initialDateHint.substring(4, 6));
            targetDate = new Date(year, month, day);
          } else if (initialDateHint.length === 8) {
            // DDMMYYYY format
            const day = parseInt(initialDateHint.substring(0, 2));
            const month = parseInt(initialDateHint.substring(2, 4)) - 1;
            const year = parseInt(initialDateHint.substring(4, 8));
            targetDate = new Date(year, month, day);
          }

          if (targetDate && !isNaN(targetDate.getTime())) {
            const matchingEventIndex = upcomingEvents.findIndex((event) => {
              const eventDate =
                event.calculatedStartDate ||
                new Date(event.startDate);
              if (!eventDate) return false;

              const eventDateOnly = new Date(
                eventDate.getFullYear(),
                eventDate.getMonth(),
                eventDate.getDate()
              );
              const targetDateOnly = new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate()
              );

              return eventDateOnly.getTime() === targetDateOnly.getTime();
            });

            if (matchingEventIndex !== -1) {
              targetIndex = matchingEventIndex;
            }
          }

          setHasNavigatedFromURL(true); // Mark as processed
        }

        setCurrentIndex(targetIndex);

        // Preload the selected event's image if available
        if (upcomingEvents[targetIndex].flyer) {
          preloadEventImage(upcomingEvents[targetIndex]);
        }
      } else {
        setCurrentIndex(-1);
      }
    } catch (error) {
      console.error("❌ [UpcomingEvent] Error in fetchUpcomingEvents:", error);
      setError("Failed to load events");
      setEvents([]);
      setCurrentIndex(-1);
      onEventsLoaded(0);
    } finally {
      setLoading(false);
    }
  };

  // Function to check if brand has any galleries available
  const checkBrandGalleries = useCallback(async () => {
    if (!brandId && !brandUsername) {
      return;
    }

    setCheckingGalleries(true);

    try {
      let endpoint = "";
      let finalBrandId = brandId;

      if (brandId) {
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandId}/galleries/check`;
      } else if (brandUsername) {
        // First get the brand by username to get the brandId
        const cleanUsername = brandUsername.replace(/^@/, "");
        const brandResponse = await axiosInstance.get(
          `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
        );

        if (brandResponse.data && brandResponse.data._id) {
          finalBrandId = brandResponse.data._id;
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${finalBrandId}/galleries/check`;
        }
      }

      if (endpoint) {
        const response = await axiosInstance.get(endpoint);

        if (response.data && response.data.success) {
          setBrandHasGalleries(response.data.hasGalleries);

          // If brand has galleries, get the latest one to display by default
          if (response.data.hasGalleries) {
            await getLatestBrandGallery();
          }
        } else {
          setBrandHasGalleries(false);
        }
      }
    } catch (error) {
      setBrandHasGalleries(false);
    } finally {
      setCheckingGalleries(false);
    }
  }, [brandId, brandUsername]);

  // Function to get the latest brand gallery for display
  const getLatestBrandGallery = useCallback(async () => {
    if (!brandId && !brandUsername) return;

    try {
      let endpoint = "";

      if (brandId) {
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandId}/galleries/latest`;
      } else if (brandUsername) {
        // Get brand ID from username
        const cleanUsername = brandUsername.replace(/^@/, "");
        const brandResponse = await axiosInstance.get(
          `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
        );

        if (brandResponse.data && brandResponse.data._id) {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandResponse.data._id}/galleries/latest`;
        }
      }

      if (endpoint) {
        // Just verify the endpoint is reachable - GalleryCarousel handles its own data fetching
        await axiosInstance.get(endpoint);
      }
    } catch (error) {
      console.error("Error getting latest brand gallery:", error);
    }
  }, [brandId, brandUsername]);

  // Function to check if brand has any video galleries available
  const checkBrandVideoGalleries = useCallback(async () => {
    if (!brandId && !brandUsername) {
      return;
    }

    setCheckingVideoGalleries(true);

    try {
      let endpoint = "";

      if (brandId) {
        endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandId}/videos/check`;
      } else if (brandUsername) {
        // First get the brand by username to get the brandId
        const cleanUsername = brandUsername.replace(/^@/, "");
        const brandResponse = await axiosInstance.get(
          `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
        );

        if (brandResponse.data && brandResponse.data._id) {
          endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brandResponse.data._id}/videos/check`;
        }
      }

      if (endpoint) {
        const response = await axiosInstance.get(endpoint);

        if (response.data && response.data.success) {
          setBrandHasVideoGalleries(response.data.hasVideoGalleries);
        } else {
          setBrandHasVideoGalleries(false);
        }
      }
    } catch (error) {
      setBrandHasVideoGalleries(false);
    } finally {
      setCheckingVideoGalleries(false);
    }
  }, [brandId, brandUsername]);

  // Simple image error handler for main event image
  const handleImageError = useCallback((e) => {
    // Could set a fallback image or just let the no-image placeholder show
  }, []);

  // Effect to check brand galleries when component mounts or brand changes
  // Skip if brandHasGalleries prop is provided from parent (BrandProfile already checked)
  useEffect(() => {
    if (brandHasGalleriesProp !== null) {
      // Parent provided the value, skip checking
      setCheckingGalleries(false);
      return;
    }
    if ((brandId || brandUsername) && !checkingGalleries) {
      checkBrandGalleries();
    }
  }, [brandId, brandUsername, checkBrandGalleries, brandHasGalleriesProp]);

  // Effect to check brand video galleries when component mounts or brand changes
  // Skip if brandHasVideoGalleries prop is provided from parent (BrandProfile already checked)
  useEffect(() => {
    if (brandHasVideoGalleriesProp !== null) {
      // Parent provided the value, skip checking
      setCheckingVideoGalleries(false);
      return;
    }
    if ((brandId || brandUsername) && !checkingVideoGalleries) {
      checkBrandVideoGalleries();
    }
  }, [
    brandId,
    brandUsername,
    checkBrandVideoGalleries,
    brandHasVideoGalleriesProp,
  ]);

  const handlePrevEvent = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setShowGuestCodeForm(false); // Hide form when changing events
  };

  const handleNextEvent = () => {
    setCurrentIndex((prev) => (prev < events.length - 1 ? prev + 1 : prev));
    setShowGuestCodeForm(false); // Hide form when changing events
  };

  // Helper function to get the best date field
  const getEventDate = (event) => {
    // If we have calculated fields from our processing, use those
    if (event.calculatedStartDate) {
      return event.calculatedStartDate;
    }
    return event.startDate;
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

  const formatCompactDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);

    // Get day name abbreviation (FR for Friday, etc.)
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "short" })
      .toUpperCase();

    // Get day and month
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    // Format as "FR 27/06/25"
    return `${dayName} ${day}/${month}/${year}`;
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
    setShowBattleSignup(false); // Close battle signup if open
  };

  // Add function to toggle battle signup
  const toggleBattleSignup = () => {
    setShowBattleSignup(!showBattleSignup);
    setShowGuestCodeForm(false); // Close guest code form if open
    setShowTableBooking(false); // Close table booking if open
  };

  // Add function to handle gallery click - scrolls to gallery carousel section
  const handleGalleryClick = (_event, e) => {
    if (e) {
      e.stopPropagation(); // Prevent the main event click handler from firing
    }

    // Scroll to the gallery carousel section
    if (gallerySectionRef.current) {
      gallerySectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Handle video click - opens VideoGallery lightbox
  const handleVideoClick = useCallback((videos, videoIndex) => {
    setVideoGalleryVideos(videos);
    setVideoGalleryInitialIndex(videoIndex);
    setShowVideoGallery(true);
  }, []);

  // Utility function to check if event supports table booking
  const supportsTableBooking = (event) => {
    // Primary check: Does event have a table layout configured?
    if (event.tableLayout && event.tableLayout !== "") {
      return true;
    }

    // Exclude specific brand ID that should not show table bookings
    if (
      event.brand === "67d737d6e1299b18afabf4f4" ||
      (event.brand && event.brand._id === "67d737d6e1299b18afabf4f4") ||
      event.brandId === "67d737d6e1299b18afabf4f4"
    ) {
      return false;
    }

    return false;
  };

  // Utility function to check if event supports battles
  const supportsBattles = (event) => {
    if (!event) return false;
    return event.battleConfig && event.battleConfig.isEnabled;
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
      const tableSection = document.getElementById(
        `table-booking-${event._id}`
      );
      if (tableSection) {
        tableSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Handle battle signup click
  const handleBattleSignupClick = (event, e) => {
    e.stopPropagation(); // Prevent the main event click handler from firing

    // Force the battle section to be rendered
    setShowBattleSignup(true);

    // Short delay to ensure the component renders before scrolling
    setTimeout(() => {
      // Scroll to the battle signup section using ID for more reliability
      const battleSection = document.getElementById(
        `battle-signup-${event._id}`
      );
      if (battleSection) {
        battleSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
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

      // OPTIMIZATION: Use cached ticket settings if available, otherwise fetch
      if (currentEvent._id) {
        if (ticketSettingsCache[currentEvent._id]) {
          setTicketSettings(ticketSettingsCache[currentEvent._id]);
          setLoadingTickets(false);
        } else {
          fetchTicketSettings(currentEvent._id);
        }
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

  // Event preview carousel functions
  const handlePreviewScrollLeft = () => {
    setPreviewScrollIndex((prev) => Math.max(0, prev - 1));
  };

  const handlePreviewScrollRight = () => {
    // Calculate how many cards we can scroll based on container width
    const containerWidth = 600; // approximate container width for larger cards
    const visibleCards = Math.floor(containerWidth / totalCardWidth);
    const maxScroll = Math.max(0, events.length - visibleCards);
    setPreviewScrollIndex((prev) => Math.min(maxScroll, prev + 1));
  };

  const handlePreviewClick = (index) => {
    setCurrentIndex(index);
    setShowGuestCodeForm(false);
  };

  // Auto-scroll preview carousel to show selected event
  useEffect(() => {
    if (events.length <= maxVisiblePreviews) {
      // If all events fit in viewport, no need to scroll
      return;
    }

    // Calculate if current event is visible in the preview carousel
    const visibleStartIndex = previewScrollIndex;
    const visibleEndIndex = previewScrollIndex + maxVisiblePreviews - 1;

    // If current event is not visible, adjust scroll position
    if (currentIndex < visibleStartIndex || currentIndex > visibleEndIndex) {
      // Calculate optimal scroll position to center the selected event
      let newScrollIndex;
      
      if (currentIndex < visibleStartIndex) {
        // Selected event is to the left, scroll left to show it
        newScrollIndex = Math.max(0, currentIndex - Math.floor(maxVisiblePreviews / 2));
      } else {
        // Selected event is to the right, scroll right to show it
        newScrollIndex = Math.min(
          events.length - maxVisiblePreviews,
          currentIndex - Math.floor(maxVisiblePreviews / 2)
        );
      }

      // Ensure we don't scroll beyond bounds
      newScrollIndex = Math.max(0, Math.min(events.length - maxVisiblePreviews, newScrollIndex));
      
      setPreviewScrollIndex(newScrollIndex);
    }
  }, [currentIndex, events.length, maxVisiblePreviews, previewScrollIndex]);

  // Get preview image for an event
  const getPreviewImage = (event) => {
    if (!event?.flyer) return null;

    // For previews, prefer square format first, then landscape, then portrait
    if (event.flyer.square) {
      return (
        event.flyer.square.thumbnail ||
        event.flyer.square.medium ||
        event.flyer.square.full
      );
    }

    if (event.flyer.landscape) {
      return (
        event.flyer.landscape.thumbnail ||
        event.flyer.landscape.medium ||
        event.flyer.landscape.full
      );
    }

    if (event.flyer.portrait) {
      return (
        event.flyer.portrait.thumbnail ||
        event.flyer.portrait.medium ||
        event.flyer.portrait.full
      );
    }

    if (typeof event.flyer === "string") {
      return event.flyer;
    }

    return null;
  };

  // Check if we have a current event to display
  if (loading && !seamless) {
    return (
      <div className="upcomingEvent-container loading">
        <div className="upcomingEvent-loader">
          <LoadingSpinner size="large" color="#ffc807" />
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  // For seamless mode, don't show loading spinner - parent handles loading
  if (loading && seamless) {
    return null;
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
      {/* Event Preview Carousel - only show when there are multiple events */}
      {!hideNavigation && events.length > 1 && (
        <div className="upcomingEvent-preview-carousel">
          <div className="preview-carousel-container">
            <div
              className="preview-carousel-track"
              style={{
                transform: `translateX(-${
                  previewScrollIndex * totalCardWidth
                }px)`,
              }}
            >
              {events.map((event, index) => {
                const previewImage = getPreviewImage(event);
                const isActive = index === currentIndex;

                return (
                  <div
                    key={event._id || `preview-${index}`}
                    className={`preview-card ${isActive ? "active" : ""}`}
                    onClick={() => handlePreviewClick(index)}
                  >
                    <div className="preview-image-container">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={event.title}
                          className="preview-image"
                        />
                      ) : (
                        <div className="preview-no-image">
                          <RiImageLine />
                        </div>
                      )}
                      {isActive && <div className="preview-active-indicator" />}
                    </div>

                    <div className="preview-info">
                      <h4 className="preview-title">{event.title}</h4>
                      {event.subTitle && (
                        <p className="preview-subtitle">{event.subTitle}</p>
                      )}
                      <div className="preview-date">
                        <span>{formatCompactDate(getEventDate(event))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
          {/* Content wrapper for desktop layout - title first */}

          <div className="upcomingEvent-content-wrapper">
            {/* Event Title */}
            <div className="upcomingEvent-header">
              <h1 className="upcomingEvent-event-title">
                {currentEvent.title}
              </h1>
            </div>

            {/* Event Subtitle */}
            <div className="upcomingEvent-subtitle-wrapper">
              {currentEvent.subTitle && (
                <div className="upcomingEvent-subtitle-header">
                  <h2 className="upcomingEvent-event-subtitle">
                    {currentEvent.subTitle}
                  </h2>
                </div>
              )}
            </div>
          </div>

          {/* Image/Flyer - positioned separately for grid layout */}
          <div className="upcomingEvent-image-wrapper">
            <div className="upcomingEvent-image-container">
              {eventImage ? (
                <img
                  src={eventImage}
                  alt={currentEvent.title}
                  className="upcomingEvent-event-image"
                  onError={handleImageError}
                />
              ) : currentEvent?.brand?.logo ? (
                <img
                  src={currentEvent.brand.logo.medium || currentEvent.brand.logo.full || currentEvent.brand.logo.thumbnail}
                  alt={`${currentEvent.brand.name || 'Brand'} logo`}
                  className="upcomingEvent-event-image placeholder-logo"
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

          {/* Event Description */}
          {currentEvent.description && (
            <div className="upcomingEvent-description-container">
              <p className="upcomingEvent-event-description">
                {currentEvent.description}
              </p>
            </div>
          )}

          {/* Full-width sections that span both columns on desktop */}
          <div className="upcomingEvent-full-width-sections">
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
                scrollToBattleSignup={(e) => {
                  e.stopPropagation();
                  // Use the new handler for battle signup
                  handleBattleSignupClick(currentEvent, e);
                }}
                scrollToGallery={(e) => {
                  e.stopPropagation();
                  // Use the handler for gallery
                  handleGalleryClick(currentEvent, e);
                }}
                brandHasGalleries={brandHasGalleries}
                hasTickets={visibleTicketSettings.length > 0}
                ticketPaymentMethod={
                  visibleTicketSettings.length > 0
                    ? visibleTicketSettings[0].paymentMethod
                    : "online"
                }
                hasBattles={supportsBattles(currentEvent)}
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
                    {loadingTickets && !seamless ? (
                      <div className="upcomingEvent-ticket-loading">
                        <LoadingSpinner color="#ffc807" />
                        <p>Loading tickets...</p>
                      </div>
                    ) : loadingTickets && seamless ? null : (
                      // No need to check length again here, already done above
                      <Tickets
                        eventId={currentEvent._id}
                        eventTitle={currentEvent.title}
                        eventDate={currentEvent.startDate}
                        seamless={seamless}
                        event={currentEvent} // Pass the full event data
                        ticketSettings={visibleTicketSettings} // Pass the already fetched and filtered ticket settings
                        fetchTicketSettings={fetchTicketSettings}
                      />
                    )}
                  </div>
                )}
              {/* Battle signup section - Only shown if battles are enabled */}
              {currentEvent && supportsBattles(currentEvent) && (
                <div
                  ref={battleSignupSectionRef}
                  className="upcomingEvent-battle-signup-section"
                  id={`battle-signup-${currentEvent._id}`}
                >
                  <div className="upcomingEvent-battle-container">
                    <BattleSign
                      eventId={currentEvent._id}
                      ref={battleSignupSectionRef}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GuestCode component section - MOVED AFTER TICKETS */}
            <div
              ref={guestCodeSectionRef}
              className="upcomingEvent-guest-code-section"
            >
              {currentEvent && <GuestCode event={currentEvent} />}
            </div>

            {/* Table booking section - Only shown if layout is configured */}
            {currentEvent &&
              !hideTableBooking &&
              supportsTableBooking(currentEvent) &&
              showTableBooking && (
                <div
                  ref={tableBookingSectionRef}
                  className="upcomingEvent-table-booking-section"
                  id="table-booking-section"
                >
                  <div className="upcomingEvent-table-container">
                    <TableSystem
                      selectedEvent={currentEvent}
                      selectedBrand={currentEvent.brand}
                      isPublic={true} // Mark as public
                      onClose={toggleTableBooking}
                      tableData={
                        window.upcomingEventTableDataCache?.[currentEvent._id]
                      } // Pass pre-fetched table data
                    />
                  </div>
                </div>
              )}

            {/* Gallery carousel section */}
            {brandHasGalleries && (
              <div
                ref={gallerySectionRef}
                className="upcomingEvent-gallery-section"
                id={`gallery-${currentEvent?._id}`}
              >
                <GalleryCarousel
                  brandId={brandId}
                  brandUsername={brandUsername}
                  currentEvent={currentEvent}
                  brandHasGalleries={brandHasGalleries}
                  onGalleryStatusChange={onGalleryStatusChange}
                  onImageClick={(images, imageIndex) => {
                    // Open the lightbox with images and selected index
                    setGalleryImages(images);
                    setGalleryInitialIndex(imageIndex);
                    setShowGallery(true);
                  }}
                />
              </div>
            )}

            {/* Video carousel section */}
            {brandHasVideoGalleries && (
              <div
                className="upcomingEvent-video-section"
                id={`videos-${currentEvent?._id}`}
              >
                <VideoCarousel
                  brandId={brandId}
                  brandUsername={brandUsername}
                  onVideoClick={handleVideoClick}
                  brandHasVideoGalleries={brandHasVideoGalleries}
                  onVideoStatusChange={onVideoStatusChange}
                />
              </div>
            )}
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
                  {supportsBattles(currentEvent) && (
                    <div
                      className="meta-tag battle"
                      onClick={() => setShowBattleSignup(true)}
                      style={{ cursor: "pointer" }}
                    >
                      <RiSwordLine />
                      <span>Battle</span>
                    </div>
                  )}
                  {brandHasGalleries && (
                    <div
                      className="meta-tag gallery"
                      onClick={(e) => handleGalleryClick(currentEvent, e)}
                      style={{ cursor: "pointer" }}
                    >
                      <RiImageLine />
                      <span>Gallery</span>
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

      {/* EventGallery Lightbox */}
      <EventGallery
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />

      {/* VideoGallery Lightbox */}
      <VideoGallery
        videos={videoGalleryVideos}
        initialIndex={videoGalleryInitialIndex}
        isOpen={showVideoGallery}
        onClose={() => setShowVideoGallery(false)}
      />
    </div>
  );
};

export default memo(UpcomingEvent);
