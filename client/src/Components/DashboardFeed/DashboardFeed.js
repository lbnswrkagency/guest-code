import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./DashboardFeed.scss";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiMusic2Line,
  RiInformationLine,
  RiRefreshLine,
  RiTicketLine,
  RiGroupLine,
  RiUserLine,
  RiVipCrownLine,
  RiLinkM,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import UpcomingEvent from "../UpcomingEvent/UpcomingEvent";

const DashboardFeed = ({ selectedBrand, selectedDate, selectedEvent }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Effect to use event data from Redux props
  useEffect(() => {
    // If we have a selected event, use it directly
    if (selectedEvent) {
      // Check if the event has lineups data
      if (selectedBrand && selectedBrand.lineups) {
        let eventLineups = [];

        // Handle case where event.lineups is an array of IDs (strings) instead of objects
        if (selectedEvent.lineups && Array.isArray(selectedEvent.lineups)) {
          if (
            selectedEvent.lineups.length > 0 &&
            typeof selectedEvent.lineups[0] === "string"
          ) {
            // If lineups are string IDs, find the full lineup objects from selectedBrand.lineups
            eventLineups = selectedEvent.lineups
              .map((lineupId) => {
                // Find the full lineup object from selectedBrand.lineups
                const fullLineup = selectedBrand.lineups.find(
                  (l) => l._id === lineupId || l.id === lineupId
                );

                return fullLineup || null;
              })
              .filter((lineup) => lineup !== null);
          } else if (
            selectedEvent.lineups.length > 0 &&
            typeof selectedEvent.lineups[0] === "object"
          ) {
            // If lineups are already objects, use them directly
            eventLineups = selectedEvent.lineups;
          }
        }

        // If no lineups were found or they're not valid objects, try to find lineups associated with this event
        if (eventLineups.length === 0) {
          eventLineups = selectedBrand.lineups.filter((lineup) => {
            // Check if lineup.events exists and contains the event ID
            if (lineup.events && Array.isArray(lineup.events)) {
              return lineup.events.some((eventId) => {
                // Convert both to strings for comparison
                const lineupEventId = eventId.toString();
                const currentEventId = selectedEvent._id.toString();
                return lineupEventId === currentEventId;
              });
            }
            return false;
          });
        }

        // Ensure all lineup objects have required properties
        const validLineups = eventLineups.map((lineup) => ({
          _id: lineup._id || lineup.id,
          name: lineup.name || "Unknown Artist",
          category: lineup.category || "Other",
          avatar: lineup.avatar || null,
          events: lineup.events || [],
          isActive: lineup.isActive !== undefined ? lineup.isActive : true,
        }));

        // Create a new event object with lineups data
        const eventWithLineups = {
          ...selectedEvent,
          lineups: validLineups.length > 0 ? validLineups : null,
        };

        setEventData(eventWithLineups);
        preloadEventImage(eventWithLineups);
      } else {
        setEventData(selectedEvent);
        preloadEventImage(selectedEvent);
      }

      setIsLoading(false);
      return;
    }

    // If no event is selected but we have a brand and date, try to find a matching event
    if (selectedBrand && selectedDate) {
      setIsLoading(true);
      setError(null);

      try {
        // Format date for comparison
        const formattedDate = new Date(selectedDate)
          .toISOString()
          .split("T")[0];

        // Get events from the brand
        let brandEvents = [];

        // Handle both possible event structures
        if (Array.isArray(selectedBrand.events)) {
          brandEvents = selectedBrand.events;
        } else if (
          selectedBrand.events &&
          Array.isArray(selectedBrand.events.items)
        ) {
          brandEvents = selectedBrand.events.items;
        }

        // Find events for the selected date
        const eventsForDate = brandEvents.filter((event) => {
          if (!event.date) return false;
          // Compare dates by converting to YYYY-MM-DD strings
          const eventDate = new Date(event.date).toISOString().split("T")[0];
          return eventDate === formattedDate;
        });

        if (eventsForDate.length > 0) {
          // Use the first event for this date
          const event = eventsForDate[0];

          // Check if the event has lineups data
          if (selectedBrand && selectedBrand.lineups) {
            let eventLineups = [];

            // Handle case where event.lineups is an array of IDs (strings) instead of objects
            if (event.lineups && Array.isArray(event.lineups)) {
              if (
                event.lineups.length > 0 &&
                typeof event.lineups[0] === "string"
              ) {
                // If lineups are string IDs, find the full lineup objects from selectedBrand.lineups
                eventLineups = event.lineups
                  .map((lineupId) => {
                    // Find the full lineup object from selectedBrand.lineups
                    const fullLineup = selectedBrand.lineups.find(
                      (l) => l._id === lineupId || l.id === lineupId
                    );

                    return fullLineup || null;
                  })
                  .filter((lineup) => lineup !== null);
              } else if (
                event.lineups.length > 0 &&
                typeof event.lineups[0] === "object"
              ) {
                // If lineups are already objects, use them directly
                eventLineups = event.lineups;
              }
            }

            // If no lineups were found or they're not valid objects, try to find lineups associated with this event
            if (eventLineups.length === 0) {
              eventLineups = selectedBrand.lineups.filter((lineup) => {
                // Check if lineup.events exists and contains the event ID
                if (lineup.events && Array.isArray(lineup.events)) {
                  return lineup.events.some((eventId) => {
                    // Convert both to strings for comparison
                    const lineupEventId = eventId.toString();
                    const currentEventId = event._id.toString();
                    return lineupEventId === currentEventId;
                  });
                }
                return false;
              });
            }

            // Ensure all lineup objects have required properties
            const validLineups = eventLineups.map((lineup) => ({
              _id: lineup._id || lineup.id,
              name: lineup.name || "Unknown Artist",
              category: lineup.category || "Other",
              avatar: lineup.avatar || null,
              events: lineup.events || [],
              isActive: lineup.isActive !== undefined ? lineup.isActive : true,
            }));

            // Create a new event object with lineups data
            const eventWithLineups = {
              ...event,
              lineups: validLineups.length > 0 ? validLineups : null,
            };

            setEventData(eventWithLineups);
            preloadEventImage(eventWithLineups);
          } else {
            setEventData(event);
            preloadEventImage(event);
          }
        } else {
          setEventData(null);
        }
      } catch (err) {
        console.error("Error processing event data:", err);
        setError("Failed to process event data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // No brand, date, or event selected
      setIsLoading(false);
      setEventData(null);
    }
  }, [selectedBrand, selectedDate, selectedEvent]);

  // Helper function to preload event image
  const preloadEventImage = (event) => {
    if (!event) {
      setImageLoaded(false);
      return;
    }

    const imageUrl = getEventImage(event);
    if (imageUrl) {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageLoaded(false);
      };
    } else {
      setImageLoaded(false);
    }
  };

  // Get appropriate flyer image or fallback
  const getEventImage = (event) => {
    if (!event) return null;

    // Handle case where flyer is a direct string URL
    if (event.flyer && typeof event.flyer === "string") {
      return event.flyer;
    }

    if (!event.flyer) return null;

    // Check for portrait image first (best for mobile)
    if (event.flyer.portrait && event.flyer.portrait.full) {
      return event.flyer.portrait.full;
    }

    // Fallback to landscape
    if (event.flyer.landscape && event.flyer.landscape.full) {
      return event.flyer.landscape.full;
    }

    // Final fallback to square
    if (event.flyer.square && event.flyer.square.full) {
      return event.flyer.square.full;
    }

    // Last resort: check for thumbnail
    if (event.flyer.thumbnail) {
      return event.flyer.thumbnail;
    }

    return null;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { weekday: "long", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return "";
    return timeString;
  };

  // Handle retry
  const handleRetry = () => {
    setImageLoaded(false);
    setEventData(null);
    setError(null);
    // This will trigger the useEffect to process data again
  };

  // Navigate to event profile
  const handleViewEvent = () => {
    if (eventData && (eventData._id || eventData.id)) {
      // Create pretty URL for event
      const eventId = eventData._id || eventData.id;

      if (selectedBrand && eventData.date && eventData.title) {
        // Format date for URL (MMDDYY)
        const eventDate = new Date(eventData.date);
        const month = String(eventDate.getMonth() + 1).padStart(2, "0");
        const day = String(eventDate.getDate()).padStart(2, "0");
        const year = String(eventDate.getFullYear()).slice(2);
        const dateSlug = `${month}${day}${year}`;

        // Get brand username
        const brandUsername = selectedBrand.username || "";

        // Construct URL based on user authentication status with ultra-simplified format
        const eventPath = user
          ? `/@${user.username}/@${brandUsername}/${dateSlug}`
          : `/@${brandUsername}/${dateSlug}`;

        navigate(eventPath);
      } else {
        // Fallback to old format if we don't have all the needed data
        navigate(`/events/${eventId}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-feed loading">
        <LoadingSpinner size="large" color="primary" />
        <p>Loading event information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-feed error">
        <div className="error-content">
          <RiInformationLine size={48} />
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-button">
            <RiRefreshLine /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="dashboard-feed empty">
        <div className="empty-content">
          <RiCalendarEventLine size={48} />
          <h2>No Events Found</h2>
          <p>There are no events scheduled for the selected date and brand.</p>
          <p>Try selecting a different date or brand from the header above.</p>
        </div>
      </div>
    );
  }

  // Use UpcomingEvent component to display the selected event
  return (
    <div className="dashboard-feed">
      <div className="dashboard-feed-content">
        <UpcomingEvent
          key={`${selectedBrand?._id}-${eventData?._id}`}
          brandId={selectedBrand?._id}
          brandUsername={selectedBrand?.username}
          seamless={true}
          events={[eventData]} // Pass as an array with a single event
          initialEventIndex={0}
          hideNavigation={true} // Hide the navigation controls
        />
      </div>
    </div>
  );
};

export default DashboardFeed;
