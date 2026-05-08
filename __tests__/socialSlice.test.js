import socialReducer, {
  setNotificationsCount,
  incrementNotificationsCount,
  resetNotificationsCount,
} from '../src/redux/slices/socialSlice';

const initialState = { notificationsCount: 0 };

describe('socialSlice — état initial', () => {
  it('retourne l\'état initial avec notificationsCount à 0', () => {
    expect(socialReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });
});

describe('socialSlice — setNotificationsCount', () => {
  it('définit le compteur à une valeur donnée', () => {
    const state = socialReducer(initialState, setNotificationsCount(5));
    expect(state.notificationsCount).toBe(5);
  });

  it('peut remettre le compteur à 0', () => {
    const state = socialReducer(
      { notificationsCount: 8 },
      setNotificationsCount(0)
    );
    expect(state.notificationsCount).toBe(0);
  });

  it('accepte de grandes valeurs', () => {
    const state = socialReducer(initialState, setNotificationsCount(99));
    expect(state.notificationsCount).toBe(99);
  });
});

describe('socialSlice — incrementNotificationsCount', () => {
  it('incrémente de 1 depuis 0', () => {
    const state = socialReducer(initialState, incrementNotificationsCount());
    expect(state.notificationsCount).toBe(1);
  });

  it('incrémente de 1 depuis une valeur existante', () => {
    const state = socialReducer(
      { notificationsCount: 3 },
      incrementNotificationsCount()
    );
    expect(state.notificationsCount).toBe(4);
  });

  it('plusieurs incréments successifs s\'accumulent', () => {
    let state = socialReducer(initialState, incrementNotificationsCount());
    state = socialReducer(state, incrementNotificationsCount());
    state = socialReducer(state, incrementNotificationsCount());
    expect(state.notificationsCount).toBe(3);
  });
});

describe('socialSlice — resetNotificationsCount', () => {
  it('remet le compteur à 0', () => {
    const state = socialReducer(
      { notificationsCount: 12 },
      resetNotificationsCount()
    );
    expect(state.notificationsCount).toBe(0);
  });

  it('n\'affecte pas un compteur déjà à 0', () => {
    const state = socialReducer(initialState, resetNotificationsCount());
    expect(state.notificationsCount).toBe(0);
  });
});
