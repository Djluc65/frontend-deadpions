// DeadPions — TournamentBracketScreen.jsx — MatchReadyGate simultané
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { T, TY } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { TOURNAMENT_STATUS_COLORS } from '../utils/tournamentConfig';
import { getTournamentMatchStatusLabelI18n } from '../utils/tournamentI18n';
import { socket } from '../utils/socket';
import { updateTournament, updateBracket } from '../redux/slices/tournamentSlice';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
import { getResponsiveSize } from '../utils/responsive';
import { useTournamentLayout } from '../utils/tournamentLayout';

const rs = getResponsiveSize;

const TournamentBracketScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { isTablet, contentWidth, width } = useTournamentLayout();
  const columnWidth = isTablet ? rs(240) : rs(180);
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { bracket, currentRound, activeTournament, tournamentStatus } = useSelector(state => state.tournament);
  const { markTournamentMatchPresence } = useTournamentSocket();

  const [waitingMatchId, setWaitingMatchId] = useState(null);
  const waitingTimerRef = useRef(null);
  const cleanupRef = useRef([]);

  const userId = user?.id || user?._id;
  const roundsCount = activeTournament ? Math.log2(activeTournament.size) : 0;
  const rounds = [];
  for (let i = 1; i <= roundsCount; i++) {
    rounds.push(bracket.filter(m => m.round === i && m.stage === 'main'));
  }
  const participantCount = Array.isArray(activeTournament?.participants) ? activeTournament.participants.length : 0;
  const isWaitingTournament = tournamentStatus === 'waiting' && bracket.length === 0;

  useEffect(() => {
    if (!activeTournament?._id || !userId) return;
    if (!socket.connected) socket.connect();
    socket.emit('join_user_room', userId);
    socket.emit('join_tournament_room', { tournamentId: activeTournament._id });
  }, [activeTournament?._id, userId]);

  useEffect(() => {
    const registerListeners = () => {
      const handleBracketUpdate = (payload = {}) => {
        if (payload.tournament) {
          dispatch(updateTournament(payload.tournament));
        }
        if (Array.isArray(payload.bracket)) {
          dispatch(updateBracket({
            bracket: payload.bracket,
            currentRound: payload.currentRound
          }));
        }
      };

      const handleBothReady = (payload = {}) => {
        console.log('[Bracket] match_both_ready recu :', payload);
        clearTimeout(waitingTimerRef.current);
        setWaitingMatchId(null);

        navigation.navigate('Game', {
          gameId: payload.gameId,
          mode: 'online_custom',
          tournamentId: payload.tournamentId,
          tournamentMatchId: payload.matchId,
          gameType: payload.gameType || 'simple',
          tournamentSettings: payload.tournamentSettings ?? null,
          isWaiting: true
        });
      };

      socket.on('tournament_bracket_update', handleBracketUpdate);
      socket.on('match_both_ready', handleBothReady);

      const cleanup = () => {
        socket.off('tournament_bracket_update', handleBracketUpdate);
        socket.off('match_both_ready', handleBothReady);
      };

      cleanupRef.current.push(cleanup);
      const timeoutId = setTimeout(() => {
        cleanup();
      }, 15000);
      cleanupRef.current.push(() => clearTimeout(timeoutId));

      return cleanup;
    };

    const cleanup = registerListeners();
    const renewId = setInterval(() => {
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
      registerListeners();
    }, 14000);
    cleanupRef.current.push(() => clearInterval(renewId));

    return () => {
      cleanup();
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
      clearTimeout(waitingTimerRef.current);
    };
  }, [dispatch, navigation]);

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
    if (!playerId) return t('tournament.bracket.waiting_players');
    const participant = participantsById.get(String(playerId));
    return participant?.pseudo || participant?.username || participant?.name || fallbackLabel;
  };

  const handleJouer = (match) => {
    const matchIdStr = String(match._id);
    const uid = String(userId || '');
    const p1 = String(match.player1?._id || match.player1 || '');
    const myReadyFlag = p1 === uid
      ? match.readyGate?.player1Ready
      : match.readyGate?.player2Ready;

    if (waitingMatchId === matchIdStr || myReadyFlag) return;

    setWaitingMatchId(matchIdStr);
    markTournamentMatchPresence(activeTournament._id, match._id);

    clearTimeout(waitingTimerRef.current);
    waitingTimerRef.current = setTimeout(() => {
      setWaitingMatchId(null);
      Alert.alert(
        t('tournament.bracket.opponent_timeout_title'),
        t('tournament.bracket.opponent_timeout_msg'),
        [{ text: t('tournament.common.ok') }]
      );
    }, 3 * 60 * 1000);
  };

  const renderMatch = (match) => {
    const isUserInMatch = sameId(match.player1, userId) || sameId(match.player2, userId);
    const isCurrentRound = match.round === currentRound;
    const isReadyToPlay = isUserInMatch && isCurrentRound && match.player1 && match.player2 && !match.winner && !!match.gameId;
    const isPlayer1Winner = sameId(match.winner, match.player1);
    const isPlayer2Winner = sameId(match.winner, match.player2);
    const statusLabel = getTournamentMatchStatusLabelI18n(match);
    const statusColor = TOURNAMENT_STATUS_COLORS[match.status] || T.textMuted;

    const uid = String(userId || '');
    const p1 = String(match.player1?._id || match.player1 || '');
    const imWaiting = waitingMatchId === String(match._id);
    const myReadyFlag = p1 === uid
      ? match.readyGate?.player1Ready
      : match.readyGate?.player2Ready;

    return (
      <View key={`${match.round}-${match.matchIndex}`} style={[
        styles.match,
        isReadyToPlay && styles.matchActive
      ]}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchHeaderText}>
            {match.label || t('tournament.bracket.match_label', { index: match.matchIndex + 1 })}
          </Text>
          <Text style={[styles.matchStatusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <View style={[styles.player, isPlayer1Winner && styles.playerWinner]}>
          <Text style={[styles.playerName, isTablet && { fontSize: rs(15) }]} numberOfLines={1}>
            {getDisplayName(match.player1, t('game.player1'))}
          </Text>
          {isPlayer1Winner && <Ionicons name="checkmark-circle" size={16} color={T.green} />}
        </View>
        <View style={styles.matchSeparator} />
        <View style={[styles.player, isPlayer2Winner && styles.playerWinner]}>
          <Text style={[styles.playerName, isTablet && { fontSize: rs(15) }]} numberOfLines={1}>
            {getDisplayName(match.player2, t('game.player2'))}
          </Text>
          {isPlayer2Winner && <Ionicons name="checkmark-circle" size={16} color={T.green} />}
        </View>

        {isReadyToPlay && (
          imWaiting || myReadyFlag ? (
            <View style={[styles.playBtn, styles.playBtnWaiting]}>
              <Text style={styles.playBtnWaitingText}>
                {t('tournament.bracket.btn_waiting_opponent')}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.playBtn, isTablet && { paddingVertical: rs(10), paddingHorizontal: rs(20) }]}
              onPress={() => handleJouer(match)}
              activeOpacity={0.8}
            >
              <Text style={styles.playBtnText}>{t('tournament.bracket.btn_play')}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[
        styles.header,
        isTablet && { paddingHorizontal: (width - contentWidth) / 2 },
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.tournamentName, isTablet && { fontSize: rs(24) }]}>{activeTournament?.name || t('tournament.bracket.title')}</Text>
          <Text style={[styles.subtitle, isTablet && { fontSize: rs(14) }]}>
            {isWaitingTournament
              ? t('tournament.bracket.inscribed', {
                  current: participantCount,
                  total: activeTournament?.size || 0
                })
              : t('tournament.bracket.round_progress', {
                  current: currentRound,
                  total: roundsCount
                })}
          </Text>
        </View>
      </View>

      {isWaitingTournament ? (
        <View style={[styles.waitingWrap, isTablet && { alignItems: 'center' }]}>
          <View style={[styles.waitingCard, isTablet && { width: contentWidth, padding: rs(26) }]}>
            <Ionicons name="hourglass-outline" size={34} color={T.gold} />
            <Text style={styles.waitingTitle}>{t('tournament.bracket.tournament_created')}</Text>
            <Text style={styles.waitingText}>
              {t('tournament.bracket.tournament_waiting')}
            </Text>
            <Text style={styles.waitingProgress}>
              {t('tournament.bracket.inscribed', {
                current: participantCount,
                total: activeTournament?.size || 0
              })}
            </Text>
            <Text style={styles.waitingHint}>
              {t('tournament.bracket.bracket_pending')}
            </Text>
          </View>
        </View>
      ) : (
      <ScrollView horizontal contentContainerStyle={styles.scrollContent}>
        {rounds.map((roundMatches, rIdx) => (
          <View key={`round-${rIdx + 1}`} style={[styles.roundColumn, { width: columnWidth }]}>
            <Text style={[styles.roundTitle, isTablet && { fontSize: rs(18) }]}>
              {rIdx + 1 === roundsCount
                ? t('tournament.bracket.finale')
                : t('tournament.bracket.round_label', { number: rIdx + 1 })}
            </Text>
            <View style={styles.matchesList}>
              {roundMatches.map(renderMatch)}
            </View>
          </View>
        ))}
        {activeTournament?.configuration?.enableThirdPlaceMatch ? (
          <View style={styles.roundColumn}>
            <Text style={styles.roundTitle}>{t('tournament.bracket.third_place')}</Text>
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
  },
  playBtnWaiting: {
    backgroundColor: '#2A2A1A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F4B41A40',
  },
  playBtnWaitingText: {
    fontSize: 13,
    color: '#F4B41A',
    textAlign: 'center',
  }
});

export default TournamentBracketScreen;
