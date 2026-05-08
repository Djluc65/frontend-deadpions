import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  updateAccessToken,
} from '../src/redux/slices/authSlice';

const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

describe('authSlice — état initial', () => {
  it('retourne l\'état initial', () => {
    expect(authReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });
});

describe('authSlice — loginStart', () => {
  it('active le chargement', () => {
    const state = authReducer(initialState, loginStart());
    expect(state.loading).toBe(true);
  });

  it('efface l\'erreur précédente', () => {
    const state = authReducer(
      { ...initialState, error: 'Une erreur précédente' },
      loginStart()
    );
    expect(state.error).toBeNull();
  });

  it('ne modifie pas isAuthenticated', () => {
    const state = authReducer(initialState, loginStart());
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('authSlice — loginSuccess', () => {
  const payload = {
    user: { _id: 'u1', pseudo: 'Alice', coins: 1000 },
    token: 'access-token-abc',
    refreshToken: 'refresh-token-xyz',
  };

  it('marque l\'utilisateur comme authentifié', () => {
    const state = authReducer({ ...initialState, loading: true }, loginSuccess(payload));
    expect(state.isAuthenticated).toBe(true);
  });

  it('stocke l\'utilisateur, le token et le refreshToken', () => {
    const state = authReducer(initialState, loginSuccess(payload));
    expect(state.user).toEqual(payload.user);
    expect(state.token).toBe('access-token-abc');
    expect(state.refreshToken).toBe('refresh-token-xyz');
  });

  it('désactive le chargement', () => {
    const state = authReducer({ ...initialState, loading: true }, loginSuccess(payload));
    expect(state.loading).toBe(false);
  });
});

describe('authSlice — loginFailure', () => {
  it('enregistre le message d\'erreur', () => {
    const state = authReducer(
      { ...initialState, loading: true },
      loginFailure('Email ou mot de passe incorrect.')
    );
    expect(state.error).toBe('Email ou mot de passe incorrect.');
  });

  it('désactive le chargement', () => {
    const state = authReducer({ ...initialState, loading: true }, loginFailure('Erreur'));
    expect(state.loading).toBe(false);
  });

  it('ne modifie pas isAuthenticated', () => {
    const state = authReducer(initialState, loginFailure('Erreur'));
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('authSlice — logout', () => {
  const loggedInState = {
    user: { _id: 'u1', pseudo: 'Alice' },
    token: 'abc',
    refreshToken: 'xyz',
    isAuthenticated: true,
    loading: false,
    error: null,
  };

  it('réinitialise user, token et refreshToken à null', () => {
    const state = authReducer(loggedInState, logout());
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('remet isAuthenticated à false', () => {
    const state = authReducer(loggedInState, logout());
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('authSlice — updateUser', () => {
  it('fusionne les nouvelles propriétés dans l\'utilisateur existant', () => {
    const state = authReducer(
      { ...initialState, user: { _id: 'u1', pseudo: 'Alice', coins: 100 } },
      updateUser({ coins: 250, avatar: 'avatar.jpg' })
    );
    expect(state.user.coins).toBe(250);
    expect(state.user.avatar).toBe('avatar.jpg');
    expect(state.user.pseudo).toBe('Alice'); // conservé
  });

  it('ne fait rien si user est null', () => {
    const state = authReducer(initialState, updateUser({ coins: 500 }));
    expect(state.user).toBeNull();
  });

  it('peut mettre à jour isPremium', () => {
    const state = authReducer(
      { ...initialState, user: { _id: 'u1', isPremium: false } },
      updateUser({ isPremium: true })
    );
    expect(state.user.isPremium).toBe(true);
  });
});

describe('authSlice — updateAccessToken', () => {
  it('remplace le token existant', () => {
    const state = authReducer(
      { ...initialState, token: 'ancien-token' },
      updateAccessToken('nouveau-token')
    );
    expect(state.token).toBe('nouveau-token');
  });

  it('ne modifie pas les autres champs', () => {
    const before = { ...initialState, token: 'ancien', refreshToken: 'refresh-ok' };
    const state = authReducer(before, updateAccessToken('nouveau'));
    expect(state.refreshToken).toBe('refresh-ok');
    expect(state.isAuthenticated).toBe(false);
  });
});
