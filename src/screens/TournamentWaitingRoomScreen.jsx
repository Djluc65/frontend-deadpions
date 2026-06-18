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
import QRCode from 'react-native-qrcode-svg';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { T, TY } from '../utils/theme';
import Button from '../components/common/Button';
import { appAlert } from '../services/appAlert';
import { socket } from '../utils/socket';
import { setTournament, updateTournament, resetTournament } from '../redux/slices/tournamentSlice';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
import {
  buildTournamentSummaryLines,
  isTournamentStartNowAvailable,
} from '../utils/tournamentConfig';

const TournamentWaitingRoomScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const cleanupRef = useRef([]);
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const activeTournament = useSelector((state) => state.tournament.activeTournament);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const tournamentId = route?.params?.tournamentId || activeTournament?._id;
  const { leaveTournament, startTournamentNow } = useTournamentSocket();

  const { data: tournament, refetch } = useQuery({
    queryKey: ['tournament', tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Tournoi introuvable');
      }
      return payload;
    }
  });

  useEffect(() => {
    if (tournament?._id) {
      dispatch(setTournament(tournament));
      socket.emit('join_user_room', user?._id || user?.id);
      socket.emit('join_tournament_room', { tournamentId: tournament._id });
      socket.emit('join_waiting_room', { tournamentId: tournament._id });
    }

    return () => {
      if (tournament?._id) {
        socket.emit('leave_waiting_room', { tournamentId: tournament._id });
        socket.emit('leave_tournament_room', { tournamentId: tournament._id });
      }
    };
  }, [dispatch, tournament, user?._id, user?.id]);

  useEffect(() => {
    const registerListeners = () => {
      const handlePlayerJoined = (payload = {}) => {
        if (payload.tournamentId !== tournamentId) return;
        setIsStarting(false);
        if (Array.isArray(payload.participants) && activeTournament) {
          dispatch(updateTournament({ ...activeTournament, participants: payload.participants }));
        }
        refetch();
      };

      const handlePlayerLeft = (payload = {}) => {
        if (payload.tournamentId !== tournamentId) return;
        setIsLeaving(false);
        if (Array.isArray(payload.participants) && activeTournament) {
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
        if (payload.tournamentId && payload.tournamentId !== tournamentId) return;
        setIsLeaving(false);
        dispatch(resetTournament());
        appAlert('Tournoi', 'Le tournoi a ete annule.');
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
        appAlert('Tournoi', typeof message === 'string' ? message : 'Action impossible');
      };

      socket.on('tournament_player_joined', handlePlayerJoined);
      socket.on('tournament_player_left', handlePlayerLeft);
      socket.on('tournament_started', handleStarted);
      socket.on('tournament_cancelled', handleCancelled);
      socket.on('tournament_left', handleLeft);
      socket.on('tournament_error', handleError);

      const cleanup = () => {
        socket.off('tournament_player_joined', handlePlayerJoined);
        socket.off('tournament_player_left', handlePlayerLeft);
        socket.off('tournament_started', handleStarted);
        socket.off('tournament_cancelled', handleCancelled);
        socket.off('tournament_left', handleLeft);
        socket.off('tournament_error', handleError);
      };

      cleanupRef.current.push(cleanup);
      const timeoutId = setTimeout(cleanup, 15000);
      cleanupRef.current.push(() => clearTimeout(timeoutId));
    };

    registerListeners();
    const renewId = setInterval(() => {
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
      registerListeners();
    }, 14000);
    cleanupRef.current.push(() => clearInterval(renewId));

    return () => {
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
    };
  }, [activeTournament, dispatch, navigation, refetch, tournament, tournamentId]);

  const currentTournament = tournament || activeTournament;
  const participants = Array.isArray(currentTournament?.participants) ? currentTournament.participants : [];
  const isCreator = String(currentTournament?.creatorId?._id || currentTournament?.creatorId) === String(user?._id || user?.id);
  const canStartNow = isCreator && isTournamentStartNowAvailable(participants.length);
  const hasByesWarning = participants.length < (currentTournament?.size || 0) && canStartNow;
  const summaryLines = useMemo(
    () => buildTournamentSummaryLines({
      size: currentTournament?.size,
      entryFee: currentTournament?.entryFee,
      ...(currentTournament?.configuration || {})
    }),
    [currentTournament]
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
      'Quitter la salle d\'attente ?',
      'Le tournoi continuera sans vous dans la salle. Vous recevrez une notification dès qu\'il sera complet et lancé.',
      [
        { text: 'Rester', style: 'cancel' },
        {
          text: 'Quitter',
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
      <View style={styles.playerRow}>
        <View style={styles.playerAvatar}>
          <Text style={styles.playerAvatarText}>{String(item?.pseudo || '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.playerMeta}>
          <Text style={styles.playerName}>{item?.pseudo || 'Joueur'}</Text>
          <Text style={styles.playerRank}>{rank}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.tournamentName}>{currentTournament?.name || 'Tournoi'}</Text>
          <Text style={styles.subtitle}>{currentTournament?.size || 0} joueurs attendus</Text>
        </View>
      </View>

      <FlatList
        data={participants}
        keyExtractor={(item, index) => String(item?._id || item?.id || index)}
        renderItem={renderPlayer}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <View>
            <View style={styles.summaryCard}>
              {summaryLines.map((line, index) => (
                <Text key={`${line}-${index}`} style={[styles.summaryText, index === summaryLines.length - 1 && styles.summaryTextHighlight]}>
                  {line}
                </Text>
              ))}
            </View>

            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>{participants.length} / {currentTournament?.size || 0} joueurs</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progressRatio * 100))}%` }]} />
              </View>
              {hasByesWarning ? (
                <Text style={styles.warningText}>Bracket incomplet : les places vides seront des BYE automatiques.</Text>
              ) : null}
            </View>

            {currentTournament?.configuration?.visibility === 'private' && currentTournament?.invitationCode ? (
              <View style={styles.privateCard}>
                <Text style={styles.privateTitle}>Code prive : {currentTournament.invitationCode}</Text>
                <View style={styles.qrWrap}>
                  <QRCode
                    value={`deadpions://tournament/${currentTournament._id}?code=${currentTournament.invitationCode}`}
                    size={132}
                    color="#060B17"
                    backgroundColor="#ECE6D6"
                  />
                </View>
              </View>
            ) : null}

            <Text style={styles.listTitle}>Joueurs inscrits</Text>
          </View>
        )}
        ListFooterComponent={(
          <View style={styles.footer}>
            {isCreator ? (
              <>
                <Text style={styles.creatorNote}>
                  ℹ️ Le tournoi démarrera automatiquement dès que {currentTournament?.size || 0} joueurs seront inscrits.
                </Text>
                <Button
                  title={isStarting ? 'Lancement...' : 'Lancer maintenant'}
                  onPress={handleStart}
                  disabled={!canStartNow || isStarting}
                  style={styles.primaryButton}
                />
              </>
            ) : null}
            <Button
              title={isLeaving ? 'Sortie...' : 'Quitter'}
              onPress={handleLeave}
              tone="ghost"
              style={styles.secondaryButton}
            />
          </View>
        )}
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
    marginBottom: 12,
  },
  qrWrap: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ECE6D6',
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
});

export default TournamentWaitingRoomScreen;
