import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Stripe.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import axios from "axios";
import { RiPriceTag3Line } from "react-icons/ri";

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
 * @param {Function} props.renderCountdown - Optional function to render custom countdown
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
  renderCountdown,
}) => {
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});

  // Get toast context
  const toast = useToast();

  // Ticket quantities
  const [ticketQuantities, setTicketQuantities] = useState({});

  // Countdown timers for early bird tickets
  const [countdowns, setCountdowns] = useState({});

  const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

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

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form
  const isFormValid = () => {
    const errors = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!hasSelectedTickets) {
      errors.tickets = "Please select at least one ticket";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field change
  const handleFieldChange = (field, value) => {
    // Update form touched state
    setFormTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    // Update field value
    switch (field) {
      case "firstName":
        setFirstName(value);
        break;
      case "lastName":
        setLastName(value);
        break;
      case "email":
        setEmail(value);
        break;
      default:
        break;
    }

    // Clear error for this field if it exists
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    // Validate form before proceeding
    if (!isFormValid()) {
      // Show toast for validation errors
      if (formErrors.tickets) {
        toast.showError(formErrors.tickets);
      } else if (Object.keys(formErrors).length > 0) {
        toast.showError("Please fill in all required fields correctly");
      }
      return;
    }

    // Prevent multiple clicks
    if (isCheckoutLoading) {
      return;
    }

    // Create a reference to the loading toast
    let loadingToast = null;

    try {
      setIsCheckoutLoading(true);

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
        setIsCheckoutLoading(false);
        return;
      }

      // Show loading state with the loading toast
      loadingToast = toast.showLoading("Preparing checkout...");

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

      if (response.data.url) {
        // Update the loading toast to show success
        if (loadingToast) {
          loadingToast.update({
            message: "Redirecting to checkout...",
            type: "success",
          });
        }

        // Call the onCheckoutComplete callback if provided
        if (onCheckoutComplete) {
          onCheckoutComplete({
            success: true,
            url: response.data.url,
            selectedTickets,
            customerInfo: { firstName, lastName, email },
          });
        }

        // Short delay to ensure the toast is visible before redirect
        setTimeout(() => {
          // Redirect to Stripe checkout
          window.location = response.data.url;
        }, 500);
      } else {
        // Dismiss the loading toast
        if (loadingToast) {
          loadingToast.dismiss();
        }

        toast.showError("Invalid checkout response. Please try again.");
        setIsCheckoutLoading(false);
      }
    } catch (error) {
      // Dismiss the loading toast
      if (loadingToast) {
        loadingToast.dismiss();
      }

      // Try to get a more specific error message
      let errorMessage = "Failed to process checkout. Please try again later.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.showError(errorMessage);
      setIsCheckoutLoading(false);
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

  // Normalize and validate ticket data to ensure it has required properties
  const validatedTickets = ticketSettings
    .map((ticket) => {
      if (!ticket || typeof ticket !== "object") {
        return null;
      }

      // Ensure ticket has required properties
      const normalizedTicket = {
        _id: ticket._id || `ticket-${Math.random().toString(36).substr(2, 9)}`,
        name: ticket.name || "Unnamed Ticket",
        description: ticket.description || "",
        price: parseFloat(ticket.price) || 0,
        quantity: ticket.quantity || 0,
        available: ticket.available !== undefined ? ticket.available : true,
        hasCountdown: !!ticket.endDate,
        endDate: ticket.endDate || null,
        ...ticket,
      };

      return normalizedTicket;
    })
    .filter(Boolean);

  if (!validatedTickets || validatedTickets.length === 0) {
    return (
      <div className="stripe-checkout">
        <div className="no-tickets-message">
          No valid ticket options available.
        </div>
      </div>
    );
  }

  return (
    <div className="stripe-checkout">
      <div className="tickets-container">
        {validatedTickets && validatedTickets.length > 0 ? (
          validatedTickets.map((ticket, index) => {
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
                {/* Render custom countdown if provided */}
                {renderCountdown && renderCountdown(ticket)}

                {/* Creative discount badge */}
                {ticket.originalPrice &&
                  ticket.originalPrice > ticket.price && (
                    <span className="ticket-discount">
                      <RiPriceTag3Line />
                      {Math.round(
                        ((ticket.originalPrice - ticket.price) /
                          ticket.originalPrice) *
                          100
                      )}
                      % OFF
                    </span>
                  )}

                <div className="ticket-header">
                  <h4>{ticket.name}</h4>
                </div>

                {/* Add countdown display for Early Bird tickets (fallback if no custom renderer) */}
                {!renderCountdown && countdowns[ticket._id] && (
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
                      {countdowns[ticket._id].hours}h
                      {countdowns[ticket._id].minutes}m left
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

        {calculateTotal() > 0 && (
          <div className="checkout-form">
            <div
              className={`form-group ${
                formTouched.firstName && formErrors.firstName ? "error" : ""
              }`}
            >
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => handleFieldChange("firstName", e.target.value)}
                className={
                  formTouched.firstName && formErrors.firstName ? "error" : ""
                }
              />
              {formTouched.firstName && formErrors.firstName && (
                <div className="error-message">{formErrors.firstName}</div>
              )}
            </div>
            <div
              className={`form-group ${
                formTouched.lastName && formErrors.lastName ? "error" : ""
              }`}
            >
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => handleFieldChange("lastName", e.target.value)}
                className={
                  formTouched.lastName && formErrors.lastName ? "error" : ""
                }
              />
              {formTouched.lastName && formErrors.lastName && (
                <div className="error-message">{formErrors.lastName}</div>
              )}
            </div>
            <div
              className={`form-group ${
                formTouched.email && formErrors.email ? "error" : ""
              }`}
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                className={formTouched.email && formErrors.email ? "error" : ""}
                onBlur={() => {
                  if (email && !isValidEmail(email)) {
                    setFormErrors((prev) => ({
                      ...prev,
                      email: "Please enter a valid email address",
                    }));
                  }
                }}
              />
              {formTouched.email && formErrors.email && (
                <div className="error-message">{formErrors.email}</div>
              )}
            </div>
            <motion.button
              className="checkout-button"
              onClick={handleCheckout}
              whileHover={{ scale: isCheckoutLoading ? 1 : 1.02 }}
              whileTap={{ scale: isCheckoutLoading ? 1 : 0.98 }}
              disabled={isCheckoutLoading}
              style={{
                backgroundColor: colors.primary,
                opacity: isCheckoutLoading ? 0.7 : 1,
              }}
            >
              {isCheckoutLoading ? (
                <div className="button-loading">
                  <div className="loading-spinner"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                "Buy Tickets"
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stripe;
