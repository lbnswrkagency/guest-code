import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCalendarAlt, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import "./CurrentEvents.scss";

const CurrentEvents = ({ isOpen, onClose, selectedBrand, onSelectEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    if (isOpen && selectedBrand) {
      loadEvents();
    }
  }, [isOpen, selectedBrand]);

  // Handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        const now = new Date();

        // Process events to add calculated end dates
        const processedEvents = brandEvents.map((event) => {
          // Get start date (prioritize startDate over date)
          const startDate = event.startDate
            ? new Date(event.startDate)
            : event.date
            ? new Date(event.date)
            : new Date(); // Fallback to now if no date

          // Set start time if available
          if (event.startTime) {
            const [startHours, startMinutes] = event.startTime
              .split(":")
              .map(Number);
            startDate.setHours(startHours, startMinutes || 0, 0);
          }

          // Get end date (either endDate or calculated from startDate + endTime)
          let endDate;

          if (event.endDate) {
            // If event has explicit end date, use it
            endDate = new Date(event.endDate);

            // If there's an endTime, set it on the end date
            if (event.endTime) {
              const [hours, minutes] = event.endTime.split(":").map(Number);
              endDate.setHours(hours, minutes || 0, 0);
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

            endDate.setHours(hours, minutes || 0, 0);
          } else {
            // If no end date/time info, assume event ends same day at 23:59
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59);
          }

          // Define event status
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
        });

        // Sort events by status and then by date
        const sortedEvents = processedEvents.sort((a, b) => {
          // First, sort by status (active events first, then upcoming, then past)
          if (a.status !== b.status) {
            if (a.status === "active") return -1;
            if (b.status === "active") return 1;
            if (a.status === "upcoming") return -1;
            if (b.status === "upcoming") return 1;
          }

          // Then, for active events, sort by end date (soonest ending first)
          if (a.status === "active" && b.status === "active") {
            return a.calculatedEndDate - b.calculatedEndDate;
          }

          // For upcoming events, sort by start date (soonest first)
          if (a.status === "upcoming" && b.status === "upcoming") {
            return a.calculatedStartDate - b.calculatedStartDate;
          }

          // For past events, sort by end date (most recent first)
          if (a.status === "past" && b.status === "past") {
            return b.calculatedEndDate - a.calculatedEndDate;
          }

          // Default sort by start date
          return a.calculatedStartDate - b.calculatedStartDate;
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

    // Get start date (prioritize startDate over date)
    const startDate = event.startDate
      ? new Date(event.startDate)
      : event.date
      ? new Date(event.date)
      : null;

    if (!startDate) return false;

    // Get end date (either endDate or calculated from startDate + endTime)
    let endDate;

    if (event.endDate) {
      // If event has explicit end date, use it
      endDate = new Date(event.endDate);

      // If there's an endTime, set it on the end date
      if (event.endTime) {
        const [hours, minutes] = event.endTime.split(":").map(Number);
        endDate.setHours(hours, minutes || 0, 0);
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

      endDate.setHours(hours, minutes || 0, 0);
    } else {
      // If no end date/time info, assume event ends same day at 23:59
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59);
    }

    // Apply start time if available
    if (event.startTime && startDate) {
      const [startHours, startMinutes] = event.startTime.split(":").map(Number);
      startDate.setHours(startHours, startMinutes || 0, 0);
    }

    // Event is live if current time is between start and end
    return now >= startDate && now <= endDate;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="current-events-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="current-events-menu"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
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
                  {(isMobile ? events.slice(0, 4) : events).map((event) => (
                    <div
                      key={event._id || event.id}
                      className={`event-item ${
                        event.status === "active" ? "active" : event.status
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
                        {event.status === "active" && (
                          <div className="active-badge">Active</div>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CurrentEvents;
