import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./Tickets.scss";
import { useToast } from "../Toast/ToastContext";
import {
  RiRefreshLine,
  RiTimeLine,
  RiAlarmLine,
  RiPriceTag3Line,
  RiTicket2Line,
  RiCoupon3Line,
  RiMapPinLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import axios from "axios";

const LoadingSpinner = ({ size = "default", color = "#d4af37" }) => {
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
 * @param {Object} props.event - The complete event object with all details
 */
const Tickets = ({
  eventId,
  eventTitle,
  eventDate,
  seamless = false,
  fetchTicketSettings,
  event,
}) => {
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const toast = useToast();
  const [primaryColor, setPrimaryColor] = useState("#d4af37"); // Default gold color
  const [checkoutColor, setCheckoutColor] = useState("#d4af37"); // Neutral gold color for checkout

  // Form state for checkout
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});

  // Ticket quantities
  const [ticketQuantities, setTicketQuantities] = useState({});

  // Countdown timers for early bird tickets
  const [countdowns, setCountdowns] = useState({});

  // Effect to get primary color from event code settings or ticketSettings
  useEffect(() => {
    // First try to get color from event.codeSettings
    if (event && event.codeSettings && event.codeSettings.length > 0) {
      const ticketCodeSetting = event.codeSettings.find(
        (cs) => cs.type === "ticket"
      );

      if (ticketCodeSetting && ticketCodeSetting.primaryColor) {
        const color = ticketCodeSetting.primaryColor;
        setPrimaryColor(color);
        // Apply the color to CSS variables for dynamic styling
        document.documentElement.style.setProperty(
          "--ticket-primary-color",
          color
        );

        return;
      }
    }

    // If not found in event.codeSettings, try ticketSettings
    if (ticketSettings && ticketSettings.length > 0) {
      const firstTicket = ticketSettings[0];
      if (firstTicket && firstTicket.color) {
        const color = firstTicket.color;
        setPrimaryColor(color);
        // Apply the color to CSS variables for dynamic styling
        document.documentElement.style.setProperty(
          "--ticket-primary-color",
          color
        );
      }
    }
  }, [event, ticketSettings]);

  useEffect(() => {
    if (eventId) {
      loadTicketSettings();
    }
  }, [eventId]);

  const loadTicketSettings = async () => {
    if (!eventId) return;

    setLoadingTickets(true);

    try {
      if (fetchTicketSettings) {
        const settings = await fetchTicketSettings(eventId);
        setTicketSettings(settings || []);

        // Set primary color from first ticket if available
        if (settings && settings.length > 0 && settings[0].color) {
          setPrimaryColor(settings[0].color);
          document.documentElement.style.setProperty(
            "--ticket-primary-color",
            settings[0].color
          );
        }
      } else {
        setTicketSettings([]);
      }
    } catch (error) {
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
      <div className="ticket-countdown" style={{ color: primaryColor }}>
        <RiAlarmLine /> {countdownText}
      </div>
    );
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
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
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

  // If loading or no tickets, show appropriate message
  if (loadingTickets) {
    return (
      <div className="tickets-loading">
        <LoadingSpinner color={primaryColor} />
        <p>Loading tickets...</p>
      </div>
    );
  }

  if (!ticketSettings || ticketSettings.length === 0) {
    return (
      <div className="no-tickets">
        <p>No tickets available for this event.</p>
        <button
          className="retry-button"
          onClick={loadTicketSettings}
          style={{ color: primaryColor }}
        >
          <RiRefreshLine /> Retry
        </button>
      </div>
    );
  }

  // Render tickets directly without nested containers
  return (
    <div className={`tickets-wrapper ${seamless ? "seamless" : ""}`}>
      <div className="tickets-container">
        <h3 className="tickets-title">Tickets</h3>
        <div className="tickets-list">
          {validatedTickets.map((ticket, index) => (
            <div
              key={ticket._id}
              className={`ticket-item ${
                (ticketQuantities[ticket._id] || 0) > 0 ? "active" : ""
              }`}
              style={{
                "--ticket-accent-color": ticket.color || primaryColor,
              }}
            >
              {renderCountdown(ticket)}
              {ticket.originalPrice && ticket.originalPrice > ticket.price && (
                <div
                  className="ticket-discount"
                  style={{ backgroundColor: ticket.color || primaryColor }}
                >
                  {Math.round(
                    ((ticket.originalPrice - ticket.price) /
                      ticket.originalPrice) *
                      100
                  )}
                  % OFF
                </div>
              )}

              <div className="ticket-header">
                <RiTicket2Line
                  style={{ color: ticket.color || primaryColor }}
                />
                <h4>{ticket.name}</h4>
              </div>

              <div
                className="ticket-price"
                style={{ color: ticket.color || primaryColor }}
              >
                {ticket.originalPrice &&
                  ticket.originalPrice > ticket.price && (
                    <span className="original-price">
                      €{ticket.originalPrice.toFixed(2)}
                    </span>
                  )}
                €{ticket.price.toFixed(2)}
              </div>

              {ticket.description && (
                <p className="ticket-description">{ticket.description}</p>
              )}

              <div className="ticket-quantity">
                <button
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(ticket._id, -1)}
                  disabled={(ticketQuantities[ticket._id] || 0) === 0}
                >
                  -
                </button>
                <span>{ticketQuantities[ticket._id] || 0}</span>
                <button
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(ticket._id, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Summary - Only show if tickets are selected */}
        {hasSelectedTickets && (
          <div className="checkout-area">
            <div className="checkout-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) =>
                    handleFieldChange("firstName", e.target.value)
                  }
                  className={
                    formTouched.firstName && formErrors.firstName ? "error" : ""
                  }
                />
                {formTouched.firstName && formErrors.firstName && (
                  <div className="error-message">{formErrors.firstName}</div>
                )}
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) =>
                    handleFieldChange("lastName", e.target.value)
                  }
                  className={
                    formTouched.lastName && formErrors.lastName ? "error" : ""
                  }
                />
                {formTouched.lastName && formErrors.lastName && (
                  <div className="error-message">{formErrors.lastName}</div>
                )}
              </div>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  className={
                    formTouched.email && formErrors.email ? "error" : ""
                  }
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
            </div>

            <div className="checkout-total">
              <span>Total:</span>
              <span className="total-amount" style={{ color: checkoutColor }}>
                €{calculateTotal()}
              </span>
            </div>

            <button
              className="checkout-button"
              onClick={handleCheckout}
              disabled={isCheckoutLoading}
              style={{
                background: checkoutColor,
                backgroundImage: `linear-gradient(to bottom, ${checkoutColor}DD, ${checkoutColor})`,
              }}
            >
              {isCheckoutLoading ? (
                <>
                  <LoadingSpinner size="small" color="#000" />
                  <span>Processing...</span>
                </>
              ) : (
                "Buy Tickets"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
