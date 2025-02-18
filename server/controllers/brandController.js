const Brand = require("../models/brandModel");
const {
  invalidateCache,
  uploadToCloudflare,
} = require("../services/s3Service");
const { uploadToS3 } = require("../utils/s3Uploader");
const JoinRequest = require("../models/joinRequestModel");
const Notification = require("../models/notificationModel");
const User = require("../models/User");

// Create new brand
exports.createBrand = async (req, res) => {
  console.log("[BrandController] Starting brand creation:", {
    user: req.user,
    userId: req.user?._id,
    body: {
      name: req.body.name,
      username: req.body.username,
      hasLogo: !!req.body.logo,
      hasCover: !!req.body.coverImage,
      hasSettings: !!req.body.settings,
    },
  });

  try {
    // Authentication check
    if (!req.user || !req.user._id) {
      console.error(
        "[BrandController] Create brand failed: No authenticated user"
      );
      return res.status(401).json({
        message: "Please log in to create a brand",
        code: "AUTH_ERROR",
      });
    }

    // Validate required fields
    const validationErrors = {};
    if (!req.body.name) validationErrors.name = "Brand name is required";
    if (!req.body.username) validationErrors.username = "Username is required";

    if (Object.keys(validationErrors).length > 0) {
      console.log("[BrandController] Validation failed:", validationErrors);
      return res.status(400).json({
        message: "Please fill in all required fields",
        code: "VALIDATION_ERROR",
        fields: validationErrors,
      });
    }

    // Check if username exists
    const existingBrand = await Brand.findOne({
      username: req.body.username.toLowerCase(),
    });

    if (existingBrand) {
      console.log("[BrandController] Username exists check:", {
        attemptedUsername: req.body.username.toLowerCase(),
        existingBrandId: existingBrand._id,
        existingBrandUsername: existingBrand.username,
        existingBrandOwner: existingBrand.owner,
      });
      return res.status(400).json({
        message: "This username is already taken",
        code: "DUPLICATE_USERNAME",
        fields: { username: "This username is already taken" },
      });
    }

    const brandData = {
      name: req.body.name,
      username: req.body.username.toLowerCase(),
      description: req.body.description,
      owner: req.user._id,
      defaultRoles: ["admin", "member"],
      teamSetup: {
        userId: req.user._id,
        role: "admin",
      },
      settings: {
        autoJoinEnabled: false,
        defaultRole: "member",
        ...req.body.settings,
      },
    };

    console.log("[BrandController] Creating brand with data:", {
      ...brandData,
      owner: brandData.owner.toString(),
      teamSetup: {
        ...brandData.teamSetup,
        userId: brandData.teamSetup.userId.toString(),
      },
    });

    const brand = new Brand(brandData);
    await brand.save();

    console.log("[BrandController] Brand created successfully:", {
      brandId: brand._id,
      name: brand.name,
      username: brand.username,
      owner: brand.owner,
    });

    return res.status(201).json(brand);
  } catch (error) {
    console.error("[BrandController] Error creating brand:", {
      error: error.message,
      code: error.code,
      body: {
        name: req.body.name,
        username: req.body.username,
      },
    });

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === "username" ? "username" : "brand name";
      console.log("[BrandController] Duplicate key error:", {
        error: error.message,
        field,
        value: error.keyValue[field],
      });
      return res.status(400).json({
        message: `This ${fieldName} is already taken`,
        code: `DUPLICATE_${field.toUpperCase()}`,
        fields: { [field]: `This ${fieldName} is already taken` },
      });
    }

    return res.status(500).json({
      message: "An error occurred while creating the brand",
      code: "SERVER_ERROR",
    });
  }
};

// Get all brands for user
exports.getAllBrands = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const brands = await Brand.find({ owner: req.user._id });
    res.status(200).json(brands);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching brands",
      error: error.message,
    });
  }
};

// Get single brand
exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findOne({
      _id: req.params.brandId,
      owner: req.user._id,
    });
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    res.status(200).json(brand);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching brand", error: error.message });
  }
};

// Get single brand (public profile)
exports.getBrandProfile = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId)
      .select("-settings.defaultEventSettings -bannedMembers")
      .populate("team.user", "username firstName lastName avatar")
      .populate("events", "name date coverImage location");

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Clean up followers array and ensure all IDs are strings
    brand.followers = (brand.followers || [])
      .filter((id) => id != null)
      .map((id) => id.toString());

    // Clean up favorites array and ensure all IDs are strings
    brand.favorites = (brand.favorites || [])
      .filter((id) => id != null)
      .map((id) => id.toString());

    // Initialize user status
    let userStatus = {
      isFollowing: false,
      isMember: false,
      isFavorited: false,
      role: null,
    };

    // Check if user is authenticated and update status accordingly
    if (req.user && req.user._id) {
      const userId = req.user._id.toString();

      userStatus = {
        isFollowing: brand.followers.includes(userId),
        isFavorited: brand.favorites.includes(userId),
        isMember: brand.team.some(
          (member) => member.user._id.toString() === userId
        ),
        role:
          brand.team.find((member) => member.user._id.toString() === userId)
            ?.role || null,
      };
    }

    // Format the response
    const response = {
      ...brand.toObject(),
      userStatus,
      _private: undefined,
      bannedMembers: undefined,
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching brand profile",
      error: error.message,
    });
  }
};

// Get single brand (public profile by username)
exports.getBrandProfileByUsername = async (req, res) => {
  try {
    console.log("[BrandController] Getting brand by username:", {
      username: req.params.username,
      authenticated: !!req.user,
      userId: req.user?._id,
    });

    if (!req.params.username) {
      console.error("[BrandController] No username provided in request");
      return res.status(400).json({ message: "Username is required" });
    }

    const brand = await Brand.findOne({ username: req.params.username })
      .select("-settings.defaultEventSettings -bannedMembers")
      .populate("team.user", "username firstName lastName avatar")
      .populate("events", "name date coverImage location");

    console.log("[BrandController] Brand lookup result:", {
      username: req.params.username,
      found: !!brand,
      brandId: brand?._id,
      brandName: brand?.name,
    });

    if (!brand) {
      console.error("[BrandController] Brand not found:", req.params.username);
      return res.status(404).json({ message: "Brand not found" });
    }

    // Clean up followers array and ensure all IDs are strings
    brand.followers = (brand.followers || [])
      .filter((id) => id != null)
      .map((id) => id.toString());

    // Clean up favorites array and ensure all IDs are strings
    brand.favorites = (brand.favorites || [])
      .filter((id) => id != null)
      .map((id) => id.toString());

    // Initialize user status
    let userStatus = {
      isFollowing: false,
      isMember: false,
      isFavorited: false,
      role: null,
    };

    // Check if user is authenticated and update status accordingly
    if (req.user && req.user._id) {
      const userId = req.user._id.toString();

      userStatus = {
        isFollowing: brand.followers.includes(userId),
        isFavorited: brand.favorites.includes(userId),
        isMember: brand.team.some(
          (member) => member.user._id.toString() === userId
        ),
        role:
          brand.team.find((member) => member.user._id.toString() === userId)
            ?.role || null,
      };

      console.log("[BrandController] User status for brand:", {
        userId,
        brandId: brand._id,
        userStatus,
      });
    }

    // Format the response
    const response = {
      ...brand.toObject(),
      userStatus,
      _private: undefined,
      bannedMembers: undefined,
    };

    console.log("[BrandController] Sending brand response:", {
      brandId: brand._id,
      username: brand.username,
      hasUserStatus: !!response.userStatus,
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("[BrandController] Error in getBrandProfileByUsername:", {
      username: req.params.username,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error fetching brand profile",
      error: error.message,
    });
  }
};

// Update brand
exports.updateBrand = async (req, res) => {
  try {
    console.log("[BrandController] Updating brand settings:", {
      brandId: req.params.brandId,
      userId: req.user?._id,
      body: {
        name: req.body.name,
        username: req.body.username,
        hasSettings: !!req.body.settings,
      },
    });

    if (!req.user?._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!req.params.brandId) {
      return res.status(400).json({ message: "Brand ID is required" });
    }

    // First get the existing brand
    const brand = await Brand.findOne({
      _id: req.params.brandId,
      owner: req.user._id,
    });

    if (!brand) {
      console.log("[BrandController] Brand not found:", {
        brandId: req.params.brandId,
        userId: req.user._id,
      });
      return res.status(404).json({ message: "Brand not found" });
    }

    // Preserve existing logo and coverImage
    const existingLogo = brand.logo;
    const existingCoverImage = brand.coverImage;

    // Update brand with new data while preserving logo and coverImage
    const updatedBrand = await Brand.findOneAndUpdate(
      { _id: req.params.brandId, owner: req.user._id },
      {
        ...req.body,
        logo: existingLogo,
        coverImage: existingCoverImage,
      },
      { new: true }
    ).populate("team.user", "username firstName lastName avatar");

    console.log("[BrandController] Brand updated successfully:", {
      brandId: updatedBrand._id,
      name: updatedBrand.name,
      username: updatedBrand.username,
      settings: updatedBrand.settings,
    });

    res.json(updatedBrand);
  } catch (error) {
    console.error("[BrandController] Error updating brand:", {
      error: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
    });
    res.status(500).json({ message: error.message });
  }
};

// Update brand logo
exports.updateBrandLogo = async (req, res) => {
  console.log("[BrandController] Starting logo update process:", {
    brandId: req.params.brandId,
    hasFile: !!req.file,
    fileDetails: req.file
      ? {
          size: req.file.size,
          mimetype: req.file.mimetype,
          hasBuffer: !!req.file.buffer,
        }
      : null,
  });

  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) {
      console.log("[BrandController] Brand not found:", req.params.brandId);
      return res.status(404).json({ message: "Brand not found" });
    }

    if (!req.file || !req.file.buffer) {
      console.log("[BrandController] No file provided for upload");
      return res.status(400).json({ message: "No file provided" });
    }

    console.log("[BrandController] Preparing S3 upload:", {
      brandId: brand._id,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    // Prepare the file path for S3
    const key = `brands/${brand._id}/logo`;
    console.log("[BrandController] Generated S3 key:", key);

    // Upload to S3 with multiple resolutions
    console.log("[BrandController] Initiating S3 upload...");
    const urls = {};
    const qualities = ["thumbnail", "medium", "full"];

    for (const quality of qualities) {
      const qualityKey = `${key}/${quality}`;
      const url = await uploadToS3(
        req.file.buffer,
        qualityKey,
        req.file.mimetype,
        quality
      );
      urls[quality] = url;
    }

    console.log("[BrandController] S3 upload response:", {
      success: true,
      uploadedUrls: urls,
    });

    // Update brand with new logo URLs
    console.log("[BrandController] Updating brand with new logo URLs");
    brand.logo = {
      thumbnail: urls.thumbnail,
      medium: urls.medium,
      full: urls.full,
    };

    await brand.save();
    console.log("[BrandController] Brand updated successfully with new logo:", {
      brandId: brand._id,
      logoUrls: brand.logo,
    });

    res.json({
      message: "Logo updated successfully",
      brand: brand,
    });
  } catch (error) {
    console.error("[BrandController] Error in logo update:", {
      error: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
    });
    res
      .status(500)
      .json({ message: "Error updating logo", error: error.message });
  }
};

// Update brand cover image
exports.updateBrandCover = async (req, res) => {
  console.log("[BrandController] Starting cover image update process:", {
    brandId: req.params.brandId,
    hasFile: !!req.file,
    fileDetails: req.file
      ? {
          size: req.file.size,
          mimetype: req.file.mimetype,
          hasBuffer: !!req.file.buffer,
        }
      : null,
  });

  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) {
      console.log("[BrandController] Brand not found:", req.params.brandId);
      return res.status(404).json({ message: "Brand not found" });
    }

    if (!req.file || !req.file.buffer) {
      console.log("[BrandController] No file provided for upload");
      return res.status(400).json({ message: "No file provided" });
    }

    console.log("[BrandController] Preparing S3 upload:", {
      brandId: brand._id,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    // Prepare the file path for S3
    const key = `brands/${brand._id}/cover`;
    console.log("[BrandController] Generated S3 key:", key);

    // Upload to S3 with multiple resolutions
    console.log("[BrandController] Initiating S3 upload...");
    const urls = {};
    const qualities = ["thumbnail", "medium", "full"];

    for (const quality of qualities) {
      const qualityKey = `${key}/${quality}`;
      const url = await uploadToS3(
        req.file.buffer,
        qualityKey,
        req.file.mimetype,
        quality
      );
      urls[quality] = url;
    }

    console.log("[BrandController] S3 upload response:", {
      success: true,
      uploadedUrls: urls,
    });

    // Update brand with new cover image URLs
    console.log("[BrandController] Updating brand with new cover image URLs");
    brand.coverImage = {
      thumbnail: urls.thumbnail,
      medium: urls.medium,
      full: urls.full,
    };

    await brand.save();
    console.log(
      "[BrandController] Brand updated successfully with new cover image:",
      {
        brandId: brand._id,
        coverImageUrls: brand.coverImage,
      }
    );

    res.json({
      message: "Cover image updated successfully",
      brand: brand,
    });
  } catch (error) {
    console.error("[BrandController] Error in cover image update:", {
      error: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
    });
    res.status(500).json({
      message: "Error updating cover image",
      error: error.message,
    });
  }
};

// Delete brand
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findOneAndDelete({
      _id: req.params.brandId,
      owner: req.user._id,
    });

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting brand", error: error.message });
  }
};

// Get team members
exports.getTeamMembers = async (req, res) => {
  try {
    const { brandId } = req.params;
    const brand = await Brand.findById(brandId)
      .populate("members.user", "username email avatar")
      .select("members");

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Transform the members data to match the frontend expectations
    const members = brand.members.map((member) => ({
      _id: member.user._id,
      name: member.user.username,
      email: member.user.email,
      avatar: member.user.avatar,
      role: member.role,
      joinedAt: member.joinedAt,
    }));

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: "Error fetching team members" });
  }
};

// Update member role
exports.updateMemberRole = async (req, res) => {
  try {
    const { brandId, memberId } = req.params;
    const { role, permissions } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if user has permission to update roles
    if (!brand.owner.equals(req.user.userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to update roles" });
    }

    const memberIndex = brand.members.findIndex(
      (m) => m.user.toString() === memberId
    );
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Update role and permissions
    brand.members[memberIndex].role = role;

    // Set default permissions based on role
    const defaultPermissions = {
      events: {
        create: role === "admin" || role === "manager",
        edit: role === "admin" || role === "manager",
        delete: role === "admin",
        view: true,
      },
      team: {
        manage: role === "admin",
        view: true,
      },
      analytics: {
        view: role === "admin" || role === "manager",
      },
      codes: {
        friends: {
          generate: role !== "staff",
          limit:
            role === "admin"
              ? -1
              : role === "manager"
              ? 100
              : role === "promoter"
              ? 50
              : 0,
        },
        backstage: {
          generate: role === "admin" || role === "manager",
          limit: role === "admin" ? -1 : role === "manager" ? 20 : 0,
        },
        table: {
          generate: role === "admin" || role === "manager",
        },
        ticket: {
          generate: role === "admin" || role === "manager",
        },
      },
      scanner: {
        use: true,
      },
    };

    // Merge default permissions with any custom permissions provided
    brand.members[memberIndex].permissions = {
      ...defaultPermissions,
      ...permissions,
    };

    await brand.save();

    res.json({
      message: "Member role and permissions updated successfully",
      member: brand.members[memberIndex],
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating member role" });
  }
};

// Remove member
exports.removeMember = async (req, res) => {
  try {
    const { brandId, memberId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if user has permission to remove members
    if (!brand.owner.equals(req.user.userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to remove members" });
    }

    brand.members = brand.members.filter((m) => !m.user.equals(memberId));
    await brand.save();

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error removing member" });
  }
};

// Ban member
exports.banMember = async (req, res) => {
  try {
    const { brandId, memberId } = req.params;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if user has permission to ban members
    if (!brand.owner.equals(req.user.userId)) {
      return res.status(403).json({ message: "Not authorized to ban members" });
    }

    // Remove member and add to banned list
    brand.members = brand.members.filter((m) => !m.user.equals(memberId));
    brand.bannedMembers.push({
      user: memberId,
      bannedAt: new Date(),
      bannedBy: req.user.userId,
    });

    await brand.save();

    res.json({ message: "Member banned successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error banning member" });
  }
};

// Follow a brand
exports.followBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user._id;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Clean up any null values and convert to strings for comparison
    brand.followers = brand.followers
      .filter((id) => id != null)
      .map((id) => id.toString());

    // Check if user is already following
    const isFollowing = brand.followers.includes(userId.toString());
    if (isFollowing) {
      return res.status(400).json({ message: "Already following this brand" });
    }

    // Add user to followers
    brand.followers = [...brand.followers, userId.toString()];
    await brand.save();

    // Create notification for brand owner
    await Notification.create({
      userId: brand.owner,
      type: "new_follower",
      title: "New Follower",
      message: `@${req.user.username} started following @${brand.username}`,
      brandId: brand._id,
      metadata: {
        follower: {
          id: userId,
          username: req.user.username,
          avatar: req.user.avatar,
        },
        brand: {
          id: brand._id,
          username: brand.username,
          name: brand.name,
        },
      },
    });

    res.status(200).json({
      message: "Successfully followed brand",
      followers: brand.followers,
    });
  } catch (error) {
    res.status(500).json({ message: "Error following brand" });
  }
};

// Unfollow a brand
exports.unfollowBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user._id;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Clean up any null values and convert to strings for comparison
    brand.followers = brand.followers
      .filter((id) => id != null)
      .map((id) => id.toString());

    // Check if user is actually following
    const isFollowing = brand.followers.includes(userId.toString());
    if (!isFollowing) {
      return res.status(400).json({ message: "Not following this brand" });
    }

    // Remove user from followers
    brand.followers = brand.followers.filter((id) => id !== userId.toString());
    await brand.save();

    res.status(200).json({
      message: "Successfully unfollowed brand",
      followers: brand.followers,
    });
  } catch (error) {
    res.status(500).json({ message: "Error unfollowing brand" });
  }
};

// Request to join a brand
exports.requestJoin = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user._id;

    const brand = await Brand.findById(brandId).populate("owner");
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if user is already a member
    const isMember = brand.team.some(
      (member) => member.user.toString() === userId.toString()
    );
    if (isMember) {
      return res
        .status(400)
        .json({ message: "Already a member of this brand" });
    }

    // Check if there's already a pending request
    const existingRequest = await JoinRequest.findOne({
      user: userId,
      brand: brandId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Join request already pending" });
    }

    if (brand.settings?.autoJoinEnabled) {
      // Auto-join enabled - add user directly to team
      brand.team.push({
        user: userId,
        role: brand.settings?.defaultRole || "staff",
        joinedAt: new Date(),
      });
      await brand.save();

      // Create notification for brand owner
      await Notification.create({
        userId: brand.owner._id,
        type: "info",
        title: "New Team Member",
        message: `@${req.user.username} joined your brand`,
        brandId: brand._id,
        metadata: {
          user: {
            id: userId,
            username: req.user.username,
            avatar: req.user.avatar,
          },
        },
      });

      return res.status(200).json({
        message: "Successfully joined brand",
        status: "joined",
        team: brand.team,
      });
    } else {
      // Create join request
      const joinRequest = await JoinRequest.create({
        user: userId,
        brand: brandId,
        status: "pending",
        requestedAt: new Date(),
      });

      // Create notification for brand owner
      await Notification.create({
        userId: brand.owner._id,
        type: "join_request",
        title: "New Join Request",
        message: `@${req.user.username} wants to join your brand`,
        brandId: brand._id,
        requestId: joinRequest._id,
        metadata: {
          user: {
            id: userId,
            username: req.user.username,
            avatar: req.user.avatar,
          },
        },
      });

      return res.status(200).json({
        message: "Join request sent successfully",
        status: "pending",
        requestId: joinRequest._id,
      });
    }
  } catch (error) {
    console.error("Error in requestJoin:", error);
    res.status(500).json({ message: "Error processing join request" });
  }
};

// Process join request (accept/reject)
exports.processJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const adminId = req.user._id;

    const joinRequest = await JoinRequest.findById(requestId)
      .populate("brand")
      .populate("user");
    if (!joinRequest) {
      return res.status(404).json({ message: "Join request not found" });
    }

    const brand = joinRequest.brand;

    // Verify admin has permission
    const isAdmin = brand.team.some(
      (member) =>
        member.user.toString() === adminId.toString() &&
        (member.role === "admin" || member.role === "owner")
    );
    if (!isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (action === "accept") {
      // Add user to team
      brand.team.push({
        user: joinRequest.user._id,
        role: brand.settings?.defaultRole || "staff",
        permissions: {}, // Default permissions will be set based on the role
      });
      await brand.save();

      // Create notification for user
      await Notification.create({
        userId: joinRequest.user._id,
        type: "join_request_accepted",
        title: "Join Request Accepted",
        message: `Your request to join ${brand.name} has been accepted`,
        brandId: brand._id,
      });
    } else {
      // Create notification for user
      await Notification.create({
        userId: joinRequest.user._id,
        type: "join_request_rejected",
        title: "Join Request Rejected",
        message: `Your request to join ${brand.name} has been rejected`,
        brandId: brand._id,
      });
    }

    // Update request status
    joinRequest.status = action === "accept" ? "accepted" : "rejected";
    joinRequest.processedAt = new Date();
    joinRequest.processedBy = adminId;
    await joinRequest.save();

    res.status(200).json({ message: `Join request ${action}ed successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error processing join request" });
  }
};

// Leave a brand
exports.leaveBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user._id;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Remove user from team
    brand.team = brand.team.filter(
      (member) => member.user.toString() !== userId.toString()
    );
    await brand.save();

    res.status(200).json({ message: "Successfully left brand" });
  } catch (error) {
    res.status(500).json({ message: "Error leaving brand" });
  }
};

// Favorite a brand
exports.favoriteBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user._id;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Clean up any null values and convert to strings for comparison
    brand.favorites = brand.favorites
      .filter((id) => id != null)
      .map((id) => id.toString());

    // Check if user has already favorited
    const isFavorited = brand.favorites.includes(userId.toString());
    if (isFavorited) {
      return res.status(400).json({ message: "Already favorited this brand" });
    }

    // Add user to favorites
    brand.favorites = [...brand.favorites, userId.toString()];
    await brand.save();

    // Create notification for brand owner
    await Notification.create({
      userId: brand.owner,
      type: "new_favorite",
      title: "New Favorite",
      message: `${req.user.username} favorited your brand`,
      brandId: brand._id,
      metadata: {
        user: {
          id: userId,
          username: req.user.username,
          avatar: req.user.avatar,
        },
      },
    });

    res.status(200).json({
      message: "Successfully favorited brand",
      favorites: brand.favorites,
    });
  } catch (error) {
    res.status(500).json({ message: "Error favoriting brand" });
  }
};

// Unfavorite a brand
exports.unfavoriteBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user._id;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Clean up any null values and convert to strings for comparison
    brand.favorites = brand.favorites
      .filter((id) => id != null)
      .map((id) => id.toString());

    // Check if user has actually favorited
    const isFavorited = brand.favorites.includes(userId.toString());
    if (!isFavorited) {
      return res.status(400).json({ message: "Not favorited this brand" });
    }

    // Remove user from favorites
    brand.favorites = brand.favorites.filter((id) => id !== userId.toString());
    await brand.save();

    res.status(200).json({
      message: "Successfully unfavorited brand",
      favorites: brand.favorites,
    });
  } catch (error) {
    res.status(500).json({ message: "Error unfavoriting brand" });
  }
};
