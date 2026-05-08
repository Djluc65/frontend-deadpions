import uiReducer, {
  setLoading,
  showLoading,
  hideLoading,
} from '../src/redux/slices/uiSlice';

const initialState = {
  isLoading: false,
  loadingMessage: null,
};

describe('uiSlice — état initial', () => {
  it('retourne l\'état initial', () => {
    expect(uiReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });
});

describe('uiSlice — setLoading', () => {
  it('active le chargement avec true', () => {
    const state = uiReducer(initialState, setLoading(true));
    expect(state.isLoading).toBe(true);
  });

  it('désactive le chargement avec false', () => {
    const state = uiReducer(
      { isLoading: true, loadingMessage: 'En cours...' },
      setLoading(false)
    );
    expect(state.isLoading).toBe(false);
  });

  it('efface le message quand on désactive le chargement', () => {
    const state = uiReducer(
      { isLoading: true, loadingMessage: 'Chargement...' },
      setLoading(false)
    );
    expect(state.loadingMessage).toBeNull();
  });

  it('ne modifie pas loadingMessage quand on active le chargement', () => {
    // setLoading(true) ne définit pas de message — le message reste null
    const state = uiReducer(initialState, setLoading(true));
    expect(state.loadingMessage).toBeNull();
  });
});

describe('uiSlice — showLoading', () => {
  it('active le chargement avec un message', () => {
    const state = uiReducer(initialState, showLoading('Connexion en cours...'));
    expect(state.isLoading).toBe(true);
    expect(state.loadingMessage).toBe('Connexion en cours...');
  });

  it('loadingMessage est null si aucun message fourni', () => {
    const state = uiReducer(initialState, showLoading());
    expect(state.isLoading).toBe(true);
    expect(state.loadingMessage).toBeNull();
  });

  it('remplace un message de chargement précédent', () => {
    let state = uiReducer(initialState, showLoading('Message 1'));
    state = uiReducer(state, showLoading('Message 2'));
    expect(state.loadingMessage).toBe('Message 2');
  });
});

describe('uiSlice — hideLoading', () => {
  it('désactive le chargement', () => {
    const state = uiReducer(
      { isLoading: true, loadingMessage: 'En cours...' },
      hideLoading()
    );
    expect(state.isLoading).toBe(false);
  });

  it('efface le message de chargement', () => {
    const state = uiReducer(
      { isLoading: true, loadingMessage: 'Patientez...' },
      hideLoading()
    );
    expect(state.loadingMessage).toBeNull();
  });

  it('n\'a pas d\'effet si déjà masqué', () => {
    const state = uiReducer(initialState, hideLoading());
    expect(state).toEqual(initialState);
  });
});
