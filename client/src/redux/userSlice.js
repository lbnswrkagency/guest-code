import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userData: null,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.userData = action.payload;
      state.status = "succeeded";
      state.error = null;
    },
    setLoading: (state) => {
      state.status = "loading";
    },
    setError: (state, action) => {
      state.status = "failed";
      state.error = action.payload;
    },
    clearUser: (state) => {
      state.userData = null;
      state.status = "idle";
      state.error = null;
    },
  },
});

// Export actions
export const { setUser, setLoading, setError, clearUser } = userSlice.actions;

// Export selectors
export const selectUser = (state) => state.user.userData;
export const selectUserStatus = (state) => state.user.status;
export const selectUserError = (state) => state.user.error;

export default userSlice.reducer;
