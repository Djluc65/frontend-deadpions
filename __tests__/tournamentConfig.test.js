
import {
  calculateTournamentPot,
  calculateTournamentWinnerGain,
  getTournamentRoundsCount,
  getTournamentWinsNeeded,
  sanitizeTournamentName,
  formatTournamentMode,
  formatStartingPlayer,
  formatPawnColors,
  formatVictoryRule,
  formatEliminationType,
  formatGamesPerMatchSummary,
  formatMinimumRanking,
  isTournamentStartNowAvailable,
  getTournamentMatchStatusLabel,
  getRoundLabel
} from '../src/utils/tournamentConfig';

// ─── calculateTournamentPot ────────────────────────────────────────────────────
describe('calculateTournamentPot', () => {
  it('calcule le pot total pour 4 joueurs et 500 coins', () => {
    expect(calculateTournamentPot(4, 500)).toBe(2000);
  });

  it('calcule le pot total pour 32 joueurs et 50000 coins', () => {
    expect(calculateTournamentPot(32, 50000)).toBe(1600000);
  });
});

// ─── calculateTournamentWinnerGain ─────────────────────────────────────────────
describe('calculateTournamentWinnerGain', () => {
  it('calcule le gain du vainqueur (95% du pot)', () => {
    expect(calculateTournamentWinnerGain(2000)).toBe(1900); // 2000 * 0.95 = 1900
  });

  it('arrondi à l entier inférieur', () => {
    expect(calculateTournamentWinnerGain(1234)).toBe(1172); // 1234 *0.95 = 1172.3
  });
});

// ─── getTournamentRoundsCount ─────────────────────────────────────────────────
describe('getTournamentRoundsCount', () => {
  it('retourne 1 pour 2 joueurs', () => {
    expect(getTournamentRoundsCount(2)).toBe(1);
  });

  it('retourne 2 pour 4 joueurs', () => {
    expect(getTournamentRoundsCount(4)).toBe(2);
  });

  it('retourne 3 pour 8 joueurs', () => {
    expect(getTournamentRoundsCount(8)).toBe(3);
  });

  it('retourne 5 pour 32 joueurs', () => {
    expect(getTournamentRoundsCount(32)).toBe(5);
  });

  it('retourne 1 si taille invalide (0 ou null)', () => {
    expect(getTournamentRoundsCount(0)).toBe(1);
    expect(getTournamentRoundsCount(null)).toBe(1);
  });
});

// ─── getTournamentWinsNeeded ───────────────────────────────────────────────────
describe('getTournamentWinsNeeded', () => {
  it('retourne 2 pour 2 parties par match', () => {
    expect(getTournamentWinsNeeded(2)).toBe(2); // (2/2)+1=2
  });

  it('retourne 3 pour 4 parties par match', () => {
    expect(getTournamentWinsNeeded(4)).toBe(3); // (4/2)+1=3
  });

  it('retourne 4 pour 6 parties par match', () => {
    expect(getTournamentWinsNeeded(6)).toBe(4); // (6/2)+1=4
  });

  it('retourne 2 si paramètre invalide', () => {
    expect(getTournamentWinsNeeded(null)).toBe(2);
    expect(getTournamentWinsNeeded(undefined)).toBe(2);
  });
});

// ─── sanitizeTournamentName ────────────────────────────────────────────────────
describe('sanitizeTournamentName', () => {
  it('trim les espaces', () => {
    expect(sanitizeTournamentName('  Mon Tournoi  ')).toBe('Mon Tournoi');
  });

  it('troncature à 40 caractères', () => {
    const longName = 'A'.repeat(50);
    expect(sanitizeTournamentName(longName)).toBe('A'.repeat(40));
  });

  it('retourne chaîne vide si pas de string', () => {
    expect(sanitizeTournamentName(null)).toBe('');
    expect(sanitizeTournamentName(123)).toBe('');
    expect(sanitizeTournamentName(undefined)).toBe('');
  });
});

// ─── formatTournamentMode ─────────────────────────────────────────────────────
describe('formatTournamentMode', () => {
  it('retourne Mode Classique par défaut', () => {
    expect(formatTournamentMode({})).toBe('Mode Classique');
    expect(formatTournamentMode({ gameMode: 'classic' })).toBe('Mode Classique');
  });

  it('retourne Mode Chrono avec temps', () => {
    expect(formatTournamentMode({ gameMode: 'chrono', moveTimeLimit: 30 })).toBe('Mode Chrono - 30 s/coup');
  });

  it('retourne Mode Chrono sans temps', () => {
    expect(formatTournamentMode({ gameMode: 'chrono', moveTimeLimit: null })).toBe('Mode Chrono - Sans chrono');
  });

  it('retourne Mode Blitz en minutes', () => {
    expect(formatTournamentMode({ gameMode: 'blitz', totalTimeLimit: 180 })).toBe('Mode Blitz - 3 min/joueur');
  });
});

// ─── formatStartingPlayer ───────────────────────────────────────────────────────
describe('formatStartingPlayer', () => {
  it('retourne Depart aleatoire par défaut', () => {
    expect(formatStartingPlayer('random')).toBe('Depart aleatoire');
    expect(formatStartingPlayer('invalid')).toBe('Depart aleatoire');
  });

  it('retourne Joueur 1 commence', () => {
    expect(formatStartingPlayer('player1')).toBe('Joueur 1 commence');
  });

  it('retourne Joueur 2 commence', () => {
    expect(formatStartingPlayer('player2')).toBe('Joueur 2 commence');
  });

  it('retourne Depart alterne', () => {
    expect(formatStartingPlayer('alternate')).toBe('Depart alterne');
  });
});

// ─── formatPawnColors ─────────────────────────────────────────────────────────
describe('formatPawnColors', () => {
  it('retourne Pions aleatoires par défaut', () => {
    expect(formatPawnColors('random')).toBe('Pions aleatoires');
    expect(formatPawnColors('invalid')).toBe('Pions aleatoires');
  });

  it('retourne Pions classiques', () => {
    expect(formatPawnColors('classic')).toBe('Pions classiques');
  });

  it('retourne Choix libre', () => {
    expect(formatPawnColors('free_choice')).toBe('Choix libre');
  });
});

// ─── formatVictoryRule ─────────────────────────────────────────────────────────
describe('formatVictoryRule', () => {
  it('retourne 5 alignes par défaut', () => {
    expect(formatVictoryRule('five_in_a_row')).toBe('5 alignes');
    expect(formatVictoryRule('invalid')).toBe('5 alignes');
  });

  it('retourne 5 exactement', () => {
    expect(formatVictoryRule('exact_five')).toBe('5 exactement');
  });
});

// ─── formatEliminationType ─────────────────────────────────────────────────────
describe('formatEliminationType', () => {
  it('retourne Elimination directe par défaut', () => {
    expect(formatEliminationType('single_elimination')).toBe('Elimination directe');
    expect(formatEliminationType('invalid')).toBe('Elimination directe');
  });

  it('retourne Meilleur des 3', () => {
    expect(formatEliminationType('best_of_3')).toBe('Meilleur des 3');
  });
});

// ─── formatGamesPerMatchSummary ────────────────────────────────────────────────
describe('formatGamesPerMatchSummary', () => {
  it('retourne le résumé pour 2 parties', () => {
    expect(formatGamesPerMatchSummary(2)).toBe('Premier a 2 victoire(s) - 3 parties max si 1-1 match nul, a rejouer');
  });

  it('retourne le résumé pour 4 parties', () => {
    expect(formatGamesPerMatchSummary(4)).toBe('Premier a 3 victoire(s) - 4 parties maximum si 2-2 match nul, a rejouer');
  });
});

// ─── formatMinimumRanking ──────────────────────────────────────────────────────
describe('formatMinimumRanking', () => {
  it('retourne Tous niveaux par défaut', () => {
    expect(formatMinimumRanking('all')).toBe('Tous niveaux');
    expect(formatMinimumRanking('invalid')).toBe('Tous niveaux');
  });

  it('retourne Bronze et +', () => {
    expect(formatMinimumRanking('bronze_plus')).toBe('Bronze et +');
  });

  it('retourne Argent et +', () => {
    expect(formatMinimumRanking('silver_plus')).toBe('Argent et +');
  });

  it('retourne Or et +', () => {
    expect(formatMinimumRanking('gold_plus')).toBe('Or et +');
  });
});

// ─── isTournamentStartNowAvailable ─────────────────────────────────────────────
describe('isTournamentStartNowAvailable', () => {
  it('retourne true pour 4 joueurs', () => {
    expect(isTournamentStartNowAvailable(4)).toBe(true);
  });

  it('retourne true pour 8 joueurs', () => {
    expect(isTournamentStartNowAvailable(8)).toBe(true);
  });

  it('retourne false pour moins de 4 joueurs', () => {
    expect(isTournamentStartNowAvailable(3)).toBe(false);
    expect(isTournamentStartNowAvailable(2)).toBe(false);
  });

  it('retourne false si pas puissance de 2', () => {
    expect(isTournamentStartNowAvailable(5)).toBe(false);
    expect(isTournamentStartNowAvailable(6)).toBe(false);
    expect(isTournamentStartNowAvailable(7)).toBe(false);
  });
});

// ─── getTournamentMatchStatusLabel ──────────────────────────────────────────────
describe('getTournamentMatchStatusLabel', () => {
  it('retourne En attente des joueurs', () => {
    expect(getTournamentMatchStatusLabel({ status: 'waiting_for_players' })).toBe('En attente des joueurs');
  });

  it('retourne Pret a lancer', () => {
    expect(getTournamentMatchStatusLabel({ status: 'ready' })).toBe('Pret a lancer');
  });

  it('retourne En cours', () => {
    expect(getTournamentMatchStatusLabel({ status: 'in_progress' })).toBe('En cours');
  });

  it('retourne Termine', () => {
    expect(getTournamentMatchStatusLabel({ status: 'finished' })).toBe('Termine');
  });

  it('retourne BYE', () => {
    expect(getTournamentMatchStatusLabel({ status: 'bye' })).toBe('BYE');
  });

  it('retourne En attente par défaut', () => {
    expect(getTournamentMatchStatusLabel({})).toBe('En attente');
  });
});

// ─── getRoundLabel ─────────────────────────────────────────────────────────────
describe('getRoundLabel', () => {
  it('retourne Finale pour le dernier round (2 joueurs, 1 round)', () => {
    expect(getRoundLabel(2, 1)).toBe('Finale');
  });

  it('retourne Finale pour le dernier round (4 joueurs, 2 rounds)', () => {
    expect(getRoundLabel(4, 2)).toBe('Finale');
  });

  it('retourne Demi-finales pour round 1 sur 8 joueurs', () => {
    expect(getRoundLabel(8, 2)).toBe('Demi-finales');
  });

  it('retourne Quarts pour round 1 sur 8 joueurs', () => {
    expect(getRoundLabel(8, 1)).toBe('Quarts');
  });

  it('retourne Round X pour les autres cas', () => {
    expect(getRoundLabel(4, 1)).toBe('Round 1');
    expect(getRoundLabel(16, 1)).toBe('Round 1');
  });
});
