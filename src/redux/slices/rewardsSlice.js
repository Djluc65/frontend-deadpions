import { createSlice } from '@reduxjs/toolkit';

export function getDayKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(ts, days) {
  return ts + days * 24 * 60 * 60 * 1000;
}

const LIVE_BASE_PER_DAY = 5;
const PREMIUM_REWARDED_REQUIRED = 3;
const PREMIUM_REWARD_DAYS = 30;
const HARD_AI_REWARD_MS = 60 * 60 * 1000;

const initialState = {
  schemaVersion: 1,
  share: {
    claimedByChannel: {}
  },
  premiumPions: {
    rewardedCount: 0,
    premiumUntil: null
  },
  hardAi: {
    unlockUntil: null
  },
  live: {
    dayKey: getDayKey(),
    used: 0,
    bonus: 0
  }
};

function ensureLiveDay(state, nowTs) {
  const today = getDayKey(nowTs);
  if (state.live.dayKey !== today) {
    state.live.dayKey = today;
    state.live.used = 0;
    state.live.bonus = 0;
  }
}

const rewardsSlice = createSlice({
  name: 'rewards',
  initialState,
  reducers: {
    ensureDailyReset(state, action) {
      const nowTs = typeof action?.payload?.nowTs === 'number' ? action.payload.nowTs : Date.now();
      ensureLiveDay(state, nowTs);
      if (typeof state.premiumPions.premiumUntil === 'number' && state.premiumPions.premiumUntil <= nowTs) {
        state.premiumPions.premiumUntil = null;
      }
      if (typeof state.hardAi.unlockUntil === 'number' && state.hardAi.unlockUntil <= nowTs) {
        state.hardAi.unlockUntil = null;
      }
    },

    claimShare(state, action) {
      const nowTs = typeof action?.payload?.nowTs === 'number' ? action.payload.nowTs : Date.now();
      const channel = action?.payload?.channel ? String(action.payload.channel) : 'generic';
      const today = getDayKey(nowTs);
      state.share.claimedByChannel[channel] = today;
    },

    incrementPremiumRewarded(state, action) {
      const nowTs = typeof action?.payload?.nowTs === 'number' ? action.payload.nowTs : Date.now();
      if (typeof state.premiumPions.premiumUntil === 'number' && state.premiumPions.premiumUntil > nowTs) return;
      const next = (state.premiumPions.rewardedCount || 0) + 1;
      if (next >= PREMIUM_REWARDED_REQUIRED) {
        state.premiumPions.rewardedCount = 0;
        state.premiumPions.premiumUntil = addDays(nowTs, PREMIUM_REWARD_DAYS);
        return;
      }
      state.premiumPions.rewardedCount = next;
    },

    unlockHardAi(state, action) {
      const nowTs = typeof action?.payload?.nowTs === 'number' ? action.payload.nowTs : Date.now();
      const durationMs = typeof action?.payload?.durationMs === 'number' ? action.payload.durationMs : HARD_AI_REWARD_MS;
      state.hardAi.unlockUntil = nowTs + durationMs;
    },

    incrementLiveBonus(state, action) {
      const nowTs = typeof action?.payload?.nowTs === 'number' ? action.payload.nowTs : Date.now();
      ensureLiveDay(state, nowTs);
      state.live.bonus += 1;
    },

    consumeLiveRoom(state, action) {
      const nowTs = typeof action?.payload?.nowTs === 'number' ? action.payload.nowTs : Date.now();
      ensureLiveDay(state, nowTs);
      state.live.used += 1;
    },
  }
});

export const {
  ensureDailyReset,
  claimShare,
  incrementPremiumRewarded,
  unlockHardAi,
  incrementLiveBonus,
  consumeLiveRoom,
} = rewardsSlice.actions;

export const selectHasTempPremiumPions = (state, nowTs = Date.now()) =>
  typeof state?.rewards?.premiumPions?.premiumUntil === 'number' && state.rewards.premiumPions.premiumUntil > nowTs;

export const selectPremiumRewardProgress = (state) => ({
  watched: state?.rewards?.premiumPions?.rewardedCount || 0,
  required: PREMIUM_REWARDED_REQUIRED,
  premiumUntil: state?.rewards?.premiumPions?.premiumUntil ?? null
});

export const selectHardAiUnlockUntil = (state) => state?.rewards?.hardAi?.unlockUntil ?? null;

export const selectLiveRemaining = (state, nowTs = Date.now()) => {
  const dayKey = getDayKey(nowTs);
  const live = state?.rewards?.live;
  const used = live && live.dayKey === dayKey ? (live.used || 0) : 0;
  const bonus = live && live.dayKey === dayKey ? (live.bonus || 0) : 0;
  const total = LIVE_BASE_PER_DAY + bonus;
  return Math.max(0, total - used);
};

export const selectShareClaimedToday = (state, channel = 'generic', nowTs = Date.now()) => {
  const today = getDayKey(nowTs);
  const key = state?.rewards?.share?.claimedByChannel?.[channel];
  return key === today;
};

export default rewardsSlice.reducer;

