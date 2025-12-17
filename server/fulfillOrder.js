const Order = require("./models/orderModel");
const Event = require("./models/eventsModel");
const TicketSettings = require("./models/ticketSettingsModel");
const { sendEmail } = require("./utils/sendEmail");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Function to create AADE receipt via Accounty API
const createAadeReceipt = async (order, event) => {
  try {
    console.log("[FulfillOrder] Creating AADE receipt via Accounty API");

    const accountyUrl = process.env.ACCOUNTY_API_URL;
    const accountyKey = process.env.ACCOUNTY_API_KEY;

    // Debug: Log the actual values being used
    console.log("[FulfillOrder] DEBUG - Accounty config:", {
      url: accountyUrl,
      keyLength: accountyKey?.length,
      keyStart: accountyKey?.substring(0, 10),
      keyEnd: accountyKey?.substring(accountyKey.length - 5),
    });

    if (!accountyUrl || !accountyKey) {
      console.warn("[FulfillOrder] Accounty API credentials not configured");
      return null;
    }

    // Build receipt payload
    const receiptData = {
      customer: {
        email: order.email,
        firstName: order.firstName,
        lastName: order.lastName,
        address: {
          street: order.billingAddress?.line1 || "",
          city: order.billingAddress?.city || "",
          postalCode: order.billingAddress?.postal_code || "",
          country: order.billingAddress?.country || "GR",
        },
      },
      items: order.tickets.map((ticket) => ({
        description: `${ticket.name} - ${event.title}`,
        quantity: ticket.quantity,
        // Convert gross price to net (customer pays gross, Accounty expects net)
        // For 24% VAT: net = gross / 1.24
        unitPrice: parseFloat((ticket.pricePerUnit / 1.24).toFixed(2)),
        vatCategory: "1", // 24% VAT
      })),
      payment: {
        method: "4", // Credit card
        stripeSessionId: order.stripeSessionId,
        totalAmount: order.originalAmount,
      },
      eventName: event.title,
      eventDate: event.startDate,
      eventTime: event.startTime,
      eventEndTime: event.endTime,
      eventLocation: event.location,
      orderId: order._id.toString(),
      // Brand logo for receipt PDF
      brandLogo: event.brand?.logo?.medium || event.brand?.logo?.full || null,
    };

    console.log("[FulfillOrder] Calling Accounty API with payload:", {
      customer: receiptData.customer.email,
      itemCount: receiptData.items.length,
      totalAmount: receiptData.payment.totalAmount,
    });

    const response = await fetch(`${accountyUrl}/external/receipts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": accountyKey,
      },
      body: JSON.stringify(receiptData),
    });

    const result = await response.json();

    if (result.success) {
      console.log("[FulfillOrder] AADE receipt created successfully:", {
        receiptNumber: result.receipt.receiptNumber,
        mark: result.receipt.mark,
        status: result.receipt.status,
      });

      return {
        accountyId: result.receipt.id,
        receiptNumber: result.receipt.receiptNumber,
        mark: result.receipt.mark,
        qrCode: result.receipt.qrCode,
        status: result.receipt.status,
        errors: result.receipt.errors || [],
        createdAt: new Date(),
      };
    } else {
      console.error("[FulfillOrder] Accounty API error:", result.message);
      return {
        status: "failed",
        errors: [{ code: "API_ERROR", message: result.message }],
        createdAt: new Date(),
      };
    }
  } catch (error) {
    console.error("[FulfillOrder] Error calling Accounty API:", error.message);
    return {
      status: "failed",
      errors: [{ code: "NETWORK_ERROR", message: error.message }],
      createdAt: new Date(),
    };
  }
};

const fulfillOrder = async (session, billingAddress) => {
  console.log("[FulfillOrder] Starting order fulfillment process");
  try {
    console.log("[FulfillOrder] Session metadata:", session.metadata);

    // Check if order already exists with this session ID - prevents race condition
    const existingOrder = await Order.findOne({ stripeSessionId: session.id });
    if (existingOrder) {
      console.log(
        "[FulfillOrder] Order already exists for session ID:",
        session.id
      );
      return existingOrder; // Return existing order, skip duplicate processing
    }

    // Parse the tickets from session metadata
    const tickets = JSON.parse(session.metadata.tickets || "[]");
    console.log("[FulfillOrder] Parsed tickets:", tickets);

    const eventId = session.metadata.eventId;
    console.log("[FulfillOrder] Event ID:", eventId);

    // Get event details including the brand and user (event creator)
    const event = await Event.findById(eventId).populate("brand");
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Get customer email from session (try multiple possible locations)
    const email =
      session.metadata.email ||
      session.customer_email ||
      session.customer_details?.email ||
      "";
    console.log("[FulfillOrder] Customer email:", email);

    // Get customer name from session
    const firstName =
      session.metadata.firstName ||
      (session.customer_details?.name
        ? session.customer_details.name.split(" ")[0]
        : "");
    const lastName =
      session.metadata.lastName ||
      (session.customer_details?.name
        ? session.customer_details.name.split(" ").slice(1).join(" ")
        : "");
    console.log("[FulfillOrder] Customer name:", { firstName, lastName });

    if (!email) {
      console.error("[FulfillOrder] Missing customer email");
      throw new Error(
        "Customer email is required but was not found in the session data"
      );
    }

    // Get currency information
    const originalCurrency = session.currency.toUpperCase(); // Should be "EUR"
    const originalAmount = session.amount_total / 100; // Amount in EUR

    console.log("[FulfillOrder] Payment amount:", {
      currency: originalCurrency,
      amount: originalAmount,
    });

    // Get billing country
    const countryCode = billingAddress?.country || "";

    // Calculate platform fee and host earnings from env
    const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_RATE) || 0.039;
    const platformFee = originalAmount * platformFeeRate;
    const hostEarnings = originalAmount - platformFee;

    console.log("[FulfillOrder] Commission calculation:", {
      originalAmount,
      platformFeeRate: `${platformFeeRate * 100}%`,
      platformFee,
      hostEarnings,
    });

    // VAT rate - default to Greek 24% (event location based, not customer)
    // TODO: When event.country field is added, use that instead
    const vatRate = 24;

    console.log("[FulfillOrder] Creating order in database...");
    // Create the order with embedded commission
    const order = await Order.create({
      eventId,
      email,
      firstName,
      lastName,
      tickets: tickets.map((ticket) => ({
        ticketId: ticket.ticketId,
        name: ticket.name,
        quantity: ticket.quantity,
        pricePerUnit: ticket.price,
      })),
      originalCurrency,
      originalAmount,
      stripeSessionId: session.id,
      billingAddress: {
        line1: billingAddress?.line1 || "",
        line2: billingAddress?.line2 || "",
        city: billingAddress?.city || "",
        state: billingAddress?.state || "",
        postal_code: billingAddress?.postal_code || "",
        country: countryCode,
      },
      // Embedded commission
      platformFeeRate,
      platformFee,
      hostEarnings,
      hostPayoutStatus: "pending",
      // VAT
      vatRate,
      // Status
      status: "completed",
      paymentStatus: "paid",
    });

    console.log("[FulfillOrder] Order created with embedded commission:", {
      orderId: order._id,
      originalAmount,
      platformFee,
      hostEarnings,
      currency: "EUR",
    });

    console.log("[FulfillOrder] Updating ticket counts in TicketSettings...");
    // Update ticket counts in TicketSettings
    for (const ticket of tickets) {
      console.log(
        `[FulfillOrder] Processing ticket: ${ticket.name} (${ticket.ticketId})`
      );
      try {
        // Find the ticket settings and increment the soldCount
        const updatedTicket = await TicketSettings.findByIdAndUpdate(
          ticket.ticketId,
          { $inc: { soldCount: ticket.quantity } },
          { new: true }
        );

        console.log(
          `[FulfillOrder] Updated soldCount for ticket ${ticket.name} (${
            ticket.ticketId
          }), sold ${ticket.quantity} tickets. New total: ${
            updatedTicket?.soldCount || "unknown"
          }`
        );
      } catch (ticketError) {
        console.error(
          `[FulfillOrder] Error updating ticket ${ticket.ticketId}:`,
          ticketError
        );
      }
    }

    // Create AADE receipt via Accounty
    console.log("[FulfillOrder] Creating AADE receipt...");
    let receiptInfo = null;
    try {
      receiptInfo = await createAadeReceipt(order, event);

      if (receiptInfo) {
        // Update order with receipt info
        const receiptSent = receiptInfo.status === "transmitted";
        await Order.findByIdAndUpdate(order._id, {
          aadeReceipt: receiptInfo,
          receiptSent: receiptSent,
        });

        console.log("[FulfillOrder] Order updated with AADE receipt:", {
          receiptNumber: receiptInfo.receiptNumber,
          mark: receiptInfo.mark,
          status: receiptInfo.status,
          receiptSent: receiptSent,
        });
      }
    } catch (receiptError) {
      console.error(
        "[FulfillOrder] Error creating AADE receipt:",
        receiptError
      );
      // Continue with order - receipt can be retried later
    }

    // Send confirmation email
    console.log("[FulfillOrder] Sending confirmation email to customer...");
    try {
      await sendEmail(order, receiptInfo);
      console.log("[FulfillOrder] Confirmation email sent successfully");
    } catch (emailError) {
      console.error(
        "[FulfillOrder] Error sending confirmation email:",
        emailError
      );
      // Don't throw here, we want to continue even if email fails
    }

    console.log("[FulfillOrder] Order fulfillment completed successfully");
    return order;
  } catch (error) {
    console.error("[FulfillOrder] Critical error during order fulfillment:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
};

module.exports = {
  fulfillOrder,
};
