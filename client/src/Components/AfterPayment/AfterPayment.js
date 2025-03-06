import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import axiosInstance from "../../utils/axiosConfig";
import "./AfterPayment.scss";
import {
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiMailLine,
} from "react-icons/ri";

const AfterPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState("loading");
  const [order, setOrder] = useState(null);
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  // Function to generate invoice number from session ID
  const generateInvoiceNumber = (sessionId) => {
    if (!sessionId) return "INV-0000";
    // Take the last 4 characters of the session ID
    const shortCode = sessionId.slice(-4).toUpperCase();
    return `INV-${shortCode}`;
  };

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const eventId = searchParams.get("eventId");
    if (!sessionId) {
      setStatus("error");
      return;
    }

    if (!verificationAttempted) {
      const verifyPayment = async () => {
        try {
          const response = await axiosInstance.get(
            `/stripe/verify-payment/${sessionId}`
          );
          if (response.data.success) {
            setStatus("success");
            setOrder(
              response.data.order || {
                eventId: response.data.eventId,
                stripeSessionId: sessionId,
              }
            );
          } else {
            setStatus("error");
            toast.showError("Payment verification failed");
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          setStatus("error");
          toast.showError("Failed to verify payment");
        } finally {
          setVerificationAttempted(true);
        }
      };

      verifyPayment();
    }
  }, [searchParams, toast, verificationAttempted]);

  const handleContinue = async () => {
    const eventId = order?.eventId || searchParams.get("eventId");
    if (eventId) {
      try {
        // Fetch event data to create pretty URL
        const { data } = await axiosInstance.get(`/events/${eventId}`);

        if (data.success && data.event) {
          const event = data.event;

          // Format date for URL (MMDDYY)
          const eventDate = new Date(event.date);
          const month = String(eventDate.getMonth() + 1).padStart(2, "0");
          const day = String(eventDate.getDate()).padStart(2, "0");
          const year = String(eventDate.getFullYear()).slice(2);
          const dateSlug = `${month}${day}${year}`;

          // No longer need a title slug, using ultra-simplified format

          // Get brand username
          const brandUsername = event.brand?.username;

          if (brandUsername) {
            // Construct URL based on user authentication status with ultra-simplified format
            const eventPath = user
              ? `/@${user.username}/@${brandUsername}/${dateSlug}`
              : `/@${brandUsername}/${dateSlug}`;

            navigate(eventPath);
            return;
          }
        }

        // Fallback to old URL if any data is missing
        navigate(`/events/${eventId}`);
      } catch (error) {
        console.error("[AfterPayment] Error fetching event data:", error);
        // Fallback to old URL if there's an error
        navigate(`/events/${eventId}`);
      }
    } else {
      navigate("/events");
    }
  };

  return (
    <div className="after-payment">
      <div className="payment-status-card">
        {status === "loading" && (
          <motion.div
            className="status-content loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <RiLoader4Line className="spinning" />
            <h2>Verifying Payment</h2>
            <p>Please wait while we confirm your payment...</p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            className="status-content success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <RiCheckLine />
            <h2>Payment Successful!</h2>
            <p>Thank you for your purchase. Your order has been confirmed.</p>

            <div className="email-notification">
              <RiMailLine />
              <p>Please check your email for your tickets and invoice</p>
            </div>

            {order && (
              <div className="order-details">
                <p>
                  Invoice Number: {generateInvoiceNumber(order.stripeSessionId)}
                </p>
                <p>Total Amount: {order.totalAmount?.toFixed(2)}€</p>
              </div>
            )}
            <motion.button
              className="continue-button"
              onClick={handleContinue}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Return to Event
            </motion.button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            className="status-content error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <RiCloseLine />
            <h2>Payment Failed</h2>
            <p>
              We couldn't verify your payment. Please try again or contact
              support.
            </p>
            <motion.button
              className="continue-button"
              onClick={() => navigate(-1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Go Back
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AfterPayment;
