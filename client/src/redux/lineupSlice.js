import { createSlice } from "@reduxjs/toolkit";
import { PURGE } from "redux-persist";

const initialState = {
  allLineups: [],
  status: "idle",
  error: null,
};

const lineupSlice = createSlice({
  name: "lineup",
  initialState,
  reducers: {
    setLineups: (state, action) => {
      state.allLineups = action.payload;
      state.status = "succeeded";
    },
    addLineup: (state, action) => {
      state.allLineups.push(action.payload);
    },
    updateLineup: (state, action) => {
      const index = state.allLineups.findIndex(
        (lineup) => lineup._id === action.payload._id
      );
      if (index !== -1) {
        state.allLineups[index] = action.payload;
      }
    },
    removeLineup: (state, action) => {
      state.allLineups = state.allLineups.filter(
        (lineup) => lineup._id !== action.payload
      );
    },
    clearLineups: (state) => {
      state.allLineups = [];
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    // Handle login success from userSlice
    builder.addCase("user/loginSuccess", (state, action) => {
      if (action.payload.user && action.payload.user.lineups) {
        state.allLineups = action.payload.user.lineups;
        state.status = "succeeded";
      }
    });

    // Handle logout
    builder.addCase("user/logout", (state) => {
      return initialState;
    });

    // Handle redux-persist purge
    builder.addCase(PURGE, () => {
      return initialState;
    });
  },
});

export const {
  setLineups,
  addLineup,
  updateLineup,
  removeLineup,
  clearLineups,
} = lineupSlice.actions;

// Selectors
export const selectAllLineups = (state) => state.lineup.allLineups;
export const selectLineupsByBrand = (state, brandId) =>
  state.lineup.allLineups.filter((lineup) => lineup.brandId === brandId);
export const selectLineupById = (state, lineupId) =>
  state.lineup.allLineups.find((lineup) => lineup._id === lineupId);
export const selectLineupsByEvent = (state, eventId) => {
  const event = state.events.allEvents.find((event) => event._id === eventId);
  if (!event || !event.lineups || !Array.isArray(event.lineups)) return [];

  return state.lineup.allLineups.filter((lineup) =>
    event.lineups.includes(lineup._id)
  );
};

export default lineupSlice.reducer;
