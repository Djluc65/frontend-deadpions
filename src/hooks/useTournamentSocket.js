// DeadPions — useTournamentSocket.js — créé le 2026-06-08
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socket } from '../utils/socket';
import { 
  setTournament, 
  updateTournament,
  updateBracket, 
  setTournamentStatus, 
  resetTournament,
} from '../redux/slices/tournamentSlice';
import { appAlert } from '../services/appAlert';

export const useTournamentSocket = () => {
  const dispatch = useDispatch();
  const cleanupRef = useRef([]);
  const user = useSelector(state => state.auth.user);
  const activeTournament = useSelector(state => state.tournament.activeTournament);
  const userId = user?._id || user?.id || null;

  useEffect(() => {
    const registerListeners = () => {
      const handleTournamentStarted = (payload = {}) => {
        const nextTournament = payload.tournament || {
          ...activeTournament,
          _id: payload.tournamentId || activeTournament?._id,
          status: 'in_progress',
          bracket: payload.bracket,
          currentRound: payload.currentRound
        };

        dispatch(setTournament(nextTournament));
        dispatch(updateBracket({
          bracket: nextTournament.bracket || payload.bracket || [],
          currentRound: nextTournament.currentRound || payload.currentRound || 1
        }));
        dispatch(setTournamentStatus('in_progress'));
      };

      const handleRoundUpdate = (payload = {}) => {
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

      const handleTournamentFinished = (payload = {}) => {
        if (payload.tournament) {
          dispatch(updateTournament(payload.tournament));
        }
        if (Array.isArray(payload.bracket)) {
          dispatch(updateBracket({ bracket: payload.bracket }));
        }
        dispatch(setTournamentStatus('finished'));

        const isWinner = user && (String(user.id || user._id) === String(payload.winnerId));
        if (isWinner) {
          appAlert('Tournoi termine', `Vous remportez ${payload.prize || 0} coins.`);
        }
      };

      const handlePlayerJoined = (payload = {}) => {
        if (payload.tournament) {
          dispatch(updateTournament(payload.tournament));
          return;
        }
        if (Array.isArray(payload.participants) && activeTournament) {
          dispatch(updateTournament({
            ...activeTournament,
            participants: payload.participants
          }));
        }
      };

      const handlePlayerLeft = (payload = {}) => {
        if (Array.isArray(payload.participants) && activeTournament) {
          dispatch(updateTournament({
            ...activeTournament,
            participants: payload.participants
          }));
        }
      };

      const handleTournamentCancelled = () => {
        dispatch(resetTournament());
        appAlert('Tournoi annule', 'Le tournoi a ete annule.');
      };

      socket.on('tournament_started', handleTournamentStarted);
      socket.on('tournament_round_update', handleRoundUpdate);
      socket.on('tournament_bracket_update', handleBracketUpdate);
      socket.on('tournament_finished', handleTournamentFinished);
      socket.on('tournament_player_joined', handlePlayerJoined);
      socket.on('tournament_player_left', handlePlayerLeft);
      socket.on('tournament_cancelled', handleTournamentCancelled);

      const cleanup = () => {
        socket.off('tournament_started', handleTournamentStarted);
        socket.off('tournament_round_update', handleRoundUpdate);
        socket.off('tournament_bracket_update', handleBracketUpdate);
        socket.off('tournament_finished', handleTournamentFinished);
        socket.off('tournament_player_joined', handlePlayerJoined);
        socket.off('tournament_player_left', handlePlayerLeft);
        socket.off('tournament_cancelled', handleTournamentCancelled);
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
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
      registerListeners();
    }, 14000);
    cleanupRef.current.push(() => clearInterval(renewId));

    return () => {
      cleanup();
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
    };
  }, [dispatch, user, activeTournament]);

  return {
    createTournament: (config) => {
      if (!socket.connected) socket.connect();
      if (userId) socket.emit('join_user_room', userId);
      socket.emit('create_tournament', config);
    },
    joinTournament: (tournamentId, invitationCode) => {
      if (!socket.connected) socket.connect();
      if (userId) socket.emit('join_user_room', userId);
      socket.emit('join_tournament', { tournamentId, invitationCode });
    },
    leaveTournament: (tournamentId) => {
      if (!socket.connected) socket.connect();
      if (userId) socket.emit('join_user_room', userId);
      socket.emit('leave_tournament', { tournamentId });
    },
    startTournamentNow: (tournamentId) => {
      if (!socket.connected) socket.connect();
      if (userId) socket.emit('join_user_room', userId);
      socket.emit('start_tournament_now', { tournamentId });
    },
    markTournamentMatchPresence: (tournamentId, matchId) => {
      if (!socket.connected) socket.connect();
      socket.emit('tournament_match_presence', { tournamentId, matchId });
    },
    leaveTournamentRoom: (tournamentId) => {
      if (!socket.connected) socket.connect();
      socket.emit('leave_tournament_room', { tournamentId });
    },
    reportTournamentMatchResult: (tournamentId, matchId, winnerId) => {
      if (!socket.connected) socket.connect();
      socket.emit('tournament_match_result', { tournamentId, matchId, winnerId });
    }
  };
};
