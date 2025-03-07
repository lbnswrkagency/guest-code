const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../../models/orderModel");

// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  console.log("[Stripe API] Received checkout session request");
  try {
    // Log the request body
    console.log("[Stripe API] Request body:", {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      eventId: req.body.eventId,
      tickets: req.body.tickets,
    });

    const { firstName, lastName, email, eventId, tickets } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !eventId ||
      !tickets ||
      !Array.isArray(tickets) ||
      tickets.length === 0
    ) {
      console.error("[Stripe API] Missing required fields:", {
        firstName,
        lastName,
        email,
        eventId,
        tickets,
      });
      return res
        .status(400)
        .json({ error: "Missing required fields for checkout" });
    }

    // Ensure CLIENT_BASE_URL is properly set
    const baseUrl = process.env.CLIENT_BASE_URL || "http://localhost:3000";
    console.log("[Stripe API] Using base URL:", baseUrl);

    // Log Stripe key status (not the actual key)
    console.log(
      "[Stripe API] Stripe key status:",
      process.env.STRIPE_SECRET_KEY ? "Present" : "Missing"
    );

    const line_items = tickets.map((ticket) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: ticket.name,
          description: ticket.description || undefined,
        },
        unit_amount: Math.round(ticket.price * 100), // Convert to cents
      },
      quantity: ticket.quantity,
    }));
    console.log("[Stripe API] Prepared line items:", line_items);

    console.log("[Stripe API] Creating Stripe checkout session...");
    let session;
    try {
      // Log the session parameters for debugging
      console.log("[Stripe API] Session parameters:", {
        payment_method_types: ["card"],
        line_items: line_items.map((item) => ({
          currency: item.price_data.currency,
          amount: item.price_data.unit_amount,
          name: item.price_data.product_data.name,
          quantity: item.quantity,
        })),
        mode: "payment",
        success_url: `${baseUrl}/paid?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`,
        cancel_url: `${baseUrl}/events/${eventId}`,
        customer_email: email,
        metadata: {
          eventId,
          firstName,
          lastName,
          email,
          ticketsCount: tickets.length,
        },
        automatic_tax: {
          enabled: process.env.STRIPE_ENABLE_TAX === "true",
        },
      });

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: `${baseUrl}/paid?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`,
        cancel_url: `${baseUrl}/events/${eventId}`,
        customer_email: email,
        billing_address_collection: "required",
        metadata: {
          eventId,
          firstName,
          lastName,
          email,
          tickets: JSON.stringify(tickets),
        },
        automatic_tax: {
          enabled: process.env.STRIPE_ENABLE_TAX === "true",
        },
        customer_creation: "always",
      });
    } catch (stripeError) {
      console.error("[Stripe API] Stripe session creation error:", {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
        detail: stripeError.detail,
        docUrl: stripeError.doc_url,
        requestId: stripeError.requestId,
      });
      throw stripeError; // Re-throw to be caught by the outer catch block
    }

    console.log("[Stripe API] Checkout session created successfully:", {
      sessionId: session.id,
      url: session.url,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe API] Error creating checkout session:", {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack,
    });

    // Log more details about the error
    if (error.type === "StripeInvalidRequestError") {
      console.error("[Stripe API] Invalid request details:", {
        param: error.param,
        detail: error.detail,
        docUrl: error.doc_url,
        statusCode: error.statusCode,
        requestId: error.requestId,
      });
    }

    // Check if Stripe key is valid
    console.error("[Stripe API] Stripe configuration:", {
      keyProvided: !!process.env.STRIPE_SECRET_KEY,
      keyLength: process.env.STRIPE_SECRET_KEY
        ? process.env.STRIPE_SECRET_KEY.length
        : 0,
      keyPrefix: process.env.STRIPE_SECRET_KEY
        ? process.env.STRIPE_SECRET_KEY.substring(0, 3)
        : "none",
      environment: process.env.NODE_ENV,
    });

    // Log request details for debugging
    console.error("[Stripe API] Request details:", {
      body: req.body,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        "user-agent": req.headers["user-agent"],
      },
      baseUrl: process.env.CLIENT_BASE_URL,
    });

    // Send a more detailed error response
    res.status(500).json({
      error: "Failed to create checkout session",
      message: error.message,
      code: error.code || "unknown",
      type: error.type || "unknown",
    });
  }
});

// Verify payment status
router.get("/verify-payment/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      // Find the order in our database
      const order = await Order.findOne({ stripeSessionId: sessionId });

      if (order) {
        res.json({
          success: true,
          order: {
            _id: order._id,
            eventId: order.eventId,
            totalAmount: order.totalAmount,
            status: order.status,
            invoiceNumber: order.invoiceNumber,
            stripeSessionId: order.stripeSessionId,
          },
        });
      } else {
        // Generate invoice number from session ID for cases where order is not found
        const generateInvoiceNumber = (sessionId) => {
          if (!sessionId) return "INV-0000";
          const shortCode = sessionId.slice(-4).toUpperCase();
          return `INV-${shortCode}`;
        };

        // Order not found but payment was successful
        res.json({
          success: true,
          message: "Payment verified but order details not found",
          eventId: session.metadata.eventId, // Add eventId from session metadata
          stripeSessionId: sessionId,
          invoiceNumber: generateInvoiceNumber(sessionId),
        });
      }
    } else {
      res.json({
        success: false,
        message: "Payment not completed",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
    });
  }
});

module.exports = router;
