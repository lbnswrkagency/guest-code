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
const Role = require("../models/roleModel");

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

    // Create initial brand without team members
    const brandData = {
      name: req.body.name,
      username: req.body.username.toLowerCase(),
      description: req.body.description,
      owner: req.user._id,
      team: [], // Start with empty team, will add after roles are created
      settings: {
        autoJoinEnabled: false,
        defaultRole: "Member", // Updated from MEMBER to Member
        ...req.body.settings,
      },
    };

    const brand = new Brand(brandData);
    await brand.save();

    // Create default roles
    const [founderRole, memberRole] = await roleController.createDefaultRoles(
      brand._id,
      req.user._id
    );

    // Now add the owner as a team member with the Founder role ID
    brand.team.push({
      user: req.user._id,
      role: founderRole._id, // Use the role ID, not the name
      joinedAt: new Date(),
    });

    await brand.save();

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

    const brands = await Brand.find({
      $or: [{ owner: req.user._id }, { "team.user": req.user._id }],
    });

    // Get all founder roles for brands where user is the owner
    const ownerBrandIds = brands
      .filter((brand) => brand.owner.toString() === req.user._id.toString())
      .map((brand) => brand._id);

    // Find founder roles for these brands if there are any owner brands
    let founderRoles = {};
    if (ownerBrandIds.length > 0) {
      const roles = await Role.find({
        brandId: { $in: ownerBrandIds },
        isFounder: true,
      });

      // Create a map of brandId -> founderRole (full object)
      founderRoles = roles.reduce((acc, role) => {
        acc[role.brandId.toString()] = role;
        return acc;
      }, {});
    }

    // Fetch all roles for team members
    const teamBrandIds = brands
      .filter((brand) =>
        brand.team.some(
          (member) => member.user.toString() === req.user._id.toString()
        )
      )
      .map((brand) => brand._id);

    // Create a map of brandId_userId -> roleObject
    const memberRolesMap = {};
    if (teamBrandIds.length > 0) {
      // First get all role IDs from brands' team members
      const roleIds = [];
      brands.forEach((brand) => {
        const teamMember = brand.team.find(
          (member) => member.user.toString() === req.user._id.toString()
        );
        if (teamMember && teamMember.role) {
          roleIds.push(teamMember.role);
        }
      });

      // Fetch all roles at once
      if (roleIds.length > 0) {
        const memberRoles = await Role.find({ _id: { $in: roleIds } });
        memberRoles.forEach((role) => {
          memberRolesMap[role._id.toString()] = role;
        });
      }
    }

    // Calculate and add memberCount and role information for each brand
    const brandsWithExtendedInfo = brands.map((brand) => {
      const brandObj = brand.toObject();

      // Calculate member count (team members + owner)
      const teamMemberCount = brand.team ? brand.team.length : 0;
      brandObj.memberCount = teamMemberCount + 1; // +1 for the owner

      // Determine if this user is the owner
      const isOwner = brand.owner.toString() === req.user._id.toString();

      // Find the user's role in this brand's team
      if (!isOwner && brand.team && brand.team.length > 0) {
        const teamMember = brand.team.find(
          (member) => member.user.toString() === req.user._id.toString()
        );

        if (teamMember && teamMember.role) {
          // Get role ID
          const roleId = teamMember.role.toString();

          // Add the role ID to the brand object
          brandObj.roleId = roleId;

          // Add the full role object if available
          if (memberRolesMap[roleId]) {
            brandObj.role = memberRolesMap[roleId];
          }
        }
      } else if (isOwner) {
        // For owners, use the Founder role ID if we found it
        const founderRole = founderRoles[brand._id.toString()];
        if (founderRole) {
          brandObj.roleId = founderRole._id;
          brandObj.role = founderRole; // Include full role object
        }
        brandObj.isOwner = true;
      }

      return brandObj;
    });

    res.status(200).json(brandsWithExtendedInfo);
  } catch (error) {
    console.error("[BrandController:getAllBrands] Error:", error);
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

    // Convert to object and add member count
    const brandObj = brand.toObject();

    // Calculate member count (team members + owner)
    const teamMemberCount = brand.team ? brand.team.length : 0;
    brandObj.memberCount = teamMemberCount + 1; // +1 for the owner

    res.status(200).json(brandObj);
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
      joinRequestStatus: null,
    };

    // Check if user is authenticated and update status accordingly
    if (req.user && req.user._id) {
      try {
        const userId = req.user._id.toString();

        // Safely check if user is following the brand
        const isFollowing =
          Array.isArray(brand.followers) && brand.followers.includes(userId);

        // Safely check if user has favorited the brand
        const isFavorited =
          Array.isArray(brand.favorites) && brand.favorites.includes(userId);

        // Safely check if user is a member of the brand
        const isMember =
          Array.isArray(brand.team) &&
          brand.team.some(
            (member) =>
              member.user &&
              member.user._id &&
              member.user._id.toString() === userId
          );

        // Safely get user's role in the brand
        let role = null;
        if (Array.isArray(brand.team)) {
          const teamMember = brand.team.find(
            (member) =>
              member.user &&
              member.user._id &&
              member.user._id.toString() === userId
          );
          role = teamMember && teamMember.role ? teamMember.role : null;
        }

        // Get join request status if exists
        let joinRequestStatus = null;
        try {
          const joinRequest = await JoinRequest.findOne({
            user: userId,
            brand: brand._id,
          }).select("status");
          joinRequestStatus = joinRequest ? joinRequest.status : null;
        } catch (joinRequestError) {
          console.error("Error fetching join request:", joinRequestError);
          // Continue with null joinRequestStatus
        }

        userStatus = {
          isFollowing,
          isFavorited,
          isMember,
          role,
          joinRequestStatus,
        };
      } catch (userStatusError) {
        console.error("Error determining user status:", userStatusError);
        // Fall back to default userStatus values
      }
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
    console.error("Error in getBrandProfile:", error);
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

    // Increment page views (simple version)
    try {
      await Brand.updateOne(
        { _id: brand._id },
        { $inc: { "metrics.pageViews": 1 } }
      );
    } catch (incrementError) {
      console.error(
        "[BrandController:getBrandProfileByUsername] Error incrementing page views:",
        incrementError
      );
      // Non-critical error, proceed with sending the response
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
      joinRequestStatus: null,
    };

    // Check if user is authenticated and update status accordingly
    if (req.user && req.user._id) {
      try {
        const userId = req.user._id.toString();

        // Safely check if user is following the brand
        const isFollowing =
          Array.isArray(brand.followers) && brand.followers.includes(userId);

        // Safely check if user has favorited the brand
        const isFavorited =
          Array.isArray(brand.favorites) && brand.favorites.includes(userId);

        // Safely check if user is a member of the brand
        const isMember =
          Array.isArray(brand.team) &&
          brand.team.some(
            (member) =>
              member.user &&
              member.user._id &&
              member.user._id.toString() === userId
          );

        // Safely get user's role in the brand
        let role = null;
        if (Array.isArray(brand.team)) {
          const teamMember = brand.team.find(
            (member) =>
              member.user &&
              member.user._id &&
              member.user._id.toString() === userId
          );
          role = teamMember && teamMember.role ? teamMember.role : null;
        }

        // Get join request status if exists
        let joinRequestStatus = null;
        try {
          const joinRequest = await JoinRequest.findOne({
            user: userId,
            brand: brand._id,
          }).select("status");
          joinRequestStatus = joinRequest ? joinRequest.status : null;
        } catch (joinRequestError) {
          console.error("Error fetching join request:", joinRequestError);
          // Continue with null joinRequestStatus
        }

        userStatus = {
          isFollowing,
          isFavorited,
          isMember,
          role,
          joinRequestStatus,
        };
      } catch (userStatusError) {
        console.error("Error determining user status:", userStatusError);
        // Fall back to default userStatus values
      }
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
    console.error("Error in getBrandProfileByUsername:", error);
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
    // First find the brand to check permissions
    const brandToDelete = await Brand.findById(req.params.brandId);

    if (!brandToDelete) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if user is owner or team member with admin rights
    const isOwner = brandToDelete.owner.toString() === req.user._id.toString();
    const isTeamAdmin = brandToDelete.team.some(
      (member) =>
        member.user.toString() === req.user._id.toString() &&
        member.role === "admin"
    );

    if (!isOwner && !isTeamAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this brand" });
    }

    // Delete the brand
    const deletedBrand = await Brand.findOneAndDelete({
      _id: req.params.brandId,
    });

    res.status(200).json({
      message: "Brand deleted successfully",
      deletedRolesCount: deletedRoles.deletedCount,
    });
  } catch (error) {
    console.error("[Delete Brand] Error:", error);
    res
      .status(500)
      .json({ message: "Error deleting brand", error: error.message });
  }
};

// Get team members
exports.getTeamMembers = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Fetch the brand and populate team.user
    const brand = await Brand.findById(brandId).populate({
      path: "team.user",
      select: "_id username firstName lastName avatar",
    });

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Fetch all roles for this brand first
    const roles = await Role.find({ brandId });
    const rolesMap = {};
    roles.forEach((role) => {
      rolesMap[role._id.toString()] = {
        name: role.name,
        isFounder: role.isFounder || false,
      };
    });

    // Filter out any invalid team members before mapping
    const validTeamMembers = brand.team.filter(
      (member) => member && member.user
    );

    // Transform team members data
    const members = await Promise.all(
      validTeamMembers.map(async (member) => {
        // Ensure member.user exists before accessing properties
        if (!member.user || !member.user._id) {
          console.log("Skipping invalid team member:", member);
          return null;
        }

        let roleName = "Unknown";
        let isFounderRole = false;

        // Get role information if member.role is valid
        if (member.role) {
          const roleId = member.role.toString();
          if (rolesMap[roleId]) {
            roleName = rolesMap[roleId].name;
            isFounderRole = rolesMap[roleId].isFounder;
          }
        }

        return {
          _id: member.user._id,
          name:
            `${member.user.firstName || ""} ${
              member.user.lastName || ""
            }`.trim() ||
            member.user.username ||
            "Unknown User",
          username: member.user.username || "unknown",
          role: member.role, // Keep the role ID
          roleName: roleName, // Add role name
          isFounderRole: isFounderRole, // Add isFounder flag
          avatar: member.user.avatar?.medium || member.user.avatar || null,
          joinedAt: member.joinedAt || new Date(),
        };
      })
    );

    // Filter out any null results that might have occurred during mapping
    const validMembers = members.filter((member) => member !== null);

    res.json(validMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ message: "Error fetching team members" });
  }
};

// Update member role
exports.updateMemberRole = async (req, res) => {
  try {
    const { brandId, memberId } = req.params;
    const { roleId } = req.body; // Now expecting roleId instead of role name

    if (!roleId) {
      return res.status(400).json({ message: "Role ID is required" });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if user has permission to update roles
    if (!brand.owner.equals(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to update roles" });
    }

    // Get the role to validate it exists and is not a Founder role
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.name === "FOUNDER") {
      return res.status(403).json({ message: "Cannot assign Founder role" });
    }

    const memberIndex = brand.team.findIndex(
      (m) => m.user.toString() === memberId
    );
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Update role with the role ID
    brand.team[memberIndex].role = roleId;

    await brand.save();

    res.json({
      message: "Member role updated successfully",
      member: brand.team[memberIndex],
    });
  } catch (error) {
    console.error("[BrandController:updateMemberRole] Error:", error);
    res
      .status(500)
      .json({ message: "Error updating member role", error: error.message });
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

    brand.team = brand.team.filter((m) => !m.user.equals(memberId));
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
    brand.team = brand.team.filter((m) => !m.user.equals(memberId));
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
    const userId = req.user._id;

    // Use findOneAndUpdate to atomically update the followers array
    const updatedBrand = await Brand.findOneAndUpdate(
      { _id: brandId },
      { $addToSet: { followers: userId } },
      { new: true }
    );

    if (!updatedBrand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Convert followers to strings for the response
    const followersAsStrings = updatedBrand.followers.map((id) =>
      id.toString()
    );

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
      return res.status(404).json({ message: "Brand not found" });
    }

    // Convert followers to strings for the response
    const followersAsStrings = updatedBrand.followers.map((id) =>
      id.toString()
    );

    const response = {
      message: "Successfully unfollowed brand",
      followers: followersAsStrings,
      userStatus: {
        isFollowing: false,
      },
    };

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

    // First delete any existing join requests for this user and brand
    await JoinRequest.deleteMany({
      user: userId,
      brand: brandId,
    });

    if (brand.settings?.autoJoinEnabled) {
      // Auto-join enabled - add user directly to team
      // Find the default role ID
      const defaultRoleName = brand.settings?.defaultRole || "Member";
      const defaultRole = await Role.findOne({
        brandId,
        name: defaultRoleName,
      });

      if (!defaultRole) {
        return res.status(500).json({
          message: "Default role not found",
          error: "Could not find the default role for this brand",
        });
      }

      // Add user with role ID
      brand.team.push({
        user: userId,
        role: defaultRole._id, // Use role ID instead of name
        joinedAt: new Date(),
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
          brand: {
            id: brand._id,
            username: brand.username,
            name: brand.name,
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
    console.error("[BrandController:requestJoin] Error:", {
      error: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      message: "Error processing join request",
      error: error.message,
    });
  }
};

// Process join request (accept/reject)
exports.processJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const joinRequest = await JoinRequest.findById(requestId).populate("user");
    if (!joinRequest) {
      return res.status(404).json({ message: "Join request not found" });
    }

    const brand = await Brand.findById(joinRequest.brand);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if user has permission to process requests
    if (!brand.owner.equals(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to process requests" });
    }

    if (action === "accept") {
      // Find the default role ID
      const defaultRoleName = brand.settings?.defaultRole || "Member";
      const defaultRole = await Role.findOne({
        brandId: brand._id,
        name: defaultRoleName,
      });

      if (!defaultRole) {
        return res.status(500).json({
          message: "Default role not found",
          error: "Could not find the default role for this brand",
        });
      }

      // Add user to team with role ID
      brand.team.push({
        user: joinRequest.user._id,
        role: defaultRole._id, // Use role ID instead of name
        joinedAt: new Date(),
      });
      await brand.save();

      // Create notification for the user
      await Notification.create({
        userId: joinRequest.user._id,
        type: "success",
        title: "Join Request Accepted",
        message: `Your request to join ${brand.name} has been accepted`,
        brandId: brand._id,
      });

      // Delete the request
      await JoinRequest.findByIdAndDelete(requestId);

      return res.status(200).json({
        message: "Join request accepted",
        team: brand.team,
      });
    } else if (action === "reject") {
      // Update request status
      joinRequest.status = "rejected";
      await joinRequest.save();

      // Create notification for the user
      await Notification.create({
        userId: joinRequest.user._id,
        type: "error",
        title: "Join Request Rejected",
        message: `Your request to join ${brand.name} has been rejected`,
        brandId: brand._id,
      });

      return res.status(200).json({
        message: "Join request rejected",
      });
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
  } catch (error) {
    console.error("[BrandController:processJoinRequest] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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

    // Clean up ALL join requests for this user and brand
    await JoinRequest.deleteMany({
      user: userId,
      brand: brandId,
    });

    res.status(200).json({
      message: "Successfully left brand",
      userStatus: {
        isMember: false,
        role: null,
      },
    });
  } catch (error) {
    console.error("[BrandController:leaveBrand] Error:", error);
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

    // Use findOneAndUpdate to atomically update the favorites array
    const updatedBrand = await Brand.findOneAndUpdate(
      { _id: brandId },
      { $addToSet: { favorites: userId } },
      { new: true }
    );

    if (!updatedBrand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Convert favorites to strings for the response
    const favoritesAsStrings = updatedBrand.favorites.map((id) =>
      id.toString()
    );

    const response = {
      message: "Successfully favorited brand",
      favorites: favoritesAsStrings,
      userStatus: {
        isFavorited: true,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("[BrandController:favoriteBrand] Error:", {
      error: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
      userId: req.user?._id,
    });
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

// Update brand settings
exports.updateBrandSettings = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { autoJoinEnabled, defaultRole } = req.body;

    // Validate brandId
    if (!brandId) {
      return res.status(400).json({ message: "Brand ID is required" });
    }

    // Find the brand
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if user is authorized (must be FOUNDER)
    const isOwner = brand.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      return res
        .status(403)
        .json({ message: "Only brand owner can update settings" });
    }

    // Update settings
    brand.settings.autoJoinEnabled = autoJoinEnabled;
    if (defaultRole && defaultRole !== "FOUNDER") {
      brand.settings.defaultRole = defaultRole;
    }

    await brand.save();

    res.status(200).json({
      message: "Settings updated successfully",
      settings: brand.settings,
    });
  } catch (error) {
    console.error("[BrandController:updateBrandSettings] Error:", error);
    res.status(500).json({
      message: "Error updating brand settings",
      error: error.message,
    });
  }
};

exports.cancelJoinRequest = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user._id;

    // Delete the join request
    const deletedRequest = await JoinRequest.findOneAndDelete({
      user: userId,
      brand: brandId,
      status: "pending", // Only allow canceling pending requests
    });

    if (!deletedRequest) {
      return res.status(404).json({ message: "No pending join request found" });
    }

    // Delete associated notification
    await Notification.deleteMany({
      type: "join_request",
      "metadata.user.id": userId,
      brandId: brandId,
    });

    res.status(200).json({
      message: "Join request cancelled successfully",
      status: "cancelled",
    });
  } catch (error) {
    console.error("[BrandController:cancelJoinRequest] Error:", {
      error: error.message,
      stack: error.stack,
      brandId: req.params.brandId,
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      message: "Error cancelling join request",
      error: error.message,
    });
  }
};

// New function specifically for updating Meta Pixel ID
exports.updateBrandMetaPixel = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { metaPixelId } = req.body;
    const userId = req.user._id;

    if (!brandId) {
      return res.status(400).json({ message: "Brand ID is required." });
    }

    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }

    // Check if the current user is the owner of the brand
    // TODO: Enhance permission check to allow admins based on roles later if needed
    if (brand.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        message:
          "Unauthorized. Only the brand owner can update the Meta Pixel ID.",
      });
    }

    // Update the metaPixelId - allow empty string to clear it
    brand.metaPixelId = metaPixelId || "";
    await brand.save();

    // Return only necessary brand info, especially the updated pixel ID
    res.status(200).json({
      message: "Brand Meta Pixel ID updated successfully.",
      metaPixelId: brand.metaPixelId,
    });
  } catch (error) {
    console.error("[BrandController:updateBrandMetaPixel] Error:", error);
    res.status(500).json({
      message: "Error updating Brand Meta Pixel ID",
      error: error.message,
    });
  }
};

// New function for updating Spotify configuration
exports.updateSpotifyConfig = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { spotifyClientId, spotifyClientSecret, spotifyPlaylistId } =
      req.body;
    const userId = req.user._id;

    if (!brandId) {
      return res.status(400).json({ message: "Brand ID is required." });
    }

    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }

    // Check if the current user is the owner of the brand
    // TODO: Enhance permission check to allow admins based on roles later if needed
    if (brand.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        message:
          "Unauthorized. Only the brand owner can update Spotify configuration.",
      });
    }

    // Update Spotify credentials - empty strings will clear the values
    brand.spotifyClientId = spotifyClientId || "";
    brand.spotifyClientSecret = spotifyClientSecret || "";
    brand.spotifyPlaylistId = spotifyPlaylistId || "";
    await brand.save();

    // Only return IDs for security, not the full credentials
    res.status(200).json({
      message: "Spotify configuration updated successfully.",
      spotifyConfigured: !!(
        spotifyClientId &&
        spotifyClientSecret &&
        spotifyPlaylistId
      ),
      spotifyPlaylistId: brand.spotifyPlaylistId,
    });
  } catch (error) {
    console.error("[BrandController:updateSpotifyConfig] Error:", error);
    res.status(500).json({
      message: "Error updating Spotify configuration",
      error: error.message,
    });
  }
};

module.exports = {
  createBrand: exports.createBrand,
  getAllBrands: exports.getAllBrands,
  getBrand: exports.getBrand,
  getBrandProfile: exports.getBrandProfile,
  getBrandProfileByUsername: exports.getBrandProfileByUsername,
  updateBrand: exports.updateBrand,
  updateBrandLogo: exports.updateBrandLogo,
  updateBrandCover: exports.updateBrandCover,
  deleteBrand: exports.deleteBrand,
  getTeamMembers: exports.getTeamMembers,
  updateMemberRole: exports.updateMemberRole,
  removeMember: exports.removeMember,
  banMember: exports.banMember,
  followBrand: exports.followBrand,
  unfollowBrand: exports.unfollowBrand,
  requestJoin: exports.requestJoin,
  processJoinRequest: exports.processJoinRequest,
  leaveBrand: exports.leaveBrand,
  favoriteBrand: exports.favoriteBrand,
  unfavoriteBrand: exports.unfavoriteBrand,
  updateBrandSettings: exports.updateBrandSettings,
  cancelJoinRequest: exports.cancelJoinRequest,
  updateBrandMetaPixel: exports.updateBrandMetaPixel,
  updateSpotifyConfig: exports.updateSpotifyConfig,
};
