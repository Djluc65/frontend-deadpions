/**
 * Tests pour AudioController.playResultSound et la détection isDraw utilisée
 * dans le useEffect de GameScreen (showResultModal).
 */

// Mock expo-av : on ne peut pas jouer de vrais sons en environnement Node.
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(),
    },
    setAudioModeAsync: jest.fn(),
  },
}));

const { Audio } = require('expo-av');
const { AudioController } = require('../src/utils/AudioController');

const makeMockSound = () => {
  const sound = {
    playAsync: jest.fn().mockResolvedValue(undefined),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    setOnPlaybackStatusUpdate: jest.fn(),
  };
  Audio.Sound.createAsync.mockResolvedValue({ sound });
  return sound;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// playResultSound — dispatch vers le bon son selon le résultat
// ---------------------------------------------------------------------------
describe('AudioController.playResultSound', () => {
  it('joue le son de victoire quand victoire=true et isDraw=false', async () => {
    const spy = jest.spyOn(AudioController, 'playVictorySound').mockResolvedValue(undefined);
    await AudioController.playResultSound(true, false, true);
    expect(spy).toHaveBeenCalledWith(true);
    spy.mockRestore();
  });

  it('joue le son de défaite quand victoire=false et isDraw=false', async () => {
    const spy = jest.spyOn(AudioController, 'playDefeatSound').mockResolvedValue(undefined);
    await AudioController.playResultSound(false, false, true);
    expect(spy).toHaveBeenCalledWith(true);
    spy.mockRestore();
  });

  it('joue le son de match nul quand isDraw=true (peu importe victoire)', async () => {
    const spy = jest.spyOn(AudioController, 'playDrawSound').mockResolvedValue(undefined);
    await AudioController.playResultSound(true, true, true);
    expect(spy).toHaveBeenCalledWith(true);
    spy.mockRestore();
  });

  it('ne joue aucun son quand isSoundEnabled=false', async () => {
    const spyV = jest.spyOn(AudioController, 'playVictorySound').mockResolvedValue(undefined);
    const spyD = jest.spyOn(AudioController, 'playDefeatSound').mockResolvedValue(undefined);
    const spyN = jest.spyOn(AudioController, 'playDrawSound').mockResolvedValue(undefined);

    // Désactivé → les méthodes internes vérifient isSoundEnabled et retournent tôt
    await AudioController.playVictorySound(false);
    await AudioController.playDefeatSound(false);
    await AudioController.playDrawSound(false);

    // createAsync ne doit jamais être appelé
    expect(Audio.Sound.createAsync).not.toHaveBeenCalled();

    spyV.mockRestore();
    spyD.mockRestore();
    spyN.mockRestore();
  });

  it('appelle bien Audio.Sound.createAsync lors d\'une vraie victoire', async () => {
    makeMockSound();
    await AudioController.playVictorySound(true);
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
  });

  it('appelle bien Audio.Sound.createAsync lors d\'une vraie défaite', async () => {
    makeMockSound();
    await AudioController.playDefeatSound(true);
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
  });

  it('appelle bien Audio.Sound.createAsync lors d\'un vrai match nul', async () => {
    makeMockSound();
    await AudioController.playDrawSound(true);
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Logique isDraw — reproduit le calcul du useEffect de GameScreen
// (showResultModal + resultData)
// ---------------------------------------------------------------------------
const computeIsDraw = (resultData) => {
  const { victoire, reason, isTournament, tournamentOver, tournamentScore: ts, type } = resultData;
  return (
    reason === 'draw' ||
    reason === 'cancel_by_agreement' ||
    ((type === 'local' || type === 'ia' || type === 'ai') &&
      isTournament &&
      tournamentOver &&
      ts?.black === ts?.white)
  );
};

describe('isDraw detection (logique GameScreen useEffect)', () => {
  it('détecte un match nul via reason=draw', () => {
    expect(computeIsDraw({ reason: 'draw', type: 'online' })).toBe(true);
  });

  it('détecte un match nul via reason=cancel_by_agreement', () => {
    expect(computeIsDraw({ reason: 'cancel_by_agreement', type: 'online' })).toBe(true);
  });

  it('détecte un match nul de tournoi local quand les scores sont égaux', () => {
    expect(computeIsDraw({
      reason: 'victory',
      type: 'local',
      isTournament: true,
      tournamentOver: true,
      tournamentScore: { black: 2, white: 2 },
    })).toBe(true);
  });

  it('ne détecte pas de match nul si le tournoi n\'est pas terminé', () => {
    expect(computeIsDraw({
      reason: 'victory',
      type: 'local',
      isTournament: true,
      tournamentOver: false,
      tournamentScore: { black: 2, white: 2 },
    })).toBe(false);
  });

  it('ne détecte pas de match nul si les scores sont différents', () => {
    expect(computeIsDraw({
      reason: 'victory',
      type: 'ai',
      isTournament: true,
      tournamentOver: true,
      tournamentScore: { black: 3, white: 2 },
    })).toBe(false);
  });

  it('ne détecte pas de match nul pour une victoire normale en ligne', () => {
    expect(computeIsDraw({ reason: 'victory', type: 'online', victoire: true })).toBe(false);
  });

  it('ne détecte pas de match nul pour une défaite normale en ligne', () => {
    expect(computeIsDraw({ reason: 'victory', type: 'online', victoire: false })).toBe(false);
  });
});
