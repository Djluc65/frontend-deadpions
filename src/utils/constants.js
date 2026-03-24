export const BET_OPTIONS = [
  100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 
  100000, 250000, 500000, 1000000, 2500000, 5000000, 
  10000000, 25000000, 50000000, 100000000, 250000000, 
  500000000, 1000000000, 2500000000, 5000000000
];

export const ONLINE_TIME_OPTIONS = [
  { label: 'Sans chrono', value: null },
  { label: '30 s', value: 30 },
  { label: '1 min', value: 60 },
  { label: '1 min 30s', value: 90 },
  { label: '2 min', value: 120 }
];

export const ONLINE_TOURNAMENT_MODES = ['online', 'online_custom', 'live'];

export function getTournamentProgress({
  mode,
  tournamentSettings,
  tournamentTotalGames,
  tournamentGameNumber,
  tournamentOver,
}) {
  if (!ONLINE_TOURNAMENT_MODES.includes(mode)) return null;
  if (tournamentOver) return null;

  const isTournament = !!tournamentSettings || (typeof tournamentTotalGames === 'number' && tournamentTotalGames > 1);
  if (!isTournament) return null;

  const totalGames = tournamentTotalGames || tournamentSettings?.totalGames || 1;
  const currentGameNumber = tournamentGameNumber || tournamentSettings?.gameNumber || 1;
  const nextGameNumber = currentGameNumber + 1;
  const isLastGame = currentGameNumber >= totalGames;

  return {
    totalGames,
    currentGameNumber,
    nextGameNumber,
    isLastGame,
  };
}
