import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
  FaTimes,
  FaCalendarDay,
  FaEye,
  FaBolt,
} from "react-icons/fa";
import { RiCalendarEventLine } from "react-icons/ri";
import "./CurrentEvents.scss";

const CurrentEvents = ({ isOpen, onClose, selectedBrand, onSelectEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'upcoming', 'past'
  const [filteredEvents, setFilteredEvents] = useState([]);

  useEffect(() => {
    if (isOpen && selectedBrand) {
      loadEvents();
    }
  }, [isOpen, selectedBrand]);

  // Filter events when filter changes
  useEffect(() => {
    if (filter === "all") {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter((event) => event.status === filter));
    }
  }, [events, filter]);

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

  // Format time range
  const formatTimeRange = (event) => {
    if (!event.startTime) return null;
    return event.endTime
      ? `${event.startTime} - ${event.endTime}`
      : event.startTime;
  };

  // Get best date based on availability (startDate or date)
  const getEventDate = (event) => {
    return event.startDate || event.date;
  };

  // Get event counts by status
  const getEventCounts = () => {
    const counts = {
      all: events.length,
      active: events.filter((e) => e.status === "active").length,
      upcoming: events.filter((e) => e.status === "upcoming").length,
      past: events.filter((e) => e.status === "past").length,
    };
    return counts;
  };

  // No animation variants needed - using CSS animations

  const getEventImage = (event) => {
    if (event.flyer && event.flyer.square && event.flyer.square.medium) {
      return event.flyer.square.medium;
    } else if (
      event.flyer &&
      event.flyer.portrait &&
      event.flyer.portrait.medium
    ) {
      return event.flyer.portrait.medium;
    } else if (
      event.flyer &&
      event.flyer.landscape &&
      event.flyer.landscape.medium
    ) {
      return event.flyer.landscape.medium;
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

  const counts = getEventCounts();

  if (!isOpen) return null;

  return (
    <div className="current-events-backdrop" onClick={onClose}>
      <div
        className="current-events-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="current-events-header">
          <h2>
            <span className="brand-name">
              {selectedBrand?.name + " " || "Brand "}
            </span>
            Events
          </h2>
          <div className="current-events-header-actions">
            <button className="current-events-header-close" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="current-events-filters">
          <button
            className={`current-events-filters-chip ${
              filter === "all" ? "active" : ""
            }`}
            onClick={() => setFilter("all")}
          >
            All
            <span className="current-events-filters-chip-count">
              ({counts.all})
            </span>
          </button>
          <button
            className={`current-events-filters-chip ${
              filter === "active" ? "active" : ""
            }`}
            onClick={() => setFilter("active")}
          >
            Active
            <span className="current-events-filters-chip-count">
              ({counts.active})
            </span>
          </button>
          <button
            className={`current-events-filters-chip ${
              filter === "upcoming" ? "active" : ""
            }`}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
            <span className="current-events-filters-chip-count">
              ({counts.upcoming})
            </span>
          </button>
          <button
            className={`current-events-filters-chip ${
              filter === "past" ? "active" : ""
            }`}
            onClick={() => setFilter("past")}
          >
            Past
            <span className="current-events-filters-chip-count">
              ({counts.past})
            </span>
          </button>
        </div>

        <div className="current-events-content">
          {loading ? (
            <div className="current-events-loading">
              <div className="current-events-loading-spinner" />
              <span>Loading events...</span>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="current-events-grid">
              {filteredEvents.map((event) => (
                <div
                  key={event._id || event.id}
                  className={`event-card status-${event.status}`}
                  onClick={() => handleSelectEvent(event)}
                >
                  <div className="event-card-image">
                    {getEventImage(event) ? (
                      <img src={getEventImage(event)} alt={event.title} />
                    ) : (
                      <div className="event-card-image-placeholder">
                        <span>{event.title?.charAt(0) || "E"}</span>
                      </div>
                    )}
                    {event.status === "active" && (
                      <div className="event-card-image-badge active">
                        <FaBolt /> Active
                      </div>
                    )}
                    {event.status === "upcoming" && (
                      <div className="event-card-image-badge upcoming">
                        Upcoming
                      </div>
                    )}
                    {formatTimeRange(event) && (
                      <div className="event-card-image-time">
                        <FaClock />
                        {formatTimeRange(event)}
                      </div>
                    )}
                  </div>
                  <div className="event-card-content">
                    <h3 className="event-card-title">{event.title}</h3>
                    {event.subTitle && (
                      <p className="event-card-subtitle">{event.subTitle}</p>
                    )}
                    <div className="event-card-meta">
                      {event.location && (
                        <div className="event-card-meta-item">
                          <FaMapMarkerAlt />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="event-card-footer">
                    <div className="event-card-footer-date">
                      <RiCalendarEventLine />
                      {formatDate(getEventDate(event))}
                    </div>
                    <button className="event-card-footer-action">Select</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="current-events-empty">
              <div className="current-events-empty-icon">
                <RiCalendarEventLine />
              </div>
              <p>
                {filter === "all"
                  ? "No events found for this brand."
                  : `No ${filter} events found.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentEvents;
