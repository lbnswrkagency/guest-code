import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import brandReducer from "./brandSlice";
import permissionsReducer from "./permissionsSlice";
import uiReducer from "./uiSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    brand: brandReducer,
    permissions: permissionsReducer,
    ui: uiReducer,
    // Add other reducers here as we expand
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializableCheck to prevent any serialization issues
    }),
});

export default store;
