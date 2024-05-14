const LineUp = require("../models/lineupModel");

exports.createLineUp = async (req, res) => {
  const { name, role, title, event } = req.body;
  const avatar = req.file ? req.file.path : undefined; // Only set avatar if file is present

  console.log("REQ BODY CREATE", req.body);
  try {
    const newLineUp = new LineUp({
      name,
      role,
      title,
      event,
      ...(avatar && { avatar }),
    });
    await newLineUp.save();
    res
      .status(201)
      .json({ message: "Artist created successfully", lineup: newLineUp });
  } catch (error) {
    res.status(400).json({ message: "Error creating artist", error });
  }
};

exports.editLineUp = async (req, res) => {
  const { id } = req.params;
  const { name, role, title, event } = req.body;
  const avatar = req.file ? req.file.path : undefined;

  const updates = {
    name,
    role,
    title,
    event,
    ...(avatar && { avatar }), // Only include avatar in the update if it's present
  };

  try {
    const updatedLineUp = await LineUp.findByIdAndUpdate(id, updates, {
      new: true,
    });
    res
      .status(200)
      .json({ message: "Artist updated successfully", lineup: updatedLineUp });
  } catch (error) {
    res.status(400).json({ message: "Error updating artist", error });
  }
};

exports.deleteLineUp = async (req, res) => {
  const { id } = req.params;

  try {
    await LineUp.findByIdAndDelete(id);
    res.status(200).json({ message: "Artist deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting artist", error });
  }
};

exports.getLineUpsByEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const lineups = await LineUp.find({ event: eventId });
    res.status(200).json(lineups);
  } catch (error) {
    res.status(400).json({ message: "Error fetching lineups", error });
  }
};
