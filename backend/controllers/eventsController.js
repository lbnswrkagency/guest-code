const Event = require("../models/Event");
const User = require("../models/User");
const GuestCode = require("../models/GuestCode");
const QRCode = require("qrcode");

const { sendQRCodeEmail } = require("../utils/email");

const onToBoolean = (value) => {
  return value === "on";
};

const generateUniqueLink = async () => {
  const link = Math.random().toString(36).substr(2, 8);
  const eventExists = await Event.findOne({ link });
  if (eventExists) {
    return generateUniqueLink();
  }
  return link;
};

exports.createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      user: req.user._id, // Add the user ID from the request
      guestCode: onToBoolean(req.body.guestCode),
      friendsCode: onToBoolean(req.body.friendsCode),
      ticketCode: onToBoolean(req.body.ticketCode),
      tableCode: onToBoolean(req.body.tableCode),
      link: await generateUniqueLink(),
    };

    const event = new Event(eventData);
    await event.save();

    // Add the event to the user's events array
    const user = await User.findById(req.body.user);

    user.events.push(event._id);
    await user.save();

    res.status(201).json({ event });
  } catch (error) {
    console.warn(error);
    res.status(400).json({ message: "Error creating event", error });
  }
};

exports.getEventByLink = async (req, res) => {
  try {
    const event = await Event.findOne({ link: req.params.eventLink });
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }
    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({ user: req.user._id }); // Get events only created by the user
    res.status(200).json({ success: true, events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.editEvent = async (req, res) => {
  const eventId = req.params.eventId;
  const updatedEventData = req.body;

  try {
    const event = await Event.findByIdAndUpdate(eventId, updatedEventData, {
      new: true,
    });

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.deleteEvent = async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const event = await Event.findByIdAndRemove(eventId);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    // Remove the event from the user's events array
    const user = await User.findById(req.user._id);
    user.events.pull(eventId);
    await user.save();

    res.status(200).json({ success: true, message: "Event deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }
    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getEventPage = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }
    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.generateGuestCode = async (req, res) => {
  try {
    const { name, email, condition, eventId, pax, paxChecked } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const guestCode = new GuestCode({
      name,
      email,
      condition,
      event: eventId,
      pax,
      paxChecked,
    });

    await guestCode.save();

    event.guestCodes.push(guestCode._id);
    await event.save();

    // Generate the QR code

    const qrCodeDataURL = await QRCode.toDataURL(`${guestCode._id}`, {
      errorCorrectionLevel: "L",
    });

    // Send the QR code via email
    await sendQRCodeEmail(name, email, condition, pax, qrCodeDataURL, event);

    res.status(201).json({ message: "Guest code created and email sent" });
  } catch (error) {
    console.error("Error generating guest code:", error);
    res.status(500).json({ error: "Error generating guest code" });
  }
};
