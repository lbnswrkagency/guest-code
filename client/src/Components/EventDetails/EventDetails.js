import React from "react";
import "./EventDetails.scss";
import {
  RiCalendarEventLine,
  RiTimeLine,
  RiMapPinLine,
  RiMusic2Line,
  RiMapPin2Line,
} from "react-icons/ri";

/**
 * EventDetails component for displaying event information in a clean, organized layout
 * @param {Object} props
 * @param {Object} props.event - The event object containing all event details
 */
const EventDetails = ({ event }) => {

  if (!event) return null;

  // Helper function to get most appropriate date
  const getEventDate = (event) => {
    return event.startDate || event.date;
  };

  // Format date in a readable way
  const formatDate = (dateString) => {
    if (!dateString) return "Date TBD";
    const date = new Date(dateString);
    const options = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return "TBA";

    try {
      // Check if timeString is a valid time format (HH:MM)
      if (/^\d{1,2}:\d{2}$/.test(timeString)) {
        return timeString;
      }

      // If it's a date object with time, extract just the time
      if (
        timeString instanceof Date ||
        (typeof timeString === "string" && timeString.includes("T"))
      ) {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }
      }

      // Return the original if it doesn't match known formats
      return timeString;
    } catch (error) {
      return timeString || "TBA";
    }
  };

  return (
    <div className="eventDetails-container">
      <div className="eventDetails-card">
        <div className="eventDetails-content">

          {/* Date and Time Section */}
          <div className="eventDetails-section">
            <div className="eventDetails-section-header">
              <RiCalendarEventLine />
              <h4>Date & Time</h4>
            </div>

            <div className="eventDetails-section-content eventDetails-time-grid">
              <div className="eventDetails-detail-item">
                <div className="eventDetails-detail-label">
                  <RiCalendarEventLine />
                  <span>Start Date</span>
                </div>
                <div className="eventDetails-detail-value">
                  {formatDate(getEventDate(event))}
                </div>
              </div>

              <div className="eventDetails-detail-item">
                <div className="eventDetails-detail-label">
                  <RiTimeLine />
                  <span>Start Time</span>
                </div>
                <div className="eventDetails-detail-value">
                  {formatTime(event.startTime)}
                </div>
              </div>

              {/* End Date (if different from start date) */}
              {(event.endDate || event.startDate) && (
                <div className="eventDetails-detail-item">
                  <div className="eventDetails-detail-label">
                    <RiCalendarEventLine />
                    <span>End Date</span>
                  </div>
                  <div className="eventDetails-detail-value">
                    {formatDate(event.endDate || getEventDate(event))}
                  </div>
                </div>
              )}

              {event.endTime && (
                <div className="eventDetails-detail-item">
                  <div className="eventDetails-detail-label">
                    <RiTimeLine />
                    <span>End Time</span>
                  </div>
                  <div className="eventDetails-detail-value">
                    {formatTime(event.endTime)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location Section */}
          <div className="eventDetails-section">
            <div className="eventDetails-section-header">
              <RiMapPinLine />
              <h4>Location</h4>
            </div>

            <div className="eventDetails-section-content">
              <div className="eventDetails-detail-item">
                <div className="eventDetails-detail-label">
                  <RiMapPinLine />
                  <span>Venue</span>
                </div>
                <div className="eventDetails-detail-value">
                  {event.location || "TBA"}
                </div>
              </div>

              {(event.street || event.address) && (
                <div className="eventDetails-detail-item">
                  <div className="eventDetails-detail-label">
                    <RiMapPin2Line />
                    <span>Address</span>
                  </div>
                  <div className="eventDetails-detail-value">
                    {event.street || event.address}
                    {event.postalCode && `, ${event.postalCode}`}
                    {!event.postalCode && event.zipCode && `, ${event.zipCode}`}
                    {event.city && ` ${event.city}`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Music/Genres Section */}
          {(event.genres?.length > 0 || event.music) && (
            <div className="eventDetails-section">
              <div className="eventDetails-section-header">
                <RiMusic2Line />
                <h4>Music</h4>
              </div>

              <div className="eventDetails-section-content">
                <div className="eventDetails-detail-item">
                  <div className="eventDetails-detail-value eventDetails-music-value">
                    {event.genres && event.genres.length > 0 ? (
                      <div className="eventDetails-genre-tags">
                        {event.genres.map((genre, index) => (
                          <span
                            key={genre._id || index}
                            className="eventDetails-genre-tag"
                          >
                            {typeof genre === "object" ? genre.name : genre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>{event.music}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
