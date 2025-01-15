const Brand = require("../models/brandModel");

// Create new brand
exports.createBrand = async (req, res) => {
  try {
    console.log("Creating brand:", req.body);
    console.log("User from request:", req.user); // Debug log

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const brand = new Brand({
      ...req.body,
      owner: req.user._id, // Use _id instead of id
    });

    await brand.save();
    console.log("Brand created successfully:", brand);
    res.status(201).json(brand);
  } catch (error) {
    console.error("Error creating brand:", error);
    res
      .status(500)
      .json({ message: "Error creating brand", error: error.message });
  }
};

// Get all brands for user
exports.getAllBrands = async (req, res) => {
  try {
    console.log("Fetching brands for user:", req.user._id);
    const brands = await Brand.find({ owner: req.user._id });
    console.log("Found brands:", brands);
    res.status(200).json(brands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    res
      .status(500)
      .json({ message: "Error fetching brands", error: error.message });
  }
};

// Get single brand
exports.getBrand = async (req, res) => {
  try {
    console.log("Fetching brand:", req.params.brandId);
    const brand = await Brand.findOne({
      _id: req.params.brandId,
      owner: req.user._id,
    });
    if (!brand) {
      console.log("Brand not found");
      return res.status(404).json({ message: "Brand not found" });
    }
    console.log("Found brand:", brand);
    res.status(200).json(brand);
  } catch (error) {
    console.error("Error fetching brand:", error);
    res
      .status(500)
      .json({ message: "Error fetching brand", error: error.message });
  }
};

// Update brand
exports.updateBrand = async (req, res) => {
  try {
    console.log("Updating brand:", req.params.brandId, "with data:", req.body);
    const brand = await Brand.findOneAndUpdate(
      { _id: req.params.brandId, owner: req.user._id },
      req.body,
      { new: true }
    );

    if (!brand) {
      console.log("Brand not found for update");
      return res.status(404).json({ message: "Brand not found" });
    }

    console.log("Brand updated successfully:", brand);
    res.status(200).json(brand);
  } catch (error) {
    console.error("Error updating brand:", error);
    res
      .status(500)
      .json({ message: "Error updating brand", error: error.message });
  }
};

// Delete brand
exports.deleteBrand = async (req, res) => {
  try {
    console.log("Deleting brand:", req.params.brandId);
    const brand = await Brand.findOneAndDelete({
      _id: req.params.brandId,
      owner: req.user._id,
    });

    if (!brand) {
      console.log("Brand not found for deletion");
      return res.status(404).json({ message: "Brand not found" });
    }

    console.log("Brand deleted successfully");
    res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res
      .status(500)
      .json({ message: "Error deleting brand", error: error.message });
  }
};
