import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  allCoHostedEvents: [],
  loading: false,
  error: null,
};

const coHostedEventsSlice = createSlice({
  name: "coHostedEvents",
  initialState,
  reducers: {
    setCoHostedEvents: (state, action) => {
      state.allCoHostedEvents = action.payload;
      state.loading = false;
      state.error = null;
    },
    addCoHostedEvents: (state, action) => {
      // Add events that don't already exist
      const newEvents = action.payload.filter(
        (newEvent) =>
          !state.allCoHostedEvents.some((event) => event._id === newEvent._id)
      );
      state.allCoHostedEvents = [...state.allCoHostedEvents, ...newEvents];
    },
    clearCoHostedEvents: (state) => {
      state.allCoHostedEvents = [];
      state.loading = false;
      state.error = null;
    },
    updateCoHostedEvent: (state, action) => {
      const { eventId, eventData } = action.payload;
      const eventIndex = state.allCoHostedEvents.findIndex((e) => e._id === eventId);
      if (eventIndex !== -1) {
        state.allCoHostedEvents[eventIndex] = {
          ...state.allCoHostedEvents[eventIndex],
          ...eventData,
        };
      }
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
  addCoHostedEvents,
  clearCoHostedEvents,
  updateCoHostedEvent,
  setLoading,
  setError,
} = coHostedEventsSlice.actions;

// Selectors
export const selectAllCoHostedEvents = (state) => state.coHostedEvents?.allCoHostedEvents || [];
export const selectCoHostedEventsByBrandId = (state, brandId) =>
  state.coHostedEvents?.allCoHostedEvents.filter((event) =>
    event.coHostBrand && event.coHostBrand._id === brandId
  ) || [];
export const selectCoHostedEventById = (state, eventId) =>
  state.coHostedEvents?.allCoHostedEvents.find((event) => event._id === eventId);

export default coHostedEventsSlice.reducer;
