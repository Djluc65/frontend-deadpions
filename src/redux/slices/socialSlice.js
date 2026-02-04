import { createSlice } from '@reduxjs/toolkit';

const socialSlice = createSlice({
  name: 'social',
  initialState: {
    notificationsCount: 0,
  },
  reducers: {
    setNotificationsCount: (state, action) => {
      state.notificationsCount = action.payload;
    },
    incrementNotificationsCount: (state) => {
      state.notificationsCount += 1;
    },
    resetNotificationsCount: (state) => {
      state.notificationsCount = 0;
    },
  },
});

export const { setNotificationsCount, incrementNotificationsCount, resetNotificationsCount } = socialSlice.actions;
export default socialSlice.reducer;
