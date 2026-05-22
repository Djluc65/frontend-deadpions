import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isMusicEnabled: true,
  isSoundEnabled: true,
  isChatEnabled: true,
  language: null, // null = non défini (première installation) → auto-détection device
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleMusic: (state) => {
      state.isMusicEnabled = !state.isMusicEnabled;
    },
    toggleSound: (state) => {
      state.isSoundEnabled = !state.isSoundEnabled;
    },
    toggleChat: (state) => {
      state.isChatEnabled = !state.isChatEnabled;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
  },
});

export const { toggleMusic, toggleSound, toggleChat, setLanguage } = settingsSlice.actions;
export default settingsSlice.reducer;
