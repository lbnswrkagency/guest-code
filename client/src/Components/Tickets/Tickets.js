import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Tickets.scss";
import { useToast } from "../Toast/ToastContext";
import Stripe from "../Stripe/Stripe";
import { RiRefreshLine, RiTimeLine, RiAlarmLine } from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";

const LoadingSpinner = ({ size = "default", color = "#ffc807" }) => {
  const spinnerSize = size === "small" ? "16px" : "24px";
  return (
    <div
      className="spinner"
      style={{
        width: spinnerSize,
        height: spinnerSize,
        borderColor: `${color}40`,
        borderTopColor: color,
      }}
    ></div>
  );
};

/**
 * Tickets component for displaying and purchasing event tickets
 * @param {Object} props
 * @param {string} props.eventId - ID of the event
 * @param {string} props.eventTitle - Title of the event
 * @param {string} props.eventDate - Date of the event
 * @param {boolean} props.seamless - Whether to display in seamless mode without borders
 * @param {Function} props.fetchTicketSettings - Function to fetch ticket settings
 */
const Tickets = ({
  eventId,
  eventTitle,
  eventDate,
  seamless = false,
  fetchTicketSettings,
}) => {
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (eventId) {
      loadTicketSettings();
    }
  }, [eventId]);

  const loadTicketSettings = async () => {
    if (!eventId) return;

    setLoadingTickets(true);
    console.log("[Tickets] Loading ticket settings for event:", {
      eventId,
      eventTitle,
      timestamp: new Date().toISOString(),
    });

    try {
      if (fetchTicketSettings) {
        const settings = await fetchTicketSettings(eventId);
        console.log("[Tickets] Received ticket settings:", {
          count: settings?.length || 0,
          settings:
            settings?.map((s) => ({
              id: s._id,
              name: s.name,
              price: s.price,
              hasCountdown: s.hasCountdown,
            })) || [],
        });
        setTicketSettings(settings || []);
      } else {
        console.warn("[Tickets] No fetchTicketSettings function provided");
        setTicketSettings([]);
      }
    } catch (error) {
      console.error("[Tickets] Error loading ticket settings:", error);
      setTicketSettings([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const options = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  const formatCountdown = (endDate) => {
    if (!endDate) return null;

    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  // Render countdown badge if ticket has a countdown
  const renderCountdown = (ticket) => {
    if (!ticket.hasCountdown || !ticket.endDate) return null;

    const countdownText = formatCountdown(ticket.endDate);
    if (!countdownText) return null;

    return (
      <div className="ticket-countdown">
        <RiAlarmLine /> {countdownText}
      </div>
    );
  };

  return (
    <div className={`tickets-container ${seamless ? "seamless" : ""}`}>
      {!seamless && (
        <>
          <h3 className="tickets-title">Buy Tickets</h3>
          <p className="ticket-info">
            Purchase tickets for {eventTitle || "this event"}
            {eventDate ? ` on ${formatDate(eventDate)}` : ""}.
          </p>
        </>
      )}

      {ticketSettings && ticketSettings.length > 0 ? (
        <Stripe
          ticketSettings={ticketSettings}
          eventId={eventId}
          colors={{
            primary: "#ffc807",
            secondary: "#2196F3",
            background: seamless
              ? "rgba(0, 0, 0, 0.15)"
              : "rgba(255, 255, 255, 0.05)",
          }}
          onCheckoutComplete={(result) => {
            toast.showSuccess("Redirecting to checkout...");
            setLoadingTickets(false);
          }}
          renderCountdown={renderCountdown}
        />
      ) : (
        <div className="no-tickets-message">
          {loadingTickets ? (
            <div className="loading-tickets">
              <LoadingSpinner />
              <span>Loading ticket information...</span>
            </div>
          ) : (
            <>
              <p>No tickets are currently available for this event.</p>
              <div className="ticket-actions">
                <button
                  className="retry-button"
                  onClick={loadingTickets ? null : loadTicketSettings}
                >
                  <RiRefreshLine /> Retry
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Tickets;
