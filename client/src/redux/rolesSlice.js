import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  allRoles: [],
  userRoles: {}, // Map of brandId -> roleId
  loading: false,
  error: null,
};

const rolesSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    setRoles: (state, action) => {
      state.allRoles = action.payload;
      state.loading = false;
      state.error = null;
    },
    addRoles: (state, action) => {
      // Add roles that don't already exist
      const newRoles = action.payload.filter(
        (newRole) => !state.allRoles.some((role) => role._id === newRole._id)
      );
      state.allRoles = [...state.allRoles, ...newRoles];
    },
    setUserRole: (state, action) => {
      const { brandId, roleId } = action.payload;
      state.userRoles[brandId] = roleId;
    },
    clearRoles: (state) => {
      state.allRoles = [];
      state.userRoles = {};
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
  setRoles,
  addRoles,
  setUserRole,
  clearRoles,
  setLoading,
  setError,
} = rolesSlice.actions;

// Selectors
export const selectAllRoles = (state) => state.roles?.allRoles || [];
export const selectRolesByBrandId = (state, brandId) =>
  state.roles?.allRoles.filter((role) => role.brandId === brandId) || [];
export const selectUserRoleForBrand = (state, brandId) => {
  const roleId = state.roles?.userRoles[brandId];
  if (!roleId) return null;
  return state.roles?.allRoles.find((role) => role._id === roleId);
};

export default rolesSlice.reducer;
