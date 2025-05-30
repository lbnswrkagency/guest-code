const Member = require("../models/memberModel");
const Event = require("../models/eventsModel"); // To validate eventId if provided

// Lookup a member by their 5-digit memberNumber
exports.lookupMember = async (req, res) => {
  try {
    const { memberNumber } = req.params;
    if (!memberNumber || !/^\d{5}$/.test(memberNumber)) {
      return res
        .status(400)
        .json({ message: "Valid 5-digit member number is required." });
    }

    const member = await Member.findOne({ memberNumber });
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    // Optional: If an eventId is passed in query, reset paxChecked if member's last check-in was for a different event.
    const { eventId } = req.query;
    if (
      eventId &&
      member.lastCheckInEventId &&
      member.lastCheckInEventId.toString() !== eventId
    ) {
      // If current event is different from last check-in event, reset paxChecked for this new event interaction.
      // This logic assumes a member's pax count resets per event.
      member.paxChecked = 0;
      // We might not save this change here, but rather let the check-in process handle it.
      // Or, we decide that paxChecked is always reset if eventId changes. For now, just return it reset.
    }

    res.status(200).json(member);
  } catch (error) {
    console.error("Error looking up member:", error);
    res.status(500).json({ message: "Server error while looking up member." });
  }
};

// Register a new member
exports.registerMember = async (req, res) => {
  try {
    const { memberNumber, firstName, lastName, brandId } = req.body;

    if (!memberNumber || !/^\d{5}$/.test(memberNumber)) {
      return res
        .status(400)
        .json({ message: "Valid 5-digit member number is required." });
    }
    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "First name and last name are required." });
    }

    let existingMember = await Member.findOne({ memberNumber });
    if (existingMember) {
      return res
        .status(409)
        .json({ message: "This member number is already registered." });
    }

    const newMember = new Member({
      memberNumber,
      firstName,
      lastName,
      brandId: brandId || null, // Optional
    });

    await newMember.save();
    res
      .status(201)
      .json({ message: "Member registered successfully.", member: newMember });
  } catch (error) {
    console.error("Error registering member:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({
          message: "This member number is already registered (duplicate key).",
        });
    }
    res.status(500).json({ message: "Server error while registering member." });
  }
};

// Update member's paxChecked (check-in / check-out)
exports.updateMemberPax = async (req, res) => {
  try {
    const { memberNumber } = req.params;
    const { increment, eventId } = req.body; // eventId to record where the check-in happened

    if (!memberNumber || !/^\d{5}$/.test(memberNumber)) {
      return res
        .status(400)
        .json({ message: "Valid 5-digit member number is required." });
    }
    if (typeof increment !== "boolean") {
      return res
        .status(400)
        .json({ message: "Increment (true/false) is required." });
    }

    const member = await Member.findOne({ memberNumber });
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    // If eventId is provided and different from last check-in, reset paxChecked
    if (
      eventId &&
      member.lastCheckInEventId &&
      member.lastCheckInEventId.toString() !== eventId
    ) {
      console.log(
        `Member ${memberNumber} checked into new event ${eventId}. Resetting paxChecked.`
      );
      member.paxChecked = 0;
    }

    if (increment) {
      // Check-in
      if (member.paxChecked >= member.pax) {
        return res
          .status(400)
          .json({ message: "Maximum PAX already checked in for this member." });
      }
      member.paxChecked += 1;
    } else {
      // Check-out
      if (member.paxChecked <= 0) {
        return res
          .status(400)
          .json({ message: "PAX checked in is already zero." });
      }
      member.paxChecked -= 1;
    }

    if (eventId) {
      member.lastCheckInEventId = eventId;
    }

    await member.save();
    res.status(200).json({
      message: `Member PAX ${
        increment ? "incremented" : "decremented"
      } successfully.`,
      member,
    });
  } catch (error) {
    console.error("Error updating member PAX:", error);
    res
      .status(500)
      .json({ message: "Server error while updating member PAX." });
  }
};
