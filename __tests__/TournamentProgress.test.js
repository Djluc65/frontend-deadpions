import { getTournamentProgress } from '../src/utils/constants';

describe('getTournamentProgress', () => {
  it('returns null for non-online tournament modes', () => {
    const result = getTournamentProgress({
      mode: 'local',
      tournamentSettings: { totalGames: 4, gameNumber: 1, score: { black: 0, white: 0 } },
      tournamentTotalGames: 4,
      tournamentGameNumber: 1,
      tournamentOver: false,
    });

    expect(result).toBeNull();
  });

  it('returns null when tournamentOver is true', () => {
    const result = getTournamentProgress({
      mode: 'online',
      tournamentSettings: { totalGames: 4, gameNumber: 2, score: { black: 1, white: 0 } },
      tournamentTotalGames: 4,
      tournamentGameNumber: 2,
      tournamentOver: true,
    });

    expect(result).toBeNull();
  });

  it('derives progress from component state when provided', () => {
    const result = getTournamentProgress({
      mode: 'online',
      tournamentSettings: null,
      tournamentTotalGames: 4,
      tournamentGameNumber: 1,
      tournamentOver: false,
    });

    expect(result).toEqual({
      totalGames: 4,
      currentGameNumber: 1,
      nextGameNumber: 2,
      isLastGame: false,
    });
  });

  it('derives progress from tournamentSettings when state is not provided', () => {
    const result = getTournamentProgress({
      mode: 'live',
      tournamentSettings: { totalGames: 4, gameNumber: 3, score: { black: 1, white: 1 } },
      tournamentTotalGames: undefined,
      tournamentGameNumber: undefined,
      tournamentOver: false,
    });

    expect(result).toEqual({
      totalGames: 4,
      currentGameNumber: 3,
      nextGameNumber: 4,
      isLastGame: false,
    });
  });

  it('marks last game correctly', () => {
    const result = getTournamentProgress({
      mode: 'online_custom',
      tournamentSettings: { totalGames: 4, gameNumber: 4, score: { black: 2, white: 1 } },
      tournamentTotalGames: 4,
      tournamentGameNumber: 4,
      tournamentOver: false,
    });

    expect(result).toEqual({
      totalGames: 4,
      currentGameNumber: 4,
      nextGameNumber: 5,
      isLastGame: true,
    });
  });
});

