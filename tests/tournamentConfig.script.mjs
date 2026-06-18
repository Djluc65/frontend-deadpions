
import assert from 'assert';
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
  formatMinimumRanking,
  isTournamentStartNowAvailable,
  getRoundLabel
} from '../src/utils/tournamentConfig.js';

console.log('🧪 Lancement du test unitaire Frontend : Tournament Config');

let passed = 0;
let failed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✅ ${description}`);
        passed++;
    } catch (error) {
        console.error(`❌ ${description}`);
        console.error(`   Erreur: ${error.message}`);
        failed++;
    }
}

// Tests calculateTournamentPot
test('calculateTournamentPot - 4 joueurs * 500 coins = 2000', () => {
  assert.strictEqual(calculateTournamentPot(4, 500), 2000);
});

test('calculateTournamentPot - 32 joueurs * 50000 coins = 1600000', () => {
  assert.strictEqual(calculateTournamentPot(32, 50000), 1600000);
});

// Tests calculateTournamentWinnerGain
test('calculateTournamentWinnerGain - 2000 coins → 1900 coins', () => {
  assert.strictEqual(calculateTournamentWinnerGain(2000), 1900);
});

test('calculateTournamentWinnerGain - arrondi inférieur pour 1234', () => {
  assert.strictEqual(calculateTournamentWinnerGain(1234), 1172);
});

// Tests getTournamentRoundsCount
test('getTournamentRoundsCount - 2 joueurs → 1 round', () => {
  assert.strictEqual(getTournamentRoundsCount(2), 1);
});

test('getTournamentRoundsCount - 4 joueurs → 2 rounds', () => {
  assert.strictEqual(getTournamentRoundsCount(4), 2);
});

test('getTournamentRoundsCount - 32 joueurs →5 rounds', () => {
  assert.strictEqual(getTournamentRoundsCount(32), 5);
});

test('getTournamentRoundsCount - invalide → 1', () => {
  assert.strictEqual(getTournamentRoundsCount(0), 1);
  assert.strictEqual(getTournamentRoundsCount(null), 1);
});

// Tests getTournamentWinsNeeded
test('getTournamentWinsNeeded - 2 parties → 2 victoires', () => {
  assert.strictEqual(getTournamentWinsNeeded(2), 2);
});

test('getTournamentWinsNeeded - 4 parties → 3 victoires', () => {
  assert.strictEqual(getTournamentWinsNeeded(4), 3);
});

test('getTournamentWinsNeeded - invalide → 2', () => {
  assert.strictEqual(getTournamentWinsNeeded(null), 2);
  assert.strictEqual(getTournamentWinsNeeded(undefined), 2);
});

// Tests sanitizeTournamentName
test('sanitizeTournamentName - trim les espaces', () => {
  assert.strictEqual(sanitizeTournamentName('  Mon Tournoi  '), 'Mon Tournoi');
});

test('sanitizeTournamentName - troncature à 40 caractères', () => {
  const longName = 'A'.repeat(50);
  assert.strictEqual(sanitizeTournamentName(longName), 'A'.repeat(40));
});

test('sanitizeTournamentName - invalide → chaîne vide', () => {
  assert.strictEqual(sanitizeTournamentName(null), '');
  assert.strictEqual(sanitizeTournamentName(123), '');
});

// Tests formatTournamentMode
test('formatTournamentMode - classic', () => {
  assert.strictEqual(formatTournamentMode({ gameMode: 'classic' }), 'Mode Classique');
});

test('formatTournamentMode - chrono 30s', () => {
  assert.strictEqual(formatTournamentMode({ gameMode: 'chrono', moveTimeLimit: 30 }), 'Mode Chrono - 30 s/coup');
});

test('formatTournamentMode - blitz 3min', () => {
  assert.strictEqual(formatTournamentMode({ gameMode: 'blitz', totalTimeLimit: 180 }), 'Mode Blitz - 3 min/joueur');
});

// Tests formatStartingPlayer
test('formatStartingPlayer - random', () => {
  assert.strictEqual(formatStartingPlayer('random'), 'Depart aleatoire');
});

test('formatStartingPlayer - player1', () => {
  assert.strictEqual(formatStartingPlayer('player1'), 'Joueur 1 commence');
});

test('formatStartingPlayer - player2', () => {
  assert.strictEqual(formatStartingPlayer('player2'), 'Joueur 2 commence');
});

// Tests formatPawnColors
test('formatPawnColors - random', () => {
  assert.strictEqual(formatPawnColors('random'), 'Pions aleatoires');
});

test('formatPawnColors - classic', () => {
  assert.strictEqual(formatPawnColors('classic'), 'Pions classiques');
});

// Tests formatVictoryRule
test('formatVictoryRule - exact_five', () => {
  assert.strictEqual(formatVictoryRule('exact_five'), '5 exactement');
});

// Tests formatEliminationType
test('formatEliminationType - single_elimination', () => {
  assert.strictEqual(formatEliminationType('single_elimination'), 'Elimination directe');
});

// Tests formatMinimumRanking
test('formatMinimumRanking - all', () => {
  assert.strictEqual(formatMinimumRanking('all'), 'Tous niveaux');
});

test('formatMinimumRanking - silver_plus', () => {
  assert.strictEqual(formatMinimumRanking('silver_plus'), 'Argent et +');
});

// Tests isTournamentStartNowAvailable
test('isTournamentStartNowAvailable - 4 joueurs → true', () => {
  assert.strictEqual(isTournamentStartNowAvailable(4), true);
});

test('isTournamentStartNowAvailable - 5 joueurs → false', () => {
  assert.strictEqual(isTournamentStartNowAvailable(5), false);
});

// Tests getRoundLabel
test('getRoundLabel - 4 joueurs, round 2 → Finale', () => {
  assert.strictEqual(getRoundLabel(4, 2), 'Finale');
});

test('getRoundLabel - 8 joueurs, round 1 → Quarts', () => {
  assert.strictEqual(getRoundLabel(8, 1), 'Quarts');
});

console.log(`\n📊 Résultat : ${passed} succès, ${failed} échecs`);

if (failed > 0) process.exit(1);
