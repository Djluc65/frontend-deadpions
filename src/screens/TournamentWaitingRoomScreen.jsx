import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { T, TY } from '../utils/theme';
import Button from '../components/common/Button';
import TournamentInviteModal from '../components/TournamentInviteModal';
import { appAlert } from '../services/appAlert';
import { socket } from '../utils/socket';
import { setTournament, updateTournament, resetTournament } from '../redux/slices/tournamentSlice';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
import {
  isTournamentStartNowAvailable,
} from '../utils/tournamentConfig';
import { getResponsiveSize } from '../utils/responsive';
import { useTournamentLayout } from '../utils/tournamentLayout';
import { buildTournamentSummaryLinesI18n } from '../utils/tournamentI18n';

const rs = getResponsiveSize;

const TournamentWaitingRoomScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const { isTablet, centeredContainer, contentWidth } = useTournamentLayout();
  const dispatch = useDispatch();
  const cleanupRef = useRef([]);
  const hasJoinedRef = useRef(false);
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const activeTournament = useSelector((state) => state.tournament.activeTournament);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  // Ref stable pour tournamentId — ne change pas entre les rendus
  const tournamentIdRef = useRef(
    route?.params?.tournamentId || activeTournament?._id
  );
  const inviteCode = route?.params?.inviteCode;
  const { leaveTournament, startTournamentNow, joinTournament } = useTournamentSocket();

  const tournamentIdForQuery = route?.params?.tournamentId || activeTournament?._id;
  const { data: tournament, refetch } = useQuery({
    queryKey: ['tournament', tournamentIdForQuery],
    enabled: !!tournamentIdForQuery,
    queryFn: async () => {
      const response = await fetch(`${API_URL}/tournaments/${tournamentIdForQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || t('tournament.join_code.error_not_found'));
      }
      return payload;
    }
  });

  useEffect(() => {
    if (!tournament?._id || !user || hasJoinedRef.current) return;

    // Mettre à jour la ref si on a maintenant un ID
    if (!tournamentIdRef.current) {
      tournamentIdRef.current = tournament._id;
    }

    const tid = tournament._id;

    const joinOrRejoin = async () => {
      // ✅ ÉTAPE 1 : Rejoindre toutes les rooms socket EN PREMIER
      socket.emit('join_user_room', user?._id || user?.id);
      socket.emit('join_tournament_room', { tournamentId: tid });
      socket.emit('join_waiting_room', { tournamentId: tid });

      // ✅ ÉTAPE 2 : Récupérer l'état courant du tournoi
      socket.emit('rejoin_tournament_room', { tournamentId: tid }, (response) => {
        console.log("🏠 WaitingRoom: rejoin_tournament_room response", response);
        if (response?.success && response.tournament) {
          dispatch(setTournament(response.tournament));
        }
      });

      // ✅ ÉTAPE 3 : Rejoindre si pas déjà inscrit
      const isAlreadyJoined = tournament.participants?.some(p =>
        String(p._id || p.id) === String(user._id || user.id)
      );

      if (!isAlreadyJoined && !isJoining && tournament.status === 'waiting') {
        setIsJoining(true);
        joinTournament(tid, inviteCode, (response) => {
          setIsJoining(false);
          if (response?.success) {
            dispatch(setTournament(response.tournament));
          } else {
            appAlert(t('tournament.common.error'), response?.message || t('tournament.join_code.error_not_found'));
            navigation.replace('TournamentLobby');
          }
        });
      }

      hasJoinedRef.current = true; // Marquer comme tenté
    };

    joinOrRejoin();

    return () => {
      socket.emit('leave_waiting_room', { tournamentId: tid });
      socket.emit('leave_tournament_room', { tournamentId: tid });
    };
  }, [tournament?._id, user?._id]);

  useEffect(() => {
    const handlePlayerJoined = (payload = {}) => {
      console.log("🏠 WaitingRoom: tournament_player_joined reçu", {
        payloadTournamentId: payload.tournamentId,
        localTournamentId: tournamentIdRef.current,
        participantsCount: payload.tournament?.participants?.length
      });

      // Filtre robuste avec String() pour éviter les mismatch ObjectId vs string
      const localId = tournamentIdRef.current;
      if (
        localId &&
        payload.tournamentId &&
        String(payload.tournamentId) !== String(localId)
      ) {
        console.log("🏠 WaitingRoom: event ignoré - tournamentId mismatch");
        return;
      }

      setIsStarting(false);
      if (payload.tournament) {
        dispatch(setTournament(payload.tournament));
      } else if (Array.isArray(payload.participants) && activeTournament) {
        dispatch(updateTournament({ ...activeTournament, participants: payload.participants }));
      }
      refetch();
    };

    const handlePlayerLeft = (payload = {}) => {
      const localId = tournamentIdRef.current;
      if (
        localId &&
        payload.tournamentId &&
        String(payload.tournamentId) !== String(localId)
      ) {
        return;
      }

      setIsLeaving(false);
      if (payload.tournament) {
        dispatch(setTournament(payload.tournament));
      } else if (Array.isArray(payload.participants) && activeTournament) {
        dispatch(updateTournament({ ...activeTournament, participants: payload.participants }));
      }
      refetch();
    };

    const handleStarted = (payload = {}) => {
      const nextTournament = payload.tournament || tournament;
      if (!nextTournament?._id) return;
      setIsStarting(false);
      dispatch(setTournament(nextTournament));
      navigation.replace('TournamentBracket', { tournamentId: nextTournament._id });
    };

    const handleCancelled = (payload = {}) => {
      const localId = tournamentIdRef.current;
      if (
        payload.tournamentId &&
        localId &&
        String(payload.tournamentId) !== String(localId)
      ) {
        return;
      }

      setIsLeaving(false);
      dispatch(resetTournament());
      appAlert(t('tournament.bracket.title'), t('tournament.notifications.cancelled_body', { name: '' }));
      navigation.replace('TournamentLobby');
    };

    const handleLeft = () => {
      setIsLeaving(false);
      dispatch(resetTournament());
      navigation.replace('TournamentLobby');
    };

    const handleError = (message) => {
      setIsLeaving(false);
      setIsStarting(false);
      appAlert(t('tournament.bracket.title'), typeof message === 'string' ? message : t('common.error'));
    };

    socket.on('tournament_player_joined', handlePlayerJoined);
    socket.on('tournament_player_left', handlePlayerLeft);
    socket.on('tournament_started', handleStarted);
    socket.on('tournament_cancelled', handleCancelled);
    socket.on('tournament_left', handleLeft);
    socket.on('tournament_error', handleError);

    return () => {
      socket.off('tournament_player_joined', handlePlayerJoined);
      socket.off('tournament_player_left', handlePlayerLeft);
      socket.off('tournament_started', handleStarted);
      socket.off('tournament_cancelled', handleCancelled);
      socket.off('tournament_left', handleLeft);
      socket.off('tournament_error', handleError);
    };
  }, [activeTournament, dispatch, navigation, refetch, tournament]);

  const currentTournament = activeTournament || tournament; // Prefer redux which updates via sockets
  const participants = Array.isArray(currentTournament?.participants) ? currentTournament.participants : [];
  
  // Add debug logs for current state
  console.log("🏠 TournamentWaitingRoomState:", {
    currentTournamentId: currentTournament?._id,
    fromQuery: tournament,
    fromRedux: activeTournament,
    participantsCount: participants.length,
    tournamentStatus: currentTournament?.status
  });
  const isCreator = String(currentTournament?.creatorId?._id || currentTournament?.creatorId) === String(user?._id || user?.id);
  const canStartNow = isCreator && isTournamentStartNowAvailable(participants.length);
  const hasByesWarning = participants.length < (currentTournament?.size || 0) && canStartNow;
  const summaryLines = useMemo(
    () => buildTournamentSummaryLinesI18n({
      size: currentTournament?.size,
      entryFee: currentTournament?.entryFee,
      ...(currentTournament?.configuration || {}),
      name: currentTournament?.name,
    }),
    [currentTournament, i18n.language]
  );
  const progressRatio = currentTournament?.size ? participants.length / currentTournament.size : 0;

  const handleStart = () => {
    if (!currentTournament?._id || isStarting) return;
    setIsStarting(true);
    startTournamentNow(currentTournament._id);
  };

  const handleLeave = () => {
    if (!currentTournament?._id || isLeaving) return;
    Alert.alert(
      t('tournament.waiting_room.quit_title'),
      t('tournament.waiting_room.quit_message'),
      [
        { text: t('tournament.common.stay'), style: 'cancel' },
        {
          text: t('tournament.common.quit'),
          onPress: () => {
            setIsLeaving(true);
            socket.emit('leave_waiting_room', { tournamentId: currentTournament._id });
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const renderPlayer = ({ item }) => {
    const rank = item?.ranking || 'Bronze';
    return (
      <View style={[
        styles.playerRow,
        isTablet && { width: contentWidth, alignSelf: 'center', padding: rs(18) },
      ]}>
        <View style={styles.playerAvatar}>
          <Text style={styles.playerAvatarText}>{String(item?.pseudo || '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.playerMeta}>
          <Text style={styles.playerName}>{item?.pseudo || t('auth.welcome')}</Text>
          <Text style={styles.playerRank}>{rank}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={[
          { flexDirection: 'row', width: '100%', alignItems: 'center' },
          isTablet && centeredContainer,
        ]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tournamentName, isTablet && { fontSize: rs(26) }]}>
              {currentTournament?.name || t('tournament.bracket.title')}
            </Text>
            <Text style={[styles.subtitle, isTablet && { fontSize: rs(14) }]}>
              {t('tournament.waiting_room.players_awaited', { count: currentTournament?.size || 0 })}
            </Text>
          </View>
        </View>
      </View>

      {isCreator && currentTournament?.invitationCode ? (
        <View style={isTablet ? { alignItems: 'center' } : undefined}>
          <TouchableOpacity
            style={[styles.btnInvite, isTablet && { width: contentWidth, paddingVertical: rs(16) }]}
            onPress={() => setInviteVisible(true)}
          >
            <Ionicons name="share-social-outline" size={16} color="#060B17" />
            <Text style={styles.btnInviteText}>{t('tournament.waiting_room.btn_invite')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={participants}
        keyExtractor={(item, index) => String(item?._id || item?.id || index)}
        renderItem={renderPlayer}
        contentContainerStyle={[
          styles.content,
          isTablet && { paddingHorizontal: 0, alignItems: 'center' },
        ]}
        ListHeaderComponent={(
          <View style={isTablet ? { width: contentWidth, alignSelf: 'center' } : undefined}>
            <View style={[styles.summaryCard, isTablet && { padding: rs(18) }]}>
              {summaryLines.map((line, index) => (
                <Text key={`${line}-${index}`} style={[styles.summaryText, index === summaryLines.length - 1 && styles.summaryTextHighlight]}>
                  {line}
                </Text>
              ))}
            </View>

            <View style={[styles.progressCard, isTablet && { padding: rs(18) }]}>
              <Text style={styles.progressTitle}>
                {t('tournament.waiting_room.players_count', {
                  current: participants.length,
                  total: currentTournament?.size || 0
                })}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progressRatio * 100))}%` }]} />
              </View>
              {hasByesWarning ? (
                <Text style={styles.warningText}>{t('tournament.waiting_room.bye_warning')}</Text>
              ) : null}
            </View>

            {currentTournament?.configuration?.visibility === 'private' && currentTournament?.invitationCode ? (
              <View style={[styles.privateCard, isTablet && { padding: rs(18) }]}>
                <Text style={styles.privateTitle}>{t('tournament.waiting_room.private_code_title')}</Text>
                <Text style={styles.privateCode}>{currentTournament.invitationCode}</Text>
              </View>
            ) : null}

            <Text style={[styles.listTitle, isTablet && { fontSize: rs(16) }]}>
              {t('tournament.waiting_room.section_players')}
            </Text>
          </View>
        )}
        ListFooterComponent={(
          <View style={[
            styles.footer,
            isTablet && { width: contentWidth, alignSelf: 'center' },
          ]}>
            {isCreator ? (
              <>
                <Text style={styles.creatorNote}>
                  {t('tournament.waiting_room.auto_start_hint', { size: currentTournament?.size || 0 })}
                </Text>
                <Button
                  title={isStarting ? t('tournament.waiting_room.btn_launching') : t('tournament.waiting_room.btn_start_now')}
                  onPress={handleStart}
                  disabled={!canStartNow || isStarting}
                  style={styles.primaryButton}
                />
              </>
            ) : null}
            <Button
              title={isLeaving ? t('tournament.waiting_room.btn_leaving') : t('tournament.waiting_room.btn_quit')}
              onPress={handleLeave}
              tone="ghost"
              style={styles.secondaryButton}
            />
          </View>
        )}
      />

      <TournamentInviteModal
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        tournamentId={currentTournament?._id}
        tournamentName={currentTournament?.name}
        invitationCode={currentTournament?.invitationCode}
        entryFee={currentTournament?.entryFee || 0}
        size={currentTournament?.size || 4}
      />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  backButton: {
    marginRight: 12,
  },
  tournamentName: {
    ...TY.heading,
    fontSize: 22,
    color: '#F4B41A',
  },
  subtitle: {
    color: T.textDim,
    fontSize: 12,
    marginTop: 4,
  },
  creatorNote: {
    color: '#A8B4C9',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#0D1526',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F4B41A',
    padding: 16,
    marginBottom: 14,
  },
  summaryText: {
    color: '#ECE6D6',
    fontSize: 14,
    marginBottom: 6,
  },
  summaryTextHighlight: {
    color: '#F4B41A',
    fontWeight: '800',
  },
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.borderSoft,
    padding: 14,
    marginBottom: 14,
  },
  progressTitle: {
    color: '#ECE6D6',
    fontWeight: '700',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#F4B41A',
  },
  warningText: {
    color: '#A8B4C9',
    fontSize: 12,
    marginTop: 10,
  },
  privateCard: {
    backgroundColor: '#ECE6D6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  privateTitle: {
    color: '#060B17',
    fontWeight: '900',
    marginBottom: 8,
  },
  privateCode: {
    color: '#060B17',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: 4,
  },
  listTitle: {
    ...TY.label,
    marginBottom: 10,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.borderSoft,
    padding: 12,
    marginBottom: 10,
  },
  playerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg3,
    marginRight: 12,
  },
  playerAvatarText: {
    color: '#F4B41A',
    fontWeight: '900',
  },
  playerMeta: {
    flex: 1,
  },
  playerName: {
    color: '#ECE6D6',
    fontWeight: '700',
    fontSize: 14,
  },
  playerRank: {
    color: '#A8B4C9',
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    height: 48,
  },
  secondaryButton: {
    height: 46,
  },
  btnInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F4B41A',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  btnInviteText: {
    fontFamily: 'BarlowCondensed-Bold',
    fontSize: 15,
    color: '#060B17',
  },
});

export default TournamentWaitingRoomScreen;
