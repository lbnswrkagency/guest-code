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
    let baseUrl = process.env.CLIENT_BASE_URL || "http://localhost:3000";

    // Log the raw environment variable for debugging
    console.log(
      "[Stripe API] Raw CLIENT_BASE_URL:",
      process.env.CLIENT_BASE_URL
    );

    // Check for common issues in the URL
    if (baseUrl) {
      // Remove any whitespace, newlines, or carriage returns
      baseUrl = baseUrl.trim().replace(/[\r\n\s]+/g, "");

      // Make sure the URL starts with http:// or https://
      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        baseUrl = `https://${baseUrl}`;
      }

      // Ensure there's no trailing slash
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }
    } else {
      // Use a default URL if none is provided
      baseUrl = "https://www.guest-code.com";
    }

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
      // Validate the URLs before creating the session
      const cleanBaseUrl = baseUrl
        ? baseUrl.trim().replace(/[\r\n]+/g, "")
        : "";

      // Create the URLs with the cleaned baseUrl
      let successUrl, cancelUrl, validSuccessUrl, validCancelUrl;

      try {
        successUrl = cleanBaseUrl
          ? `${cleanBaseUrl}/paid?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`
          : `https://www.guest-code.com/paid?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`;

        cancelUrl = cleanBaseUrl
          ? `${cleanBaseUrl}/events/${eventId}`
          : `https://www.guest-code.com/events/${eventId}`;

        // Ensure the URLs are valid by checking if they start with http:// or https://
        validSuccessUrl =
          successUrl.startsWith("http://") || successUrl.startsWith("https://")
            ? successUrl
            : `https://www.guest-code.com/paid?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`;

        validCancelUrl =
          cancelUrl.startsWith("http://") || cancelUrl.startsWith("https://")
            ? cancelUrl
            : `https://www.guest-code.com/events/${eventId}`;

        // Final validation - ensure no newlines or invalid characters
        validSuccessUrl = validSuccessUrl.replace(/[\r\n\s]+/g, "");
        validCancelUrl = validCancelUrl.replace(/[\r\n\s]+/g, "");

        // Validate URLs with a URL constructor
        new URL(validSuccessUrl);
        new URL(validCancelUrl);
      } catch (urlError) {
        console.error("[Stripe API] Error creating URLs:", urlError);
        // Fallback to hardcoded URLs
        validSuccessUrl = `https://www.guest-code.com/paid?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`;
        validCancelUrl = `https://www.guest-code.com/events/${eventId}`;
      }

      console.log("[Stripe API] Using URLs:", {
        successUrl,
        cancelUrl,
      });

      console.log("[Stripe API] Using URLs:", {
        successUrl: validSuccessUrl,
        cancelUrl: validCancelUrl,
        originalBaseUrl: baseUrl,
        cleanedBaseUrl: cleanBaseUrl,
      });

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: validSuccessUrl,
        cancel_url: validCancelUrl,
        customer_email: email,
        billing_address_collection: "required",
        metadata: {
          eventId,
          firstName,
          lastName,
          email,
          ticketsCount: tickets.length,
          tickets: JSON.stringify(tickets),
        },
        automatic_tax: {
          enabled: process.env.STRIPE_ENABLE_TAX === "true",
        },
        customer_creation: "always",
      });

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: validSuccessUrl,
        cancel_url: validCancelUrl,
        customer_email: email,
        billing_address_collection: "required",
        metadata: {
          eventId,
          firstName,
          lastName,
          email,
          ticketsCount: tickets.length,
          tickets: JSON.stringify(tickets),
        },
        automatic_tax: {
          enabled: process.env.STRIPE_ENABLE_TAX === "true",
        },
        customer_creation: "always",
        // Disable Link payment option
        payment_method_options: {
          link: {
            enabled: false,
          },
        },
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
