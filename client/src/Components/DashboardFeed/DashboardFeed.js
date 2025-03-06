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
import axiosInstance from "../../utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const DashboardFeed = ({ selectedBrand, selectedDate, selectedEvent }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Log props for debugging
  useEffect(() => {
    console.group("🔍 FEED: Props");
    console.log(
      "Selected Brand:",
      selectedBrand
        ? {
            _id: selectedBrand._id,
            name: selectedBrand.name,
          }
        : "undefined"
    );
    console.log("Selected Date:", selectedDate);
    console.log(
      "Selected Event:",
      selectedEvent
        ? {
            _id: selectedEvent._id,
            name: selectedEvent.name,
            date: selectedEvent.date,
          }
        : "undefined"
    );
    console.groupEnd();
  }, [selectedBrand, selectedDate, selectedEvent]);

  // Effect to fetch event data when brand or date changes
  useEffect(() => {
    const fetchEventData = async () => {
      // If we already have a selected event, use it directly
      if (selectedEvent) {
        console.log(
          "🔍 FEED: Using provided selectedEvent:",
          selectedEvent._id
        );
        setEventData(selectedEvent);
        setIsLoading(false);
        return;
      }

      if (!selectedBrand || !selectedDate) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Format date for API
        const formattedDate = new Date(selectedDate)
          .toISOString()
          .split("T")[0];

        // This endpoint should return events for a specific brand on a specific date
        const response = await axiosInstance.get(
          `/events/brand/${selectedBrand._id}`
        );

        // Filter events for the selected date
        const eventsForDate = response.data.filter((event) => {
          // Compare dates by converting to YYYY-MM-DD strings
          const eventDate = new Date(event.date).toISOString().split("T")[0];
          return eventDate === formattedDate;
        });

        if (eventsForDate.length > 0) {
          // Use the first event for this date
          const event = eventsForDate[0];
          setEventData(event);

          // Preload event image
          preloadEventImage(event);
        } else {
          setEventData(null);
        }
      } catch (err) {
        setError("Failed to load event data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [selectedBrand, selectedDate, selectedEvent]);

  // Helper function to preload event image
  const preloadEventImage = (event) => {
    if (!event || !event.flyer) {
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
    if (!event || !event.flyer) return null;

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
    // This will trigger the useEffect to fetch data again
  };

  // Navigate to event profile
  const handleViewEvent = () => {
    if (eventData && eventData._id) {
      // Create pretty URL for event
      if (eventData.brand && eventData.date && eventData.title) {
        // Format date for URL (MMDDYY)
        const eventDate = new Date(eventData.date);
        const month = String(eventDate.getMonth() + 1).padStart(2, "0");
        const day = String(eventDate.getDate()).padStart(2, "0");
        const year = String(eventDate.getFullYear()).slice(2);
        const dateSlug = `${month}${day}${year}`;

        // No longer using title slugs in URL
        // Get brand username
        const brandUsername = eventData.brand.username || "";

        // Construct URL based on user authentication status with ultra-simplified format
        const eventPath = user
          ? `/@${user.username}/@${brandUsername}/${dateSlug}`
          : `/@${brandUsername}/${dateSlug}`;

        navigate(eventPath);
      } else {
        // Fallback to old format if we don't have all the needed data
        navigate(`/events/${eventData._id}`);
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

  return (
    <div className="dashboard-feed">
      {/* Event Hero Section */}
      <div className="event-hero">
        <div
          className="event-hero-image"
          style={
            imageLoaded && getEventImage(eventData)
              ? { backgroundImage: `url(${getEventImage(eventData)})` }
              : { background: "linear-gradient(145deg, #1a1a1a, #2a2a2a)" }
          }
        >
          <div className="event-hero-overlay">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {eventData.title}
            </motion.h1>
            {eventData.subTitle && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {eventData.subTitle}
              </motion.h2>
            )}
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="event-details-container">
        <div className="event-details">
          <div className="detail-item">
            <RiCalendarEventLine />
            <div>
              <h4>Date</h4>
              <p>{formatDate(eventData.date)}</p>
            </div>
          </div>

          <div className="detail-item">
            <RiTimeLine />
            <div>
              <h4>Time</h4>
              <p>
                {formatTime(eventData.startTime)} -{" "}
                {formatTime(eventData.endTime)}
              </p>
            </div>
          </div>

          <div className="detail-item">
            <RiMapPinLine />
            <div>
              <h4>Location</h4>
              <p>{eventData.location || "To be announced"}</p>
            </div>
          </div>

          {eventData.lineup && eventData.lineup.length > 0 && (
            <div className="detail-item">
              <RiMusic2Line />
              <div>
                <h4>Lineup</h4>
                <p>{eventData.lineup.join(", ")}</p>
              </div>
            </div>
          )}
        </div>

        {/* View Full Event Button */}
        <div className="event-actions">
          <button onClick={handleViewEvent} className="view-event-button">
            <RiLinkM /> View Full Event
          </button>
        </div>

        {/* Event Description */}
        {eventData.description && (
          <div className="event-description">
            <h3>Description</h3>
            <p>{eventData.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFeed;
