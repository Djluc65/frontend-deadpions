// DeadPions — streakSlice.js — créé le 2026-06-08
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentStreak: 0,
  bestStreak: 0,
  pendingReward: null
};

const streakSlice = createSlice({
  name: 'streak',
  initialState,
  reducers: {
    setStreak: (state, action) => {
      state.currentStreak = action.payload.currentStreak;
      state.bestStreak = action.payload.bestStreak;
    },
    setPendingReward: (state, action) => {
      state.pendingReward = action.payload;
    },
    clearPendingReward: (state) => {
      state.pendingReward = null;
    },
    resetStreak: (state) => {
      state.currentStreak = 0;
    }
  }
});

export const { setStreak, setPendingReward, clearPendingReward, resetStreak } = streakSlice.actions;
export default streakSlice.reducer;
