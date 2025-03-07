const Order = require("./models/orderModel");
const Event = require("./models/eventsModel");
const TicketSettings = require("./models/ticketSettingsModel");
const { sendEmail } = require("./utils/sendEmail");
// const { sendInvoice } = require("./sendInvoice");

// Function to generate invoice number from session ID
const generateInvoiceNumber = (sessionId) => {
  if (!sessionId) return "INV-0000";
  // Take the last 4 characters of the session ID
  const shortCode = sessionId.slice(-4).toUpperCase();
  return `INV-${shortCode}`;
};

const fulfillOrder = async (session, billingAddress) => {
  console.log("[FulfillOrder] Starting order fulfillment process");
  try {
    console.log("[FulfillOrder] Session metadata:", session.metadata);

    // Parse the tickets from session metadata
    const tickets = JSON.parse(session.metadata.tickets || "[]");
    console.log("[FulfillOrder] Parsed tickets:", tickets);

    const eventId = session.metadata.eventId;
    console.log("[FulfillOrder] Event ID:", eventId);

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

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber(session.id);
    console.log("[FulfillOrder] Generated invoice number:", invoiceNumber);

    console.log("[FulfillOrder] Creating order in database...");
    // Create the order
    const order = await Order.create({
      eventId,
      email,
      firstName,
      lastName,
      invoiceNumber,
      tickets: tickets.map((ticket) => ({
        ticketId: ticket.ticketId,
        name: ticket.name,
        quantity: ticket.quantity,
        pricePerUnit: ticket.price,
      })),
      totalAmount: session.amount_total / 100, // Convert from cents
      stripeSessionId: session.id,
      billingAddress: {
        line1: billingAddress?.line1 || "",
        line2: billingAddress?.line2 || "",
        city: billingAddress?.city || "",
        state: billingAddress?.state || "",
        postal_code: billingAddress?.postal_code || "",
        country: billingAddress?.country || "",
      },
      status: "completed",
      paymentStatus: "paid",
    });

    console.log("[FulfillOrder] Order created successfully:", {
      orderId: order._id,
      invoiceNumber: order.invoiceNumber,
      totalAmount: order.totalAmount,
      ticketCount: order.tickets.length,
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

    // Send confirmation email
    console.log("[FulfillOrder] Sending confirmation email to customer...");
    try {
      await sendEmail(order);
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
