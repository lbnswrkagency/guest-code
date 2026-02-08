# Co-Host Permission Limit Bug - Investigation Document

## Problem Summary

**Issue:** Co-hosts see codes counting up but limits aren't being recognized. The counter always shows "GENERATED" (unlimited) instead of "REMAINING X" (limited).

**Current Behavior:**
- VIP Code shows "0 REMAINING" even though nothing is created (wrong - should have a limit like 5)
- Friends Code (Local) shows "GENERATED" (unlimited) even when host set a limit

**Expected Behavior:**
- If host grants co-host 5 VIP codes, co-host should see "REMAINING 5" initially
- After generating 2, it should show "REMAINING 3"

---

## System Architecture Overview

### Entities Involved

#### 1. Brands
- Each brand has an **owner** (founder) and a **team** of members
- Team members have **roles** with specific permissions
- Brands can be **co-hosts** on other brands' events

#### 2. Events
- Events belong to a **brand** (the main host)
- Events can have **coHosts** (array of brand IDs)
- Events have **coHostRolePermissions** - stores what permissions each co-host brand's roles have

#### 3. Roles
- Roles belong to a brand
- Roles have **permissions** object with nested permissions for codes, analytics, etc.
- **Founder role** has `isFounder: true` and full access to everything

#### 4. CodeSettings
- Stored in separate `CodeSettings` collection (not embedded in events)
- Each code setting has: `_id`, `name`, `type`, `limit`, `maxPax`, `isEnabled`, `brandId`, `eventId`
- Child events inherit CodeSettings from parent via `getParentEventId()`

---

## Permission Flow

### For Regular Brand Members (Own Events)

```
User logs in
  → authController.js fetches user's brand memberships
  → For each brand, gets user's role and permissions
  → Permissions stored in: selectedBrand.role.permissions.codes
```

### For Co-Hosts (Other Brand's Events)

```
User logs in
  → authController.js detects user is co-host on an event
  → Fetches event.coHostRolePermissions
  → Finds permissions for user's brand + user's role
  → Normalizes permissions via permissionResolver.js
  → Returns as: selectedEvent.coHostBrandInfo.effectivePermissions.codes
```

---

## Data Structures

### Event.coHostRolePermissions Structure

```javascript
coHostRolePermissions: [
  {
    brandId: ObjectId("co-host-brand-id"),
    rolePermissions: [
      {
        roleId: ObjectId("role-id"),  // e.g., Founder role of co-host brand
        permissions: {
          codes: {
            "6985471218d5a907663d3a2e": {  // Key is code setting _id
              generate: true,
              limit: 5,
              unlimited: false
            },
            "Backstage Code": {  // Legacy: Key is code name
              generate: true,
              limit: 0,
              unlimited: true
            }
          },
          analytics: { view: true },
          scanner: { use: true },
          // ...
        }
      }
    ]
  }
]
```

### CodeSettings Structure

```javascript
{
  _id: ObjectId("6987e38bd09b0246db376bf1"),
  name: "VIP Code (locally)",  // Display name - can differ from stored permission key!
  type: "custom",
  brandId: ObjectId("main-host-brand-id"),
  eventId: ObjectId("event-id"),  // or null for brand-level templates
  isEnabled: true,
  limit: 0,  // This is the code setting's default limit, NOT the permission limit
  maxPax: 1,
  isGlobalForBrand: false
}
```

### Permission Object (Normalized)

```javascript
{
  generate: true,    // Can this role generate this code type?
  limit: 5,          // How many total pax can they generate? (0 = check unlimited flag)
  unlimited: true    // If true, no limit applies
}
```

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `server/utils/permissionResolver.js` | Normalizes permissions, remaps keys |
| `server/controllers/authController.js` | Login flow, fetches user permissions |
| `server/controllers/coHostController.js` | Co-host permission management |
| `server/controllers/codeSettingsController.js` | CRUD for code settings |
| `server/models/eventsModel.js` | Event schema with coHostRolePermissions |

### Frontend

| File | Purpose |
|------|---------|
| `client/src/Components/CodeGenerator/CodeGenerator.js` | Code generation UI, permission checking |
| `client/src/Components/CoHost/CoHostRoleSettings.js` | UI for host to set co-host permissions |

---

## The Bug: Key Mismatch

### Console Output Analysis

```javascript
// From CodeGenerator.js getActivePermission()
availableKeys: ['6985471218d5a907663d3a2e', 'Backstage Code']  // Stored permission keys
selectedCodeType: "VIP Code (locally)"                          // Current code's display name
settingId: "6987e38bd09b0246db376bf1"                           // Current code's _id

// PROBLEM: settingId "6987e38bd09b0246db376bf1" is NOT in availableKeys!
```

### Why Keys Don't Match

1. **Permissions were saved** with code IDs that existed at save time
2. **New codes were created** AFTER permissions were saved (VIP Code)
3. **New code has new _id** that doesn't exist in stored permissions
4. **Lookup fails** → Falls back to unlimited (bug) or denied (our fix attempt)

### Additional Complexity: Name vs ID Keys

- **CoHostRoleSettings.js** saves permissions using `code._id` as key
- **codeSettingsController.js** (founder role) uses `code.name` or `code.type` as key
- This creates **mixed key formats** in stored data

---

## What We Tried

### Attempt 1: Backend Key Remapping

**File:** `server/utils/permissionResolver.js`

Added `remapPermissionKeys()` function that:
- Takes stored permission keys and current code settings
- Tries to match keys by: exact ID, exact name, normalized name
- Remaps to current code `_id` for stable lookup

**Result:** Helps when code NAME changed but ID stayed same. Doesn't help when code is NEW (no stored permission at all).

### Attempt 2: Backend Auto-Sync

**File:** `server/utils/permissionResolver.js`

Added auto-sync logic in `normalizePermissions()`:
```javascript
codeSettings.forEach(code => {
  const codeId = code._id?.toString();
  if (codeId && !rawCodes[codeId]) {
    rawCodes[codeId] = {
      generate: false,  // No access by default
      limit: 0,
      unlimited: false,
    };
  }
});
```

**Result:** Codes without permission now get `generate: false`, so they're filtered out. But this doesn't fix the LIMIT recognition issue for codes that DO have permissions.

### Attempt 3: Frontend Fallback Change

**File:** `client/src/Components/CodeGenerator/CodeGenerator.js`

Changed fallback from granting unlimited to denying:
```javascript
// Before: return { unlimited: true, hasAccess: true }
// After: return { unlimited: false, hasAccess: false }
```

**Result:** Safety net, but doesn't address root cause.

---

## Current State / Where We're Stuck

### Problem 1: VIP Code Shows "0 REMAINING"

The VIP Code's `_id` is not in stored permissions at all. Our auto-sync adds it with `generate: false`, which causes:
- It gets filtered out from visible codes (good if we want to hide it)
- OR if somehow visible, shows 0 remaining (bad - should be hidden entirely)

**Root Issue:** Auto-sync is setting `limit: 0` for new codes. If the code IS shown, it looks like limit reached.

### Problem 2: Friends Code (Local) Shows Unlimited

Even for codes that ARE in stored permissions, the limit isn't being recognized.

**Possible Causes:**
1. Permission lookup still failing (key mismatch)
2. `unlimited` flag incorrectly set to `true` in stored data
3. Limit value is `0` in stored data (which we treat as "check unlimited flag")

### Problem 3: Dynamic Code Names

Code names can be anything - "VIP Code", "Friends Code (Local)", "Backstage", etc. The system needs to handle:
- New codes created after permissions were set
- Code names that changed
- Multiple codes with similar names

---

## Debugging Steps Needed

### Step 1: Log What's Actually Stored

Add logging to see the raw `coHostRolePermissions` from the event:
```javascript
// In authController.js or coHostController.js
console.log("Raw coHostRolePermissions:", JSON.stringify(event.coHostRolePermissions, null, 2));
```

### Step 2: Log What's Returned to Frontend

```javascript
// In authController.js after normalizing
console.log("Normalized effectivePermissions.codes:", effectivePermissions.codes);
```

### Step 3: Compare with Current CodeSettings

```javascript
// Log current code settings with their IDs
console.log("Current codeSettings:", codeSettings.map(c => ({ _id: c._id, name: c.name })));
```

### Step 4: Check Permission Save in CoHostRoleSettings

Verify what keys are being saved when host sets permissions:
```javascript
// In CoHostRoleSettings.js when saving
console.log("Saving permissions with keys:", Object.keys(permissions.codes));
```

---

## Potential Solutions

### Solution A: Always Use Code Name as Key (Simpler)

Standardize on using `code.name` as the permission key everywhere:
- Pros: Simpler, human-readable
- Cons: Breaks if code name changes, name collisions possible

### Solution B: Sync Permissions When Codes Change

When host creates/deletes codes, automatically update all co-host permissions:
- Pros: Permissions always in sync
- Cons: Complex, requires tracking code changes

### Solution C: Permission Inheritance from Code Templates

Instead of storing permissions per-code, store per-code-template:
- CodeTemplates have `_id` that doesn't change
- Event codes reference template
- Permissions stored against template ID
- Pros: Stable IDs, works with dynamic codes
- Cons: Major refactor

### Solution D: Real-Time Permission Resolution

Don't store permissions by code ID. Store by code type/category:
```javascript
permissions: {
  codes: {
    "guest": { generate: true, limit: 10 },
    "vip": { generate: true, limit: 5 },
    "table": { generate: false }
  }
}
```
Then match codes by their `type` field instead of `_id` or `name`.

---

## Files Modified in This Session

1. `server/utils/permissionResolver.js` - Added auto-sync logic (lines 169-182)
2. `client/src/Components/CodeGenerator/CodeGenerator.js` - Changed fallback to deny (lines 388-404)

---

## Next Steps

1. Add comprehensive logging to trace the exact data flow
2. Identify exactly what keys are stored in `coHostRolePermissions`
3. Identify exactly what keys are being looked up
4. Fix the mismatch at the source (either save or lookup side)
5. Consider architectural changes if key matching is fundamentally broken

---

## Test Scenario

1. **Main Host Brand:** Sets up event with codes:
   - Guest Code (ID: abc123)
   - Friends Code (ID: def456)

2. **Main Host:** Adds Co-Host Brand and sets permissions:
   - Guest Code: generate=true, limit=10
   - Friends Code: generate=true, limit=5

3. **Main Host:** Creates new VIP Code (ID: ghi789) - AFTER permissions were set

4. **Co-Host User:** Logs in and opens CodeGenerator
   - Should see Guest Code with "REMAINING 10"
   - Should see Friends Code with "REMAINING 5"
   - Should NOT see VIP Code (no permission granted)

5. **Current Broken Behavior:**
   - Guest Code shows "GENERATED" (unlimited) - WRONG
   - Friends Code shows "GENERATED" (unlimited) - WRONG
   - VIP Code shows or shows "0 REMAINING" - WRONG

---

*Last Updated: February 8, 2026*
*Session: Investigating co-host permission limit recognition*
