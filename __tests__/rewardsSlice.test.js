import rewardsReducer, {
  addDays,
  ensureDailyReset,
  getDayKey,
  incrementLiveBonus,
  incrementPremiumRewarded,
  selectHasTempPremiumPions,
  selectLiveRemaining,
  unlockHardAi,
} from '../src/redux/slices/rewardsSlice';

describe('rewardsSlice — helpers', () => {
  it('getDayKey retourne YYYY-MM-DD', () => {
    const ts = Date.UTC(2026, 4, 13, 12, 0, 0);
    expect(getDayKey(ts)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('addDays ajoute des jours', () => {
    const ts = 0;
    expect(addDays(ts, 1)).toBe(24 * 60 * 60 * 1000);
  });
});

describe('rewardsSlice — premium pions via rewarded', () => {
  it('débloque premium après 3 vidéos', () => {
    const baseTs = Date.UTC(2026, 4, 13, 10, 0, 0);
    let state = rewardsReducer(undefined, { type: '@@INIT' });
    state = rewardsReducer(state, incrementPremiumRewarded({ nowTs: baseTs }));
    state = rewardsReducer(state, incrementPremiumRewarded({ nowTs: baseTs + 1000 }));
    state = rewardsReducer(state, incrementPremiumRewarded({ nowTs: baseTs + 2000 }));
    expect(typeof state.premiumPions.premiumUntil).toBe('number');
    expect(state.premiumPions.rewardedCount).toBe(0);
    expect(selectHasTempPremiumPions({ rewards: state }, baseTs + 3000)).toBe(true);
  });

  it('expire et se nettoie via ensureDailyReset', () => {
    const baseTs = Date.UTC(2026, 4, 13, 10, 0, 0);
    let state = rewardsReducer(undefined, { type: '@@INIT' });
    state.premiumPions.premiumUntil = baseTs + 1000;
    state = rewardsReducer(state, ensureDailyReset({ nowTs: baseTs + 2000 }));
    expect(state.premiumPions.premiumUntil).toBe(null);
  });
});

describe('rewardsSlice — live rooms', () => {
  it('ajoute un bonus et calcule le restant', () => {
    const ts = Date.UTC(2026, 4, 13, 10, 0, 0);
    let state = rewardsReducer(undefined, { type: '@@INIT' });
    state = rewardsReducer(state, ensureDailyReset({ nowTs: ts }));
    state = rewardsReducer(state, incrementLiveBonus({ nowTs: ts }));
    const remaining = selectLiveRemaining({ rewards: state }, ts);
    expect(remaining).toBeGreaterThanOrEqual(5);
  });
});

describe('rewardsSlice — hard AI', () => {
  it('débloque hard AI pendant une durée', () => {
    const ts = Date.UTC(2026, 4, 13, 10, 0, 0);
    let state = rewardsReducer(undefined, { type: '@@INIT' });
    state = rewardsReducer(state, unlockHardAi({ nowTs: ts, durationMs: 1000 }));
    expect(state.hardAi.unlockUntil).toBe(ts + 1000);
    state = rewardsReducer(state, ensureDailyReset({ nowTs: ts + 1500 }));
    expect(state.hardAi.unlockUntil).toBe(null);
  });
});

