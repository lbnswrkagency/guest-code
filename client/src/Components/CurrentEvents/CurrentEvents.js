import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCalendarAlt, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import "./CurrentEvents.scss";

const CurrentEvents = ({ isOpen, onClose, selectedBrand, onSelectEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedBrand) {
      loadEvents();
    }
  }, [isOpen, selectedBrand]);

  const loadEvents = () => {
    if (!selectedBrand) return;

    // Brief loading state for UI feedback
    setLoading(true);

    try {
      // Get events from the selectedBrand directly
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

      if (brandEvents.length > 0) {
        // Sort events by date (closest to today first)
        const sortedEvents = [...brandEvents].sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });

        setEvents(sortedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error processing events:", error);
      setEvents([]);
    } finally {
      // End loading state
      setTimeout(() => {
        setLoading(false);
      }, 300); // Short timeout for UI smoothness
    }
  };

  // Format event date for display
  const formatDate = (dateString) => {
    if (!dateString) return "TBA";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("[CurrentEvents] Error formatting date:", error);
      return "TBA";
    }
  };

  // Get best date based on availability (startDate or date)
  const getEventDate = (event) => {
    return event.startDate || event.date;
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const menuVariants = {
    hidden: { opacity: 0, scale: 0.9, y: -20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 500,
      },
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  const getEventImage = (event) => {
    if (event.flyer && event.flyer.square && event.flyer.square.thumbnail) {
      return event.flyer.square.thumbnail;
    } else if (
      event.flyer &&
      event.flyer.portrait &&
      event.flyer.portrait.thumbnail
    ) {
      return event.flyer.portrait.thumbnail;
    } else if (
      event.flyer &&
      event.flyer.landscape &&
      event.flyer.landscape.thumbnail
    ) {
      return event.flyer.landscape.thumbnail;
    } else if (event.flyer && typeof event.flyer === "string") {
      // Handle case where flyer might be a direct URL string
      return event.flyer;
    }
    return null;
  };

  const handleSelectEvent = (event) => {
    onSelectEvent(event);
    onClose();
  };

  const isEventLive = (event) => {
    const now = new Date();
    const eventDate = new Date(event.startDate);

    // Check if today is the event date
    return (
      now.getDate() === eventDate.getDate() &&
      now.getMonth() === eventDate.getMonth() &&
      now.getFullYear() === eventDate.getFullYear()
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="current-events-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />
          <motion.div
            className="current-events-menu"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="current-events-header">
              <h3>Current Events</h3>
              <button className="close-button" onClick={onClose}>
                ×
              </button>
            </div>

            <div className="current-events-content">
              {loading ? (
                <div className="loading-state">Loading events...</div>
              ) : events.length > 0 ? (
                <div className="events-list">
                  {events.map((event) => (
                    <div
                      key={event._id || event.id}
                      className={`event-item ${
                        isEventLive(event) ? "live" : ""
                      }`}
                      onClick={() => handleSelectEvent(event)}
                    >
                      <div className="event-image">
                        {getEventImage(event) ? (
                          <img src={getEventImage(event)} alt={event.title} />
                        ) : (
                          <div className="placeholder-image">
                            {event.title ? event.title.charAt(0) : "E"}
                          </div>
                        )}
                        {isEventLive(event) && (
                          <div className="live-badge">Live</div>
                        )}
                      </div>
                      <div className="event-details">
                        <h4 className="event-title">{event.title}</h4>
                        <div className="event-info">
                          <div className="event-date">
                            <FaCalendarAlt />
                            <span>{formatDate(getEventDate(event))}</span>
                          </div>
                          {event.location && (
                            <div className="event-location">
                              <FaMapMarkerAlt />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.startTime && (
                            <div className="event-time">
                              <FaClock />
                              <span>
                                {event.startTime}
                                {event.endTime && ` - ${event.endTime}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-events">
                  <p>No events found for this brand.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CurrentEvents;
