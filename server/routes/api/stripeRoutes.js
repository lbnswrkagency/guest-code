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
    let baseUrl = process.env.CLIENT_BASE_URL || "http://localhost:9231";

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
        // Note: payment_method_options.link.enabled is not supported in the current Stripe API version
      });
    } catch (stripeError) {
      console.error("[Stripe API] Stripe session creation error:", {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
        detail: stripeError.detail,
        docUrl: stripeError.docUrl,
        requestId: stripeError.requestId,
        stack: stripeError.stack,
      });

      console.error("[Stripe API] Error creating checkout session:", {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        stack: stripeError.stack,
      });

      // Log more detailed information about the request
      console.error("[Stripe API] Invalid request details:", {
        param: stripeError.param,
        detail: stripeError.detail,
        docUrl: stripeError.docUrl,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
      });

      // Log Stripe configuration
      console.error("[Stripe API] Stripe configuration:", {
        keyProvided: !!process.env.STRIPE_SECRET_KEY,
        keyLength: process.env.STRIPE_SECRET_KEY
          ? process.env.STRIPE_SECRET_KEY.length
          : 0,
        keyPrefix: process.env.STRIPE_SECRET_KEY
          ? process.env.STRIPE_SECRET_KEY.substring(0, 3) + "_"
          : "none",
        environment: process.env.NODE_ENV || "development",
      });

      // Log request details
      console.error("[Stripe API] Request details:", {
        body: req.body,
        headers: {
          host: req.headers.host,
          origin: req.headers.origin,
          referer: req.headers.referer,
          "user-agent": req.headers["user-agent"],
        },
        baseUrl: baseUrl,
      });

      return res.status(400).json({
        error: "Failed to create checkout session",
        message: stripeError.message,
        code: stripeError.code,
        docUrl: stripeError.docUrl,
      });
    }

    console.log("[Stripe API] Checkout session created successfully:", {
      sessionId: session.id,
      url: session.url,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error(
      "[Stripe API] Unhandled error in checkout session creation:",
      {
        message: error.message,
        type: error.type || error.name,
        code: error.code,
        stack: error.stack,
      }
    );

    // Only log detailed Stripe errors if they haven't been handled already
    if (error.type === "StripeInvalidRequestError") {
      console.error("[Stripe API] Stripe API error details:", {
        param: error.param,
        detail: error.detail,
        docUrl: error.docUrl || error.doc_url,
        statusCode: error.statusCode,
        requestId: error.requestId,
      });
    }

    // Return a generic error message to the client
    return res.status(500).json({
      error: "An unexpected error occurred while creating the checkout session",
      message: error.message,
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
        // Check if order has an associated commission
        let commissionInfo = null;
        if (order.commissionId) {
          // Include basic commission info if present
          try {
            const Commission = require("../../models/commissionModel");
            const commission = await Commission.findById(order.commissionId);
            if (commission) {
              commissionInfo = {
                id: commission._id,
                amount: commission.commissionAmount,
                status: commission.status,
                isGuestPurchase: commission.isGuestPurchase,
              };
            }
          } catch (commissionError) {
            console.error("Error retrieving commission:", commissionError);
            // Continue even if commission lookup fails
          }
        }

        res.json({
          success: true,
          order: {
            _id: order._id,
            eventId: order.eventId,
            totalAmount: order.totalAmount,
            originalAmount: order.originalAmount,
            originalCurrency: order.originalCurrency,
            conversionRate: order.conversionRate,
            vatRate: order.vatRate,
            status: order.status,
            invoiceNumber: order.invoiceNumber,
            stripeSessionId: order.stripeSessionId,
            commission: commissionInfo,
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
