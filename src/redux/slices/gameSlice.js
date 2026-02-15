import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  players: {
    me: null,
    opponent: null,
  },
  spectators: [],
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setPlayers(state, action) {
      state.players = action.payload;
    },
    setSpectators(state, action) {
      state.spectators = action.payload;
    },
    addSpectator(state, action) {
        state.spectators.push(action.payload);
    },
    removeSpectator(state, action) {
        state.spectators = state.spectators.filter(s => s.id !== action.payload);
    }
  },
});

export const {
  setPlayers,
  setSpectators,
  addSpectator,
  removeSpectator
} = gameSlice.actions;

export default gameSlice.reducer;
