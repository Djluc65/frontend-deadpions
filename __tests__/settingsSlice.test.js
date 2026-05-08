import settingsReducer, {
  toggleMusic,
  toggleSound,
  setLanguage,
} from '../src/redux/slices/settingsSlice';

const initialState = {
  isMusicEnabled: true,
  isSoundEnabled: true,
  language: 'fr',
};

describe('settingsSlice — état initial', () => {
  it('retourne l\'état initial', () => {
    expect(settingsReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });
});

describe('settingsSlice — toggleMusic', () => {
  it('désactive la musique quand elle est activée', () => {
    const state = settingsReducer(initialState, toggleMusic());
    expect(state.isMusicEnabled).toBe(false);
  });

  it('réactive la musique quand elle est désactivée', () => {
    const state = settingsReducer(
      { ...initialState, isMusicEnabled: false },
      toggleMusic()
    );
    expect(state.isMusicEnabled).toBe(true);
  });

  it('deux toggles successifs reviennent à l\'état initial', () => {
    let state = settingsReducer(initialState, toggleMusic());
    state = settingsReducer(state, toggleMusic());
    expect(state.isMusicEnabled).toBe(true);
  });

  it('ne modifie pas isSoundEnabled', () => {
    const state = settingsReducer(initialState, toggleMusic());
    expect(state.isSoundEnabled).toBe(true);
  });
});

describe('settingsSlice — toggleSound', () => {
  it('désactive le son quand il est activé', () => {
    const state = settingsReducer(initialState, toggleSound());
    expect(state.isSoundEnabled).toBe(false);
  });

  it('réactive le son quand il est désactivé', () => {
    const state = settingsReducer(
      { ...initialState, isSoundEnabled: false },
      toggleSound()
    );
    expect(state.isSoundEnabled).toBe(true);
  });

  it('ne modifie pas isMusicEnabled', () => {
    const state = settingsReducer(initialState, toggleSound());
    expect(state.isMusicEnabled).toBe(true);
  });
});

describe('settingsSlice — setLanguage', () => {
  it('change la langue en anglais', () => {
    const state = settingsReducer(initialState, setLanguage('en'));
    expect(state.language).toBe('en');
  });

  it('change la langue en espagnol', () => {
    const state = settingsReducer(initialState, setLanguage('es'));
    expect(state.language).toBe('es');
  });

  it('peut revenir au français', () => {
    const state = settingsReducer(
      { ...initialState, language: 'en' },
      setLanguage('fr')
    );
    expect(state.language).toBe('fr');
  });

  it('ne modifie pas les autres paramètres audio', () => {
    const state = settingsReducer(initialState, setLanguage('en'));
    expect(state.isMusicEnabled).toBe(true);
    expect(state.isSoundEnabled).toBe(true);
  });
});
