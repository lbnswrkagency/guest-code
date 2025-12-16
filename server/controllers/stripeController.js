const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});
const Event = require("../models/eventsModel");

// Get the client URL with fallback
const CLIENT_URL = process.env.CLIENT_BASE_URL || "http://localhost:3000";

const checkOutSession = async (req, res) => {
  try {
    const { firstName, lastName, email, eventId, tickets } = req.body;

    // Validate the event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Create line items from tickets with more detailed information
    const line_items = tickets.map((ticket) => ({
      price_data: {
        currency: "eur", // Explicit EUR currency for customer checkout
        product_data: {
          name: ticket.name,
          description: `${event.title} - ${
            ticket.description || "Event ticket"
          }`,
          images: event.flyer?.landscape?.full
            ? [event.flyer.landscape.full]
            : undefined,
          metadata: {
            ticketId: ticket.ticketId,
            eventId: eventId,
          },
        },
        unit_amount: Math.round(ticket.price * 100), // Convert to cents
      },
      quantity: ticket.quantity,
    }));

    // Create the checkout session with absolute URLs
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      // Disable Link payment option to avoid confusion
      payment_method_options: {
        card: {
          setup_future_usage: null,
        },
      },
      line_items,
      mode: "payment",
      success_url: `${CLIENT_URL}/paid?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/events/${eventId}`,
      customer_email: email,
      metadata: {
        eventId,
        firstName,
        lastName,
        email,
        tickets: JSON.stringify(tickets),
        userId: req.user ? req.user._id : undefined, // Add user ID if logged in, otherwise undefined for guests
      },
      billing_address_collection: "required",
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      client_reference_id: eventId,
      locale: "auto", // Changed from "de" to "auto" to use browser's locale
      custom_text: {
        submit: {
          message: "We'll reserve your tickets for 30 minutes.", // Changed to English for consistency
        },
      },
      payment_intent_data: {
        // Add payment intent data to ensure we get currency exchange information
        description: `Tickets for ${tickets.map((t) => t.name).join(", ")}`,
        capture_method: "automatic",
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = { checkOutSession };
