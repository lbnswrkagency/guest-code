import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Stripe.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";

/**
 * Reusable Stripe checkout component
 * @param {Object} props
 * @param {Array} props.ticketSettings - Array of ticket settings objects
 * @param {string} props.eventId - ID of the event
 * @param {Object} props.colors - Optional color customization
 * @param {string} props.colors.primary - Primary color (default: #ffc807)
 * @param {string} props.colors.secondary - Secondary color (default: #2196F3)
 * @param {string} props.colors.background - Background color (default: rgba(255, 255, 255, 0.05))
 * @param {Function} props.onCheckoutComplete - Optional callback when checkout is complete
 */
const Stripe = ({
  ticketSettings = [],
  eventId,
  colors = {
    primary: "#ffc807",
    secondary: "#2196F3",
    background: "rgba(255, 255, 255, 0.05)",
  },
  onCheckoutComplete,
}) => {
  console.log("[Stripe] Component initialized with props:", {
    ticketSettingsCount: ticketSettings?.length || 0,
    ticketSettingsData: ticketSettings,
    eventId,
    timestamp: new Date().toISOString(),
  });

  const toast = useToast();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Ticket quantities
  const [ticketQuantities, setTicketQuantities] = useState({});

  // Countdown timers for early bird tickets
  const [countdowns, setCountdowns] = useState({});

  // Handle ticket quantity changes
  const handleQuantityChange = (ticketId, change) => {
    setTicketQuantities((prev) => ({
      ...prev,
      [ticketId]: Math.max(0, (prev[ticketId] || 0) + change),
    }));
  };

  // Calculate total price
  const calculateTotal = () => {
    return ticketSettings
      .reduce((total, ticket) => {
        return total + ticket.price * (ticketQuantities[ticket._id] || 0);
      }, 0)
      .toFixed(2);
  };

  // Check if any tickets are selected
  const hasSelectedTickets = Object.values(ticketQuantities).some(
    (quantity) => quantity > 0
  );

  // Validate form
  const isFormValid = () => {
    return (
      firstName &&
      lastName &&
      email &&
      email.includes("@") &&
      hasSelectedTickets
    );
  };

  // Handle checkout
  const handleCheckout = async () => {
    console.log("[Stripe Checkout] Starting checkout process...");
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

      if (selectedTickets.length === 0) {
        toast.showError("Please select at least one ticket");
        return;
      }

      console.log("[Stripe Checkout] Selected tickets:", selectedTickets);
      console.log("[Stripe Checkout] Customer info:", {
        firstName,
        lastName,
        email,
      });
      console.log("[Stripe Checkout] Event ID:", eventId);

      console.log(
        "[Stripe Checkout] Making API request to create checkout session..."
      );
      // Log the API base URL for debugging
      console.log(
        "[Stripe Checkout] API base URL:",
        process.env.REACT_APP_API_BASE_URL
      );
      console.log(
        "[Stripe Checkout] Endpoint path:",
        "/stripe/create-checkout-session"
      );

      // Show loading state
      toast.showInfo("Preparing checkout...");

      const response = await axiosInstance.post(
        `/stripe/create-checkout-session`,
        {
          firstName,
          lastName,
          email,
          eventId,
          tickets: selectedTickets,
        }
      );

      console.log("[Stripe Checkout] Response received:", response.data);

      if (response.data.url) {
        console.log(
          "[Stripe Checkout] Redirecting to Stripe checkout URL:",
          response.data.url
        );

        // Call the onCheckoutComplete callback if provided
        if (onCheckoutComplete) {
          onCheckoutComplete({
            success: true,
            url: response.data.url,
            selectedTickets,
            customerInfo: { firstName, lastName, email },
          });
        }

        // Redirect to Stripe checkout
        window.location = response.data.url;
      } else {
        console.error("[Stripe Checkout] No URL in response:", response.data);
        toast.showError("Invalid checkout response. Please try again.");
      }
    } catch (error) {
      // Log the full error object
      console.error("[Stripe Checkout] Full error object:", error);

      // Log detailed error information
      console.error("[Stripe Checkout] Error details:", {
        message: error.message,
        name: error.name,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack,
      });

      // Log request configuration
      console.error("[Stripe Checkout] Request configuration:", {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        headers: error.config?.headers,
        withCredentials: error.config?.withCredentials,
        data: error.config?.data ? JSON.parse(error.config?.data) : null,
      });

      // Log response data if available
      if (error.response?.data) {
        console.error(
          "[Stripe Checkout] Server error response:",
          error.response.data
        );
      }

      // Try to get a more specific error message
      let errorMessage = "Failed to process checkout. Please try again later.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.showError(errorMessage);

      // Log the error to the server if you have error tracking
      console.error("[Stripe Checkout] Error occurred during checkout:", {
        eventId,
        customerEmail: email,
        errorMessage: error.message,
        errorCode: error.code,
        errorStatus: error.response?.status,
      });
    }
  };

  // Calculate remaining time for countdown
  const calculateRemainingTime = (endDate) => {
    if (!endDate) return null;

    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return { days, hours };
  };

  // Initialize and update countdowns
  useEffect(() => {
    if (!ticketSettings || ticketSettings.length === 0) return;

    console.log("[Stripe] Setting up countdowns for tickets:", {
      ticketCount: ticketSettings.length,
      ticketsWithCountdown: ticketSettings.filter(
        (t) => t.hasCountdown && t.endDate
      ).length,
      timestamp: new Date().toISOString(),
    });

    // Initialize countdowns
    const initialCountdowns = {};
    ticketSettings.forEach((ticket) => {
      if (
        ticket.hasCountdown &&
        ticket.endDate &&
        ticket.name.toLowerCase().includes("early")
      ) {
        const remaining = calculateRemainingTime(ticket.endDate);
        if (remaining) {
          initialCountdowns[ticket._id] = remaining;
        }
      }
    });
    setCountdowns(initialCountdowns);

    // Update countdowns every minute
    const interval = setInterval(() => {
      const updatedCountdowns = {};
      ticketSettings.forEach((ticket) => {
        if (
          ticket.hasCountdown &&
          ticket.endDate &&
          ticket.name.toLowerCase().includes("early")
        ) {
          const remaining = calculateRemainingTime(ticket.endDate);
          if (remaining) {
            updatedCountdowns[ticket._id] = remaining;
          }
        }
      });
      setCountdowns(updatedCountdowns);
    }, 60000);

    return () => clearInterval(interval);
  }, [ticketSettings]);

  console.log("[Stripe] Rendering component with:", {
    ticketSettingsCount: ticketSettings?.length || 0,
    hasTickets: ticketSettings && ticketSettings.length > 0,
    ticketIds: ticketSettings?.map((t) => t._id) || [],
    rawTicketData: JSON.stringify(ticketSettings),
    timestamp: new Date().toISOString(),
  });

  // Normalize and validate ticket data to ensure it has required properties
  const validatedTickets = (ticketSettings || [])
    .map((ticket) => {
      // If ticket is missing required properties, try to normalize it
      if (!ticket || typeof ticket !== "object") {
        console.error("[Stripe] Invalid ticket data (not an object):", ticket);
        return null;
      }

      // Create a normalized ticket with default values for missing properties
      const normalizedTicket = {
        _id: ticket._id || `temp-${Math.random().toString(36).substring(2, 9)}`,
        name: ticket.name || "Standard Ticket",
        description: ticket.description || "Entry ticket",
        price: typeof ticket.price === "number" ? ticket.price : 0,
        originalPrice:
          typeof ticket.originalPrice === "number"
            ? ticket.originalPrice
            : null,
        isLimited: !!ticket.isLimited,
        maxTickets: ticket.maxTickets || 100,
        soldCount: ticket.soldCount || 0,
        hasCountdown: !!ticket.hasCountdown,
        endDate: ticket.endDate || null,
        eventId: ticket.eventId || eventId,
        // Keep any other properties
        ...ticket,
      };

      console.log("[Stripe] Normalized ticket:", {
        id: normalizedTicket._id,
        name: normalizedTicket.name,
        price: normalizedTicket.price,
        wasNormalized:
          ticket._id !== normalizedTicket._id ||
          ticket.name !== normalizedTicket.name ||
          ticket.price !== normalizedTicket.price,
      });

      return normalizedTicket;
    })
    .filter(Boolean); // Remove null entries

  if (
    validatedTickets.length === 0 &&
    ticketSettings &&
    ticketSettings.length > 0
  ) {
    console.error("[Stripe] No valid tickets found after normalization");
  }

  return (
    <div className="stripe-checkout">
      <div className="tickets-container">
        {validatedTickets && validatedTickets.length > 0 ? (
          validatedTickets.map((ticket, index) => {
            console.log("[Stripe] Rendering ticket:", {
              ticketId: ticket._id,
              ticketName: ticket.name,
              ticketPrice: ticket.price,
              index,
            });
            return (
              <motion.div
                key={ticket._id}
                className="ticket-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  borderColor: ticket.color || colors.secondary,
                  background: colors.background,
                }}
              >
                <div className="ticket-header">
                  <h4>{ticket.name}</h4>
                  {ticket.originalPrice &&
                    ticket.originalPrice > ticket.price && (
                      <span
                        className="ticket-discount"
                        style={{
                          backgroundColor: `rgba(${parseInt(
                            colors.primary.slice(1, 3),
                            16
                          )}, ${parseInt(
                            colors.primary.slice(3, 5),
                            16
                          )}, ${parseInt(
                            colors.primary.slice(5, 7),
                            16
                          )}, 0.15)`,
                          color: colors.primary,
                        }}
                      >
                        {Math.round(
                          ((ticket.originalPrice - ticket.price) /
                            ticket.originalPrice) *
                            100
                        )}
                        % OFF
                      </span>
                    )}
                </div>

                {/* Add countdown display for Early Bird tickets */}
                {countdowns[ticket._id] && (
                  <div
                    className="ticket-countdown"
                    style={{
                      backgroundColor: `rgba(${parseInt(
                        colors.primary.slice(1, 3),
                        16
                      )}, ${parseInt(
                        colors.primary.slice(3, 5),
                        16
                      )}, ${parseInt(colors.primary.slice(5, 7), 16)}, 0.1)`,
                    }}
                  >
                    <span
                      className="countdown-text"
                      style={{ color: colors.primary }}
                    >
                      {countdowns[ticket._id].days > 0
                        ? `${countdowns[ticket._id].days}d `
                        : ""}
                      {countdowns[ticket._id].hours}h remaining
                    </span>
                  </div>
                )}

                <div className="ticket-price">
                  <span className="current-price">
                    {ticket.price.toFixed(2)}€
                  </span>
                  {ticket.originalPrice &&
                    ticket.originalPrice > ticket.price && (
                      <span className="original-price">
                        {ticket.originalPrice.toFixed(2)}€
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
                          backgroundColor: colors.primary,
                        }}
                      ></div>
                    </div>
                    <span className="availability-text">
                      {Math.max(0, ticket.maxTickets - ticket.soldCount)}{" "}
                      tickets left
                    </span>
                  </div>
                )}

                <div className="ticket-quantity">
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(ticket._id, -1)}
                    style={{
                      borderColor: `rgba(${parseInt(
                        colors.primary.slice(1, 3),
                        16
                      )}, ${parseInt(
                        colors.primary.slice(3, 5),
                        16
                      )}, ${parseInt(colors.primary.slice(5, 7), 16)}, 0.3)`,
                      backgroundColor: `rgba(${parseInt(
                        colors.primary.slice(1, 3),
                        16
                      )}, ${parseInt(
                        colors.primary.slice(3, 5),
                        16
                      )}, ${parseInt(colors.primary.slice(5, 7), 16)}, 0.15)`,
                      color: colors.primary,
                    }}
                  >
                    -
                  </button>
                  <span className="quantity">
                    {ticketQuantities[ticket._id] || 0}
                  </span>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(ticket._id, 1)}
                    style={{
                      borderColor: `rgba(${parseInt(
                        colors.primary.slice(1, 3),
                        16
                      )}, ${parseInt(
                        colors.primary.slice(3, 5),
                        16
                      )}, ${parseInt(colors.primary.slice(5, 7), 16)}, 0.3)`,
                      backgroundColor: `rgba(${parseInt(
                        colors.primary.slice(1, 3),
                        16
                      )}, ${parseInt(
                        colors.primary.slice(3, 5),
                        16
                      )}, ${parseInt(colors.primary.slice(5, 7), 16)}, 0.15)`,
                      color: colors.primary,
                    }}
                  >
                    +
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="no-tickets-message">
            <p>No ticket options available for this event.</p>
          </div>
        )}
      </div>

      <div
        className="checkout-summary"
        style={{
          backgroundColor: colors.background,
          borderColor: `rgba(${parseInt(
            colors.primary.slice(1, 3),
            16
          )}, ${parseInt(colors.primary.slice(3, 5), 16)}, ${parseInt(
            colors.primary.slice(5, 7),
            16
          )}, 0.3)`,
        }}
      >
        <div className="selected-tickets">
          {ticketSettings.map(
            (ticket) =>
              ticketQuantities[ticket._id] > 0 && (
                <div key={ticket._id} className="selected-ticket-item">
                  <span>
                    {ticketQuantities[ticket._id]}x {ticket.name}
                  </span>
                  <span>
                    {(ticket.price * ticketQuantities[ticket._id]).toFixed(2)}€
                  </span>
                </div>
              )
          )}
        </div>

        <div className="total-amount">
          <span>Total</span>
          <span>{calculateTotal()}€</span>
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
              style={{ backgroundColor: colors.primary }}
            >
              Buy Tickets
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stripe;
