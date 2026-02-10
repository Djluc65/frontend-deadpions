import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoading: false,
  loadingMessage: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
      if (!action.payload) {
        state.loadingMessage = null;
      }
    },
    showLoading: (state, action) => {
      state.isLoading = true;
      state.loadingMessage = action.payload || null;
    },
    hideLoading: (state) => {
      state.isLoading = false;
      state.loadingMessage = null;
    },
  },
});

export const { setLoading, showLoading, hideLoading } = uiSlice.actions;
export default uiSlice.reducer;
