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
    updatePlayerCoins(state, action) {
      const { playerId, coins } = action.payload;

      if (state.players.me?.id?.toString() === playerId?.toString()) {
        state.players.me.coins = coins;
      }
      if (state.players.opponent?.id?.toString() === playerId?.toString()) {
        state.players.opponent.coins = coins;
      }
      
      // Update spectators if needed
      state.spectators = state.spectators.map(s => 
        s.id?.toString() === playerId?.toString() ? { ...s, coins } : s
      );
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
  updatePlayerCoins,
  setSpectators,
  addSpectator,
  removeSpectator
} = gameSlice.actions;

export default gameSlice.reducer;
