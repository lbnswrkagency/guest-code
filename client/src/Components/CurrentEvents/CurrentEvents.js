import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCalendarAlt, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import axiosInstance from "../../utils/axiosConfig";
import "./CurrentEvents.scss";

const CurrentEvents = ({ isOpen, onClose, selectedBrand, onSelectEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedBrand) {
      fetchEvents();
    }
  }, [isOpen, selectedBrand]);

  const fetchEvents = async () => {
    if (!selectedBrand) return;

    setLoading(true);
    try {
      const response = await axiosInstance.get(
        `/events/brand/${selectedBrand._id}`
      );

      if (response.data) {
        // Sort events by date (closest to today first)
        const sortedEvents = response.data.sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });

        setEvents(sortedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { weekday: "short", month: "short", day: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", options);
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const menuVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { delay: 0.1 } },
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
    }
    return null;
  };

  const handleSelectEvent = (event) => {
    onSelectEvent(event);
    onClose();
  };

  const isEventLive = (event) => {
    const now = new Date();
    const eventDate = new Date(event.date);

    // Check if today is the event date
    return (
      now.getDate() === eventDate.getDate() &&
      now.getMonth() === eventDate.getMonth() &&
      now.getFullYear() === eventDate.getFullYear()
    );
  };

  // Group events by date for better organization
  const groupEventsByDate = () => {
    const groupedEvents = {};

    events.forEach((event) => {
      const dateStr = new Date(event.date).toDateString();
      if (!groupedEvents[dateStr]) {
        groupedEvents[dateStr] = [];
      }
      groupedEvents[dateStr].push(event);
    });

    // Convert to array sorted by date
    return Object.entries(groupedEvents)
      .map(([dateStr, events]) => ({
        date: dateStr,
        events,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="current-events-backdrop mobile-flex-center"
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
            exit="hidden"
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
                      key={event._id}
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
                            <span>{formatDate(event.date)}</span>
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
