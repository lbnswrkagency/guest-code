const Brand = require("../models/brandModel");
const {
  invalidateCache,
  uploadToCloudflare,
} = require("../services/s3Service");
const { uploadToS3 } = require("../utils/s3Uploader");
const JoinRequest = require("../models/joinRequestModel");
const Notification = require("../models/notificationModel");
const User = require("../models/User");
const roleController = require("../controllers/roleController");

// Create new brand
exports.createBrand = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: "Please log in to create a brand",
        code: "AUTH_ERROR",
      });
    }

    const validationErrors = {};
    if (!req.body.name) validationErrors.name = "Brand name is required";
    if (!req.body.username) validationErrors.username = "Username is required";

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: "Please fill in all required fields",
        code: "VALIDATION_ERROR",
        fields: validationErrors,
      });
    }

    const existingBrand = await Brand.findOne({
      username: req.body.username.toLowerCase(),
    });

    if (existingBrand) {
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
      team: [
        {
          user: req.user._id,
          role: "OWNER",
          permissions: {
            events: {
              create: true,
              edit: true,
              delete: true,
              view: true,
            },
            team: {
              manage: true,
              view: true,
            },
            analytics: {
              view: true,
            },
            codes: {
              friends: {
                generate: true,
                limit: 0,
                unlimited: true,
              },
              backstage: {
                generate: true,
                limit: 0,
                unlimited: true,
              },
              table: {
                generate: true,
              },
              ticket: {
                generate: true,
              },
              guest: {
                generate: true,
              },
            },
            scanner: {
              use: true,
            },
          },
        },
      ],
      settings: {
        autoJoinEnabled: false,
        defaultRole: "MEMBER",
        ...req.body.settings,
      },
    };

    const brand = new Brand(brandData);
    await brand.save();

    // Create default roles
    await roleController.createDefaultRoles(brand._id, req.user._id);

    return res.status(201).json(brand);
  } catch (error) {
    console.error("[BrandController:createBrand] Error:", error);
    return res.status(500).json({
      message: "Error creating brand",
      code: "SERVER_ERROR",
      error: error.message,
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
    if (!req.params.username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const brand = await Brand.findOne({ username: req.params.username })
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

// Update brand
exports.updateBrand = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!req.params.brandId) {
      return res.status(400).json({ message: "Brand ID is required" });
    }

    const brand = await Brand.findOne({
      _id: req.params.brandId,
      owner: req.user._id,
    });

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const updateData = { ...req.body };
    delete updateData.logo;
    delete updateData.coverImage;

    const updatedBrand = await Brand.findOneAndUpdate(
      { _id: req.params.brandId, owner: req.user._id },
      updateData,
      { new: true }
    ).populate("team.user", "username firstName lastName avatar");

    res.json(updatedBrand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update brand logo
exports.updateBrandLogo = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No file provided" });
    }

    if (brand.logo) {
      try {
        const qualities = ["thumbnail", "medium", "full"];
        const paths = qualities.map(
          (quality) => `/brands/${brand._id}/logo/${quality}`
        );
        await invalidateCache(paths);
      } catch (error) {
        // Continue even if cache invalidation fails
      }
    }

    const timestamp = Date.now();
    const key = `brands/${brand._id}/logo/${timestamp}`;
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

    brand.logo = {
      thumbnail: urls.thumbnail,
      medium: urls.medium,
      full: urls.full,
      timestamp,
    };

    await brand.save();

    res.json({
      message: "Logo updated successfully",
      brand: brand,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating logo", error: error.message });
  }
};

// Update brand cover image
exports.updateBrandCover = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No file provided" });
    }

    if (brand.coverImage) {
      try {
        const qualities = ["thumbnail", "medium", "full"];
        const paths = qualities.map(
          (quality) => `/brands/${brand._id}/cover/${quality}`
        );
        await invalidateCache(paths);
      } catch (error) {
        // Continue even if cache invalidation fails
      }
    }

    const timestamp = Date.now();
    const key = `brands/${brand._id}/cover/${timestamp}`;
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

    brand.coverImage = {
      thumbnail: urls.thumbnail,
      medium: urls.medium,
      full: urls.full,
      timestamp,
    };

    await brand.save();

    res.json({
      message: "Cover image updated successfully",
      brand: brand,
    });
  } catch (error) {
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
  console.log("[BrandController:followBrand] Starting follow request:", {
    brandId: req.params.brandId,
    userId: req.user?._id,
    timestamp: new Date().toISOString(),
  });

  try {
    const { brandId } = req.params;
    const userId = req.user._id;

    // Use findOneAndUpdate to atomically update the followers array
    const updatedBrand = await Brand.findOneAndUpdate(
      { _id: brandId },
      { $addToSet: { followers: userId } },
      { new: true }
    );

    if (!updatedBrand) {
      console.log("[BrandController:followBrand] Brand not found:", {
        brandId,
      });
      return res.status(404).json({ message: "Brand not found" });
    }

    // Convert followers to strings for the response
    const followersAsStrings = updatedBrand.followers.map((id) =>
      id.toString()
    );

    console.log("[BrandController:followBrand] Updated brand:", {
      brandId: updatedBrand._id,
      followersAsStrings,
      addedUserId: userId.toString(),
    });

    // Create notification for brand owner
    await Notification.create({
      userId: updatedBrand.owner,
      type: "new_follower",
      title: "New Follower",
      message: `@${req.user.username} started following @${updatedBrand.username}`,
      brandId: updatedBrand._id,
      metadata: {
        follower: {
          id: userId,
          username: req.user.username,
          avatar: req.user.avatar,
        },
        brand: {
          id: updatedBrand._id,
          username: updatedBrand.username,
          name: updatedBrand.name,
        },
      },
    });

    const response = {
      message: "Successfully followed brand",
      followers: followersAsStrings,
      userStatus: {
        isFollowing: true,
      },
    };

    console.log(
      "[BrandController:followBrand] Sending success response:",
      response
    );
    res.status(200).json(response);
  } catch (error) {
    console.error("[BrandController:followBrand] Error:", {
      error: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
      userId: req.user?._id,
    });
    res.status(500).json({ message: "Error following brand" });
  }
};

// Unfollow a brand
exports.unfollowBrand = async (req, res) => {
  console.log("[BrandController:unfollowBrand] Starting unfollow request:", {
    brandId: req.params.brandId,
    userId: req.user?._id,
    timestamp: new Date().toISOString(),
  });

  try {
    const { brandId } = req.params;
    const userId = req.user._id;

    // Use findOneAndUpdate to atomically update the followers array
    const updatedBrand = await Brand.findOneAndUpdate(
      { _id: brandId },
      { $pull: { followers: userId } },
      { new: true }
    );

    if (!updatedBrand) {
      console.log("[BrandController:unfollowBrand] Brand not found:", {
        brandId,
      });
      return res.status(404).json({ message: "Brand not found" });
    }

    // Convert followers to strings for the response
    const followersAsStrings = updatedBrand.followers.map((id) =>
      id.toString()
    );

    console.log("[BrandController:unfollowBrand] Updated brand:", {
      brandId: updatedBrand._id,
      previousFollowers: updatedBrand.followers,
      followersAsStrings,
      removedUserId: userId.toString(),
    });

    const response = {
      message: "Successfully unfollowed brand",
      followers: followersAsStrings,
      userStatus: {
        isFollowing: false,
      },
    };

    console.log(
      "[BrandController:unfollowBrand] Sending success response:",
      response
    );
    res.status(200).json(response);
  } catch (error) {
    console.error("[BrandController:unfollowBrand] Error:", {
      error: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
      userId: req.user?._id,
    });
    res.status(500).json({ message: "Error unfollowing brand" });
  }
};

// Process join request
exports.requestJoin = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user._id;

    // Check if brand exists
    const brand = await Brand.findById(brandId);
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

    // Check if user is banned
    const isBanned = brand.bannedMembers.some(
      (member) => member.user.toString() === userId.toString()
    );
    if (isBanned) {
      return res
        .status(403)
        .json({ message: "You are banned from this brand" });
    }

    // Check if there's a pending request
    const pendingRequest = await JoinRequest.findOne({
      user: userId,
      brand: brandId,
      status: "pending",
    });
    if (pendingRequest) {
      return res
        .status(400)
        .json({ message: "You already have a pending request" });
    }

    if (brand.settings?.autoJoinEnabled) {
      // Auto-join enabled - add user directly to team
      brand.team.push({
        user: userId,
        role: brand.settings?.defaultRole || "MEMBER",
        permissions: {
          events: {
            create: false,
            edit: false,
            delete: false,
            view: true,
          },
          team: {
            manage: false,
            view: true,
          },
          analytics: {
            view: false,
          },
          codes: {
            friends: {
              generate: true,
              limit: 10,
              unlimited: false,
            },
            backstage: {
              generate: false,
              limit: 0,
              unlimited: false,
            },
            table: {
              generate: false,
            },
            ticket: {
              generate: false,
            },
            guest: {
              generate: false,
            },
          },
          scanner: {
            use: false,
          },
        },
      });
      await brand.save();

      // Create notification for brand owner
      await Notification.create({
        userId: brand.owner,
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
        userId: brand.owner,
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
    console.error("[BrandController:requestJoin] Error:", error);
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
        (member.role === "OWNER" || member.role === "admin")
    );
    if (!isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (action === "accept") {
      // Add user to team with default role
      brand.team.push({
        user: joinRequest.user._id,
        role: brand.settings?.defaultRole || "MEMBER",
        permissions: {
          events: {
            create: false,
            edit: false,
            delete: false,
            view: true,
          },
          team: {
            manage: false,
            view: true,
          },
          analytics: {
            view: false,
          },
          codes: {
            friends: {
              generate: true,
              limit: 10,
              unlimited: false,
            },
            backstage: {
              generate: false,
              limit: 0,
              unlimited: false,
            },
            table: {
              generate: false,
            },
            ticket: {
              generate: false,
            },
            guest: {
              generate: false,
            },
          },
          scanner: {
            use: false,
          },
        },
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
    console.error("[BrandController:processJoinRequest] Error:", error);
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
