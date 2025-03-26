import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "redux";

import userReducer from "./userSlice";
import brandReducer from "./brandSlice";
import uiReducer from "./uiSlice";
import eventsReducer from "./eventsSlice";
import rolesReducer from "./rolesSlice";
import codeSettingsReducer from "./codeSettingsSlice";
import lineupReducer from "./lineupSlice";

// Configure persist for specific reducers
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["user", "brand", "events", "roles", "codeSettings", "lineup"], // Persist all data
};

const rootReducer = combineReducers({
  user: userReducer,
  brand: brandReducer,
  ui: uiReducer,
  events: eventsReducer,
  roles: rolesReducer,
  codeSettings: codeSettingsReducer,
  lineup: lineupReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializable check for complex objects
    }),
});

export const persistor = persistStore(store);

// Selector utilities
export const getState = () => store.getState();

// Base selectors
export const selectBrands = (state) => state.brand?.allBrands || [];
export const selectUser = (state) => state.user?.user || null;
export const selectEvents = (state) => state.events?.allEvents || [];
export const selectRoles = (state) => state.roles?.allRoles || [];
export const selectCodeSettings = (state) =>
  state.codeSettings?.allCodeSettings || [];
export const selectLineups = (state) => state.lineup?.allLineups || [];

// Derived selectors
export const selectBrandsWithEvents = (state) => {
  const brands = selectBrands(state);
  const events = selectEvents(state);

  return brands.map((brand) => ({
    ...brand,
    events: events.filter((event) => event.brand === brand._id),
  }));
};

export const selectBrandWithEventsAndRole = (state, brandId) => {
  const brand = selectBrands(state).find((b) => b._id === brandId);
  if (!brand) return null;

  const events = selectEvents(state).filter((event) => event.brand === brandId);
  const userRole = state.roles?.userRoles[brandId];
  const role = state.roles?.allRoles.find((r) => r._id === userRole);
  const lineups = selectLineups(state).filter(
    (lineup) => lineup.brandId === brandId
  );

  return {
    ...brand,
    events,
    role,
    lineups,
  };
};

export const selectUniqueDates = (state) => {
  const events = selectEvents(state);
  const dates = new Set();

  events.forEach((event) => {
    if (event.startDate) {
      dates.add(new Date(event.startDate).toISOString().split("T")[0]);
    }
  });

  return Array.from(dates).sort();
};
