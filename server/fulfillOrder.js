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
  try {
    // Parse the tickets from session metadata
    const tickets = JSON.parse(session.metadata.tickets || "[]");
    const eventId = session.metadata.eventId;

    // Get customer email from session (try multiple possible locations)
    const email =
      session.metadata.email ||
      session.customer_email ||
      session.customer_details?.email ||
      "";

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

    if (!email) {
      throw new Error(
        "Customer email is required but was not found in the session data"
      );
    }

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber(session.id);

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

    // Update ticket counts in TicketSettings
    for (const ticket of tickets) {
      // Find the ticket settings and increment the soldCount
      await TicketSettings.findByIdAndUpdate(
        ticket.ticketId,
        { $inc: { soldCount: ticket.quantity } },
        { new: true }
      );

      console.log(
        `Updated soldCount for ticket ${ticket.name} (${ticket.ticketId}), sold ${ticket.quantity} tickets`
      );
    }

    // Send confirmation email
    await sendEmail(order);

    return order;
  } catch (error) {
    console.error("Error fulfilling order:", error);
    throw error;
  }
};

module.exports = {
  fulfillOrder,
};
