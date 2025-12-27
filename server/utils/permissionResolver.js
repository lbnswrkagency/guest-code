/**
 * Unified Permission Resolver
 *
 * Resolves effective permissions for any user in any context (regular brand member or co-host).
 * Returns permissions in a consistent format that can be used directly by frontend components.
 */

const Role = require('../models/roleModel');
const Brand = require('../models/brandModel');
const Event = require('../models/eventsModel');

/**
 * Converts any Map-like object to a plain object
 * Handles Mongoose Maps, native Maps, and already-plain objects
 */
function ensurePlainObject(obj) {
  if (!obj) return {};

  // If it's a Map instance
  if (obj instanceof Map) {
    return Object.fromEntries(obj);
  }

  // If it has a toObject method (Mongoose Map or Document)
  if (typeof obj.toObject === 'function') {
    return obj.toObject();
  }

  // If it's already a plain object, return a copy
  if (typeof obj === 'object') {
    return { ...obj };
  }

  return {};
}

/**
 * Normalizes permissions to ensure consistent format
 * Always returns plain objects, never Maps
 */
function normalizePermissions(permissions) {
  if (!permissions) {
    return getDefaultPermissions();
  }

  // Handle if permissions itself needs toObject
  const perms = typeof permissions.toObject === 'function'
    ? permissions.toObject()
    : { ...permissions };

  return {
    analytics: {
      view: perms.analytics?.view ?? false,
    },
    scanner: {
      use: perms.scanner?.use ?? false,
    },
    tables: {
      access: perms.tables?.access ?? false,
      manage: perms.tables?.manage ?? false,
      summary: perms.tables?.summary ?? false,
    },
    battles: {
      view: perms.battles?.view ?? false,
      edit: perms.battles?.edit ?? false,
      delete: perms.battles?.delete ?? false,
    },
    codes: ensurePlainObject(perms.codes),
    // Include events permissions for regular brand roles
    events: perms.events ? {
      create: perms.events?.create ?? false,
      edit: perms.events?.edit ?? false,
      delete: perms.events?.delete ?? false,
      view: perms.events?.view ?? true,
    } : undefined,
    // Include team permissions for regular brand roles
    team: perms.team ? {
      manage: perms.team?.manage ?? false,
      view: perms.team?.view ?? true,
    } : undefined,
  };
}

/**
 * Returns default (empty) permissions
 */
function getDefaultPermissions() {
  return {
    analytics: { view: false },
    scanner: { use: false },
    tables: { access: false, manage: false, summary: false },
    battles: { view: false, edit: false, delete: false },
    codes: {},
  };
}

/**
 * Gets the user's role in a brand
 *
 * @param {string} userId - User ID
 * @param {string} brandId - Brand ID
 * @returns {Object|null} Role object or null if not found
 */
async function getUserRoleInBrand(userId, brandId) {
  const brand = await Brand.findById(brandId).populate({
    path: 'team.role',
    model: 'Role'
  });

  if (!brand) return null;

  // Check if user is the owner
  if (brand.owner?.toString() === userId.toString()) {
    const founderRole = await Role.findOne({
      brandId: brandId,
      isFounder: true
    });
    return founderRole;
  }

  // Check if user is in the team
  const teamMember = brand.team?.find(
    member => member.user?.toString() === userId.toString()
  );

  if (teamMember?.role) {
    // If role is already populated
    if (typeof teamMember.role === 'object' && teamMember.role._id) {
      return teamMember.role;
    }
    // If role is just an ID, fetch it
    return await Role.findById(teamMember.role);
  }

  return null;
}

/**
 * Resolves effective permissions for a user
 *
 * For regular brand members: Returns role permissions from the Role model
 * For co-hosts: Returns event-specific permissions from Event.coHostRolePermissions
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.brandId - Brand the user belongs to (their team membership)
 * @param {string} [params.eventId] - Event ID (required for co-host permissions)
 * @param {boolean} [params.isCoHost=false] - Whether this is a co-host context
 * @returns {Object} Unified permissions object (always plain objects, no Maps)
 */
async function resolvePermissions({ userId, brandId, eventId, isCoHost = false }) {
  try {
    // Get user's role in their brand
    const userRole = await getUserRoleInBrand(userId, brandId);

    if (!userRole) {
      return getDefaultPermissions();
    }

    // For regular brand members (not co-host context)
    if (!isCoHost) {
      return normalizePermissions(userRole.permissions);
    }

    // For co-hosts: need event-specific permissions
    if (!eventId) {
      return getDefaultPermissions();
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return getDefaultPermissions();
    }

    // Find co-host permissions for this brand
    const coHostPermissions = event.coHostRolePermissions || [];
    const brandPermissions = coHostPermissions.find(
      cp => cp.brandId?.toString() === brandId.toString()
    );

    if (!brandPermissions) {
      return getDefaultPermissions();
    }

    // Find permissions for the user's specific role
    const rolePermission = brandPermissions.rolePermissions?.find(
      rp => rp.roleId?.toString() === userRole._id.toString()
    );

    if (!rolePermission?.permissions) {
      return getDefaultPermissions();
    }

    return normalizePermissions(rolePermission.permissions);
  } catch (error) {
    console.error('Error resolving permissions:', error);
    return getDefaultPermissions();
  }
}

/**
 * Resolves permissions for multiple events at once (for batch processing)
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.brandId - Brand the user belongs to
 * @param {Array<string>} params.eventIds - Array of event IDs
 * @param {boolean} params.isCoHost - Whether this is a co-host context
 * @returns {Object} Map of eventId -> permissions
 */
async function resolvePermissionsBatch({ userId, brandId, eventIds, isCoHost = false }) {
  const results = {};

  // Get user's role once
  const userRole = await getUserRoleInBrand(userId, brandId);

  if (!userRole) {
    eventIds.forEach(eventId => {
      results[eventId] = getDefaultPermissions();
    });
    return results;
  }

  // For regular brand members, all events have same permissions
  if (!isCoHost) {
    const permissions = normalizePermissions(userRole.permissions);
    eventIds.forEach(eventId => {
      results[eventId] = permissions;
    });
    return results;
  }

  // For co-hosts, need to check each event
  const events = await Event.find({
    _id: { $in: eventIds }
  }).select('coHostRolePermissions');

  for (const event of events) {
    const eventId = event._id.toString();

    const coHostPermissions = event.coHostRolePermissions || [];
    const brandPermissions = coHostPermissions.find(
      cp => cp.brandId?.toString() === brandId.toString()
    );

    if (!brandPermissions) {
      results[eventId] = getDefaultPermissions();
      continue;
    }

    const rolePermission = brandPermissions.rolePermissions?.find(
      rp => rp.roleId?.toString() === userRole._id.toString()
    );

    if (!rolePermission?.permissions) {
      results[eventId] = getDefaultPermissions();
      continue;
    }

    results[eventId] = normalizePermissions(rolePermission.permissions);
  }

  // Add default permissions for any events not found
  eventIds.forEach(eventId => {
    if (!results[eventId]) {
      results[eventId] = getDefaultPermissions();
    }
  });

  return results;
}

module.exports = {
  resolvePermissions,
  resolvePermissionsBatch,
  normalizePermissions,
  ensurePlainObject,
  getDefaultPermissions,
  getUserRoleInBrand,
};
