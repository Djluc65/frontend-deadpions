import { T } from './theme';

export const TOURNAMENT_SIZE_OPTIONS = [4, 8, 16, 32];
export const TOURNAMENT_ENTRY_FEE_OPTIONS = [500, 1000, 5000, 10000, 50000];
export const TOURNAMENT_GAMES_PER_MATCH_OPTIONS = [2, 4, 6, 8, 10];
export const TOURNAMENT_SCHEDULING_OPTIONS = [
  { label: 'Automatique', value: 'automatique' },
  { label: 'Programme', value: 'programme' },
];

export const TOURNAMENT_MODE_OPTIONS = [
  { label: 'Classique', value: 'classic' },
  { label: 'Chrono', value: 'chrono' },
  { label: 'Blitz', value: 'blitz' },
];

export const TOURNAMENT_MOVE_TIME_OPTIONS = [
  { label: 'Sans chrono', value: null },
  { label: '30 s', value: 30 },
  { label: '60 s', value: 60 },
  { label: '120 s', value: 120 },
  { label: '150 s', value: 150 },
];

export const TOURNAMENT_TOTAL_TIME_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
];

export const TOURNAMENT_STARTING_PLAYER_OPTIONS = [
  { label: 'Aleatoire', value: 'random' },
  { label: 'Joueur 1', value: 'player1' },
  { label: 'Joueur 2', value: 'player2' },
  { label: 'Alterne', value: 'alternate' },
];

export const TOURNAMENT_COLOR_OPTIONS = [
  { label: 'Aleatoire', value: 'random' },
  { label: 'Classique', value: 'classic' },
  { label: 'Choix libre', value: 'free_choice' },
];

export const TOURNAMENT_VICTORY_RULE_OPTIONS = [
  // { label: '5 alignes', value: 'five_in_a_row' },
  { label: '5 exactement', value: 'exact_five' },
];

export const TOURNAMENT_ELIMINATION_OPTIONS = [
  { label: 'Elimination directe', value: 'single_elimination' },
  { label: 'Meilleur des 3', value: 'best_of_3' },
];

export const TOURNAMENT_VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Prive', value: 'private' },
];

export const TOURNAMENT_RANK_OPTIONS = [
  { label: 'Tous niveaux', value: 'all' },
  { label: 'Bronze et +', value: 'bronze_plus' },
  { label: 'Argent et +', value: 'silver_plus' },
  { label: 'Or et +', value: 'gold_plus' },
];

export const DEFAULT_TOURNAMENT_CONFIG = {
  name: '',
  size: 4,
  entryFee: 500,
  gameMode: 'classic',
  moveTimeLimit: 30,
  totalTimeLimit: 180,
  startingPlayer: 'random',
  pawnColorMode: 'random',
  victoryRule: 'exact_five',
  eliminationType: 'single_elimination',
  enableThirdPlaceMatch: false,
  visibility: 'public',
  minimumRanking: 'all',
  gamesPerMatch: 2,
  schedulingMode: 'automatique',
  roundSchedule: [],
};

export const TOURNAMENT_STATUS_COLORS = {
  pending: T.textMuted,
  waiting_for_players: T.gold,
  ready: T.gold,
  in_progress: T.cyan,
  finished: T.green,
  bye: T.textDim,
};

export const calculateTournamentPot = (size, entryFee) => size * entryFee;
export const calculateTournamentWinnerGain = (totalPot) => Math.floor(totalPot * 0.95);
export const getTournamentRoundsCount = (size) => Math.max(1, Math.log2(Number(size || 2)));
export const getTournamentWinsNeeded = (gamesPerMatch) => Math.floor(Number(gamesPerMatch || 2) / 2) + 1;
export const sanitizeTournamentName = (value) => (typeof value === 'string' ? value.trim().slice(0, 40) : '');
export const buildAutomaticTournamentName = (pseudo) => `${pseudo || 'Joueur'}'s Tournament #${String(Date.now()).slice(-4)}`.slice(0, 40);

export const formatTournamentMode = (config = {}) => {
  if (config.gameMode === 'chrono') {
    const label = config.moveTimeLimit == null ? 'Sans chrono' : `${config.moveTimeLimit} s/coup`;
    return `Mode Chrono - ${label}`;
  }
  if (config.gameMode === 'blitz') {
    const minutes = Math.round((config.totalTimeLimit || 0) / 60);
    return `Mode Blitz - ${minutes} min/joueur`;
  }
  return 'Mode Classique';
};

export const formatStartingPlayer = (value) => {
  switch (value) {
    case 'player1':
      return 'Joueur 1 commence';
    case 'player2':
      return 'Joueur 2 commence';
    case 'alternate':
      return 'Depart alterne';
    default:
      return 'Depart aleatoire';
  }
};

export const formatPawnColors = (value) => {
  switch (value) {
    case 'classic':
      return 'Pions classiques';
    case 'free_choice':
      return 'Choix libre';
    default:
      return 'Pions aleatoires';
  }
};

export const formatVictoryRule = (value) => (
  value === 'exact_five' ? '5 exactement' : '5 alignes'
);

export const formatEliminationType = (value) => (
  value === 'best_of_3' ? 'Meilleur des 3' : 'Elimination directe'
);

export const formatGamesPerMatchSummary = (gamesPerMatch) => {
  const winsNeeded = getTournamentWinsNeeded(gamesPerMatch);
  const drawThreshold = Math.floor(Number(gamesPerMatch || 2) / 2);
  const maxLabel = Number(gamesPerMatch || 2) === 2 ? '3 parties max' : `${gamesPerMatch} parties maximum`;
  return `Premier a ${winsNeeded} victoire(s) - ${maxLabel} si ${drawThreshold}-${drawThreshold} match nul, a rejouer`;
};
export const formatGamesPerMatch = formatGamesPerMatchSummary;

export const formatMinimumRanking = (value) => {
  switch (value) {
    case 'bronze_plus':
      return 'Bronze et +';
    case 'silver_plus':
      return 'Argent et +';
    case 'gold_plus':
      return 'Or et +';
    default:
      return 'Tous niveaux';
  }
};

export const buildTournamentSummaryLines = (config = {}) => {
  const totalPot = calculateTournamentPot(config.size || 0, config.entryFee || 0);
  const name = sanitizeTournamentName(config.name) || `Tournoi ${config.size || 0} joueurs`;
  return [
    `${name}`,
    formatTournamentMode(config),
    formatPawnColors(config.pawnColorMode),
    `${formatVictoryRule(config.victoryRule)} • Elimination directe`,
    `${config.visibility === 'private' ? 'Prive' : 'Public'} • ${formatMinimumRanking(config.minimumRanking)}`,
    `Mise : ${config.entryFee || 0} coins`,
    `Pot total : ${totalPot} coins`,
    `Gain vainqueur : ${calculateTournamentWinnerGain(totalPot)} coins`,
  ];
};

export const isTournamentStartNowAvailable = (playersCount) => (
  playersCount >= 4 && Number.isInteger(Math.log2(playersCount))
);

export const getTournamentMatchStatusLabel = (match = {}) => {
  switch (match.status) {
    case 'waiting_for_players':
      return 'En attente des joueurs';
    case 'ready':
      return 'Pret a lancer';
    case 'in_progress':
      return 'En cours';
    case 'finished':
      return 'Termine';
    case 'bye':
      return 'BYE';
    default:
      return 'En attente';
  }
};

export const estimateGameDurationMinutes = (config = {}) => {
  if (config.gameMode === 'chrono') {
    const moveTime = Number(config.moveTimeLimit || 30);
    return Math.min(30, Math.max(5, Math.ceil((moveTime * 361) / 60)));
  }
  if (config.gameMode === 'blitz') {
    return Math.max(2, Math.ceil((Number(config.totalTimeLimit || 180) * 2) / 60));
  }
  return 20;
};

export const estimateRoundDurationMinutes = (config = {}, roundNumber = 1) => {
  const matchesInParallel = Math.max(1, Math.floor((config.size || 2) / Math.pow(2, roundNumber)));
  return {
    durationMinutes: estimateGameDurationMinutes(config) * Math.max(1, Number(config.gamesPerMatch || 2)),
    matchesInParallel
  };
};

export const getRoundLabel = (size, roundNumber) => {
  const rounds = getTournamentRoundsCount(size);
  if (roundNumber === rounds) return 'Finale';
  if (size >= 8 && roundNumber === rounds - 1) return 'Demi-finales';
  if (size >= 8 && roundNumber === rounds - 2) return 'Quarts';
  return `Round ${roundNumber}`;
};

export const buildDefaultRoundSchedule = (config = {}) => {
  const rounds = getTournamentRoundsCount(config.size);
  let cursor = new Date(Date.now() + (15 * 60 * 1000));

  return Array.from({ length: rounds }, (_, index) => {
    const roundNumber = index + 1;
    if (index > 0) {
      const previous = estimateRoundDurationMinutes(config, roundNumber - 1);
      cursor = new Date(cursor.getTime() + previous.durationMinutes * 60 * 1000);
    }
    return {
      round: roundNumber,
      scheduledAt: new Date(cursor)
    };
  });
};
