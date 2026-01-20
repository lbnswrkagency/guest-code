const Notification = require("../models/notificationModel");
const Brand = require("../models/brandModel");
const Role = require("../models/roleModel");
const Event = require("../models/eventsModel");

/**
 * Find all users who have tables.manage permission for a given event
 * This includes both the main brand team members and co-host team members
 * @param {string} brandId - The main brand's ID
 * @param {string} eventId - The event's ID (optional, used to check co-host permissions)
 * @returns {Array<string>} - Array of user IDs who can manage tables
 */
const findUsersWithTablePermission = async (brandId, eventId = null) => {
  try {
    const userIds = new Set();

    // 1. Get the main brand and its team members
    const brand = await Brand.findById(brandId).populate("team.role");
    if (!brand) {
      console.log("[findUsersWithTablePermission] Brand not found:", brandId);
      return [];
    }

    // 2. Add brand owner (owners have all permissions)
    if (brand.owner) {
      userIds.add(brand.owner.toString());
    }

    // 3. Check each team member's role for tables.manage permission
    if (brand.team && brand.team.length > 0) {
      for (const member of brand.team) {
        if (!member.user) continue;

        // If role is populated, check directly
        if (member.role && member.role.permissions?.tables?.manage === true) {
          userIds.add(member.user.toString());
        } else if (member.role && typeof member.role === "object" && member.role._id) {
          // Role is populated but we need to check permissions
          const role = await Role.findById(member.role._id);
          if (role?.permissions?.tables?.manage === true) {
            userIds.add(member.user.toString());
          }
        } else if (member.role) {
          // Role is just an ID, fetch it
          const role = await Role.findById(member.role);
          if (role?.permissions?.tables?.manage === true) {
            userIds.add(member.user.toString());
          }
        }
      }
    }

    // 4. If eventId is provided, also check co-host permissions
    if (eventId) {
      const event = await Event.findById(eventId);
      if (event && event.coHosts && event.coHosts.length > 0) {
        for (const coHostId of event.coHosts) {
          // Find the co-host brand
          const coHostBrand = await Brand.findById(coHostId);
          if (!coHostBrand) continue;

          // Check co-host role permissions from the event
          const coHostPermissions = event.coHostRolePermissions || [];
          const brandPermissions = coHostPermissions.find(
            (cp) => cp.brandId?.toString() === coHostId.toString()
          );

          if (!brandPermissions) continue;

          // Add co-host brand owner if they have table manage permission
          if (coHostBrand.owner) {
            // Check if any role for this co-host has tables.manage
            const hasOwnerPermission = brandPermissions.rolePermissions?.some(
              (rp) => rp.permissions?.tables?.manage === true
            );
            if (hasOwnerPermission) {
              userIds.add(coHostBrand.owner.toString());
            }
          }

          // Check each co-host team member
          if (coHostBrand.team && coHostBrand.team.length > 0) {
            for (const member of coHostBrand.team) {
              if (!member.user || !member.role) continue;

              // Find the permission for this specific role
              const rolePermission = brandPermissions.rolePermissions?.find(
                (rp) => rp.roleId?.toString() === member.role.toString()
              );

              if (rolePermission?.permissions?.tables?.manage === true) {
                userIds.add(member.user.toString());
              }
            }
          }
        }
      }
    }

    return Array.from(userIds);
  } catch (error) {
    console.error("[findUsersWithTablePermission] Error:", error.message);
    return [];
  }
};

const createSystemNotification = async ({
  userId,
  type,
  title,
  message,
  metadata = {},
  brandId = null,
  requestId = null,
}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      metadata,
      brandId,
      requestId,
      read: false,
      createdAt: new Date(),
    });

    const savedNotification = await notification.save();

    // Get the io instance
    const io = global.io;

    if (io) {
      io.to(`user:${userId}`).emit("new_notification", savedNotification);
    }

    return savedNotification;
  } catch (error) {
    console.error("Error creating notification:", error.message);
    throw error;
  }
};

// Example usage:
// await createSystemNotification({
//   userId: user._id,
//   type: 'join_request',
//   title: 'New Join Request',
//   message: `@${requester.username} wants to join your brand`,
//   metadata: { requester },
//   brandId: brand._id,
//   requestId: joinRequest._id
// });

module.exports = {
  createSystemNotification,
  findUsersWithTablePermission,
};
