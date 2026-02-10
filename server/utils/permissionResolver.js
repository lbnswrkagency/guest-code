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
 * Converts any Map-like object to a plain object (deeply)
 * Handles Mongoose Maps, native Maps, and already-plain objects
 */
function ensurePlainObject(obj, deep = true) {
  if (!obj) return {};

  // If it's a Map instance
  if (obj instanceof Map) {
    const result = Object.fromEntries(obj);
    if (deep) {
      Object.keys(result).forEach(key => {
        if (typeof result[key] === 'object' && result[key] !== null) {
          result[key] = ensurePlainObject(result[key], deep);
        }
      });
    }
    return result;
  }

  // If it has a toObject method (Mongoose Map or Document)
  if (typeof obj.toObject === 'function') {
    const result = obj.toObject();
    if (deep) {
      Object.keys(result).forEach(key => {
        if (typeof result[key] === 'object' && result[key] !== null) {
          result[key] = ensurePlainObject(result[key], deep);
        }
      });
    }
    return result;
  }

  // If it's already a plain object, deep copy if needed
  if (typeof obj === 'object') {
    const result = { ...obj };
    if (deep) {
      Object.keys(result).forEach(key => {
        if (typeof result[key] === 'object' && result[key] !== null) {
          result[key] = ensurePlainObject(result[key], deep);
        }
      });
    }
    return result;
  }

  return {};
}

/**
 * Remaps permission keys to match current code settings IDs
 *
 * Matches by code _id first. For keys that don't match any _id, attempts to
 * convert from code name to _id (handles legacy data stored with name keys).
 * Unmatched keys are dropped.
 *
 * @param {Object} storedCodes - The codes object from stored permissions (key -> permission)
 * @param {Array} currentCodeSettings - Current code settings for the event
 * @returns {Object} Remapped codes object with _id keys
 */
function remapPermissionKeys(storedCodes, currentCodeSettings) {
  if (!storedCodes || !currentCodeSettings || currentCodeSettings.length === 0) {
    return storedCodes || {};
  }

  const remappedCodes = {};
  const codeById = new Map();
  const codeByName = new Map();

  currentCodeSettings.forEach(code => {
    const codeId = code._id?.toString() || code._id;
    if (codeId) codeById.set(codeId, code);
    if (code.name) codeByName.set(code.name, code);
  });

  Object.entries(storedCodes).forEach(([key, permission]) => {
    if (codeById.has(key)) {
      // Already an _id key — pass through
      remappedCodes[key] = permission;
    } else if (codeByName.has(key)) {
      // Name key — convert to _id
      const code = codeByName.get(key);
      const codeId = code._id?.toString() || code._id;
      remappedCodes[codeId] = permission;
    }
    // Unmatched keys are silently dropped (no longer in current code settings)
  });

  return remappedCodes;
}

/**
 * Normalizes permissions to ensure consistent format
 * Always returns plain objects, never Maps
 *
 * @param {Object} permissions - Raw permissions object
 * @param {Array} [codeSettings] - Optional current code settings for key remapping
 */
function normalizePermissions(permissions, codeSettings = null) {
  if (!permissions) {
    return getDefaultPermissions();
  }

  // Handle if permissions itself needs toObject
  const perms = typeof permissions.toObject === 'function'
    ? permissions.toObject()
    : { ...permissions };

  // Normalize codes permissions to ensure limit and unlimited fields are preserved
  let rawCodes = ensurePlainObject(perms.codes);

  // If code settings provided, remap permission keys to match current code _ids
  if (codeSettings && codeSettings.length > 0) {
    rawCodes = remapPermissionKeys(rawCodes, codeSettings);

    // AUTO-SYNC: Add entries for codes that have NO permission saved
    // This ensures every visible code has a permission entry (default: no access)
    // When host creates NEW codes after setting co-host permissions, those new codes
    // would have NO permission entry. This ensures deny-by-default for such codes.
    codeSettings.forEach(code => {
      const codeId = code._id?.toString() || code._id;
      if (codeId && !rawCodes[codeId]) {
        rawCodes[codeId] = {
          generate: false,  // No access by default
          limit: 0,
          unlimited: false,
        };
      }
    });
  }

  const normalizedCodes = {};
  Object.keys(rawCodes).forEach(codeName => {
    const codePerms = rawCodes[codeName];
    if (codePerms && typeof codePerms === 'object') {
      normalizedCodes[codeName] = {
        generate: codePerms.generate === true,
        // Preserve limit value - default to 0 if not set
        limit: typeof codePerms.limit === 'number' ? codePerms.limit : 0,
        // Preserve unlimited flag - must be explicitly true
        unlimited: codePerms.unlimited === true,
      };
    }
  });

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
    codes: normalizedCodes,
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
  remapPermissionKeys,
};
