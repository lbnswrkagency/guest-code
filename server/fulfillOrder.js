const Order = require("./models/orderModel");
const Event = require("./models/eventsModel");
const { sendEmail } = require("./sendEmail");
// const { sendInvoice } = require("./sendInvoice");
const UserChallenge = require("./models/userChallengeModel");
const Challenge = require("./models/challengeModel");

const fulfillOrder = async (session, billingAddress) => {
  try {
    // Parse the tickets from session metadata
    const tickets = JSON.parse(session.metadata.tickets);
    const eventId = session.metadata.eventId;

    // Create the order
    const order = await Order.create({
      eventId,
      email: session.metadata.email,
      firstName: session.metadata.firstName,
      lastName: session.metadata.lastName,
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

    // Send confirmation email
    await sendEmail(order);

    console.log(`Order fulfilled: ${order._id}`);
    return order;
  } catch (error) {
    console.error("Error fulfilling order:", error);
    throw error;
  }
};

module.exports = {
  fulfillOrder,
};
