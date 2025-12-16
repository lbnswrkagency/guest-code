const Location = require("../models/locationModel");

// Create new location
exports.createLocation = async (req, res) => {
  try {
    console.log("Creating location:", req.body);
    console.log("User from request:", req.user);

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const location = new Location({
      ...req.body,
      owner: req.user._id,
    });

    await location.save();
    console.log("Location created successfully:", location);
    res.status(201).json(location);
  } catch (error) {
    console.error("Error creating location:", error);
    res
      .status(500)
      .json({ message: "Error creating location", error: error.message });
  }
};

// Get all locations for user
exports.getAllLocations = async (req, res) => {
  try {
    console.log("Fetching locations for user:", req.user._id);
    const locations = await Location.find({ owner: req.user._id });
    console.log("Found locations:", locations);
    res.status(200).json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res
      .status(500)
      .json({ message: "Error fetching locations", error: error.message });
  }
};

// Get single location
exports.getLocation = async (req, res) => {
  try {
    console.log("Fetching location:", req.params.locationId);
    const location = await Location.findOne({
      _id: req.params.locationId,
      owner: req.user._id,
    });
    if (!location) {
      console.log("Location not found");
      return res.status(404).json({ message: "Location not found" });
    }
    console.log("Found location:", location);
    res.status(200).json(location);
  } catch (error) {
    console.error("Error fetching location:", error);
    res
      .status(500)
      .json({ message: "Error fetching location", error: error.message });
  }
};

// Update location
exports.updateLocation = async (req, res) => {
  try {
    console.log(
      "Updating location:",
      req.params.locationId,
      "with data:",
      req.body
    );
    const location = await Location.findOneAndUpdate(
      { _id: req.params.locationId, owner: req.user._id },
      req.body,
      { new: true }
    );

    if (!location) {
      console.log("Location not found for update");
      return res.status(404).json({ message: "Location not found" });
    }

    console.log("Location updated successfully:", location);
    res.status(200).json(location);
  } catch (error) {
    console.error("Error updating location:", error);
    res
      .status(500)
      .json({ message: "Error updating location", error: error.message });
  }
};

// Delete location
exports.deleteLocation = async (req, res) => {
  try {
    console.log("Deleting location:", req.params.locationId);
    const location = await Location.findOneAndDelete({
      _id: req.params.locationId,
      owner: req.user._id,
    });

    if (!location) {
      console.log("Location not found for deletion");
      return res.status(404).json({ message: "Location not found" });
    }

    console.log("Location deleted successfully");
    res.status(200).json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    res
      .status(500)
      .json({ message: "Error deleting location", error: error.message });
  }
};
