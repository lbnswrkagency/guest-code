import React, { useState, useEffect, useContext } from "react";
import "./Events.scss";
import { motion } from "framer-motion";
import {
  RiAddCircleLine,
  RiEditLine,
  RiSettings4Line,
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiTeamLine,
  RiGroupLine,
} from "react-icons/ri";
import EventForm from "../EventForm/EventForm";
import EventSettings from "../EventSettings/EventSettings";
import Navigation from "../Navigation/Navigation";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import AuthContext from "../../contexts/AuthContext";
import ProgressiveImage from "../ProgressiveImage/ProgressiveImage";

const Events = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEventForSettings, setSelectedEventForSettings] =
    useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const loadingToast = toast.showLoading("Loading events...");
    try {
      const response = await axiosInstance.get("/events");
      setEvents(response.data.events || []);
    } catch (error) {
      toast.showError("Failed to load events");
      setEvents([]);
    } finally {
      setLoading(false);
      loadingToast.dismiss();
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedEvent(null);
  };

  const handleSave = async (eventData) => {
    try {
      setEvents((prev) => {
        const updatedEvents = selectedEvent
          ? prev.map((e) => (e._id === selectedEvent._id ? eventData : e))
          : [...prev, eventData];
        return updatedEvents;
      });
      handleClose();
    } catch (error) {
      toast.showError(error.response?.data?.message || "Failed to save event");
    }
  };

  const handleDelete = async (eventId) => {
    try {
      const loadingToast = toast.showLoading("Deleting event...");
      await axiosInstance.delete(`/events/${eventId}`);
      toast.showSuccess("Event deleted successfully!");
      fetchEvents();
    } catch (error) {
      toast.showError("Failed to delete event");
    }
  };

  const handleBack = () => {
    navigate(`/@${user.username}`);
  };

  const handleSettingsClick = (event) => {
    setSelectedEventForSettings(event);
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    setSelectedEventForSettings(null);
  };

  return (
    <div className="page-wrapper">
      <Navigation
        onBack={handleBack}
        onMenuClick={() => setIsNavigationOpen(true)}
      />

      <DashboardNavigation
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        currentUser={user}
      />

      <div className="events">
        <div className="events-header">
          <h1>Your Events</h1>
          <p>Create and manage your events</p>
        </div>

        <div className="events-grid">
          {loading ? (
            <div className="loading-state">Loading events...</div>
          ) : events.length > 0 ? (
            <>
              {events.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  onClick={handleEventClick}
                  onSettingsClick={handleSettingsClick}
                />
              ))}
              <div
                className="event-card add-card"
                onClick={() => setShowForm(true)}
              >
                <RiAddCircleLine className="add-icon" />
                <p>Create New Event</p>
              </div>
            </>
          ) : (
            <div
              className="event-card add-card"
              onClick={() => setShowForm(true)}
            >
              <RiAddCircleLine className="add-icon" />
              <p>No events found. Create your first event!</p>
            </div>
          )}
        </div>

        {showForm && (
          <EventForm
            event={selectedEvent}
            onClose={handleClose}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
};

const EventCard = ({ event, onClick, onSettingsClick }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBackContent, setShowBackContent] = useState(false);

  const getImageUrl = (imageObj) => {
    if (!imageObj) return null;
    if (typeof imageObj === "string") return imageObj;
    return imageObj.medium || imageObj.full || imageObj.thumbnail;
  };

  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => setShowBackContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowBackContent(false);
    }
  }, [isFlipped]);

  const handleEditClick = (e) => {
    e.stopPropagation();
    onClick(event);
  };

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    setIsFlipped(true);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <motion.div
      className={`event-card ${isFlipped ? "flipped" : ""}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
    >
      {/* Front side */}
      <div
        className="card-front"
        style={{
          backfaceVisibility: "hidden",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          zIndex: isFlipped ? 0 : 1,
          position: "absolute",
          inset: 0,
          transformOrigin: "center",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="event-card-header">
          <div className="event-cover-image">
            {event.flyer?.landscape && (
              <ProgressiveImage
                thumbnailSrc={getImageUrl(event.flyer.landscape)}
                mediumSrc={getImageUrl(event.flyer.landscape)}
                fullSrc={getImageUrl(event.flyer.landscape)}
                alt={`${event.title} cover`}
                className="cover-image"
              />
            )}
          </div>
          <div className="card-actions">
            <motion.button
              className="action-button edit"
              onClick={handleEditClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RiEditLine />
            </motion.button>
            <motion.button
              className="action-button settings"
              onClick={handleSettingsClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RiSettings4Line />
            </motion.button>
          </div>
        </div>

        <div className="event-card-content">
          <div className="event-info">
            <h3>{event.title}</h3>
            {event.subTitle && (
              <span className="subtitle">{event.subTitle}</span>
            )}
          </div>

          <div className="event-details">
            <div className="detail-item">
              <RiCalendarEventLine />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="detail-item">
              <RiTimeLine />
              <span>
                {event.startTime} - {event.endTime}
              </span>
            </div>
            <div className="detail-item">
              <RiMapPinLine />
              <span>{event.location}</span>
            </div>
            <div className="detail-item">
              <RiTeamLine />
              <span>{event.team?.length || 0} Team Members</span>
            </div>
          </div>

          <div className="event-features">
            {event.guestCode && <span className="feature">Guest Code</span>}
            {event.friendsCode && <span className="feature">Friends Code</span>}
            {event.ticketCode && <span className="feature">Ticket Code</span>}
            {event.tableCode && <span className="feature">Table Code</span>}
          </div>
        </div>
      </div>

      {/* Back side */}
      <div
        className="card-back"
        style={{
          backfaceVisibility: "hidden",
          transform: `rotateY(${isFlipped ? 0 : -180}deg) scaleX(-1)`,
          zIndex: isFlipped ? 1 : 0,
          position: "absolute",
          inset: 0,
          transformOrigin: "center",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {showBackContent && (
          <EventSettings event={event} onClose={() => setIsFlipped(false)} />
        )}
      </div>
    </motion.div>
  );
};

export default Events;
