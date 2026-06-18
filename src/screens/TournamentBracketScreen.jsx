// DeadPions — TournamentBracketScreen.jsx — créé le 2026-06-08
import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { T, TY } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getTournamentMatchStatusLabel, TOURNAMENT_STATUS_COLORS } from '../utils/tournamentConfig';

const COLUMN_WIDTH = 180;

const TournamentBracketScreen = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
  const { bracket, currentRound, activeTournament, tournamentStatus } = useSelector(state => state.tournament);
  
  const userId = user?.id || user?._id;
  const roundsCount = activeTournament ? Math.log2(activeTournament.size) : 0;
  const rounds = [];
  for (let i = 1; i <= roundsCount; i++) {
    rounds.push(bracket.filter(m => m.round === i && m.stage === 'main'));
  }
  const participantCount = Array.isArray(activeTournament?.participants) ? activeTournament.participants.length : 0;
  const isWaitingTournament = tournamentStatus === 'waiting' && bracket.length === 0;

  const participantsById = useMemo(() => {
    const map = new Map();
    const participants = activeTournament?.participants || [];
    for (const participant of participants) {
      const id = participant?._id || participant?.id || participant;
      if (!id) continue;
      map.set(String(id), participant);
    }
    return map;
  }, [activeTournament?.participants]);

  const normalizeId = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value._id || value.id || null;
    return value;
  };

  const sameId = (a, b) => {
    const aId = normalizeId(a);
    const bId = normalizeId(b);
    if (!aId || !bId) return false;
    return String(aId) === String(bId);
  };

  const getDisplayName = (playerValue, fallbackLabel) => {
    const playerId = normalizeId(playerValue);
    if (!playerId) return 'En attente...';
    const participant = participantsById.get(String(playerId));
    return participant?.pseudo || participant?.username || participant?.name || fallbackLabel;
  };

  const renderMatch = (match) => {
    const isUserInMatch = sameId(match.player1, userId) || sameId(match.player2, userId);
    const isCurrentRound = match.round === currentRound;
    const isReadyToPlay = isUserInMatch && isCurrentRound && match.player1 && match.player2 && !match.winner && !!match.gameId;
    const isPlayer1Winner = sameId(match.winner, match.player1);
    const isPlayer2Winner = sameId(match.winner, match.player2);
    const statusLabel = getTournamentMatchStatusLabel(match);
    const statusColor = TOURNAMENT_STATUS_COLORS[match.status] || T.textMuted;

    return (
      <View key={`${match.round}-${match.matchIndex}`} style={[
        styles.match,
        isReadyToPlay && styles.matchActive
      ]}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchHeaderText}>{match.label || `Match ${match.matchIndex + 1}`}</Text>
          <Text style={[styles.matchStatusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <View style={[styles.player, isPlayer1Winner && styles.playerWinner]}>
          <Text style={styles.playerName} numberOfLines={1}>
            {getDisplayName(match.player1, 'Joueur 1')}
          </Text>
          {isPlayer1Winner && <Ionicons name="checkmark-circle" size={16} color={T.green} />}
        </View>
        <View style={styles.matchSeparator} />
        <View style={[styles.player, isPlayer2Winner && styles.playerWinner]}>
          <Text style={styles.playerName} numberOfLines={1}>
            {getDisplayName(match.player2, 'Joueur 2')}
          </Text>
          {isPlayer2Winner && <Ionicons name="checkmark-circle" size={16} color={T.green} />}
        </View>

        {isReadyToPlay && (
          <TouchableOpacity 
            style={styles.playBtn}
            onPress={() => navigation.navigate('Game', {
              gameId: match.gameId,
              mode: 'online_custom',
              tournamentId: activeTournament?._id,
              tournamentMatchId: match._id,
              gameType: match.bestOf > 1 ? 'tournament' : 'simple',
              isWaiting: true
            })}
          >
            <Text style={styles.playBtnText}>Jouer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.tournamentName}>{activeTournament?.name || 'Tournoi'}</Text>
          <Text style={styles.subtitle}>
            {isWaitingTournament
              ? `${participantCount} / ${activeTournament?.size || 0} inscrits`
              : `Round ${currentRound} / ${roundsCount}`}
          </Text>
        </View>
      </View>

      {isWaitingTournament ? (
        <View style={styles.waitingWrap}>
          <View style={styles.waitingCard}>
            <Ionicons name="hourglass-outline" size={34} color={T.gold} />
            <Text style={styles.waitingTitle}>Tournoi cree</Text>
            <Text style={styles.waitingText}>
              Votre tournoi attend encore des joueurs.
            </Text>
            <Text style={styles.waitingProgress}>
              {participantCount} / {activeTournament?.size || 0} inscrits
            </Text>
            <Text style={styles.waitingHint}>
              Le bracket se genere automatiquement des que le quota est atteint.
            </Text>
          </View>
        </View>
      ) : (
      <ScrollView horizontal contentContainerStyle={styles.scrollContent}>
        {rounds.map((roundMatches, rIdx) => (
          <View key={`round-${rIdx + 1}`} style={styles.roundColumn}>
            <Text style={styles.roundTitle}>
              {rIdx + 1 === roundsCount ? 'FINALE' : `ROUND ${rIdx + 1}`}
            </Text>
            <View style={styles.matchesList}>
              {roundMatches.map(renderMatch)}
            </View>
          </View>
        ))}
        {activeTournament?.configuration?.enableThirdPlaceMatch ? (
          <View style={styles.roundColumn}>
            <Text style={styles.roundTitle}>3E PLACE</Text>
            <View style={styles.matchesList}>
              {bracket.filter((match) => match.stage === 'third_place').map(renderMatch)}
            </View>
          </View>
        ) : null}
      </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#060B17',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    marginRight: 15,
  },
  tournamentName: {
    ...TY.heading,
    fontSize: 20,
    color: '#F4B41A',
  },
  subtitle: {
    color: '#6A7791',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: 20,
  },
  waitingWrap: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  waitingCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 26, 0.2)',
    padding: 22,
    alignItems: 'center',
  },
  waitingTitle: {
    ...TY.heading,
    fontSize: 22,
    marginTop: 14,
    marginBottom: 10,
    color: '#ECE6D6',
  },
  waitingText: {
    color: '#A8B4C9',
    fontSize: 15,
    textAlign: 'center',
  },
  waitingProgress: {
    color: T.gold,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 12,
  },
  waitingHint: {
    color: '#6A7791',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  roundColumn: {
    width: COLUMN_WIDTH,
    marginRight: 30,
  },
  roundTitle: {
    ...TY.label,
    textAlign: 'center',
    marginBottom: 20,
    color: '#6A7791',
  },
  matchesList: {
    flex: 1,
    justifyContent: 'space-around',
  },
  match: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(236, 230, 214, 0.08)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  matchHeaderText: {
    color: '#A8B4C9',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  matchStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  matchActive: {
    borderColor: '#F4B41A',
    borderWidth: 2,
    backgroundColor: 'rgba(244, 180, 26, 0.05)',
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    height: 44,
  },
  playerWinner: {
    backgroundColor: 'rgba(46, 194, 126, 0.1)',
  },
  playerName: {
    color: '#ECE6D6',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  matchSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  playBtn: {
    backgroundColor: '#F4B41A',
    paddingVertical: 8,
    alignItems: 'center',
  },
  playBtnText: {
    color: '#060B17',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  }
});

export default TournamentBracketScreen;
