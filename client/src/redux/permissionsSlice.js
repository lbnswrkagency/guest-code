import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  rolePermissions: [],
  rolesByBrandId: {},
  loading: false,
  error: null,
};

const permissionsSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    setLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setRolePermissions: (state, action) => {
      state.rolePermissions = action.payload;
      state.loading = false;
    },
    addRolesForBrand: (state, action) => {
      const { brandId, roles } = action.payload;
      state.rolesByBrandId[brandId] = roles;
    },
    clearRolePermissions: (state) => {
      state.rolePermissions = [];
      state.rolesByBrandId = {};
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setLoading,
  setRolePermissions,
  addRolesForBrand,
  clearRolePermissions,
  setError,
} = permissionsSlice.actions;

// Selectors
export const selectAllRolePermissions = (state) =>
  state.permissions.rolePermissions;
export const selectRolesForBrand = (brandId) => (state) =>
  state.permissions.rolesByBrandId[brandId] || [];
export const selectPermissionsLoading = (state) => state.permissions.loading;
export const selectPermissionsError = (state) => state.permissions.error;

export default permissionsSlice.reducer;
