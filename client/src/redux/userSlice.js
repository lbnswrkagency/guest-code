import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
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
    clearUser: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.loading = false;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
  },
});

// Export actions
export const {
  setUser,
  setLoading,
  setError,
  clearUser,
  loginSuccess,
  logout,
} = userSlice.actions;

// Export selectors
export const selectUser = (state) => state.user?.user;
export const selectUserLoading = (state) => state.user?.loading;
export const selectUserError = (state) => state.user?.error;

export default userSlice.reducer;
