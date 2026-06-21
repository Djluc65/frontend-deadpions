import i18n from '../i18n/index';

const t = (key, opts) => i18n.t(`tournament.${key}`, opts);

const modeKey = (gameMode) => {
  if (gameMode === 'chrono') return 'chrono';
  if (gameMode === 'blitz') return 'blitz';
  return 'classique';
};

export const getTournamentModeLabel = (mode) => (
  t(`common.${modeKey(mode)}`)
);

export const getRoundLabelI18n = (size, roundNumber) => {
  const rounds = Math.max(1, Math.log2(Number(size || 2)));
  if (roundNumber === rounds) return t('config.options.round_finale');
  if (size >= 8 && roundNumber === rounds - 1) return t('config.options.round_semifinals');
  if (size >= 8 && roundNumber === rounds - 2) return t('config.options.round_quarters');
  return t('config.options.round_n', { number: roundNumber });
};

export const formatGamesPerMatchSummaryI18n = (gamesPerMatch) => {
  const winsNeeded = Math.floor(Number(gamesPerMatch || 2) / 2) + 1;
  const drawThreshold = Math.floor(Number(gamesPerMatch || 2) / 2);
  const maxLabel = Number(gamesPerMatch || 2) === 2
    ? t('config.options.games_max_two')
    : t('config.options.games_max_n', { count: gamesPerMatch });
  return t('config.options.games_summary_full', {
    wins: winsNeeded,
    maxLabel,
    draw: drawThreshold,
  });
};

export const buildTournamentSummaryLinesI18n = (config = {}) => {
  const totalPot = (config.size || 0) * (config.entryFee || 0);
  const name = (typeof config.name === 'string' && config.name.trim())
    ? config.name.trim().slice(0, 40)
    : t('config.options.summary_default_name', { size: config.size || 0 });

  let modeLine;
  if (config.gameMode === 'chrono') {
    const label = config.moveTimeLimit == null
      ? t('config.options.move_none')
      : t('config.options.move_secs', { value: config.moveTimeLimit });
    modeLine = t('config.options.summary_mode_chrono', { label });
  } else if (config.gameMode === 'blitz') {
    const minutes = Math.round((config.totalTimeLimit || 0) / 60);
    modeLine = t('config.options.summary_mode_blitz', { minutes });
  } else {
    modeLine = t('config.options.summary_mode_classic');
  }

  let pawnLine;
  switch (config.pawnColorMode) {
    case 'classic':
      pawnLine = t('config.options.summary_pawn_classic');
      break;
    case 'free_choice':
      pawnLine = t('config.options.summary_pawn_free');
      break;
    default:
      pawnLine = t('config.options.summary_pawn_random');
  }

  const ruleLine = t('config.options.victory_exact');

  const visibilityLine = t('config.options.summary_visibility', {
    visibility: config.visibility === 'private'
      ? t('config.options.visibility_private')
      : t('common.public'),
    rank: formatMinimumRankingI18n(config.minimumRanking),
  });

  return [
    name,
    modeLine,
    pawnLine,
    t('config.options.summary_victory_elim', { rule: ruleLine }),
    visibilityLine,
    t('config.options.summary_entry', { amount: config.entryFee || 0 }),
    t('config.options.summary_pot', { amount: totalPot }),
    t('config.options.summary_winner', { amount: Math.floor(totalPot * 0.95) }),
  ];
};

export const formatMinimumRankingI18n = (value) => {
  switch (value) {
    case 'bronze_plus':
      return t('config.options.rank_bronze');
    case 'silver_plus':
      return t('config.options.rank_silver');
    case 'gold_plus':
      return t('config.options.rank_gold');
    default:
      return t('common.all_levels');
  }
};

export const getTournamentMatchStatusLabelI18n = (match = {}) => {
  switch (match.status) {
    case 'waiting_for_players':
      return t('config.options.match_waiting_players');
    case 'ready':
      return t('config.options.match_ready');
    case 'in_progress':
      return t('common.in_progress');
    case 'finished':
      return t('common.finished');
    case 'bye':
      return t('config.options.match_bye');
    default:
      return t('common.waiting');
  }
};

export const mapMoveTimeOptions = () => ([
  { label: t('config.options.move_none'), value: null },
  { label: t('config.options.move_secs', { value: 30 }), value: 30 },
  { label: t('config.options.move_secs', { value: 60 }), value: 60 },
  { label: t('config.options.move_secs', { value: 120 }), value: 120 },
  { label: t('config.options.move_secs', { value: 150 }), value: 150 },
]);

export const mapTotalTimeOptions = () => ([
  { label: t('config.options.total_min', { value: 1 }), value: 60 },
  { label: t('config.options.total_min', { value: 2 }), value: 120 },
  { label: t('config.options.total_min', { value: 3 }), value: 180 },
  { label: t('config.options.total_min', { value: 5 }), value: 300 },
]);

export const mapStartingPlayerOptions = () => ([
  { label: t('config.options.start_random'), value: 'random' },
  { label: t('config.options.start_player1'), value: 'player1' },
  { label: t('config.options.start_player2'), value: 'player2' },
  { label: t('config.options.start_alternate'), value: 'alternate' },
]);

export const mapColorOptions = () => ([
  { label: t('config.options.color_random'), value: 'random' },
  { label: t('config.options.color_classic'), value: 'classic' },
  { label: t('config.options.color_free'), value: 'free_choice' },
]);

export const mapVictoryRuleOptions = () => ([
  { label: t('config.options.victory_exact'), value: 'exact_five' },
]);

export const mapSchedulingOptions = () => ([
  { label: t('config.options.scheduling_auto'), value: 'automatique' },
  { label: t('config.options.scheduling_program'), value: 'programme' },
]);

export const mapRankOptions = () => ([
  { label: t('common.all_levels'), value: 'all' },
  { label: t('config.options.rank_bronze'), value: 'bronze_plus' },
  { label: t('config.options.rank_silver'), value: 'silver_plus' },
  { label: t('config.options.rank_gold'), value: 'gold_plus' },
]);

export const mapModeKey = (mode) => modeKey(mode);
