# Co-Host Permissions System - Debug Summary

**Last Updated:** December 27, 2025
**Status:** IN PROGRESS - Debug logs added, awaiting test results

---

## The Problem

When a user logs in as a **co-host team member**, they cannot see or generate codes even though:
1. Permissions ARE correctly saved in the database
2. Permissions ARE correctly returned from the backend
3. The DashboardMenu component correctly shows `canGenerateAny: true`

But CodeGenerator shows: **"NO CODE TYPES AVAILABLE"**

---

## The Co-Host System Explained

### How Co-Hosting Works

1. **Brand A** creates an event
2. **Brand A** adds **Brand B** as a co-host via EventForm
3. **Brand A** sets permissions for each role in Brand B (e.g., "General Manager" can generate "VIP Code", "Friends Code")
4. These permissions are saved to `Event.coHostRolePermissions`

### Data Structure

```javascript
// Event.coHostRolePermissions structure
[
  {
    brandId: ObjectId("brand-b-id"),
    rolePermissions: [
      {
        roleId: ObjectId("general-manager-role-id"),
        permissions: {
          codes: {
            "VIP Code": { generate: true, limit: 0, unlimited: true },
            "Friends Code": { generate: true, limit: 5 }
          },
          analytics: { view: true },
          scanner: { use: true },
          tables: { access: true, manage: false },
          battles: { view: false, edit: false, delete: false }
        }
      }
    ]
  }
]
```

### Important: Parent vs Child Events

- **Weekly events** have a parent event (week 0) and child events (week 1, 2, 3...)
- **Each child event can have its OWN co-hosts and coHostRolePermissions**
- This is intentional - different weeks might have different co-hosts
- **CodeSettings are inherited from parent** (child events don't have their own CodeSettings)

---

## What We Fixed

### Bug #1: Only Fetching Parent Events (FIXED)

**File:** `server/controllers/coHostController.js`

**The Bug:**
```javascript
// Line 94-96 - OLD CODE
const coHostedEvents = await Event.find({
  coHosts: brandId,
  parentEventId: { $exists: false } // <-- BUG! Only gets parent events
})
```

**The Fix:**
```javascript
// Removed the parentEventId filter
const coHostedEvents = await Event.find({
  coHosts: brandId
  // Now fetches ALL events where brand is co-host (parent AND child)
})
```

### Bug #2: CodeSettings for Child Events (FIXED)

**File:** `server/controllers/coHostController.js`

```javascript
// Use parent event ID for code settings (child events inherit from parent)
const effectiveEventId = event.parentEventId || event._id;
const eventCodeSettings = await CodeSettings.find({
  eventId: effectiveEventId
});
```

---

## Current Issue: CodeGenerator Not Receiving codeSettings

### The Flow

1. **Backend** returns co-hosted events with `codeSettings` attached
2. **Login.js** stores them in Redux: `dispatch(setCoHostedEvents(events))`
3. **Dashboard.js** reads from Redux: `useSelector(selectAllCoHostedEvents)`
4. **DashboardMenu** receives `codeSettings={brandCodeSettings}` (310 items!) ✅
5. **CodeGenerator** receives `codeSettings={getCodeSettingsForSelectedEvent()}` (0 items!) ❌

### The Problem

`getCodeSettingsForSelectedEvent()` filters from Redux by `eventId`, but co-hosted events have `codeSettings` **embedded in the event object**, not in Redux.

### Partial Fix Applied

**File:** `client/src/Components/Dashboard/Dashboard.js`

```javascript
const getCodeSettingsForSelectedEvent = () => {
  if (!selectedEvent) return [];

  // Check if event has embedded code settings (co-hosted event case)
  if (selectedEvent.codeSettings && Array.isArray(selectedEvent.codeSettings) && selectedEvent.codeSettings.length > 0) {
    return selectedEvent.codeSettings;
  }

  // Fallback to Redux store for regular events
  const eventIdStr = selectedEvent._id?.toString();
  return codeSettings.filter((setting) => setting.eventId?.toString() === eventIdStr);
};
```

### Remaining Question

Is `selectedEvent.codeSettings` actually populated when the event is selected? Debug logs were added to verify this.

---

## Debug Logs Added

### Backend: `server/controllers/coHostController.js`

```javascript
console.log('[CO-HOST DEBUG] ========== getCoHostedEvents ==========');
console.log('[CO-HOST DEBUG] Brand:', coHostBrand.name, '- ID:', brandId);
console.log('[CO-HOST DEBUG] User role:', userRoleInCoHostBrand.name);
console.log('[CO-HOST DEBUG] Total co-hosted events found:', coHostedEvents.length);
// ... more detailed logs for each event and permission matching
```

### Frontend: `client/src/Components/DashboardMenu/DashboardMenu.js`

```javascript
console.log('[DASHBOARD-MENU DEBUG] ========== PERMISSION CHECK ==========');
console.log('[DASHBOARD-MENU DEBUG] selectedEvent:', selectedEvent?.title);
console.log('[DASHBOARD-MENU DEBUG] effectivePermissions received:', effectivePermissions);
console.log('[DASHBOARD-MENU DEBUG] effectivePermissions.codes:', effectivePermissions?.codes);
console.log('[DASHBOARD-MENU DEBUG] codeSettings:', codeSettings?.map(s => s.name));
```

### Frontend: `client/src/Components/CodeGenerator/CodeGenerator.js`

```javascript
console.log('[CODE-GEN DEBUG] ========== INITIALIZING ==========');
console.log('[CODE-GEN DEBUG] selectedEvent:', selectedEvent?.title);
console.log('[CODE-GEN DEBUG] codeSettings received:', codeSettings?.length, 'items');
console.log('[CODE-GEN DEBUG] userPermissions (codes):', userPermissions);
console.log('[CODE-GEN DEBUG] customCodeSettings (isEditable && isEnabled):', customCodeSettings.length);
console.log('[CODE-GEN DEBUG] permittedSettings FINAL:', permittedSettings.length);
```

### Frontend: `client/src/Components/Dashboard/Dashboard.js`

```javascript
console.log('[DASHBOARD DEBUG] Setting selectedEvent:', eventForDate?.title);
console.log('[DASHBOARD DEBUG] eventForDate.codeSettings:', eventForDate?.codeSettings?.length, 'items');
console.log('[DASHBOARD DEBUG] eventForDate.coHostBrandInfo:', !!eventForDate?.coHostBrandInfo);
```

---

## Files Modified

| File | Changes |
|------|---------|
| `server/controllers/coHostController.js` | Removed parentEventId filter, added effectiveEventId for code settings, added debug logs |
| `server/models/roleModel.js` | Changed `codes` from Map to Mixed type |
| `server/models/eventsModel.js` | Changed permission maps to Mixed type |
| `server/utils/permissionResolver.js` | Created normalizePermissions() utility |
| `client/src/Components/Dashboard/Dashboard.js` | Fixed getCodeSettingsForSelectedEvent(), added debug logs |
| `client/src/Components/DashboardMenu/DashboardMenu.js` | Removed Map instanceof checks, added debug logs |
| `client/src/Components/CodeGenerator/CodeGenerator.js` | Removed Map instanceof checks, added debug logs |
| `client/src/redux/coHostedEventsSlice.js` | Fixed ID comparison for string/ObjectId |

---

## Next Steps

1. **Test with debug logs** - User needs to test and share console output
2. **Check if selectedEvent.codeSettings is populated** - The new Dashboard debug log will show this
3. **If codeSettings is empty on selectedEvent** - The issue is in how events are stored/retrieved from Redux
4. **If codeSettings exists but CodeGenerator still fails** - Issue is in the filtering logic

---

## Test Scenario

1. Login as user "Hulk" who is member of brand "Harlem" with role "General Manager"
2. Brand "Harlem" is co-host of event "Penelope & Jackson"
3. Permissions for "General Manager" include: Friends Code, VIP Code, Backstage Code, Free Drink Code (all with `generate: true`)
4. Expected: CodeGenerator should show these code types
5. Actual: Shows "NO CODE TYPES AVAILABLE"

---

## Key Insights

1. **Permissions ARE working** - effectivePermissions.codes has the correct data
2. **DashboardMenu works** - It shows canGenerateAny: true and displays the Codes menu item
3. **CodeGenerator fails** - It receives 0 codeSettings even though permissions are correct
4. **The gap** - DashboardMenu uses `brandCodeSettings` (all events), CodeGenerator uses `getCodeSettingsForSelectedEvent()` (single event)

The issue is likely that `selectedEvent.codeSettings` is undefined/empty when the event is selected from the list, even though the data exists in the events array.

---

## Related Plan File

See: `~/.claude/plans/clever-twirling-tulip.md` for the full debugging plan.
