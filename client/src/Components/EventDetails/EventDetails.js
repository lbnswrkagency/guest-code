import React from "react";
import { motion } from "framer-motion";
import "./EventDetails.scss";
import {
  RiCalendarEventLine,
  RiTimeLine,
  RiMapPinLine,
  RiTicketLine,
  RiVipCrownLine,
  RiMusic2Line,
  RiCalendarCheckLine,
  RiMapPin2Line,
  RiInformationLine,
  RiArrowRightSLine,
} from "react-icons/ri";

/**
 * EventDetails component for displaying event information in a clean, organized layout
 * @param {Object} props
 * @param {Object} props.event - The event object containing all event details
 * @param {Function} props.scrollToTickets - Function to scroll to tickets section
 * @param {Function} props.scrollToGuestCode - Function to scroll to guest code section
 */
const EventDetails = ({ event, scrollToTickets, scrollToGuestCode }) => {
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
      console.error(
        `[EventDetails] Error formatting time: ${timeString}`,
        error
      );
      return timeString || "TBA";
    }
  };

  // Get guest code condition if available
  const guestCodeSetting = event.codeSettings?.find(
    (cs) => cs.type === "guest"
  );
  const guestCodeCondition = guestCodeSetting?.condition;

  return (
    <div className="event-details-container">
      <div className="event-details-card">
        <div className="event-details-content">
          {/* Date and Time Section */}
          <div className="details-section">
            <div className="section-header">
              <RiCalendarEventLine />
              <h4>Date & Time</h4>
            </div>

            <div className="section-content time-grid">
              <div className="detail-item">
                <div className="detail-label">
                  <RiCalendarEventLine />
                  <span>Start Date</span>
                </div>
                <div className="detail-value">
                  {formatDate(getEventDate(event))}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <RiTimeLine />
                  <span>Start Time</span>
                </div>
                <div className="detail-value">
                  {formatTime(event.startTime)}
                </div>
              </div>

              {/* End Date (if different from start date) */}
              {(event.endDate || event.startDate) && (
                <div className="detail-item">
                  <div className="detail-label">
                    <RiCalendarEventLine />
                    <span>End Date</span>
                  </div>
                  <div className="detail-value">
                    {formatDate(event.endDate || getEventDate(event))}
                  </div>
                </div>
              )}

              {event.endTime && (
                <div className="detail-item">
                  <div className="detail-label">
                    <RiTimeLine />
                    <span>End Time</span>
                  </div>
                  <div className="detail-value">
                    {formatTime(event.endTime)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location Section */}
          <div className="details-section">
            <div className="section-header">
              <RiMapPinLine />
              <h4>Location</h4>
            </div>

            <div className="section-content">
              <div className="detail-item">
                <div className="detail-label">
                  <RiMapPinLine />
                  <span>Venue</span>
                </div>
                <div className="detail-value">{event.location || "TBA"}</div>
              </div>

              {(event.street || event.address) && (
                <div className="detail-item">
                  <div className="detail-label">
                    <RiMapPin2Line />
                    <span>Address</span>
                  </div>
                  <div className="detail-value">
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
            <div className="details-section">
              <div className="section-header">
                <RiMusic2Line />
                <h4>Music</h4>
              </div>

              <div className="section-content">
                <div className="detail-item">
                  <div className="detail-value music-value">
                    <RiMusic2Line />
                    {event.genres && event.genres.length > 0 ? (
                      <div className="genre-tags">
                        {event.genres.map((genre, index) => (
                          <span key={genre._id || index} className="genre-tag">
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

          {/* Tickets & Guest Code Section */}
          <div className="details-section availability-section">
            <div className="availability-items">
              {(event.ticketsAvailable || event.ticketSettings?.length > 0) && (
                <motion.div
                  className="availability-item tickets-available"
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  onClick={scrollToTickets}
                >
                  <div className="availability-icon">
                    <RiTicketLine />
                  </div>
                  <div className="availability-text">
                    <h5>Tickets</h5>
                  </div>
                  <div className="availability-action">
                    <RiArrowRightSLine />
                  </div>
                </motion.div>
              )}

              {guestCodeSetting && (
                <motion.div
                  className="availability-item guest-code-available"
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  onClick={scrollToGuestCode}
                >
                  <div className="availability-icon">
                    <RiVipCrownLine />
                  </div>
                  <div className="availability-text">
                    <h5>Guest Code</h5>
                    {guestCodeCondition && <p>{guestCodeCondition}</p>}
                  </div>
                  <div className="availability-action">
                    <RiArrowRightSLine />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
