import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedBrand: null,
  selectedEvent: null,
  selectedDate: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSelectedBrand: (state, action) => {
      // Store the complete brand object including events
      state.selectedBrand = action.payload;
      // Reset event and date when brand changes
      state.selectedEvent = null;
      state.selectedDate = null;
    },
    setSelectedEvent: (state, action) => {
      state.selectedEvent = action.payload;
      // Update date when event changes (if event has a date)
      if (action.payload && action.payload.date) {
        state.selectedDate = action.payload.date;
      }
    },
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    resetSelections: (state) => {
      state.selectedBrand = null;
      state.selectedEvent = null;
      state.selectedDate = null;
    },
  },
});

// Export actions
export const {
  setSelectedBrand,
  setSelectedEvent,
  setSelectedDate,
  resetSelections,
} = uiSlice.actions;

// Export selectors
export const selectSelectedBrand = (state) => state.ui.selectedBrand;
export const selectSelectedEvent = (state) => state.ui.selectedEvent;
export const selectSelectedDate = (state) => state.ui.selectedDate;

// Export reducer
export default uiSlice.reducer;
