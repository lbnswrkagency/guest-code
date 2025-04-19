// Add a helper function to create an order with items from ticket settings
const createOrderFromTicketSettings = async (eventId, userId, items) => {
  try {
    // Create a new order
    const order = new Order({
      eventId,
      userId,
      tickets: [],
      total: 0,
      status: "pending",
    });

    let total = 0;

    // Process each ticket item
    for (const item of items) {
      // Look up the ticket settings to get current price and details
      const ticketSetting = await mongoose
        .model("TicketSettings")
        .findById(item.ticketSettingId);

      if (!ticketSetting) {
        throw new Error(
          `Ticket setting not found for ID: ${item.ticketSettingId}`
        );
      }

      // Calculate total price for this item
      const itemPrice = ticketSetting.price * item.quantity;
      total += itemPrice;

      // Add the ticket to the order items
      order.tickets.push({
        ticketSettingId: ticketSetting._id,
        name: ticketSetting.name,
        pricePerUnit: ticketSetting.price,
        quantity: item.quantity,
        pax: ticketSetting.paxPerTicket || 1, // Include paxPerTicket from ticket settings
      });
    }

    // Set the total for the order
    order.total = total;

    // Save the order
    await order.save();

    return order;
  } catch (error) {
    console.error("Error creating order from ticket settings:", error);
    throw error;
  }
};

// Create an order
const createOrder = async (req, res) => {
  try {
    const { eventId, items } = req.body;
    const userId = req.user._id;

    // Validate eventId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No tickets selected" });
    }

    // Create the order with ticket settings data
    const order = await createOrderFromTicketSettings(eventId, userId, items);

    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
};
