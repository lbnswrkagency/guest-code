import { createSlice } from "@reduxjs/toolkit";
import { REHYDRATE } from "redux-persist";

const initialState = {
  allBrands: [],
  selectedBrandId: null,
  loading: false,
  error: null,
};

// Helper function to ensure events are properly structured
const ensureEventsStructure = (brand) => {
  if (!brand) return brand;

  // Make a deep copy to avoid reference issues
  const brandCopy = { ...brand };

  // Ensure events is an array
  if (!brandCopy.events) {
    brandCopy.events = [];
  } else if (!Array.isArray(brandCopy.events)) {
    brandCopy.events = brandCopy.events.items || [];
  }

  // Ensure each event has a codeSettings array
  if (Array.isArray(brandCopy.events)) {
    brandCopy.events = brandCopy.events.map((event) => ({
      ...event,
      codeSettings: Array.isArray(event.codeSettings) ? event.codeSettings : [],
    }));
  }

  return brandCopy;
};

const brandSlice = createSlice({
  name: "brand",
  initialState,
  reducers: {
    setBrands: (state, action) => {
      // Store brand data INCLUDING role and roleId for permissions
      console.log('🔵 [brandSlice] setBrands called with', action.payload?.length, 'brands');
      state.allBrands = action.payload.map((brand) => {
        // Log role data for debugging
        console.log(`🔵 [brandSlice] Brand "${brand.name}" (${brand._id}):`, {
          hasRole: !!brand.role,
          roleId: brand.roleId,
          roleName: brand.role?.name,
          hasPermissions: !!brand.role?.permissions,
          codesPermissions: brand.role?.permissions?.codes ? Object.keys(brand.role.permissions.codes) : 'none',
        });

        return {
          _id: brand._id,
          name: brand.name,
          username: brand.username,
          description: brand.description,
          owner: brand.owner,
          team: brand.team,
          logo: brand.logo,
          coverImage: brand.coverImage,
          colors: brand.colors,
          social: brand.social,
          contact: brand.contact,
          media: brand.media,
          settings: brand.settings,
          metrics: brand.metrics,
          createdAt: brand.createdAt,
          updatedAt: brand.updatedAt,
          // FIXED: Include role and roleId for permissions
          role: brand.role,
          roleId: brand.roleId,
          // Analytics configuration
          metaPixelId: brand.metaPixelId,
          // Dropbox configuration
          dropboxBaseFolder: brand.dropboxBaseFolder,
          dropboxDateFormat: brand.dropboxDateFormat,
          dropboxPathStructure: brand.dropboxPathStructure,
          dropboxVideoPathStructure: brand.dropboxVideoPathStructure,
          // Spotify configuration
          spotifyClientId: brand.spotifyClientId,
          spotifyClientSecret: brand.spotifyClientSecret,
          spotifyPlaylistId: brand.spotifyPlaylistId,
        };
      });
      state.loading = false;
      state.error = null;
    },
    setSelectedBrand: (state, action) => {
      state.selectedBrandId = action.payload;
    },
    clearBrands: (state) => {
      state.allBrands = [];
      state.selectedBrandId = null;
      state.loading = false;
      state.error = null;
    },
    updateBrand: (state, action) => {
      const { brandId, brandData } = action.payload;
      const brandIndex = state.allBrands.findIndex((b) => b._id === brandId);
      if (brandIndex !== -1) {
        state.allBrands[brandIndex] = {
          ...state.allBrands[brandIndex],
          ...brandData,
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
  extraReducers: (builder) => {
    // Handle rehydration from persistence
    builder.addCase(REHYDRATE, (state, action) => {
      // Only process if we have brand data in the payload
      if (action.payload && action.payload.brand) {
        // Ensure events and code settings are properly restored
        if (action.payload.brand.allBrands) {
          state.allBrands = action.payload.brand.allBrands.map(
            ensureEventsStructure
          );
        }

        // Restore selected brand if it exists
        if (action.payload.brand.selectedBrandId) {
          state.selectedBrandId = action.payload.brand.selectedBrandId;
        }
      }
    });
  },
});

export const {
  setBrands,
  setSelectedBrand,
  clearBrands,
  updateBrand,
  setLoading,
  setError,
} = brandSlice.actions;

// Selectors
export const selectAllBrands = (state) => state.brand?.allBrands || [];
export const selectSelectedBrandId = (state) => state.brand?.selectedBrandId;
export const selectSelectedBrand = (state) => {
  const selectedId = state.brand?.selectedBrandId;
  if (!selectedId) return null;
  return state.brand?.allBrands.find((b) => b._id === selectedId);
};
export const selectBrandById = (state, brandId) =>
  state.brand?.allBrands.find((b) => b._id === brandId);

export default brandSlice.reducer;
