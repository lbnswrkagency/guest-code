import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // New structure: array of relationships, each containing hostBrand, permissions, and events
  relationships: [],
  loading: false,
  error: null,
};

const coHostedEventsSlice = createSlice({
  name: "coHostedEvents",
  initialState,
  reducers: {
    setCoHostedEvents: (state, action) => {
      // Now expects array of relationships with structure:
      // { hostBrand, coHostBrand, userRole, permissions, codeSettings, events }
      state.relationships = action.payload;
      state.loading = false;
      state.error = null;
    },
    clearCoHostedEvents: (state) => {
      state.relationships = [];
      state.loading = false;
      state.error = null;
    },
    setLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  setCoHostedEvents,
  clearCoHostedEvents,
  setLoading,
  setError,
} = coHostedEventsSlice.actions;

// Selectors

// Get all relationships
export const selectAllRelationships = (state) =>
  state.coHostedEvents?.relationships || [];

// Get all events (flattened from all relationships) - for backward compatibility
export const selectAllCoHostedEvents = (state) => {
  const relationships = state.coHostedEvents?.relationships || [];
  const allEvents = [];

  relationships.forEach((rel) => {
    (rel.events || []).forEach((event) => {
      // Attach relationship info to event for easy access
      allEvents.push({
        ...event,
        coHostBrandInfo: {
          brandId: rel.coHostBrand?._id,
          brandName: rel.coHostBrand?.name,
          userRole: rel.userRole,
          effectivePermissions: rel.permissions,
        },
        coHostBrand: rel.coHostBrand,
        codeSettings: rel.codeSettings,
      });
    });
  });

  return allEvents;
};

// Get relationship by host brand ID
export const selectRelationshipByHostBrandId = (state, hostBrandId) =>
  (state.coHostedEvents?.relationships || []).find(
    (rel) => rel.hostBrand?._id?.toString() === hostBrandId?.toString()
  );

// Get events for a specific co-host brand
export const selectCoHostedEventsByBrandId = (state, coHostBrandId) => {
  const relationships = state.coHostedEvents?.relationships || [];
  const events = [];

  relationships.forEach((rel) => {
    if (rel.coHostBrand?._id?.toString() === coHostBrandId?.toString()) {
      (rel.events || []).forEach((event) => {
        events.push({
          ...event,
          coHostBrandInfo: {
            brandId: rel.coHostBrand?._id,
            brandName: rel.coHostBrand?.name,
            userRole: rel.userRole,
            effectivePermissions: rel.permissions,
          },
          coHostBrand: rel.coHostBrand,
          codeSettings: rel.codeSettings,
        });
      });
    }
  });

  return events;
};

// Get permissions for a specific host brand (global permissions)
export const selectPermissionsByHostBrandId = (state, hostBrandId) => {
  const relationship = (state.coHostedEvents?.relationships || []).find(
    (rel) => rel.hostBrand?._id?.toString() === hostBrandId?.toString()
  );
  return relationship?.permissions || null;
};

// Get co-hosted event by event ID
export const selectCoHostedEventById = (state, eventId) => {
  const relationships = state.coHostedEvents?.relationships || [];

  for (const rel of relationships) {
    const event = (rel.events || []).find(
      (e) => e._id?.toString() === eventId?.toString()
    );
    if (event) {
      return {
        ...event,
        coHostBrandInfo: {
          brandId: rel.coHostBrand?._id,
          brandName: rel.coHostBrand?.name,
          userRole: rel.userRole,
          effectivePermissions: rel.permissions,
        },
        coHostBrand: rel.coHostBrand,
        codeSettings: rel.codeSettings,
      };
    }
  }
  return null;
};

export default coHostedEventsSlice.reducer;
