import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import { getEventUrl } from "../../utils/urlUtils";
import "./EventOverview.scss";

const EventOverview = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicEvents();
  }, []);

  const fetchPublicEvents = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/events/public");
      setEvents(response.data.events || []);
    } catch (error) {
      console.error("Error fetching public events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (date) => {
    try {
      const eventDate = new Date(date);
      const options = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric'
      };
      return eventDate.toLocaleDateString('en-US', options);
    } catch (e) {
      return "TBD";
    }
  };

  const formatEventTime = (startTime, endTime) => {
    if (!startTime) return "";
    const timeStr = endTime ? `${startTime} - ${endTime}` : startTime;
    return timeStr;
  };

  const handleEventClick = (event) => {
    if (!event.brand?.username || !event.startDate) {
      console.error("Missing event data for navigation");
      return;
    }

    const url = getEventUrl(event);
    navigate(url);
  };

  const getUniqueCategories = () => {
    const categories = new Set(["all"]);
    events.forEach(event => {
      if (event.genres && Array.isArray(event.genres)) {
        event.genres.forEach(genre => {
          if (genre?.name) {
            categories.add(genre.name);
          }
        });
      }
    });
    return Array.from(categories);
  };

  const filteredEvents = selectedCategory === "all" 
    ? events 
    : events.filter(event => 
        event.genres?.some(genre => genre?.name === selectedCategory)
      );

  const categories = getUniqueCategories();

  if (loading) {
    return (
      <section className="event-overview loading">
        <div className="container">
          <div className="loading-animation">
            <div className="loading-circle"></div>
            <p>Loading events...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="event-overview">
      <div className="container">
        {categories.length > 1 && (
          <motion.div 
            className="category-filter"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === "all" ? "All Events" : category}
              </button>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {filteredEvents.length === 0 ? (
            <motion.div 
              className="no-events"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p>No upcoming events at the moment.</p>
            </motion.div>
          ) : (
            <motion.div 
              className="events-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event._id}
                  className="event-card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => handleEventClick(event)}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="event-image">
                    {event.flyer?.landscape?.thumbnail || event.flyer?.square?.thumbnail ? (
                      <img 
                        src={event.flyer.landscape?.thumbnail || event.flyer.square?.thumbnail}
                        alt={event.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="placeholder-image">
                        <span>{event.title.charAt(0)}</span>
                      </div>
                    )}
                    <div className="event-date-badge">
                      {formatEventDate(event.startDate || event.date)}
                    </div>
                  </div>

                  <div className="event-info">
                    <h3 className="event-title">{event.title}</h3>
                    {event.subTitle && (
                      <p className="event-subtitle">{event.subTitle}</p>
                    )}
                    
                    <div className="event-details">
                      <div className="event-time">
                        {formatEventTime(event.startTime, event.endTime)}
                      </div>
                      {event.location && (
                        <div className="event-location">
                          <span className="location-icon">📍</span>
                          {event.location}
                        </div>
                      )}
                    </div>

                    {event.genres && event.genres.length > 0 && (
                      <div className="event-genres">
                        {event.genres.slice(0, 3).map((genre) => (
                          <span key={genre._id} className="genre-tag">
                            {genre.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="event-brand">
                      {event.brand?.logo?.thumbnail && (
                        <img 
                          src={event.brand.logo.thumbnail} 
                          alt={event.brand.name}
                          className="brand-logo"
                        />
                      )}
                      <span className="brand-name">{event.brand?.name}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default EventOverview;