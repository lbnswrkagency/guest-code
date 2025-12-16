import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  allCodeSettings: [],
  loading: false,
  error: null,
};

const codeSettingsSlice = createSlice({
  name: "codeSettings",
  initialState,
  reducers: {
    setCodeSettings: (state, action) => {
      state.allCodeSettings = action.payload;
      state.loading = false;
      state.error = null;
    },
    addCodeSettings: (state, action) => {
      // Add code settings that don't already exist
      const newSettings = action.payload.filter(
        (newSetting) =>
          !state.allCodeSettings.some(
            (setting) => setting._id === newSetting._id
          )
      );
      state.allCodeSettings = [...state.allCodeSettings, ...newSettings];
    },
    clearCodeSettings: (state) => {
      state.allCodeSettings = [];
      state.loading = false;
      state.error = null;
    },
    updateCodeSetting: (state, action) => {
      const { settingId, settingData } = action.payload;
      const settingIndex = state.allCodeSettings.findIndex(
        (s) => s._id === settingId
      );
      if (settingIndex !== -1) {
        state.allCodeSettings[settingIndex] = {
          ...state.allCodeSettings[settingIndex],
          ...settingData,
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
});

export const {
  setCodeSettings,
  addCodeSettings,
  clearCodeSettings,
  updateCodeSetting,
  setLoading,
  setError,
} = codeSettingsSlice.actions;

// Selectors
export const selectAllCodeSettings = (state) =>
  state.codeSettings?.allCodeSettings || [];
export const selectCodeSettingsByEventId = (state, eventId) =>
  state.codeSettings?.allCodeSettings.filter(
    (setting) => setting.eventId === eventId
  ) || [];

export default codeSettingsSlice.reducer;
