import React, { useState, useEffect, useRef, useCallback } from "react";
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
  RiTableLine,
} from "react-icons/ri";

/**
 * EventDetails component for displaying event information in a clean, organized layout
 * @param {Object} props
 * @param {Object} props.event - The event object containing all event details
 * @param {Function} props.scrollToTickets - Function to scroll to tickets section
 * @param {Function} props.scrollToGuestCode - Function to scroll to guest code section
 * @param {Function} props.scrollToTableBooking - Function to scroll to table booking section
 * @param {Boolean} props.hasTickets - Whether the event has actual ticket settings available
 * @param {String} props.ticketPaymentMethod - The payment method for tickets (online/atEntrance)
 */
const EventDetails = ({
  event,
  scrollToTickets,
  scrollToGuestCode,
  scrollToTableBooking,
  hasTickets = false,
  ticketPaymentMethod = "online",
}) => {
  const [isSticky, setIsSticky] = useState(false);
  const actionsRef = useRef(null);
  const stickyPosRef = useRef(null);
  const spacerRef = useRef(null);
  const lastScrollY = useRef(0); // Track last scroll position to determine direction
  const scrollTimer = useRef(null); // For debouncing

  // Update the handleScroll function to work with phone simulator
  const handleScroll = useCallback(() => {
    if (!actionsRef.current || !stickyPosRef.current) return;

    // Find the scroll container - either the phone simulator content or the window
    const phoneSimulatorContent = document.querySelector(
      ".phone-simulator-content"
    );
    const scrollContainer = phoneSimulatorContent || window;

    // Get the current scroll position - for the phone simulator or window
    const currentScrollY = phoneSimulatorContent
      ? phoneSimulatorContent.scrollTop
      : window.scrollY || window.pageYOffset;

    const actionsElement = actionsRef.current;

    // Get the original position relative to scroll container
    let stickyPos;
    if (phoneSimulatorContent) {
      const rect = stickyPosRef.current.getBoundingClientRect();
      const simulatorRect = phoneSimulatorContent.getBoundingClientRect();
      stickyPos =
        rect.top - simulatorRect.top + phoneSimulatorContent.scrollTop;
    } else {
      stickyPos =
        stickyPosRef.current.getBoundingClientRect().top + window.scrollY;
    }

    // Get navigation height for offset
    const navHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--nav-height"
      ) || "56"
    );

    // Determine scroll direction
    const isScrollingDown = currentScrollY > lastScrollY.current;

    // Add a significant threshold to prevent flickering
    const threshold = isScrollingDown ? 15 : 25;

    // Calculate if we should show sticky buttons
    const shouldBeSticky = currentScrollY > stickyPos - navHeight - threshold;

    // Only update DOM if state actually changes
    if (shouldBeSticky && !isSticky) {
      setIsSticky(true);
      actionsElement.classList.add("sticky");

      // Add special class if we're in phone simulator
      if (phoneSimulatorContent) {
        actionsElement.classList.add("in-simulator");
      }

      // Add spacer height to prevent content jump
      if (spacerRef.current) {
        const height = actionsElement.offsetHeight;
        spacerRef.current.style.height = `${height}px`;
      }
    } else if (!shouldBeSticky && isSticky) {
      setIsSticky(false);
      actionsElement.classList.remove("sticky");
      actionsElement.classList.remove("in-simulator");

      // Reset spacer height
      if (spacerRef.current) {
        spacerRef.current.style.height = "0px";
      }
    }

    // Update last scroll position
    lastScrollY.current = currentScrollY;
  }, [isSticky]);

  // Update the scroll event listener with a more efficient approach
  useEffect(() => {
    // Use requestAnimationFrame for smoother performance
    let ticking = false;

    const handleScrollEvent = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Find the scroll container - either the phone simulator content or the window
    const phoneSimulatorContent = document.querySelector(
      ".phone-simulator-content"
    );
    const scrollContainer = phoneSimulatorContent || window;

    // Attach scroll listener to the appropriate container
    scrollContainer.addEventListener("scroll", handleScrollEvent, {
      passive: true,
    });

    // Initial check with slight delay to ensure all elements are properly sized
    setTimeout(handleScroll, 100);

    return () => {
      // Remove the event listener from the appropriate container
      scrollContainer.removeEventListener("scroll", handleScrollEvent);
      if (scrollTimer.current) {
        window.cancelAnimationFrame(scrollTimer.current);
      }
    };
  }, [handleScroll]);

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

  // Check if this is an event that supports table booking
  const isBolivarEvent =
    // Exclude specific event IDs that should never show table bookings
    event._id !== "68504c76f50c6d871f1a8013" &&
    event._id !== "685825953aa1769419195723" &&
    // Exclude specific brand ID that should not show table bookings
    event.brand !== "67d737d6e1299b18afabf4f4" &&
    (event.brand && event.brand._id !== "67d737d6e1299b18afabf4f4") &&
    (
      // Check event ID
      event._id === "6807c197d4455638731dbda6" ||
      // Check brand as object with _id (excluding the specific brand ID)
      (event.brand && event.brand._id === "67ba051873bd89352d3ab6db") ||
      // Fallback check for brand as string ID (excluding the specific brand ID)
      event.brand === "67ba051873bd89352d3ab6db"
    );

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

  // Get guest code condition if available
  const guestCodeSetting = event.codeSettings?.find(
    (cs) => cs.type === "guest"
  );
  const guestCodeCondition = guestCodeSetting?.condition;

  return (
    <div className="eventDetails-container">
      <div className="eventDetails-card">
        {/* Add spacer before the buttons for better content flow */}
        <div ref={spacerRef} className="action-buttons-spacer"></div>

        {/* Add position marker right at the trigger point */}
        <div ref={stickyPosRef} className="sticky-position-marker"></div>

        <div className="eventDetails-content">
          {/* Action Buttons Section */}
          <div ref={actionsRef} className="eventDetails-action-buttons">
            {/* Only show tickets button if tickets are available AND there are actual ticket settings */}
            {event.ticketsAvailable !== false && hasTickets && (
              <motion.button
                className="eventDetails-action-button tickets-button"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToTickets(e);
                }}
              >
                <div className="button-content">
                  <div className="button-icon">
                    <RiTicketLine />
                  </div>
                  <div className="button-text">
                    <h5>Tickets</h5>
                    <p>
                      {ticketPaymentMethod === "atEntrance"
                        ? "Pay at entrance"
                        : "Buy tickets online"}
                    </p>
                  </div>
                  <div className="button-arrow">
                    <RiArrowRightSLine />
                  </div>
                </div>
              </motion.button>
            )}

            {guestCodeSetting && (
              <motion.button
                className="eventDetails-action-button guestcode-button"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToGuestCode(e);
                }}
              >
                <div className="button-content">
                  <div className="button-icon">
                    <RiVipCrownLine />
                  </div>
                  <div className="button-text">
                    <h5>Guest Code</h5>
                    <p>{guestCodeCondition || "Free entry with code"}</p>
                  </div>
                  <div className="button-arrow">
                    <RiArrowRightSLine />
                  </div>
                </div>
              </motion.button>
            )}

            {/* Add Table Booking button for supported events */}
            {isBolivarEvent && scrollToTableBooking && (
              <motion.button
                className="eventDetails-action-button table-button"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToTableBooking(e);
                }}
              >
                <div className="button-content">
                  <div className="button-icon">
                    <RiTableLine />
                  </div>
                  <div className="button-text">
                    <h5>Book Table</h5>
                    <p>Reserve your table now</p>
                  </div>
                  <div className="button-arrow">
                    <RiArrowRightSLine />
                  </div>
                </div>
              </motion.button>
            )}
          </div>

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
