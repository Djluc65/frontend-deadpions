// DeadPions — tournamentSlice.js — créé le 2026-06-08
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeTournament: null,
  bracket: [],
  currentRound: 0,
  myMatchId: null,
  tournamentStatus: 'idle', // 'idle', 'waiting', 'in_progress', 'finished'
  availableTournaments: []
};

const tournamentSlice = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    setTournament: (state, action) => {
      state.activeTournament = action.payload;
      state.tournamentStatus = action.payload?.status || 'idle';
      state.bracket = action.payload.bracket || [];
      state.currentRound = action.payload.currentRound || 1;
    },
    updateTournament: (state, action) => {
      if (!state.activeTournament) {
        state.activeTournament = action.payload;
      } else {
        state.activeTournament = {
          ...state.activeTournament,
          ...action.payload
        };
      }
      state.tournamentStatus = state.activeTournament?.status || state.tournamentStatus;
      if (Array.isArray(action.payload?.bracket)) {
        state.bracket = action.payload.bracket;
      }
      if (typeof action.payload?.currentRound === 'number') {
        state.currentRound = action.payload.currentRound;
      }
    },
    updateBracket: (state, action) => {
      state.bracket = action.payload.bracket;
      if (action.payload.currentRound) {
        state.currentRound = action.payload.currentRound;
      }
    },
    setTournamentStatus: (state, action) => {
      state.tournamentStatus = action.payload;
    },
    setMyMatchId: (state, action) => {
      state.myMatchId = action.payload;
    },
    setAvailableTournaments: (state, action) => {
      state.availableTournaments = action.payload;
    },
    resetTournament: (state) => {
      state.activeTournament = null;
      state.bracket = [];
      state.currentRound = 0;
      state.myMatchId = null;
      state.tournamentStatus = 'idle';
    }
  }
});

export const { 
  setTournament, 
  updateTournament,
  updateBracket, 
  setTournamentStatus, 
  setMyMatchId, 
  setAvailableTournaments,
  resetTournament 
} = tournamentSlice.actions;

export default tournamentSlice.reducer;
