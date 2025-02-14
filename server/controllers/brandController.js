const Brand = require("../models/brandModel");
const { invalidateCache } = require("../services/s3Service");

// Create new brand
exports.createBrand = async (req, res) => {
  try {
    console.log("[BrandController] Creating brand with data:", {
      ...req.body,
      logo: req.body.logo ? "<<LOGO_DATA>>" : null,
      coverImage: req.body.coverImage ? "<<COVER_DATA>>" : null,
    });
    console.log("[BrandController] User context:", {
      id: req.user?._id,
      email: req.user?.email,
    });

    if (!req.user || !req.user._id) {
      console.error("[BrandController] Authentication error: No user context");
      return res.status(401).json({ message: "User not authenticated" });
    }

    const brand = new Brand({
      ...req.body,
      owner: req.user._id,
    });

    await brand.save();
    console.log("[BrandController] Brand created successfully:", {
      id: brand._id,
      name: brand.name,
      username: brand.username,
    });
    res.status(201).json(brand);
  } catch (error) {
    console.error("[BrandController] Error creating brand:", error);
    res
      .status(500)
      .json({ message: "Error creating brand", error: error.message });
  }
};

// Get all brands for user
exports.getAllBrands = async (req, res) => {
  try {
    console.log("[BrandController] Request details:", {
      headers: {
        authorization: req.headers.authorization,
        contentType: req.headers["content-type"],
      },
      user: {
        id: req.user?.userId,
        hasUser: !!req.user,
      },
      timestamp: new Date().toISOString(),
    });

    if (!req.user?.userId) {
      console.error("[BrandController] No user ID in request");
      return res.status(401).json({ message: "User not authenticated" });
    }

    console.log("[BrandController] Fetching brands for user:", req.user.userId);
    const brands = await Brand.find({ owner: req.user.userId });

    console.log("[BrandController] Query results:", {
      count: brands.length,
      brands: brands.map((b) => ({
        id: b._id,
        name: b.name,
        username: b.username,
        owner: b.owner,
      })),
    });

    res.status(200).json(brands);
  } catch (error) {
    console.error("[BrandController] Error fetching brands:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      message: "Error fetching brands",
      error: error.message,
    });
  }
};

// Get single brand
exports.getBrand = async (req, res) => {
  try {
    console.log("[BrandController] Fetching brand:", req.params.brandId);
    const brand = await Brand.findOne({
      _id: req.params.brandId,
      owner: req.user._id,
    });
    if (!brand) {
      console.log("[BrandController] Brand not found");
      return res.status(404).json({ message: "Brand not found" });
    }
    console.log("[BrandController] Found brand:", {
      id: brand._id,
      name: brand.name,
      username: brand.username,
    });
    res.status(200).json(brand);
  } catch (error) {
    console.error("[BrandController] Error fetching brand:", error);
    res
      .status(500)
      .json({ message: "Error fetching brand", error: error.message });
  }
};

// Update brand
exports.updateBrand = async (req, res) => {
  try {
    console.log("[BrandController] Update request details:", {
      brandId: req.params.brandId,
      userId: req.user?.userId,
      headers: {
        contentType: req.headers["content-type"],
        authorization: req.headers.authorization ? "Bearer ..." : "none",
      },
      timestamp: new Date().toISOString(),
    });

    if (!req.user?.userId) {
      console.error("[BrandController] Update failed: No user ID in request");
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!req.params.brandId) {
      console.error("[BrandController] Update failed: No brand ID provided");
      return res.status(400).json({ message: "Brand ID is required" });
    }

    // First get the existing brand with owner check
    const existingBrand = await Brand.findOne({
      _id: req.params.brandId,
      owner: req.user.userId,
    });

    if (!existingBrand) {
      console.log("[BrandController] Brand not found or unauthorized:", {
        brandId: req.params.brandId,
        userId: req.user.userId,
      });
      return res.status(404).json({
        message: "Brand not found or unauthorized",
        details:
          "The brand may not exist or you may not have permission to update it",
      });
    }

    console.log("[BrandController] Found existing brand:", {
      id: existingBrand._id,
      name: existingBrand.name,
      owner: existingBrand.owner,
    });

    // Create update data starting with existing brand data
    const updateData = {
      ...existingBrand.toObject(),
      ...req.body,
    };

    // Track paths that need cache invalidation
    const pathsToInvalidate = [];

    // Handle image updates with versioning
    if (req.body.logo) {
      const timestamp = Date.now();
      updateData.logo = {
        thumbnail: `${req.body.logo.thumbnail}?v=${timestamp}`,
        medium: `${req.body.logo.medium}?v=${timestamp}`,
        full: `${req.body.logo.full}?v=${timestamp}`,
      };
      pathsToInvalidate.push(
        "/brands/logos/thumbnail/*",
        "/brands/logos/medium/*",
        "/brands/logos/full/*"
      );
    }

    if (req.body.coverImage) {
      const timestamp = Date.now();
      updateData.coverImage = {
        thumbnail: `${req.body.coverImage.thumbnail}?v=${timestamp}`,
        medium: `${req.body.coverImage.medium}?v=${timestamp}`,
        full: `${req.body.coverImage.full}?v=${timestamp}`,
      };
      pathsToInvalidate.push(
        "/brands/covers/thumbnail/*",
        "/brands/covers/medium/*",
        "/brands/covers/full/*"
      );
    }

    // Ensure social media fields are preserved and merged
    updateData.social = {
      ...existingBrand.social,
      ...(req.body.social || {}),
    };

    // Ensure contact info is preserved and merged
    updateData.contact = {
      ...existingBrand.contact,
      ...(req.body.contact || {}),
    };

    console.log("[BrandController] Attempting update with data:", {
      id: req.params.brandId,
      name: updateData.name,
      hasLogo: !!updateData.logo,
      hasCover: !!updateData.coverImage,
    });

    const updatedBrand = await Brand.findOneAndUpdate(
      { _id: req.params.brandId, owner: req.user.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedBrand) {
      console.error(
        "[BrandController] Update failed: Brand not found after update attempt"
      );
      return res.status(404).json({ message: "Failed to update brand" });
    }

    console.log("[BrandController] Update successful:", {
      id: updatedBrand._id,
      name: updatedBrand.name,
      timestamp: new Date().toISOString(),
    });

    res.json(updatedBrand);
  } catch (error) {
    console.error("[BrandController] Update error:", {
      message: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      message: "Error updating brand",
      error: error.message,
    });
  }
};

// Delete brand
exports.deleteBrand = async (req, res) => {
  try {
    console.log("[BrandController] Deleting brand:", req.params.brandId);
    const brand = await Brand.findOneAndDelete({
      _id: req.params.brandId,
      owner: req.user._id,
    });

    if (!brand) {
      console.log("[BrandController] Brand not found for deletion");
      return res.status(404).json({ message: "Brand not found" });
    }

    console.log("[BrandController] Brand deleted successfully:", {
      id: brand._id,
      name: brand.name,
      username: brand.username,
    });
    res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("[BrandController] Error deleting brand:", error);
    res
      .status(500)
      .json({ message: "Error deleting brand", error: error.message });
  }
};
