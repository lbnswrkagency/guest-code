import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  RiDoorLine,
} from "react-icons/ri";
import {
  FaUserFriends,
  FaRegClock,
  FaTicketAlt,
  FaMapMarkerAlt,
  FaCreditCard,
  FaPaypal,
  FaApplePay,
  FaGooglePay,
  FaGem,
  FaShoppingBasket,
  FaRegCreditCard,
  FaUsers,
  FaTimes,
  FaMinus,
  FaPlus,
  FaInfoCircle,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaShieldAlt,
  FaLock,
  FaTag,
} from "react-icons/fa";
import { FaApple } from "react-icons/fa6";
import axiosInstance from "../../utils/axiosConfig";
import axios from "axios";

// Memoize the LoadingSpinner component to prevent unnecessary renders
const LoadingSpinner = React.memo(({ size = "default", color = "#d4af37" }) => {
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
});

/**
 * Tickets component for displaying and purchasing event tickets
 * @param {Object} props
 * @param {string} props.eventId - ID of the event
 * @param {string} props.eventTitle - Title of the event
 * @param {string} props.eventDate - Date of the event
 * @param {boolean} props.seamless - Whether to display in seamless mode without borders
 * @param {Function} props.fetchTicketSettings - Function to fetch ticket settings
 * @param {Object} props.event - The complete event object with all details
 * @param {Array} props.ticketSettings - Pre-fetched ticket settings (optional)
 */
const Tickets = ({
  eventId,
  eventTitle,
  eventDate,
  seamless = false,
  fetchTicketSettings,
  event,
  ticketSettings: providedTicketSettings,
}) => {
  const [ticketSettings, setTicketSettings] = useState(
    providedTicketSettings || []
  );
  const [loadingTickets, setLoadingTickets] = useState(!providedTicketSettings);
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

  // Global door price
  const [globalDoorPrice, setGlobalDoorPrice] = useState(null);

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

  // Memoize loadTickets function to prevent recreation on each render
  const loadTickets = useCallback(async () => {
    // If ticket settings are provided as props, use them instead of fetching
    if (providedTicketSettings && providedTicketSettings.length > 0) {
      setTicketSettings(providedTicketSettings);
      setLoadingTickets(false);

      // Set primary color from first ticket if available
      if (providedTicketSettings[0].color) {
        setPrimaryColor(providedTicketSettings[0].color);
        document.documentElement.style.setProperty(
          "--ticket-primary-color",
          providedTicketSettings[0].color
        );
      }
      return;
    }

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
      console.error("Error loading tickets:", error);
      setTicketSettings([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [eventId, fetchTicketSettings, providedTicketSettings]);

  // Load ticket settings only once when component mounts or when dependencies change
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Handle changes to providedTicketSettings
  useEffect(() => {
    if (providedTicketSettings) {
      setTicketSettings(providedTicketSettings);
      setLoadingTickets(false);

      // Set primary color from first ticket if available
      if (
        providedTicketSettings.length > 0 &&
        providedTicketSettings[0].color
      ) {
        setPrimaryColor(providedTicketSettings[0].color);
        document.documentElement.style.setProperty(
          "--ticket-primary-color",
          providedTicketSettings[0].color
        );
      }
    }
  }, [providedTicketSettings]);

  // Memoize the validated tickets to prevent unnecessary re-renders
  const validatedTickets = useMemo(() => {
    const now = new Date();

    return (
      ticketSettings
        // Filter out old event-level tickets (those without brandId)
        // Only brand-level templates should be shown
        .filter(ticket => ticket.brandId)
        .map((ticket) => {
          if (!ticket || typeof ticket !== "object") {
            return null;
          }

          // Ensure ticket has required properties
          const normalizedTicket = {
            _id:
              ticket._id ||
              `ticket-${Math.random().toString(36).substring(2, 9)}`,
            name: ticket.name || "Unnamed Ticket",
            description: ticket.description || "",
            price: parseFloat(ticket.price) || 0,
            quantity: ticket.quantity || 0,
            available: ticket.available !== undefined ? ticket.available : true,
            // Respect hasCountdown from DB, only default to true if not explicitly set
            hasCountdown:
              ticket.hasCountdown !== undefined
                ? ticket.hasCountdown
                : !!ticket.endDate,
            endDate: ticket.endDate || null,
            ...ticket,
          };

          // Check if ticket is offline instead of filtering it out
          let isOffline = false;
          let offlineSince = null;

          // Check if ticket has countdown and is expired
          if (normalizedTicket.hasCountdown && normalizedTicket.endDate) {
            const endDate = new Date(normalizedTicket.endDate);
            if (endDate <= now) {
              isOffline = true;
              offlineSince = endDate;
            }
          }

          // Check if ticket has custom offlineTime and event is today
          if (!isOffline && normalizedTicket.offlineTime && event?.startDate) {
            const eventDate = new Date(event.startDate);
            const todayStr = now.toISOString().split('T')[0];
            const eventDateStr = eventDate.toISOString().split('T')[0];

            // Only check if event is today
            if (todayStr === eventDateStr) {
              const [hours, minutes] = normalizedTicket.offlineTime.split(':').map(Number);
              const offlineDateTime = new Date(eventDate);
              offlineDateTime.setHours(hours, minutes, 0, 0);

              if (now >= offlineDateTime) {
                isOffline = true;
                offlineSince = offlineDateTime;
              }
            }
          }

          // Check goOfflineAtEventStart
          if (!isOffline && normalizedTicket.goOfflineAtEventStart && event?.startDate) {
            const eventStartDateTime = new Date(event.startDate);

            // If event has startTime, use it to set the time
            if (event.startTime) {
              const [hours, minutes] = event.startTime.split(':').map(Number);
              eventStartDateTime.setHours(hours, minutes, 0, 0);
            }

            if (now >= eventStartDateTime) {
              isOffline = true;
              offlineSince = eventStartDateTime;
            }
          }

          return {
            ...normalizedTicket,
            isOffline,
            offlineSince,
          };
        })
        .filter(Boolean)
        // Don't filter out offline tickets anymore - show them all
    );
  }, [ticketSettings, event]);

  // Memoize these functions to prevent recreation on each render
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const options = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }, []);

  const formatCountdown = useCallback((endDate) => {
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
  }, []);

  // Memoize renderCountdown to prevent unnecessary recreations
  const renderCountdown = useCallback(
    (ticket) => {
      if (!ticket.hasCountdown || !ticket.endDate) return null;

      const countdownText = formatCountdown(ticket.endDate);
      if (!countdownText) return null;

      return (
        <div className="ticket-countdown" style={{ color: primaryColor }}>
          <RiAlarmLine /> {countdownText}
        </div>
      );
    },
    [formatCountdown, primaryColor]
  );

  // Memoize renderLimitedBadge for limited quantity tickets
  const renderLimitedBadge = useCallback(
    (ticket) => {
      if (!ticket.isLimited || !ticket.maxTickets) return null;

      const remaining = ticket.maxTickets - (ticket.soldCount || 0);
      if (remaining <= 0) return null;

      return (
        <div className="ticket-limited-badge" style={{ color: primaryColor }}>
          <RiPriceTag3Line /> {remaining} left
        </div>
      );
    },
    [primaryColor]
  );

  // Render offline deadline badge - shows offline time if set
  const renderOfflineDeadline = useCallback(
    (ticket) => {
      // Skip if ticket is already offline
      if (ticket.isOffline) return null;

      let deadlineTime = null;
      let isEventDay = false;

      const now = new Date();

      // Check for custom offline time
      if (ticket.offlineTime) {
        deadlineTime = ticket.offlineTime;
        if (event?.startDate) {
          const eventDate = new Date(event.startDate);
          isEventDay = now.toISOString().split('T')[0] === eventDate.toISOString().split('T')[0];
        }
      }

      // Check for goOfflineAtEventStart
      if (!deadlineTime && ticket.goOfflineAtEventStart && event?.startTime) {
        deadlineTime = event.startTime;
        if (event?.startDate) {
          const eventDate = new Date(event.startDate);
          isEventDay = now.toISOString().split('T')[0] === eventDate.toISOString().split('T')[0];
        }
      }

      if (!deadlineTime) return null;

      return (
        <div className="ticket-offline-deadline" style={{ color: primaryColor }}>
          <RiTimeLine /> {isEventDay ? `Online until ${deadlineTime}` : `Goes offline at ${deadlineTime}`}
        </div>
      );
    },
    [event, primaryColor]
  );

  // Memoize calculateRemainingTime
  const calculateRemainingTime = useCallback((endDate) => {
    if (!endDate) return null;

    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  }, []);

  // Initialize and update countdowns - optimize interval handling
  useEffect(() => {
    if (!ticketSettings || ticketSettings.length === 0) return;

    // Create a function to update countdowns that doesn't rely on closure over ticketSettings
    const updateCountdowns = () => {
      setCountdowns((prevCountdowns) => {
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
        return updatedCountdowns;
      });
    };

    // Initialize countdowns immediately
    updateCountdowns();

    // Update countdowns every minute
    const interval = setInterval(updateCountdowns, 60000);

    return () => clearInterval(interval);
  }, [ticketSettings, calculateRemainingTime]);

  // Memoize handleQuantityChange to prevent recreation on each render
  const handleQuantityChange = useCallback((ticketId, change) => {
    setTicketQuantities((prev) => ({
      ...prev,
      [ticketId]: Math.max(0, (prev[ticketId] || 0) + change),
    }));
  }, []);

  // Calculate total price - memoized to prevent recalculation on each render
  const calculateTotal = useMemo(() => {
    return ticketSettings
      .reduce((total, ticket) => {
        return total + ticket.price * (ticketQuantities[ticket._id] || 0);
      }, 0)
      .toFixed(2);
  }, [ticketSettings, ticketQuantities]);

  // Check if any tickets are selected - memoized
  const hasSelectedTickets = useMemo(() => {
    return Object.values(ticketQuantities).some((quantity) => quantity > 0);
  }, [ticketQuantities]);

  // Validate email format - memoized
  const isValidEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Validate form - memoized
  const isFormValid = useCallback(() => {
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
  }, [firstName, lastName, email, hasSelectedTickets, isValidEmail]);

  // Handle field change - memoized
  const handleFieldChange = useCallback((field, value) => {
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
    setFormErrors((prev) => ({
      ...prev,
      [field]: null,
    }));
  }, []);

  // Handle checkout - memoized
  const handleCheckout = useCallback(async () => {
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
          paxPerTicket: ticket.paxPerTicket || 1,
        }));

      if (selectedTickets.length === 0) {
        toast.showError("Please select at least one ticket");
        setIsCheckoutLoading(false);
        return;
      }

      // Determine payment method from the first ticket (they should all have the same payment method)
      const paymentMethod =
        ticketSettings.length > 0 ? ticketSettings[0].paymentMethod : "online";

      // Show loading state with the loading toast
      loadingToast = toast.showLoading(
        paymentMethod === "online"
          ? "Preparing checkout..."
          : "Generating tickets..."
      );

      if (paymentMethod === "online") {
        // Original online payment flow with Stripe
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
      } else {
        // Pay at entrance flow - direct ticket creation
        const response = await axiosInstance.post(`/tickets/create-direct`, {
          firstName,
          lastName,
          email,
          eventId,
          tickets: selectedTickets,
        });

        if (response.data.success) {
          // Update the loading toast to show success
          if (loadingToast) {
            loadingToast.update({
              message: "Tickets created! Check your email.",
              type: "success",
            });
          }

          // Clear the form and selected tickets
          setFirstName("");
          setLastName("");
          setEmail("");
          setTicketQuantities({});

          // Short delay to ensure the toast is visible
          setTimeout(() => {
            if (loadingToast) {
              loadingToast.dismiss();
            }
            toast.showSuccess(
              "Tickets have been created and sent to your email. Please pay at the entrance."
            );
          }, 2000);

          setIsCheckoutLoading(false);
        } else {
          // Dismiss the loading toast
          if (loadingToast) {
            loadingToast.dismiss();
          }

          toast.showError("Failed to create tickets. Please try again.");
          setIsCheckoutLoading(false);
        }
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
  }, [
    isFormValid,
    formErrors,
    toast,
    isCheckoutLoading,
    ticketSettings,
    ticketQuantities,
    firstName,
    lastName,
    email,
    eventId,
  ]);

  // Memoize the retry function to prevent recreation on each render
  const handleRetry = useCallback(() => {
    if (fetchTicketSettings) {
      setLoadingTickets(true);
      fetchTicketSettings(eventId)
        .then((settings) => {
          setTicketSettings(settings || []);
        })
        .catch((err) => {
          console.error("Error in manual reload:", err);
          setTicketSettings([]);
        })
        .finally(() => {
          setLoadingTickets(false);
        });
    }
  }, [fetchTicketSettings, eventId]);

  // Helper function to format offline time
  const formatOfflineTime = useCallback((date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Memoize the ticket item rendering to prevent unnecessary re-renders
  const renderTicketItem = useCallback(
    (ticket) => (
      <div
        key={ticket._id}
        className={`ticket-item ${
          (ticketQuantities[ticket._id] || 0) > 0 ? "active" : ""
        } ${ticket.isOffline ? "ticket-offline" : ""}`}
        style={{
          "--ticket-accent-color": ticket.color || primaryColor,
        }}
      >
        {/* Offline overlay */}
        {ticket.isOffline && (
          <div className="ticket-offline-overlay">
            <RiDoorLine className="offline-icon" />
            <span className="offline-message">
              {ticket.offlineSince
                ? `Tickets offline since ${formatOfflineTime(ticket.offlineSince)}`
                : "Tickets offline"}
            </span>
            <span className="door-message">Further tickets only at the door</span>
          </div>
        )}

        {!ticket.isOffline && renderCountdown(ticket)}
        {!ticket.isOffline && renderLimitedBadge(ticket)}
        {!ticket.isOffline && renderOfflineDeadline(ticket)}
        {ticket.paxPerTicket > 1 && (
          <div className="ticket-group-badge">
            <FaUserFriends />
            <span>{ticket.paxPerTicket} people per ticket</span>
          </div>
        )}
        {ticket.originalPrice > ticket.price && (
          <div
            className="ticket-discount"
            style={{
              backgroundColor: ticket.color || primaryColor,
            }}
          >
            {Math.round(
              ((ticket.originalPrice - ticket.price) / ticket.originalPrice) *
                100
            )}
            % OFF
          </div>
        )}

        <div className="ticket-header">
          <RiTicket2Line style={{ color: ticket.color || primaryColor }} />
          <h4>{ticket.name}</h4>
        </div>

        <div
          className="ticket-price"
          style={{ color: ticket.color || primaryColor }}
        >
          {ticket.originalPrice > ticket.price && (
            <span className="original-price">
              {ticket.originalPrice.toFixed(2)}€
            </span>
          )}
          {ticket.price.toFixed(2)}€
        </div>

        {ticket.description && (
          <p className="ticket-description" style={{ whiteSpace: "pre-wrap" }}>
            {ticket.description}
          </p>
        )}

        <div className="ticket-quantity">
          <button
            className="quantity-btn"
            onClick={() => handleQuantityChange(ticket._id, -1)}
            disabled={ticket.isOffline || (ticketQuantities[ticket._id] || 0) === 0}
          >
            -
          </button>
          <span>{ticketQuantities[ticket._id] || 0}</span>
          <button
            className="quantity-btn"
            onClick={() => handleQuantityChange(ticket._id, 1)}
            disabled={ticket.isOffline}
          >
            +
          </button>
        </div>
      </div>
    ),
    [
      ticketQuantities,
      primaryColor,
      renderCountdown,
      renderLimitedBadge,
      renderOfflineDeadline,
      handleQuantityChange,
      formatOfflineTime,
    ]
  );

  // Helper function to calculate discount percentage
  const calculateDiscountPercentage = (doorPrice, onlinePrice) => {
    if (!doorPrice || !onlinePrice || doorPrice <= onlinePrice) return null;
    const discount = ((doorPrice - onlinePrice) / doorPrice) * 100;
    return Math.round(discount);
  };

  // Render tickets directly without nested containers
  return (
    <div className={`tickets-wrapper ${seamless ? "seamless" : ""}`}>
      <div className="tickets-container">
        <h3 className="tickets-title">Tickets</h3>

        {loadingTickets ? (
          <div className="tickets-loading">
            <LoadingSpinner color={primaryColor} />
            <p>Loading tickets...</p>
          </div>
        ) : validatedTickets.length > 0 ? (
          <>
            {/* Door Price Hint */}
            {validatedTickets.length > 0 &&
              validatedTickets[0].doorPrice > 0 &&
              validatedTickets[0].doorPrice > validatedTickets[0].price && (
                <div style={{ textAlign: 'center' }}>
                  <div className="door-price-hint">
                    <span className="door-price-value">
                      {validatedTickets[0].doorPrice.toFixed(0)}€ at door
                    </span>
                    <span className="door-price-savings">
                      Save {calculateDiscountPercentage(
                        validatedTickets[0].doorPrice,
                        validatedTickets[0].price
                      )}%
                    </span>
                  </div>
                </div>
              )}

            <div className="tickets-list">
              {validatedTickets.map(renderTicketItem)}
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
                        formTouched.firstName && formErrors.firstName
                          ? "error"
                          : ""
                      }
                    />
                    {formTouched.firstName && formErrors.firstName && (
                      <div className="error-message">
                        {formErrors.firstName}
                      </div>
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
                        formTouched.lastName && formErrors.lastName
                          ? "error"
                          : ""
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
                      onChange={(e) =>
                        handleFieldChange("email", e.target.value)
                      }
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
                  <span
                    className="total-amount"
                    style={{ color: checkoutColor }}
                  >
                    {calculateTotal}€
                  </span>
                </div>

                {/* Removed the exclusive online discount section from checkout area */}

                {/* Checkout payment method with enhanced animations */}
                {validatedTickets.length > 0 && (
                  <motion.div
                    className={`checkout-payment-method ${
                      validatedTickets[0].paymentMethod === "online"
                        ? "online-payment"
                        : "entrance-payment"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <div className="payment-method">
                      <div className="payment-icon">
                        {validatedTickets[0].paymentMethod === "online" ? (
                          <FaLock />
                        ) : (
                          <FaMapMarkerAlt />
                        )}
                      </div>
                      <div className="payment-details">
                        <h3>
                          {validatedTickets[0].paymentMethod === "online"
                            ? "Secure Online Payment"
                            : "Pay at Entrance"}
                        </h3>
                        <p>
                          {validatedTickets[0].paymentMethod === "online"
                            ? "Your payment is secured with industry-standard encryption"
                            : "Please be ready to pay at the door"}
                        </p>
                      </div>
                    </div>
                    {validatedTickets[0].paymentMethod === "online" && (
                      <motion.div
                        className="online-payment-icons"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                      >
                        <FaRegCreditCard />
                        <FaCreditCard />
                        <FaPaypal />
                        <FaApple />
                        <FaGooglePay />
                      </motion.div>
                    )}
                  </motion.div>
                )}

                <button
                  className="checkout-button"
                  onClick={handleCheckout}
                  disabled={isCheckoutLoading}
                  style={{
                    background: "#d4af37",
                    backgroundImage: `linear-gradient(to bottom, #e5c158, #d4af37)`,
                  }}
                >
                  {isCheckoutLoading ? (
                    <>
                      <LoadingSpinner size="small" color="#000" />
                      <span>Processing...</span>
                    </>
                  ) : validatedTickets[0].paymentMethod === "online" ? (
                    "Buy Tickets"
                  ) : (
                    "Get Tickets"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-tickets">
            <p>No tickets available for this event.</p>
            <button
              className="retry-button"
              onClick={handleRetry}
              style={{ color: primaryColor }}
            >
              <RiRefreshLine /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the entire component to prevent unnecessary re-renders from parent
export default React.memo(Tickets);
