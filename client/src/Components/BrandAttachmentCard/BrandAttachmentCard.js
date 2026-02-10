import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RiCloseLine,
  RiGlobalLine,
  RiMapPinLine,
  RiBuildingLine,
  RiCalendarEventLine,
  RiRepeatLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import "./BrandAttachmentCard.scss";

const BrandAttachmentCard = ({ attachment, onUpdate, onRemove }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!attachment.isGlobalForBrand);

  // Fetch events when switching to specific mode
  useEffect(() => {
    if (!attachment.isGlobalForBrand && events.length === 0) {
      fetchEvents();
    }
  }, [attachment.isGlobalForBrand]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/events/brand/${attachment.brandId}`
      );
      // Filter to only parent events (not child events)
      const parentEvents = (response.data || []).filter(
        (e) => !e.parentEventId
      );
      setEvents(parentEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle mode change (global vs specific)
  const handleModeChange = (isGlobal) => {
    if (isGlobal) {
      // Switching to global - clear specific events
      onUpdate({ isGlobalForBrand: true, enabledEvents: [] });
    } else {
      // Switching to specific - fetch events if not loaded
      onUpdate({ isGlobalForBrand: false });
      if (events.length === 0) {
        fetchEvents();
      }
    }
  };

  // Handle event toggle
  const handleEventToggle = (eventId) => {
    const currentEnabled = attachment.enabledEvents || [];
    const isCurrentlyEnabled = currentEnabled.some((e) => e.eventId === eventId);

    let newEnabled;
    if (isCurrentlyEnabled) {
      // Remove this event
      newEnabled = currentEnabled.filter((e) => e.eventId !== eventId);
    } else {
      // Add this event
      newEnabled = [...currentEnabled, { eventId, applyToChildren: true }];
    }

    onUpdate({ enabledEvents: newEnabled });
  };

  // Handle "apply to children" toggle for weekly events
  const handleApplyToChildrenToggle = (eventId) => {
    const currentEnabled = attachment.enabledEvents || [];
    const newEnabled = currentEnabled.map((e) =>
      e.eventId === eventId ? { ...e, applyToChildren: !e.applyToChildren } : e
    );
    onUpdate({ enabledEvents: newEnabled });
  };

  // Check if an event is enabled
  const isEventEnabled = (eventId) => {
    return (attachment.enabledEvents || []).some((e) => e.eventId === eventId);
  };

  // Check if apply to children is enabled for an event
  const isApplyToChildren = (eventId) => {
    const enabled = (attachment.enabledEvents || []).find(
      (e) => e.eventId === eventId
    );
    return enabled?.applyToChildren !== false;
  };

  // Get logo URL
  const logoUrl =
    attachment.brandLogo?.thumbnail ||
    attachment.brandLogo?.medium ||
    attachment.brandLogo?.full;

  return (
    <motion.div
      className="brand-attachment-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="card-header">
        <div className="brand-info">
          {logoUrl ? (
            <img src={logoUrl} alt={attachment.brandName} className="brand-logo" />
          ) : (
            <div className="brand-logo-placeholder">
              <RiBuildingLine />
            </div>
          )}
          <div className="brand-details">
            <span className="brand-name">{attachment.brandName}</span>
            <span className="brand-username">@{attachment.brandUsername}</span>
          </div>
        </div>
        <button className="remove-btn" onClick={onRemove}>
          <RiCloseLine />
        </button>
      </div>

      <div className="attachment-mode">
        <button
          className={`mode-option ${attachment.isGlobalForBrand ? "selected" : ""}`}
          onClick={() => handleModeChange(true)}
        >
          <RiGlobalLine />
          <div className="mode-text">
            <span className="mode-label">All events</span>
            <span className="mode-description">Global for this brand</span>
          </div>
        </button>

        <button
          className={`mode-option ${!attachment.isGlobalForBrand ? "selected" : ""}`}
          onClick={() => handleModeChange(false)}
        >
          <RiMapPinLine />
          <div className="mode-text">
            <span className="mode-label">Specific events</span>
            <span className="mode-description">Select which events</span>
          </div>
        </button>
      </div>

      {/* Event list for specific mode */}
      {!attachment.isGlobalForBrand && (
        <div className="events-section">
          {loading ? (
            <div className="events-loading">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="no-events">
              <RiCalendarEventLine />
              <span>No events found for this brand</span>
            </div>
          ) : (
            <div className="events-list">
              {events.map((event) => (
                <div key={event._id} className="event-item">
                  <label className="event-toggle">
                    <input
                      type="checkbox"
                      checked={isEventEnabled(event._id)}
                      onChange={() => handleEventToggle(event._id)}
                    />
                    <div className="event-info">
                      <span className="event-title">{event.title}</span>
                      {event.isWeekly && (
                        <span className="weekly-badge">
                          <RiRepeatLine /> Weekly
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Show "apply to all weeks" checkbox for weekly events */}
                  {event.isWeekly && isEventEnabled(event._id) && (
                    <label className="apply-to-children">
                      <input
                        type="checkbox"
                        checked={isApplyToChildren(event._id)}
                        onChange={() => handleApplyToChildrenToggle(event._id)}
                      />
                      <span>Apply to all weeks</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default BrandAttachmentCard;
