import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  allBrands: [],
  selectedBrand: null,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const brandSlice = createSlice({
  name: "brand",
  initialState,
  reducers: {
    setBrands: (state, action) => {
      state.allBrands = action.payload;
      state.status = "succeeded";
      state.error = null;
    },
    setSelectedBrand: (state, action) => {
      state.selectedBrand = action.payload;
    },
    setLoading: (state) => {
      state.status = "loading";
    },
    setError: (state, action) => {
      state.status = "failed";
      state.error = action.payload;
    },
    clearBrands: (state) => {
      state.allBrands = [];
      state.selectedBrand = null;
      state.status = "idle";
      state.error = null;
    },
    updateBrand: (state, action) => {
      // Update a single brand in the allBrands array
      const index = state.allBrands.findIndex(
        (brand) => brand._id === action.payload._id
      );
      if (index !== -1) {
        state.allBrands[index] = action.payload;
      }

      // Also update selectedBrand if it matches
      if (
        state.selectedBrand &&
        state.selectedBrand._id === action.payload._id
      ) {
        state.selectedBrand = action.payload;
      }
    },
    addEventsToBrand: (state, action) => {
      const { brandId, events } = action.payload;

      // Find the brand in allBrands array
      const brandIndex = state.allBrands.findIndex(
        (brand) => brand._id === brandId
      );

      if (brandIndex !== -1) {
        // Add events to the brand
        state.allBrands[brandIndex].events = events;

        // Also update selectedBrand if it matches
        if (state.selectedBrand && state.selectedBrand._id === brandId) {
          state.selectedBrand.events = events;
        }
      }
    },
    updateEventInBrand: (state, action) => {
      const { brandId, eventId, eventData } = action.payload;

      // Find the brand in allBrands array
      const brandIndex = state.allBrands.findIndex(
        (brand) => brand._id === brandId
      );

      if (brandIndex !== -1) {
        const brand = state.allBrands[brandIndex];

        // Check if events is an array or has an items property
        if (Array.isArray(brand.events)) {
          // Find the event in the events array
          const eventIndex = brand.events.findIndex(
            (event) => event._id === eventId || event.id === eventId
          );

          if (eventIndex !== -1) {
            // Update the event
            state.allBrands[brandIndex].events[eventIndex] = {
              ...state.allBrands[brandIndex].events[eventIndex],
              ...eventData,
            };

            // Also update selectedBrand if it matches
            if (state.selectedBrand && state.selectedBrand._id === brandId) {
              if (Array.isArray(state.selectedBrand.events)) {
                const selectedEventIndex = state.selectedBrand.events.findIndex(
                  (event) => event._id === eventId || event.id === eventId
                );

                if (selectedEventIndex !== -1) {
                  state.selectedBrand.events[selectedEventIndex] = {
                    ...state.selectedBrand.events[selectedEventIndex],
                    ...eventData,
                  };
                }
              }
            }
          }
        } else if (brand.events && Array.isArray(brand.events.items)) {
          // Find the event in the events.items array
          const eventIndex = brand.events.items.findIndex(
            (event) => event._id === eventId || event.id === eventId
          );

          if (eventIndex !== -1) {
            // Update the event
            state.allBrands[brandIndex].events.items[eventIndex] = {
              ...state.allBrands[brandIndex].events.items[eventIndex],
              ...eventData,
            };

            // Also update selectedBrand if it matches
            if (state.selectedBrand && state.selectedBrand._id === brandId) {
              if (
                state.selectedBrand.events &&
                Array.isArray(state.selectedBrand.events.items)
              ) {
                const selectedEventIndex =
                  state.selectedBrand.events.items.findIndex(
                    (event) => event._id === eventId || event.id === eventId
                  );

                if (selectedEventIndex !== -1) {
                  state.selectedBrand.events.items[selectedEventIndex] = {
                    ...state.selectedBrand.events.items[selectedEventIndex],
                    ...eventData,
                  };
                }
              }
            }
          }
        }
      }
    },
  },
});

// Export actions
export const {
  setBrands,
  setSelectedBrand,
  setLoading,
  setError,
  clearBrands,
  updateBrand,
  addEventsToBrand,
  updateEventInBrand,
} = brandSlice.actions;

// Export selectors
export const selectAllBrands = (state) => state.brand.allBrands;
export const selectSelectedBrand = (state) => state.brand.selectedBrand;
export const selectBrandStatus = (state) => state.brand.status;
export const selectBrandError = (state) => state.brand.error;

export default brandSlice.reducer;
