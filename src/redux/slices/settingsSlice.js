import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isMusicEnabled: true,
  isSoundEnabled: true,
  language: 'fr', // 'fr', 'en', 'es', etc.
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
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
  },
});

export const { toggleMusic, toggleSound, setLanguage } = settingsSlice.actions;
export default settingsSlice.reducer;
