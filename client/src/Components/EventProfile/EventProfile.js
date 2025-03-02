import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./EventProfile.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import Navigation from "../Navigation/Navigation";
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
  RiUserAddLine,
  RiUserFollowLine,
  RiStarFill,
  RiStarLine,
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState("");
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

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
          setIsFollowing(response.data.isFollowing || false);
          setIsFavorited(response.data.isFavorited || false);
          setIsMember(response.data.isMember || false);
          setJoinRequestStatus(response.data.joinRequestStatus || "");
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
  const handleShare = () => {
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

  // Handle follow event
  const handleFollow = () => {
    console.log("[EventProfile] Handle follow event");
    // Implementation of handleFollow function
  };

  // Handle join request
  const handleJoinRequest = () => {
    console.log("[EventProfile] Handle join request");
    // Implementation of handleJoinRequest function
  };

  // Handle favorite event
  const handleFavorite = () => {
    console.log("[EventProfile] Handle favorite event");
    // Implementation of handleFavorite function
  };

  const getJoinButtonClass = () => {
    if (isMember) return "active";
    if (joinRequestStatus === "pending") return "pending";
    if (joinRequestStatus === "accepted") return "accepted";
    if (joinRequestStatus === "rejected") return "rejected";
    return "";
  };

  const getJoinButtonText = () => {
    if (isMember) return "Member";
    if (joinRequestStatus === "pending") return "Pending";
    if (joinRequestStatus === "accepted") return "Accepted";
    if (joinRequestStatus === "rejected") return "Rejected";
    return "Join";
  };

  const handleQuantityChange = (ticketId, change) => {
    setTicketQuantities((prev) => ({
      ...prev,
      [ticketId]: Math.max(0, (prev[ticketId] || 0) + change),
    }));
  };

  const calculateTotal = () => {
    return ticketSettings
      .reduce((total, ticket) => {
        return total + ticket.price * (ticketQuantities[ticket._id] || 0);
      }, 0)
      .toFixed(2);
  };

  const hasSelectedTickets = Object.values(ticketQuantities).some(
    (quantity) => quantity > 0
  );

  const isFormValid = () => {
    return (
      firstName &&
      lastName &&
      email &&
      email.includes("@") &&
      hasSelectedTickets
    );
  };

  const handleCheckout = async () => {
    try {
      const selectedTickets = ticketSettings
        .filter((ticket) => ticketQuantities[ticket._id] > 0)
        .map((ticket) => ({
          ticketId: ticket._id,
          name: ticket.name,
          description: ticket.description,
          price: ticket.price,
          quantity: ticketQuantities[ticket._id],
        }));

      const response = await axiosInstance.post(
        "/stripe/create-checkout-session",
        {
          firstName,
          lastName,
          email,
          eventId: event._id,
          tickets: selectedTickets,
        }
      );

      if (response.data.url) {
        window.location = response.data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.showError("Failed to process checkout");
    }
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
    <div className="page-wrapper">
      <Navigation onBack={() => navigate(-1)} />

      <div className="event-profile">
        {/* Event Header Section */}
        <div className="event-header">
          <div className="event-cover">
            {getEventImage() ? (
              <img
                src={getEventImage()}
                alt={event.title}
                className="cover-image"
              />
            ) : (
              <div className="cover-placeholder" />
            )}
          </div>

          <div className="event-info">
            <div className="brand-logo">
              {event.brand?.logo && event.brand.logo.medium ? (
                <img src={event.brand.logo.medium} alt={event.brand.name} />
              ) : (
                <div className="logo-placeholder">
                  {event.brand?.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="eventProfile-details">
              <h1 className="event-title">{event.title}</h1>
              <div className="username">
                @
                {event.brand?.username ||
                  event.brand?.name.toLowerCase().replace(/\s+/g, "")}
              </div>
            </div>

            <div className="header-actions">
              <motion.button
                className="action-button"
                onClick={handleShare}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RiShareLine />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="event-nav">
          <button
            className={activeSection === "info" ? "active" : ""}
            onClick={() => setActiveSection("info")}
          >
            <RiInformationLine />
            Info
          </button>
          <button
            className={activeSection === "lineup" ? "active" : ""}
            onClick={() => setActiveSection("lineup")}
          >
            <RiUserLine />
            Lineup
          </button>
          <button
            className={activeSection === "tickets" ? "active" : ""}
            onClick={() => setActiveSection("tickets")}
          >
            <RiTicketLine />
            Tickets
          </button>
          <button
            className={activeSection === "access" ? "active" : ""}
            onClick={() => setActiveSection("access")}
          >
            <RiDoorLine />
            Access
          </button>
        </div>

        {/* Main Content Area */}
        <div className="event-content">
          {/* Info Section */}
          {activeSection === "info" && (
            <motion.div
              className="event-section event-info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="event-details">
                <motion.div
                  className="detail-item"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <RiCalendarEventLine />
                  <div>
                    <h4>Date</h4>
                    <p>{formatDate(event.date)}</p>
                  </div>
                </motion.div>

                <motion.div
                  className="detail-item"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <RiTimeLine />
                  <div>
                    <h4>Time</h4>
                    <p>
                      {event.startTime} - {event.endTime}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className="detail-item"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <RiMapPinLine />
                  <div>
                    <h4>Location</h4>
                    <p>{event.location}</p>
                  </div>
                </motion.div>
              </div>

              {event.description && (
                <motion.div
                  className="event-description"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3>About This Event</h3>
                  <p>{event.description}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Lineup Section */}
          {activeSection === "lineup" && (
            <motion.div
              className="event-section event-lineup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
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
                        <span className="artist-category">
                          {artist.category}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="no-lineup">
                  <p>No lineup information available for this event.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Tickets Section */}
          {activeSection === "tickets" && (
            <motion.div
              className="event-section event-tickets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3>Tickets</h3>
              {ticketSettings && ticketSettings.length > 0 ? (
                <>
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
                          <p className="ticket-description">
                            {ticket.description}
                          </p>
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
                                      (ticket.soldCount / ticket.maxTickets) *
                                        100
                                    )
                                  )}%`,
                                }}
                              ></div>
                            </div>
                            <span className="availability-text">
                              {Math.max(
                                0,
                                ticket.maxTickets - ticket.soldCount
                              )}{" "}
                              tickets left
                            </span>
                          </div>
                        )}

                        <div className="ticket-quantity">
                          <button
                            className="quantity-btn"
                            onClick={() => handleQuantityChange(ticket._id, -1)}
                          >
                            -
                          </button>
                          <span className="quantity">
                            {ticketQuantities[ticket._id] || 0}
                          </span>
                          <button
                            className="quantity-btn"
                            onClick={() => handleQuantityChange(ticket._id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="checkout-summary">
                    <div className="selected-tickets">
                      {ticketSettings.map(
                        (ticket) =>
                          ticketQuantities[ticket._id] > 0 && (
                            <div
                              key={ticket._id}
                              className="selected-ticket-item"
                            >
                              <span>
                                {ticketQuantities[ticket._id]}x {ticket.name}
                              </span>
                              <span>
                                $
                                {(
                                  ticket.price * ticketQuantities[ticket._id]
                                ).toFixed(2)}
                              </span>
                            </div>
                          )
                      )}
                    </div>

                    <div className="total-amount">
                      <span>Total</span>
                      <span>${calculateTotal()}</span>
                    </div>

                    {hasSelectedTickets && (
                      <div className="checkout-form">
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        <motion.button
                          className="checkout-button"
                          onClick={handleCheckout}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={!isFormValid()}
                        >
                          Buy Tickets
                        </motion.button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="no-tickets">
                  <p>No tickets available for this event.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Access Section */}
          {activeSection === "access" && (
            <motion.div
              className="event-section event-access"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3>Access Codes</h3>
              <div className="access-options">
                {codeSettings &&
                  codeSettings.map(
                    (code, index) =>
                      code.isEnabled && (
                        <motion.div
                          key={code.type}
                          className="access-option"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className={`access-icon ${code.type}`}>
                            {code.type === "guest" && <RiUserLine />}
                            {code.type === "friends" && <RiUserLine />}
                            {code.type === "vip" && <RiVipCrownLine />}
                            {code.type === "backstage" && <RiDoorLine />}
                            {code.type === "table" && <RiTableLine />}
                          </div>
                          <div className="access-info">
                            <h4>
                              {code.name ||
                                code.type.charAt(0).toUpperCase() +
                                  code.type.slice(1)}
                            </h4>
                            <p>
                              {code.description ||
                                `Access code for ${code.type} entry`}
                            </p>
                          </div>
                          {code.type === "guest" ? (
                            <motion.button
                              className="generate-code-button"
                              onClick={handleGenerateGuestCode}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <RiCodeSSlashLine /> Generate Code
                            </motion.button>
                          ) : (
                            <div className="code-input">
                              <input
                                type="text"
                                placeholder={`Enter ${code.type} code`}
                              />
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Verify
                              </motion.button>
                            </div>
                          )}
                        </motion.div>
                      )
                  )}
                {(!codeSettings || codeSettings.length === 0) && (
                  <div className="no-access-codes">
                    <p>No access codes are available for this event.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
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
    </div>
  );
};

export default EventProfile;
