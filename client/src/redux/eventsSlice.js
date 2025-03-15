import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  allEvents: [],
  loading: false,
  error: null,
};

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    setEvents: (state, action) => {
      state.allEvents = action.payload;
      state.loading = false;
      state.error = null;
    },
    addEvents: (state, action) => {
      // Add events that don't already exist
      const newEvents = action.payload.filter(
        (newEvent) =>
          !state.allEvents.some((event) => event._id === newEvent._id)
      );
      state.allEvents = [...state.allEvents, ...newEvents];
    },
    clearEvents: (state) => {
      state.allEvents = [];
      state.loading = false;
      state.error = null;
    },
    updateEvent: (state, action) => {
      const { eventId, eventData } = action.payload;
      const eventIndex = state.allEvents.findIndex((e) => e._id === eventId);
      if (eventIndex !== -1) {
        state.allEvents[eventIndex] = {
          ...state.allEvents[eventIndex],
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
  setEvents,
  addEvents,
  clearEvents,
  updateEvent,
  setLoading,
  setError,
} = eventsSlice.actions;

// Selectors
export const selectAllEvents = (state) => state.events?.allEvents || [];
export const selectEventsByBrandId = (state, brandId) =>
  state.events?.allEvents.filter((event) => event.brand === brandId) || [];
export const selectEventById = (state, eventId) =>
  state.events?.allEvents.find((event) => event._id === eventId);

export default eventsSlice.reducer;
