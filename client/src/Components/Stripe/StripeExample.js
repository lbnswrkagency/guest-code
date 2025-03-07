import React, { useState, useEffect } from "react";
import Stripe from "./Stripe";
import axiosInstance from "../../utils/axiosConfig";
import { useParams } from "react-router-dom";
import { useToast } from "../Toast/ToastContext";

const StripeExample = () => {
  const { eventId } = useParams();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [ticketSettings, setTicketSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);

        // Fetch event data
        const response = await axiosInstance.get(`/events/${eventId}`);
        setEvent(response.data);

        // Fetch ticket settings
        const ticketResponse = await axiosInstance.get(
          `/ticket-settings/events/${eventId}`
        );
        if (ticketResponse.data && ticketResponse.data.ticketSettings) {
          setTicketSettings(ticketResponse.data.ticketSettings);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching event data:", err);
        setError("Failed to load event data. Please try again.");
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const handleCheckoutComplete = (result) => {
    console.log("Checkout completed:", result);
    // You can add additional logic here if needed
  };

  if (loading) {
    return <div className="loading">Loading event data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!event) {
    return <div className="error">Event not found</div>;
  }

  // Get brand colors if available
  const colors = event.brand?.colors || {
    primary: "#ffc807",
    secondary: "#2196F3",
    background: "rgba(255, 255, 255, 0.05)",
  };

  return (
    <div className="stripe-example">
      <h1>{event.title}</h1>
      {event.subTitle && <h2>{event.subTitle}</h2>}

      <div className="event-details">
        <p>
          <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
        </p>
        <p>
          <strong>Location:</strong> {event.venue}, {event.location}
        </p>
      </div>

      <h2>Tickets</h2>
      <Stripe
        ticketSettings={ticketSettings}
        eventId={eventId}
        colors={colors}
        onCheckoutComplete={handleCheckoutComplete}
      />
    </div>
  );
};

export default StripeExample;
