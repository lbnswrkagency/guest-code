import React from "react";
import "./EventDetails.scss";
import {
  RiCalendarEventLine,
  RiTimeLine,
  RiMapPinLine,
  RiMusic2Line,
  RiMapPin2Line,
} from "react-icons/ri";
import { getEventDate, formatDate, formatTime } from "../../utils/dateFormatters";

const EventDetails = ({ event }) => {
  if (!event) return null;

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

export default React.memo(EventDetails);
