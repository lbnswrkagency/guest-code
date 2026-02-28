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
import { useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import EventSummary from "../EventSummary/EventSummary";
import EventGallery from "../EventGallery/EventGallery";
import {
  RiCalendarEventLine,
  RiImageLine,
  RiInformationLine,
  RiRefreshLine,
} from "react-icons/ri";
import {
  getEventDate,
  formatCompactDate,
} from "../../utils/dateFormatters";
import {
  getPreviewImage as getPreviewImageUtil,
  preloadEventImage,
} from "../../utils/eventHelpers";

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
  events: providedEvents,
  initialEventIndex = 0,
  onEventsLoaded = () => {},
  onEventChange = () => {},
  initialDateHint = null,
  brandHasGalleries: brandHasGalleriesProp = null,
  onGalleryStatusChange,
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
  const location = useLocation();

  // Add state for table bookings
  const [showTableBooking, setShowTableBooking] = useState(false);

  // Add state for battle signup
  const [showBattleSignup, setShowBattleSignup] = useState(false);

  const [brandUploadSettings, setBrandUploadSettings] = useState({
    guestUploadEnabled: false,
    guestUploadFolder: null,
  });


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

  const handleGalleryImageClick = useCallback((images, imageIndex) => {
    setGalleryImages(images);
    setGalleryInitialIndex(imageIndex);
    setShowGallery(true);
  }, []);

  // Ticket settings state
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Action buttons refs for scrolling
  const guestCodeSectionRef = useRef(null);
  const ticketSectionRef = useRef(null);
  const tableBookingSectionRef = useRef(null);
  const battleSignupSectionRef = useRef(null);
  const gallerySectionRef = useRef(null);

  // Add caches for data from comprehensive endpoint
  const [ticketSettingsCache, setTicketSettingsCache] = useState({});
  const [codeSettingsCache, setCodeSettingsCache] = useState({});
  const [tableDataCache, setTableDataCache] = useState({});

  // Add flag to prevent infinite loops in URL navigation
  const [hasNavigatedFromURL, setHasNavigatedFromURL] = useState(false);

  // Track Spotify load status (null = not checked, true = success, false = failed)
  const [spotifyLoaded, setSpotifyLoaded] = useState(null);

  // Event strip ref for auto-scrolling active item into view
  const stripTrackRef = useRef(null);

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
            fetchTicketSettings(event._id);
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
    setHasNavigatedFromURL(false); // Reset URL navigation flag

    fetchUpcomingEvents();
  }, [brandId, brandUsername, memoizedProvidedEvents]);

  // Code settings are already fetched once in fetchUpcomingEvents() via the comprehensive endpoint
  // and merged into each event object. No re-fetch needed on event change.

  // Notify parent when current event changes (prevent callback loops)
  useEffect(() => {
    const currentEvent =
      events.length > 0 && currentIndex >= 0 && currentIndex < events.length
        ? events[currentIndex]
        : null;
    onEventChange(currentEvent);
  }, [currentIndex, events]); // Removed onEventChange from deps to prevent loops

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
      setCurrentIndex(matchingEventIndex);
    }
  }, [events, location.pathname, hasNavigatedFromURL]);

  // Reset navigation flag when URL changes
  useEffect(() => {
    setHasNavigatedFromURL(false);
  }, [location.pathname]);

  // Effect to navigate to event based on URL when events load or path changes
  useEffect(() => {
    navigateToEventFromURL();
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

        // Store code settings in React state (replacing window globals)
        if (codeSettings) {
          setCodeSettingsCache(codeSettings);
        }

        // Store table data in React state (replacing window globals)
        if (tableData) {
          setTableDataCache(tableData);
        }

        // Use the events from comprehensive response and MERGE codeSettings into each event
        events = (responseEvents || []).map(event => {
          const eventId = event._id?.toString();
          const eventCodeSettings = codeSettings?.[eventId] || [];
          return {
            ...event,
            codeSettings: eventCodeSettings
          };
        });
      } else {
        // Comprehensive endpoint failed, fall back to individual calls

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
      // Error in fetchUpcomingEvents
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
      // Error getting latest brand gallery
    }
  }, [brandId, brandUsername]);


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

  // Effect to fetch brand upload settings
  useEffect(() => {
    const fetchUploadSettings = async () => {
      if (!brandId && !brandUsername) return;

      try {
        let finalBrandId = brandId;

        // If we only have brandUsername, get the brand ID first
        if (!finalBrandId && brandUsername) {
          const cleanUsername = brandUsername.replace(/^@/, "");
          const brandResponse = await axiosInstance.get(
            `${process.env.REACT_APP_API_BASE_URL}/brands/profile/username/${cleanUsername}`
          );
          if (brandResponse.data && brandResponse.data._id) {
            finalBrandId = brandResponse.data._id;
          }
        }

        if (finalBrandId) {
          const response = await axiosInstance.get(
            `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${finalBrandId}/upload-settings`
          );

          if (response.data && response.data.success) {
            setBrandUploadSettings({
              guestUploadEnabled: response.data.settings.guestUploadEnabled || false,
              guestUploadFolder: response.data.settings.guestUploadFolder || null,
            });
          }
        }
      } catch (error) {
        // Silent fail - upload feature just won't be shown
        // Upload settings not available
      }
    };

    fetchUploadSettings();
  }, [brandId, brandUsername]);

  const handlePrevEvent = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setSpotifyLoaded(null); // Reset Spotify status when changing events
  };

  const handleNextEvent = () => {
    setCurrentIndex((prev) => (prev < events.length - 1 ? prev + 1 : prev));
    setSpotifyLoaded(null); // Reset Spotify status when changing events
  };

  // Add function to toggle table booking system
  const toggleTableBooking = () => {
    setShowTableBooking(!showTableBooking);
    setShowBattleSignup(false); // Close battle signup if open
  };

  // Add function to toggle battle signup
  const toggleBattleSignup = () => {
    setShowBattleSignup(!showBattleSignup);
    setShowTableBooking(false); // Close table booking if open
  };

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
        return !!(
          event.brand.spotifyClientId &&
          event.brand.spotifyClientSecret &&
          event.brand.spotifyPlaylistId
        );
      }

      // If we only have a brand ID, check known brands with Spotify configured
      return (
        event.brand === "67d737d6e1299b18afabf4f4" ||
        event.brand === "67ba051873bd89352d3ab6db"
      );
    }

    return false;
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

  const handlePreviewClick = (index) => {
    setCurrentIndex(index);
  };

  // Auto-scroll event strip to keep active item visible
  useEffect(() => {
    if (stripTrackRef.current && events.length > 1) {
      const activeItem = stripTrackRef.current.children[currentIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentIndex, events.length]);

  // getPreviewImage imported from eventHelpers

  // Check if we have a current event to display
  if (loading) {
    return (
      <div className="upcomingEvent-container loading">
        <div className="upcomingEvent-loader">
          <LoadingSpinner size="large" color="#ffc807" />
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="upcomingEvent-container error">
        <div className="upcomingEvent-error">
          <div className="upcomingEvent-error-content">
            <RiInformationLine size={48} />
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <button
              type="button"
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
      <div className="upcomingEvent-container empty">
        <div className="upcomingEvent-empty-simple">
          <RiCalendarEventLine className="empty-icon" />
          <h2>No upcoming events</h2>
          <p>Check back later for new events</p>
        </div>
      </div>
    );
  }

  const currentEvent = events[currentIndex];

  // Get guest code setting if available
  const guestCodeSetting = currentEvent.codeSettings?.find(
    (cs) => cs.type === "guest"
  );

  return (
    <div
      className={`upcomingEvent-container ${loading ? "upcomingEvent-loading" : ""}`}
    >
      {/* Event Strip - compact horizontal scrollable event selector */}
      {events.length > 1 && (
        <div className="upcomingEvent-event-strip">
          <div className="event-strip__track" ref={stripTrackRef}>
            {events.map((event, index) => {
              const previewImage = getPreviewImageUtil(event);
              const isActive = index === currentIndex;
              return (
                <button
                  key={event._id || `strip-${index}`}
                  className={`event-strip__item ${isActive ? "event-strip__item--active" : ""}`}
                  onClick={() => handlePreviewClick(index)}
                  type="button"
                >
                  <div className="event-strip__thumb">
                    {previewImage ? (
                      <img src={previewImage} alt={event.title} />
                    ) : event.brand?.logo ? (
                      <img src={event.brand.logo.medium || event.brand.logo.full || event.brand.logo.thumbnail} alt="" />
                    ) : (
                      <RiImageLine />
                    )}
                  </div>
                  <div className="event-strip__info">
                    <span className="event-strip__title">{event.title}</span>
                    <span className="event-strip__date">{formatCompactDate(getEventDate(event))}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentEvent?._id || `event-${currentIndex}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <EventSummary
            event={currentEvent}
            ticketSettings={ticketSettings}
            visibleTicketSettings={visibleTicketSettings}
            loadingTickets={loadingTickets}
            fetchTicketSettings={fetchTicketSettings}
            guestCodeSetting={guestCodeSetting}
            brandId={brandId}
            brandUsername={brandUsername}
            brandHasGalleries={brandHasGalleries}
            brandUploadSettings={brandUploadSettings}
            showTableBooking={showTableBooking}
            showBattleSignup={showBattleSignup}
            supportsTableBooking={supportsTableBooking}
            supportsBattles={supportsBattles}
            isSpotifyConfigured={isSpotifyConfigured}
            spotifyLoaded={spotifyLoaded}
            tableDataCache={tableDataCache}
            onToggleTableBooking={toggleTableBooking}
            onToggleBattleSignup={toggleBattleSignup}
            onSpotifyLoadChange={setSpotifyLoaded}
            onGalleryStatusChange={onGalleryStatusChange}
            onGalleryImageClick={handleGalleryImageClick}
            ticketSectionRef={ticketSectionRef}
            guestCodeSectionRef={guestCodeSectionRef}
            tableBookingSectionRef={tableBookingSectionRef}
            battleSignupSectionRef={battleSignupSectionRef}
            gallerySectionRef={gallerySectionRef}
          />
        </motion.div>
      </AnimatePresence>

      {/* EventGallery Lightbox */}
      <EventGallery
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />

    </div>
  );
};

export default memo(UpcomingEvent);
