import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./EventProfile.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiTicketLine,
  RiUserLine,
  RiLinkM,
  RiShareLine,
  RiInformationLine,
  RiCodeSSlashLine,
  RiVipCrownLine,
  RiDoorLine,
  RiTableLine,
} from "react-icons/ri";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";

const EventProfile = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [lineups, setLineups] = useState([]);
  const [ticketSettings, setTicketSettings] = useState([]);
  const [codeSettings, setCodeSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guestCode, setGuestCode] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [activeSection, setActiveSection] = useState("info");

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        console.log(`[EventProfile] Fetching data for event ID: ${eventId}`);

        // Fetch all event data in a single request
        const response = await axiosInstance.get(`/events/profile/${eventId}`);
        console.log("[EventProfile] Received event data:", response.data);

        if (response.data.success) {
          // Set all data from the single response
          setEvent(response.data.event);
          setLineups(response.data.lineups || []);
          setTicketSettings(response.data.ticketSettings || []);
          setCodeSettings(response.data.codeSettings || []);
        } else {
          throw new Error(response.data.message || "Failed to load event data");
        }
      } catch (err) {
        console.error("[EventProfile] Error fetching event data:", err);
        setError("Failed to load event information");
        toast.showError("Failed to load event information");
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventData();
    }
  }, [eventId, toast]);

  // Format date
  const formatDate = (dateString) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get appropriate flyer image or fallback
  const getEventImage = () => {
    if (!event || !event.flyer) return null;

    // Check for portrait image first (best for mobile)
    if (event.flyer.portrait && event.flyer.portrait.full) {
      return event.flyer.portrait.full;
    }

    // Fallback to landscape
    if (event.flyer.landscape && event.flyer.landscape.full) {
      return event.flyer.landscape.full;
    }

    // Final fallback to square
    if (event.flyer.square && event.flyer.square.full) {
      return event.flyer.square.full;
    }

    return null;
  };

  // Generate guest code
  const handleGenerateGuestCode = async () => {
    try {
      console.log("[EventProfile] Generating guest code for event:", event._id);

      const response = await axiosInstance.post("/events/generateGuestCode", {
        eventId: event._id,
      });

      console.log("[EventProfile] Guest code generated:", response.data);

      if (response.data && response.data.code) {
        setGuestCode(response.data.code);
        setShowCodeDialog(true);
      }
    } catch (err) {
      console.error("[EventProfile] Error generating guest code:", err);
      toast.showError("Failed to generate guest code");
    }
  };

  // Share event
  const handleShareEvent = () => {
    if (navigator.share) {
      navigator
        .share({
          title: event.title,
          text: `Check out this event: ${event.title}`,
          url: window.location.href,
        })
        .then(() => console.log("Shared successfully"))
        .catch((error) => console.log("Error sharing:", error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.showSuccess("Event link copied to clipboard");
    }
  };

  // Handle ticket purchase
  const handleBuyTicket = (ticket) => {
    console.log("[EventProfile] Buy ticket clicked:", ticket);

    // Check if ticket is available
    if (ticket.isLimited && ticket.soldCount >= ticket.maxTickets) {
      toast.showError("Sorry, this ticket is sold out");
      return;
    }

    if (
      ticket.hasCountdown &&
      ticket.endDate &&
      new Date() > new Date(ticket.endDate)
    ) {
      toast.showError("Sorry, this ticket sale has ended");
      return;
    }

    // If user is not logged in, redirect to login
    if (!user) {
      toast.showInfo("Please log in to purchase tickets");
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }

    // Here you would typically redirect to a checkout page or open a modal
    // For now, we'll just show a toast message
    toast.showSuccess(
      `Ticket purchase flow for ${ticket.name} would start here`
    );
  };

  if (loading) {
    return (
      <div className="event-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading event information...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-profile-error">
        <RiInformationLine size={48} />
        <h2>Oops! Something went wrong</h2>
        <p>{error || "Failed to load event information"}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="event-profile">
      {/* Hero Section with Event Flyer */}
      <div className="event-hero">
        {getEventImage() ? (
          <div
            className="event-hero-image"
            style={{ backgroundImage: `url(${getEventImage()})` }}
          >
            <div className="event-hero-overlay">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {event.title}
              </motion.h1>
              {event.subTitle && (
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {event.subTitle}
                </motion.h2>
              )}

              {event.brand && (
                <motion.div
                  className="event-brand"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Presented by {event.brand.name}
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          <div className="event-hero-placeholder">
            <div className="event-hero-overlay">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {event.title}
              </motion.h1>
              {event.subTitle && (
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {event.subTitle}
                </motion.h2>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="event-nav">
        <button
          className={activeSection === "info" ? "active" : ""}
          onClick={() => setActiveSection("info")}
        >
          Info
        </button>
        <button
          className={activeSection === "lineup" ? "active" : ""}
          onClick={() => setActiveSection("lineup")}
        >
          Lineup
        </button>
        <button
          className={activeSection === "tickets" ? "active" : ""}
          onClick={() => setActiveSection("tickets")}
        >
          Tickets
        </button>
        <button
          className={activeSection === "access" ? "active" : ""}
          onClick={() => setActiveSection("access")}
        >
          Access
        </button>
      </div>

      {/* Main Content Area */}
      <div className="event-content">
        {/* Info Section */}
        {activeSection === "info" && (
          <div className="event-section event-info">
            <div className="event-details">
              <div className="detail-item">
                <RiCalendarEventLine />
                <div>
                  <h4>Date</h4>
                  <p>{formatDate(event.date)}</p>
                </div>
              </div>

              <div className="detail-item">
                <RiTimeLine />
                <div>
                  <h4>Time</h4>
                  <p>
                    {event.startTime} - {event.endTime}
                  </p>
                </div>
              </div>

              <div className="detail-item">
                <RiMapPinLine />
                <div>
                  <h4>Location</h4>
                  <p>{event.location}</p>
                </div>
              </div>

              {event.isWeekly && (
                <div className="detail-item weekly-badge">
                  <span>Weekly Event</span>
                </div>
              )}
            </div>

            {event.description && (
              <div className="event-description">
                <h3>About This Event</h3>
                <p>{event.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Lineup Section */}
        {activeSection === "lineup" && (
          <div className="event-section event-lineup">
            <h3>Event Lineup</h3>

            {lineups && lineups.length > 0 ? (
              <div className="lineup-grid">
                {lineups.map((artist, index) => (
                  <motion.div
                    key={artist._id || index}
                    className="lineup-artist"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="artist-image">
                      {artist.avatar && artist.avatar.medium ? (
                        <img src={artist.avatar.medium} alt={artist.name} />
                      ) : (
                        <div className="artist-placeholder">
                          {artist.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <h4>{artist.name}</h4>
                    {artist.category && (
                      <p className="artist-category">{artist.category}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="no-lineup">
                <p>No lineup information available for this event.</p>
              </div>
            )}
          </div>
        )}

        {/* Tickets Section */}
        {activeSection === "tickets" && (
          <div className="event-section event-tickets">
            <h3>Tickets</h3>

            {ticketSettings && ticketSettings.length > 0 ? (
              <div className="tickets-container">
                {ticketSettings.map((ticket, index) => (
                  <motion.div
                    key={ticket._id}
                    className="ticket-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      borderColor: ticket.color || "#2196F3",
                      borderLeft: `4px solid ${ticket.color || "#2196F3"}`,
                    }}
                  >
                    <div className="ticket-header">
                      <h4>{ticket.name}</h4>
                      {ticket.originalPrice &&
                        ticket.originalPrice > ticket.price && (
                          <span className="ticket-discount">
                            {Math.round(
                              ((ticket.originalPrice - ticket.price) /
                                ticket.originalPrice) *
                                100
                            )}
                            % OFF
                          </span>
                        )}
                    </div>

                    <div className="ticket-price">
                      <span className="current-price">
                        ${ticket.price.toFixed(2)}
                      </span>
                      {ticket.originalPrice &&
                        ticket.originalPrice > ticket.price && (
                          <span className="original-price">
                            ${ticket.originalPrice.toFixed(2)}
                          </span>
                        )}
                    </div>

                    {ticket.description && (
                      <p className="ticket-description">{ticket.description}</p>
                    )}

                    {ticket.isLimited && (
                      <div className="ticket-availability">
                        <div className="availability-bar">
                          <div
                            className="availability-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (ticket.soldCount / ticket.maxTickets) * 100
                                )
                              )}%`,
                              backgroundColor: ticket.color || "#2196F3",
                            }}
                          ></div>
                        </div>
                        <span className="availability-text">
                          {Math.max(0, ticket.maxTickets - ticket.soldCount)}{" "}
                          tickets left
                        </span>
                      </div>
                    )}

                    {ticket.hasCountdown && ticket.endDate && (
                      <div className="ticket-countdown">
                        <RiTimeLine />
                        <span>
                          Sale ends:{" "}
                          {new Date(ticket.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <button
                      className="buy-ticket-button"
                      style={{ backgroundColor: ticket.color || "#2196F3" }}
                      onClick={() => handleBuyTicket(ticket)}
                    >
                      Buy Ticket
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="no-tickets">
                <p>No tickets available for this event.</p>
              </div>
            )}
          </div>
        )}

        {/* Access Codes Section */}
        {activeSection === "access" && (
          <div className="event-section event-access">
            <h3>Access Codes</h3>

            <div className="access-options">
              {/* Guest Code */}
              {codeSettings &&
                codeSettings.some(
                  (code) => code.type === "guest" && code.isEnabled
                ) && (
                  <div className="access-option">
                    <div className="access-icon">
                      <RiUserLine />
                    </div>
                    <div className="access-info">
                      <h4>Guest Code</h4>
                      <p>
                        {codeSettings.find((code) => code.type === "guest")
                          ?.description ||
                          "Get a unique code to access this event as a guest"}
                      </p>
                    </div>
                    <button
                      className="generate-code-button"
                      onClick={handleGenerateGuestCode}
                    >
                      <RiCodeSSlashLine /> Generate Code
                    </button>
                  </div>
                )}

              {/* Friends Code */}
              {codeSettings &&
                codeSettings.some(
                  (code) => code.type === "friends" && code.isEnabled
                ) && (
                  <div className="access-option">
                    <div className="access-icon friends">
                      <RiUserLine />
                    </div>
                    <div className="access-info">
                      <h4>Friends Code</h4>
                      <p>
                        {codeSettings.find((code) => code.type === "friends")
                          ?.description ||
                          "Special access for friends of the organizer"}
                      </p>
                    </div>
                    <div className="code-input">
                      <input type="text" placeholder="Enter friends code" />
                      <button>Verify</button>
                    </div>
                  </div>
                )}

              {/* VIP Code */}
              {codeSettings &&
                codeSettings.some(
                  (code) => code.type === "vip" && code.isEnabled
                ) && (
                  <div className="access-option">
                    <div className="access-icon vip">
                      <RiVipCrownLine />
                    </div>
                    <div className="access-info">
                      <h4>VIP Access</h4>
                      <p>
                        {codeSettings.find((code) => code.type === "vip")
                          ?.description ||
                          "Exclusive VIP access for special guests"}
                      </p>
                    </div>
                    <div className="code-input">
                      <input type="text" placeholder="Enter VIP code" />
                      <button>Verify</button>
                    </div>
                  </div>
                )}

              {/* Backstage Code */}
              {codeSettings &&
                codeSettings.some(
                  (code) => code.type === "backstage" && code.isEnabled
                ) && (
                  <div className="access-option">
                    <div className="access-icon backstage">
                      <RiDoorLine />
                    </div>
                    <div className="access-info">
                      <h4>Backstage Access</h4>
                      <p>
                        {codeSettings.find((code) => code.type === "backstage")
                          ?.description ||
                          "Exclusive backstage access for authorized personnel"}
                      </p>
                    </div>
                    <div className="code-input">
                      <input type="text" placeholder="Enter backstage code" />
                      <button>Verify</button>
                    </div>
                  </div>
                )}

              {/* Table Code */}
              {codeSettings &&
                codeSettings.some(
                  (code) => code.type === "table" && code.isEnabled
                ) && (
                  <div className="access-option">
                    <div className="access-icon table">
                      <RiTableLine />
                    </div>
                    <div className="access-info">
                      <h4>Table Reservation</h4>
                      <p>
                        {codeSettings.find((code) => code.type === "table")
                          ?.description ||
                          "Reserved table access for premium guests"}
                      </p>
                    </div>
                    <div className="code-input">
                      <input type="text" placeholder="Enter table code" />
                      <button>Verify</button>
                    </div>
                  </div>
                )}

              {codeSettings && codeSettings.length === 0 && (
                <div className="no-access-codes">
                  <p>No access codes are available for this event.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share button */}
      <div className="event-actions-footer">
        <button className="share-event-button" onClick={handleShareEvent}>
          <RiShareLine /> Share Event
        </button>
      </div>

      {/* Guest Code Dialog */}
      {showCodeDialog && (
        <ConfirmDialog
          title="Your Guest Code"
          message={
            <div className="guest-code-display">
              <p>Use this code to access the event:</p>
              <div className="code">{guestCode}</div>
              <p className="code-note">
                This code is unique to you and should not be shared.
              </p>
            </div>
          }
          confirmText="Copy Code"
          cancelText="Close"
          onConfirm={() => {
            navigator.clipboard.writeText(guestCode);
            toast.showSuccess("Code copied to clipboard");
            setShowCodeDialog(false);
          }}
          onCancel={() => setShowCodeDialog(false)}
          type="default"
        />
      )}
    </div>
  );
};

export default EventProfile;
