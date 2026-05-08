import gameReducer, {
  setPlayers,
  setSpectators,
  addSpectator,
  removeSpectator,
} from '../src/redux/slices/gameSlice';

const initialState = {
  players: { me: null, opponent: null },
  spectators: [],
};

describe('gameSlice — état initial', () => {
  it('retourne l\'état initial', () => {
    expect(gameReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('players.me et players.opponent sont null par défaut', () => {
    const state = gameReducer(undefined, { type: '@@INIT' });
    expect(state.players.me).toBeNull();
    expect(state.players.opponent).toBeNull();
  });

  it('spectators est un tableau vide par défaut', () => {
    const state = gameReducer(undefined, { type: '@@INIT' });
    expect(state.spectators).toEqual([]);
  });
});

describe('gameSlice — setPlayers', () => {
  const players = {
    me: { id: 'u1', pseudo: 'Alice', role: 'black' },
    opponent: { id: 'u2', pseudo: 'Bob', role: 'white' },
  };

  it('définit les deux joueurs', () => {
    const state = gameReducer(initialState, setPlayers(players));
    expect(state.players).toEqual(players);
  });

  it('remplace les joueurs précédents', () => {
    const first = { me: { id: 'old', pseudo: 'Old' }, opponent: null };
    let state = gameReducer(initialState, setPlayers(first));
    state = gameReducer(state, setPlayers(players));
    expect(state.players.me.pseudo).toBe('Alice');
  });

  it('ne modifie pas les spectateurs', () => {
    const stateWithSpectators = { ...initialState, spectators: [{ id: 's1' }] };
    const state = gameReducer(stateWithSpectators, setPlayers(players));
    expect(state.spectators).toHaveLength(1);
  });
});

describe('gameSlice — setSpectators', () => {
  it('remplace la liste de spectateurs', () => {
    const spectators = [{ id: 's1', pseudo: 'Charlie' }, { id: 's2', pseudo: 'Diana' }];
    const state = gameReducer(initialState, setSpectators(spectators));
    expect(state.spectators).toEqual(spectators);
  });

  it('peut vider la liste de spectateurs', () => {
    const state = gameReducer(
      { ...initialState, spectators: [{ id: 's1' }] },
      setSpectators([])
    );
    expect(state.spectators).toHaveLength(0);
  });
});

describe('gameSlice — addSpectator', () => {
  it('ajoute un spectateur à la liste vide', () => {
    const state = gameReducer(initialState, addSpectator({ id: 's1', pseudo: 'Eve' }));
    expect(state.spectators).toHaveLength(1);
    expect(state.spectators[0].pseudo).toBe('Eve');
  });

  it('ajoute un spectateur à une liste existante', () => {
    const state = gameReducer(
      { ...initialState, spectators: [{ id: 's1' }] },
      addSpectator({ id: 's2', pseudo: 'Frank' })
    );
    expect(state.spectators).toHaveLength(2);
    expect(state.spectators[1].id).toBe('s2');
  });

  it('ne modifie pas les joueurs', () => {
    const players = { me: { id: 'u1' }, opponent: { id: 'u2' } };
    const state = gameReducer(
      { ...initialState, players },
      addSpectator({ id: 's1' })
    );
    expect(state.players).toEqual(players);
  });
});

describe('gameSlice — removeSpectator', () => {
  it('retire le spectateur correspondant à l\'id', () => {
    const state = gameReducer(
      { ...initialState, spectators: [{ id: 's1' }, { id: 's2' }, { id: 's3' }] },
      removeSpectator('s2')
    );
    expect(state.spectators).toHaveLength(2);
    expect(state.spectators.find(s => s.id === 's2')).toBeUndefined();
    expect(state.spectators.map(s => s.id)).toEqual(['s1', 's3']);
  });

  it('ne fait rien si l\'id est inexistant', () => {
    const state = gameReducer(
      { ...initialState, spectators: [{ id: 's1' }] },
      removeSpectator('inconnu')
    );
    expect(state.spectators).toHaveLength(1);
  });

  it('peut vider la liste en retirant le dernier spectateur', () => {
    const state = gameReducer(
      { ...initialState, spectators: [{ id: 's1' }] },
      removeSpectator('s1')
    );
    expect(state.spectators).toHaveLength(0);
  });
});
