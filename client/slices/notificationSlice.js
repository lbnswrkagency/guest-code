import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  notifications: [],
  unreadCount: 0,
};

export const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const existingIndex = state.notifications.findIndex(
        (n) => n._id === action.payload._id
      );

      if (existingIndex !== -1) {
        const oldRead = state.notifications[existingIndex].read;
        const newRead = action.payload.read;
        state.notifications[existingIndex] = action.payload;

        if (oldRead !== newRead) {
          state.unreadCount += newRead ? -1 : 1;
        }
      } else {
        state.notifications.unshift(action.payload);
        if (!action.payload.read) {
          state.unreadCount += 1;
        }
      }
    },
    markAsRead: (state, action) => {
      const notification = state.notifications.find(
        (n) => n._id === action.payload
      );
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    setInitialNotifications: (state, action) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.read).length;
    },
  },
});

export const {
  addNotification,
  markAsRead,
  clearNotifications,
  setInitialNotifications,
} = notificationSlice.actions;

export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;

export default notificationSlice.reducer;
