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
} = brandSlice.actions;

// Export selectors
export const selectAllBrands = (state) => state.brand.allBrands;
export const selectSelectedBrand = (state) => state.brand.selectedBrand;
export const selectBrandStatus = (state) => state.brand.status;
export const selectBrandError = (state) => state.brand.error;

export default brandSlice.reducer;
