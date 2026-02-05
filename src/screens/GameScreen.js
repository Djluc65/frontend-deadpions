import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Dimensions, Alert, ScrollView, Animated, Image, Modal, Keyboard, Platform, Share, ActivityIndicator, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useSelector, useDispatch } from 'react-redux';
import Svg, { Line, Circle, Text as SvgText, Rect, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { API_URL } from '../config';
import { calculerCoupIA } from '../utils/IAEngine';
import { socket } from '../utils/socket';
import { updateUser } from '../redux/slices/authSlice';
import { setPlayers, updatePlayerCoins, setSpectators } from '../redux/slices/gameSlice';
import { toggleSound } from '../redux/slices/settingsSlice';
import { AudioController } from '../utils/AudioController';
import ProfilIA from './ProfilIA';
import ChatEnLigne from '../components/ChatEnLigne';
import VoiceChat from '../components/VoiceChat';
import LiveChatOverlay from '../components/LiveChatOverlay';
import CoinsFeedback from '../components/CoinsFeedback';
import PlayerProfileCard from '../components/PlayerProfileCard';

const { width, height } = Dimensions.get('window');

// Configuration du plateau
const COLS = 18; // A à R
const ROWS = 28; // 1 à 28
const PADDING_LEFT = 35; // Espace pour les numéros
const PADDING_TOP = 35; // Espace pour les lettres
const PADDING_RIGHT = 35;
const PADDING_BOTTOM = 150;

// Calcul de la taille des cellules pour tenir en largeur
const AVAILABLE_WIDTH = width - PADDING_LEFT - PADDING_RIGHT;
const CELL_SIZE = AVAILABLE_WIDTH / (COLS - 1);

const BOARD_WIDTH = width;
const BOARD_HEIGHT = PADDING_TOP + (ROWS - 1) * CELL_SIZE + PADDING_BOTTOM;

const LETTERS = 'ABCDEFGHIJKLMNOPQR'.split('');

const GradientArrow = ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
            <LinearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#ffee00ff" stopOpacity="1" />
                <Stop offset="1" stopColor="#848484ff" stopOpacity="1" />
            </LinearGradient>
        </Defs>
        <Path
            d="M35,0 L65,0 L65,55 L90,55 L50,100 L10,55 L35,55 Z"
            fill="url(#arrowGrad)"
            stroke="black"
            strokeWidth="3"
            strokeLinejoin="round"
        />
    </Svg>
);

const formatTemps = (seconds) => {
    if (seconds === null || seconds === undefined) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const getCouleurChrono = (tempsRestant, tempsTotal) => {
    if (!tempsTotal) return '#10b981'; // Vert par défaut
    const ratio = tempsRestant / tempsTotal;
    if (ratio > 0.5) return '#10b981'; // Vert
    if (ratio > 0.2) return '#f59e0b'; // Orange
    return '#ef4444'; // Rouge
};

const GameScreen = ({ navigation, route }) => {
  const params = route.params || {};
  const configIA = params.configIA || {};
  const localConfig = params.localConfig || {};
  
  // Détection robuste du mode
  let mode = params.mode || params.modeJeu || 'local'; // 'online', 'ai', 'friend'
  if (mode === 'ia') mode = 'ai';
  
  // Force le mode IA si une configuration IA est présente
  if (Object.keys(configIA).length > 0) {
      mode = 'ai';
  }
  
  // Force le mode Local si une configuration Local est présente
  if (Object.keys(localConfig).length > 0) {
      mode = 'local';
  }

  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { players: reduxPlayers, spectators: reduxSpectators } = useSelector(state => state.game);

  const getPlayerId = (p) => p?._id || p?.id;
  const currentUserId = getPlayerId(user);

  // Local state for players and timeControl to avoid setParams issues
  const [playersData, setPlayersData] = useState(params.players || {});
  const [timeControlSetting, setTimeControlSetting] = useState(params.timeControl || configIA?.timeControl || localConfig?.timeControl);

  const playersDataRef = useRef(playersData);
  const timeControlSettingRef = useRef(timeControlSetting);
  const userRef = useRef(user);
  
  useEffect(() => {
      playersDataRef.current = playersData;
      timeControlSettingRef.current = timeControlSetting;
      userRef.current = user;
  }, [playersData, timeControlSetting, user]);

  // Check if current user is the White player in Live/Custom modes
  // This allows us to swap positions so the local player is always on the Left (Player 1 slot)
  const isLocalPlayerWhite = (mode === 'live' || mode === 'online_custom') && 
                             playersData?.white && 
                             getPlayerId(playersData.white)?.toString() === currentUserId?.toString();

  // State for opponent coins (to allow real-time updates)
  const [opponentCoins, setOpponentCoins] = useState(
      mode === 'online' ? route.params?.opponent?.coins : 
      ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.white?.coins : playersData?.black?.coins
  );

  // Define players early to avoid ReferenceError in useEffect
  const player1 = {
    id: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? getPlayerId(playersData?.black) : currentUserId,
    pseudo: mode === 'local' ? 'Joueur 1' : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.black?.pseudo : (user?.pseudo || 'Joueur 1'),
    avatar: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.black?.avatar : user?.avatar,
    country: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.black?.country : user?.country,
    coins: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.black?.coins : ((mode === 'online_custom' || mode === 'live') && isLocalPlayerWhite ? playersData?.white?.coins : user?.coins),
    level: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? (playersData?.black?.niveau || playersData?.black?.level) : (user?.niveau || user?.level),
    color: mode === 'ai' 
      ? configIA.couleurs.joueur 
      : mode === 'local'
      ? (localConfig.player1Color || 'black')
      : mode === 'online' 
      ? (getPlayerId(playersData?.black)?.toString() === currentUserId?.toString() ? 'black' : 'white')
      : (mode === 'spectator' || mode === 'online_custom' || mode === 'live') ? (isLocalPlayerWhite ? 'white' : 'black') : 'black'
  };

  const player2 = {
    id: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? getPlayerId(playersData?.white) : (mode === 'online' ? getPlayerId(route.params?.opponent) : getPlayerId(playersData?.black)),
    pseudo: mode === 'ai' ? 'IA' : mode === 'local' ? 'Joueur 2' : mode === 'online' ? (route.params?.opponent?.pseudo || 'Adversaire') : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? (playersData?.white?.pseudo || 'En attente...') : (playersData?.black?.pseudo || 'Joueur 2'),
    avatar: mode === 'online' ? route.params?.opponent?.avatar : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.white?.avatar : playersData?.black?.avatar,
    country: mode === 'online' ? route.params?.opponent?.country : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.white?.country : playersData?.black?.country,
    coins: opponentCoins ?? (mode === 'online' ? route.params?.opponent?.coins : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.white?.coins : playersData?.black?.coins),
    level: mode === 'online' ? (route.params?.opponent?.niveau || route.params?.opponent?.level) : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? (playersData?.white?.niveau || playersData?.white?.level) : (playersData?.black?.niveau || playersData?.black?.level),
    color: mode === 'ai' 
      ? configIA.couleurs.ia 
      : mode === 'local'
      ? (localConfig.player2Color || 'white')
      : mode === 'online'
        ? (getPlayerId(playersData?.black)?.toString() === currentUserId?.toString() ? 'white' : 'black')
        : (mode === 'spectator' || mode === 'online_custom' || mode === 'live') ? (isLocalPlayerWhite ? 'black' : 'white') : 'white'
  };

  // Disable swipe back on iOS to prevent accidental exit
  useEffect(() => {
    navigation.setOptions({
        gestureEnabled: false,
    });
  }, [navigation]);

  // Sync Redux user coins with game params if available (fixes initial display after bet)
  useEffect(() => {
    if ((mode === 'online' || mode === 'online_custom' || mode === 'live') && params.players) {
        const myId = user?._id || user?.id;
        let myGameCoins = null;
        
        // Find my coins in params.players
        if (getPlayerId(params.players.black)?.toString() === myId?.toString()) {
            myGameCoins = params.players.black.coins;
        } else if (getPlayerId(params.players.white)?.toString() === myId?.toString()) {
            myGameCoins = params.players.white.coins;
        }

        // If found and different from current user coins, update Redux
        if (myGameCoins !== null && myGameCoins !== undefined && user?.coins !== myGameCoins) {
            console.log(`[GameScreen] Syncing initial coins from params: ${user?.coins} -> ${myGameCoins}`);
            dispatch(updateUser({ coins: myGameCoins }));
        }
    }
  }, [params.players, user?.coins, mode]);

    // EFFET : Déduction de la mise pour le mode IA
    useEffect(() => {
        if ((mode === 'ai' || mode === 'ia') && params.betAmount > 0) {
            // Déduire la mise au début de la partie
            dispatch(updateUser({ coins: user.coins - params.betAmount }));
        }
    }, []);

  // Initialize Redux game state
  useEffect(() => {
      dispatch(setPlayers({
          me: {
              id: player1.id,
              pseudo: player1.pseudo,
              avatar: player1.avatar,
              coins: player1.coins,
          },
          opponent: {
              id: player2.id,
              pseudo: player2.pseudo,
              avatar: player2.avatar,
              coins: player2.coins,
          }
      }));
  }, [player1.id, player1.coins, player2.id, player2.coins]);

  const token = useSelector(state => state.auth.token);
  const { isSoundEnabled, isMusicEnabled } = useSelector(state => state.settings || {});
  const [board, setBoard] = useState([]); // Array of { row, col, player }
  
  // Pre-selection state
  const [selectedCell, setSelectedCell] = useState(null); // { row, col }

  // Clear selection when turn changes or game ends
  useEffect(() => {
      setSelectedCell(null);
  }, [currentPlayer, gameOver, mode]);
  
  // Modal state for player profile
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'chat', 'emoji', null
  const [chatMessages, setChatMessages] = useState([]);
  const [bubbles, setBubbles] = useState({ player1: null, player2: null });
  const [rematchRequested, setRematchRequested] = useState(false);
  const isRematching = useRef(false);

  useEffect(() => {
    if (bubbles.player1) {
        const timer = setTimeout(() => {
            setBubbles(prev => ({ ...prev, player1: null }));
        }, 4000);
        return () => clearTimeout(timer);
    }
  }, [bubbles.player1]);

  // Ensure socket is identified for online modes
  useEffect(() => {
    if (user && (mode === 'online' || mode === 'online_custom' || mode === 'spectator' || mode === 'live')) {
         if (!socket.connected) socket.connect();
         // Always re-identify to ensure server has userId in socket.data
         socket.emit('join_user_room', user._id);
         
         // Rejoin game room if we have a gameId
         if (params.gameId && mode !== 'spectator' && mode !== 'live') {
             console.log('Attempting to rejoin game room:', params.gameId);
             socket.emit('join_custom_game', { gameId: params.gameId });
         }
    }
  }, [user, mode, params.gameId]);

  useEffect(() => {
      if (bubbles.player2) {
          const timer = setTimeout(() => {
              setBubbles(prev => ({ ...prev, player2: null }));
          }, 4000);
          return () => clearTimeout(timer);
      }
  }, [bubbles.player2]);
  
  // Keyboard handling for chat modal
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [feedback, setFeedback] = useState({ visible: false, amount: 0 });

  useEffect(() => {
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(keyboardShowEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardHideListener = Keyboard.addListener(keyboardHideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Timer state for online mode
  const timeControl = timeControlSetting; // Seconds or null
  const [timeLeft, setTimeLeft] = useState(timeControl);
  const [timeouts, setTimeouts] = useState({ black: 0, white: 0 });

  // Timer countdown effect
  useEffect(() => {
      const validModes = ['online', 'live', 'spectator', 'ai', 'local'];
      if (!validModes.includes(mode) || !timeControl || gameOver || (!playersData?.white && mode !== 'ai' && mode !== 'local') || waitingForNextRound || !currentPlayer) return;
      
      const interval = setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  if (mode === 'ai' || mode === 'local') {
                      // Logic for Local mode timeouts
                      if (mode === 'local') {
                          const currentTimeoutCount = timeouts[currentPlayer] || 0;
                          
                          if (currentTimeoutCount + 1 >= 5) {
                                setGameOver(true);
                                AudioController.playVictorySound(isSoundEnabled);
                                setTimeout(() => {
                                   let newScore = { ...tournamentScore };
                                   let isTournament = localConfig.mode === 'tournament' || (initialTournamentSettings && initialTournamentSettings.totalGames > 1);
                                   let tournamentOver = false;
                                   let nextGameNumber = tournamentGameNumber;
                                   
                                   const winnerColor = currentPlayer === 'black' ? 'white' : 'black';

                                   if (isTournament) {
                                        newScore[winnerColor] += 1;
                                        setTournamentScore(newScore);
                                        
                                        if (tournamentGameNumber >= tournamentTotalGames) {
                                            tournamentOver = true;
                                        } else {
                                             const blackScore = newScore.black;
                                             const whiteScore = newScore.white;
                                             const remainingGames = tournamentTotalGames - tournamentGameNumber;
                                             
                                             if (Math.abs(blackScore - whiteScore) > remainingGames) {
                                                 tournamentOver = true;
                                             }
                                        }
                                        
                                        if (!tournamentOver) {
                                            nextGameNumber += 1;
                                        }
                                   }

                                   let nextStartingPlayer = localConfig.startingPlayer || 'black';
                                   if (isTournament && !tournamentOver) {
                                       nextStartingPlayer = (localConfig.startingPlayer || 'black') === 'black' ? 'white' : 'black';
                                   }

                                   const nextLocalConfig = {
                                       ...localConfig,
                                       startingPlayer: nextStartingPlayer,
                                       tournamentSettings: isTournament ? {
                                           totalGames: tournamentTotalGames,
                                           gameNumber: tournamentOver ? 1 : nextGameNumber,
                                           score: tournamentOver ? { black: 0, white: 0 } : newScore
                                       } : null
                                   };

                                   setResultData({
                                       victoire: true,
                                       winnerColor: winnerColor,
                                       type: 'local',
                                       reason: 'timeout',
                                       localConfig: nextLocalConfig,
                                       isTournament,
                                       tournamentScore: newScore,
                                       tournamentOver,
                                       gameNumber: tournamentGameNumber,
                                       totalGames: tournamentTotalGames
                                   });
                                   setShowResultModal(true);
                               }, 500);
                               return 0;
                          } else {
                              setTimeouts(prev => ({ ...prev, [currentPlayer]: currentTimeoutCount + 1 }));
                          }
                      }

                      // AI Mode Auto-Play (Time out) & Local Mode Random Move
                      const move = calculerCoupIA(board, currentPlayer, 'facile');
                      if (move) {
                          handlePress(move.row, move.col);
                      }
                  } else {
                      // Trigger Auto-Play if it's my turn
                      const myColor = getPlayerId(playersData?.black)?.toString() === currentUserId?.toString() ? 'black' : 'white';
                      if (currentPlayer === myColor && prev === 1) {
                           const aiMove = calculerCoupIA(board, myColor, 'difficile');
                           if (aiMove) {
                               socket.emit('make_move', {
                                   gameId: params.gameId,
                                   userId: user._id,
                                   player: myColor,
                                   row: aiMove.row,
                                   col: aiMove.col,
                                   isAutoPlay: true
                               });
                           }
                      }
                  }
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      
      return () => clearInterval(interval);
  }, [mode, timeControl, gameOver, currentPlayer, board, params.gameId, user._id, playersData, waitingForNextRound, configIA, timeouts, isSoundEnabled]);

  // Determine initial player
  const getInitialPlayer = () => {
    if (params.currentTurn) return params.currentTurn;
    if (mode === 'ai') {
        if (configIA.premierJoueur === 'ia') {
            return configIA.couleurs.ia;
        } else {
            return configIA.couleurs.joueur;
        }
    }
    if (mode === 'local') {
        return localConfig.startingPlayer || 'black';
    }
    return 'black'; // Standard Gomoku rule: black starts
  };

  const [currentPlayer, setCurrentPlayer] = useState(getInitialPlayer());
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [statsIA, setStatsIA] = useState(null);
  
  // Nouveaux états pour l'IA
  const [iaEnReflexion, setIaEnReflexion] = useState(false);
  const [messageIA, setMessageIA] = useState('');
  const [dernierCoupIA, setDernierCoupIA] = useState(null);
  const [gameOver, setGameOver] = useState(false);

  // Tournament State
  const initialTournamentSettings = params.tournamentSettings || configIA.tournamentSettings || localConfig.tournamentSettings || {};
  const [tournamentScore, setTournamentScore] = useState(initialTournamentSettings.score || { black: 0, white: 0 });
  const [tournamentGameNumber, setTournamentGameNumber] = useState(initialTournamentSettings.gameNumber || 1);
  const [tournamentTotalGames, setTournamentTotalGames] = useState(initialTournamentSettings.totalGames || 1);
  const [waitingForNextRound, setWaitingForNextRound] = useState(false);

  // Use ref to access latest params in socket listeners without re-binding
  const paramsRef = useRef(params);
  useEffect(() => {
      paramsRef.current = params;
  }, [params]);

  // --- ONLINE MODE LOGIC ---
  useEffect(() => {
    if (mode !== 'online' && mode !== 'spectator' && mode !== 'online_custom' && mode !== 'live') return;

    if (mode === 'spectator' && params.gameId) {
        socket.emit('join_spectator', { gameId: params.gameId });
    } else if (mode === 'live' && params.gameId) {
        socket.emit('join_live_room', { gameId: params.gameId });
    }

    const handleSpectatorJoined = (data) => {
        setBoard(data.board || []);
        setCurrentPlayer(data.currentTurn);
        if (data.moves && data.moves.length > 0) {
            setDernierCoupIA(data.moves[data.moves.length - 1]);
        }
        if (data.winner) {
            setWinner(data.winner);
            setGameOver(true);
        }
        if (data.players && JSON.stringify(data.players) !== JSON.stringify(playersDataRef.current)) {
            setPlayersData(data.players);
        }
        if (data.timeControl && data.timeControl !== timeControlSettingRef.current) {
            setTimeControlSetting(data.timeControl);
            setTimeLeft(data.timeControl);
        }
        if (data.timeouts) {
            setTimeouts(data.timeouts);
        }
    };

    const handleGameStart = (data) => {
        console.log('Game start received in GameScreen:', data);

        if (data.gameId && data.gameId !== params.gameId) {
             console.log('New Game ID detected, reloading screen...');
             navigation.replace('Game', {
                 ...params, 
                 gameId: data.gameId,
                 players: data.players,
                 betAmount: data.betAmount,
                 timeControl: data.timeControl,
                 tournamentSettings: data.tournamentSettings,
                 currentTurn: data.currentTurn
             });
             return;
        }

        if (data.players && JSON.stringify(data.players) !== JSON.stringify(playersDataRef.current)) {
            setPlayersData(data.players);
        }
        if (data.currentTurn) {
            setCurrentPlayer(data.currentTurn);
        }
        if (data.board) {
             setBoard(data.board);
        }
        if (data.timeControl && data.timeControl !== timeControlSettingRef.current) {
             setTimeControlSetting(data.timeControl);
             setTimeLeft(data.timeControl);
        }
        if (data.tournamentSettings) {
            setTournamentScore(data.tournamentSettings.score);
            setTournamentGameNumber(data.tournamentSettings.gameNumber);
            setTournamentTotalGames(data.tournamentSettings.totalGames);
        }
        
        setGameOver(false);
        setWinner(null);
        setShowResultModal(false);
        setWaitingForNextRound(false);
    };

    const handleMoveMade = (data) => {
      const { row, col, player, nextTurn, newAutoPlayCount } = data;
      
      setBoard(prev => {
        if (prev.some(m => m.row === row && m.col === col)) return prev;
        return [...prev, { row, col, player }];
      });
      
      setCurrentPlayer(nextTurn);
      if (timeControl) setTimeLeft(timeControl);

      if (newAutoPlayCount !== undefined) {
          setTimeouts(prev => ({ ...prev, [player]: newAutoPlayCount }));
      }

      playSound(player);
    };

    const handleGameOver = (data) => {
      setGameOver(true);
      setWaitingForNextRound(false);
      if (data.winner) setWinner(data.winner);
      
      if (data.updatedCoins) {
          const myId = user?._id || user?.id;
          const opponentId = player2.id;

          if (data.updatedCoins[myId] !== undefined) {
             dispatch(updateUser({ coins: data.updatedCoins[myId] }));
          }
          if (data.updatedCoins[opponentId] !== undefined) {
             setOpponentCoins(data.updatedCoins[opponentId]);
          }
          
          Object.entries(data.updatedCoins).forEach(([playerId, coins]) => {
              dispatch(updatePlayerCoins({ playerId, coins }));
          });
      }

      if (data.reason !== 'timeout' && data.reason !== 'resign') {
        AudioController.playVictorySound(isSoundEnabled);
      }

      const isWinner = data.winnerId?.toString() === (user?._id || user?.id).toString();
      
      if (isWinner && data.gains > 0) {
          setFeedback({ visible: true, amount: data.gains });
      }

      setTimeout(() => {
        setResultData({
            victoire: isWinner,
            gains: data.gains || 0,
            montantPari: params.betAmount || 0,
            adversaire: params.opponent,
            raisonVictoire: isWinner && data.reason === 'timeout' ? 'timeout_adverse' : null,
            raisonDefaite: !isWinner && data.reason === 'timeout' ? 'timeout' : null,
            timeouts: data.timeouts,
            type: mode,
            isTournament: !!params.tournamentSettings
        });
        setShowResultModal(true);
      }, 1500);
    };

    const handleOpponentDisconnected = () => {
       setGameOver(true);
       setWaitingForNextRound(false);
       setResultData({
         victoire: true,
         gains: (params.betAmount || 0) * 0.9,
         montantPari: params.betAmount || 0,
         adversaire: params.opponent,
         raisonVictoire: 'disconnect',
         type: mode
       });
       setShowResultModal(true);
    };

    const handleBalanceUpdated = (newBalance) => {
      dispatch(updateUser({ coins: newBalance }));
    };

    const handleMessageTexte = (data) => {
        const msgId = data.id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        const nouveauMessage = {
            id: msgId,
            type: 'texte',
            auteur: data.senderPseudo || params.opponent?.pseudo || 'Adversaire',
            estMoi: false,
            contenu: data.message,
            timestamp: new Date()
        };
        
        setChatMessages(prev => {
            if (prev.some(msg => msg.id === msgId)) return prev;
            return [...prev, nouveauMessage];
        });

        if (mode === 'spectator' || mode === 'live') {
            if (data.senderId === player1.id) {
                setBubbles(prev => ({ ...prev, player1: { content: data.message, type: 'text' } }));
            } else if (data.senderId === player2.id) {
                setBubbles(prev => ({ ...prev, player2: { content: data.message, type: 'text' } }));
            }
        } else {
            setBubbles(prev => ({ ...prev, player2: { content: data.message, type: 'text' } }));
        }
    };

    const handleMessageEmoji = (data) => {
        const msgId = data.id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        const nouveauMessage = {
            id: msgId,
            type: 'emoji',
            auteur: data.senderPseudo || params.opponent?.pseudo || 'Adversaire',
            estMoi: false,
            contenu: data.emoji,
            timestamp: new Date()
        };
        
        setChatMessages(prev => {
            if (prev.some(msg => msg.id === msgId)) return prev;
            return [...prev, nouveauMessage];
        });

        if (mode === 'spectator' || mode === 'live') {
            if (data.senderId === player1.id) {
                setBubbles(prev => ({ ...prev, player1: { content: data.emoji, type: 'emoji' } }));
            } else if (data.senderId === player2.id) {
                setBubbles(prev => ({ ...prev, player2: { content: data.emoji, type: 'emoji' } }));
            }
        } else {
            setBubbles(prev => ({ ...prev, player2: { content: data.emoji, type: 'emoji' } }));
        }
    };

    const handleRoundOver = (data) => {
        setTimeout(() => {
             Alert.alert(
                `Match ${data.nextGameNumber - 1} terminé`,
                `${data.winner === 'black' ? (params.players?.black?.pseudo || 'Joueur 1') : (params.players?.white?.pseudo || 'Joueur 2')} gagne ! \nScore: ${data.score.black} - ${data.score.white}`,
                [
                    { 
                        text: "Match Suivant", 
                        onPress: () => {
                            setBoard([]);
                            setTournamentScore(data.score);
                            setTournamentGameNumber(data.nextGameNumber);
                            setWinningLine(null);
                            setDernierCoupIA(null);
                            
                            setWaitingForNextRound(true);
                            setCurrentPlayer(null); 
                            
                            socket.emit('player_ready_next_round', {
                                gameId: params.gameId,
                                userId: user._id
                            });
                        }
                    }
                ],
                { cancelable: false }
             );
        }, 500);
    };

    const handleStartNextRound = (data) => {
        setWaitingForNextRound(false);
        setBoard([]);
        setTournamentScore(data.score);
        setTournamentGameNumber(data.nextGameNumber);
        setCurrentPlayer(data.nextTurn);
        if (data.timeControl) setTimeLeft(data.timeControl);
    };

    const handleTournamentOver = (data) => {
        setGameOver(true);
        setWaitingForNextRound(false);
        if (data.winner) setWinner(data.winner);
        
        if (data.reason !== 'timeout' && data.reason !== 'resign') {
             AudioController.playVictorySound(isSoundEnabled);
        }

        const isWinner = data.winnerId?.toString() === (user?._id || user?.id).toString();
        
        setTimeout(() => {
             setResultData({
                 victoire: isWinner,
                 gains: data.gains || 0,
                 montantPari: params.betAmount || 0,
                 adversaire: params.opponent,
                 raisonVictoire: data.reason === 'victory' ? 'tournament_win' : null,
                 raisonDefaite: data.reason === 'victory' ? 'tournament_loss' : null,
                 isTournament: true,
                 tournamentScore: data.score,
                 reason: data.reason,
                 type: mode
             });
             setShowResultModal(true);
        }, 1500);
    };

    const handleGameRejoined = (data) => {
        console.log('Game rejoined:', data);
        if (data.board) setBoard(data.board);
        if (data.currentTurn) setCurrentPlayer(data.currentTurn);
        if (data.timeControl) setTimeLeft(data.timeControl);
        if (data.players) setPlayersData(data.players);
    };

    const handleSocketError = (msg) => {
        console.log('Socket error:', msg);
        // Only show alert if it's a critical error or we are trying to play
        if (msg === 'Not your turn' || msg === 'Cell occupied') {
             // Toast or small feedback? For now Alert is fine for debugging
             // Alert.alert('Info', msg);
        } else {
             // Alert.alert('Erreur', msg);
        }
    };

    const handleLiveRoomClosed = () => {
        Alert.alert("Live terminé", "Le créateur a fermé le live.", [
            { text: "OK", onPress: () => navigation.navigate('Home') }
        ]);
    };

    const handleOpponentLeftLive = () => {
        Alert.alert(
            "Adversaire parti",
            "Votre adversaire a quitté la partie. Le live reste actif.",
            [
                { 
                    text: "Attendre un autre joueur",
                    onPress: () => {
                        if (params.roomConfig) {
                            navigation.replace('SalleAttenteLive', { configSalle: params.roomConfig });
                        } else {
                            navigation.goBack();
                        }
                    }
                },
                {
                    text: "Arrêter le live",
                    style: 'destructive',
                    onPress: () => {
                        socket.emit('stop_live_room', { gameId: params.gameId });
                        navigation.navigate('Home');
                    }
                }
            ],
            { cancelable: false }
        );
    };

    socket.on('spectator_joined', handleSpectatorJoined);
    socket.on('game_start', handleGameStart);
    socket.on('game_rejoined', handleGameRejoined);
    socket.on('move_made', handleMoveMade);
    socket.on('game_over', handleGameOver);
    socket.on('opponent_disconnected', handleOpponentDisconnected);
    socket.on('opponent_left_live', handleOpponentLeftLive);
    socket.on('live_room_closed', handleLiveRoomClosed);
    socket.on('balance_updated', handleBalanceUpdated);
    socket.on('MESSAGE_TEXTE', handleMessageTexte);
    socket.on('MESSAGE_EMOJI', handleMessageEmoji);
    socket.on('round_over', handleRoundOver);
    socket.on('start_next_round', handleStartNextRound);
    socket.on('tournament_over', handleTournamentOver);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('spectator_joined', handleSpectatorJoined);
    socket.off('game_start', handleGameStart);
    socket.off('game_rejoined', handleGameRejoined);
    socket.off('move_made', handleMoveMade);
    socket.off('game_over', handleGameOver);
    socket.off('opponent_disconnected', handleOpponentDisconnected);
    socket.off('opponent_left_live', handleOpponentLeftLive);
    socket.off('live_room_closed', handleLiveRoomClosed);
    socket.off('balance_updated', handleBalanceUpdated);
      socket.off('MESSAGE_TEXTE', handleMessageTexte);
      socket.off('MESSAGE_EMOJI', handleMessageEmoji);
      socket.off('round_over', handleRoundOver);
      socket.off('start_next_round', handleStartNextRound);
      socket.off('tournament_over', handleTournamentOver);
      socket.off('error', handleSocketError);
    };
  }, [mode, navigation, user, isSoundEnabled, player1.id, player2.id]);

  // Effect to find winning line in online mode (since server doesn't send it)
  useEffect(() => {
    if ((mode === 'online' || mode === 'live') && gameOver && winner && !winningLine) {
        const playerStones = board.filter(s => s.player === winner);
        for (let s of playerStones) {
            // checkWinner checks neighbors in board. Pass current board explicitly.
            const line = checkWinner(s.row, s.col, winner, board);
            if (line) {
                setWinningLine(line);
                break;
            }
        }
    }
  }, [mode, gameOver, winner, board, winningLine]);

  const envoyerMessageChat = (displayMsg, socketMsg) => {
      // Don't add locally, wait for server echo or add with estMoi=true
      // But for better UX, add locally
      const myMsg = { ...displayMsg, estMoi: true, auteur: 'Moi' };
      setChatMessages(prev => [...prev, myMsg]);
      
      // Attach matchId
      const msgToSend = { 
        ...socketMsg, 
        matchId: params.gameId, 
        senderId: user?._id || user?.id,
        senderPseudo: user?.pseudo || 'Spectateur',
        id: displayMsg.id // Pass the generated ID
      };
      socket.emit(socketMsg.type, msgToSend);
      
      const content = socketMsg.type === 'MESSAGE_TEXTE' ? socketMsg.message : socketMsg.emoji;
      const type = socketMsg.type === 'MESSAGE_TEXTE' ? 'text' : 'emoji';
      
      // Only show my bubble locally if I am a player (not spectator)
      if (mode !== 'spectator' && mode !== 'live') {
          setBubbles(prev => ({ ...prev, player1: { content, type } }));
      }
      setActiveModal(null);
  };



  // --- BACKGROUND MUSIC ---
  useEffect(() => {
    // Stop Home music and play Game music
    AudioController.stopHomeMusic();
    AudioController.playGameMusic(isMusicEnabled);

    return () => {
      // Stop Game music
      AudioController.stopGameMusic();
      // Only play Home music if NOT rematching
      if (!isRematching.current) {
          AudioController.playHomeMusic(isMusicEnabled);
      }
      isRematching.current = false;
    };
  }, [isMusicEnabled, params.gameId]);



  // Déterminer les noms pour l'affichage
  const joueurNoir = mode === 'ai' 
    ? (configIA.couleurs.joueur === 'black' ? 'Vous' : configIA.difficulte) 
    : 'Joueur 1';

  const joueurBlanc = mode === 'ai'
    ? (configIA.couleurs.joueur === 'white' ? 'Vous' : configIA.difficulte)
    : 'Joueur 2';

  const getAvatarSource = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return { uri: avatar };
    if (avatar.startsWith('/uploads')) {
        const baseUrl = API_URL.replace('/api', '');
        return { uri: `${baseUrl}${avatar}` };
    }
    return { uri: avatar };
  };

  const handleSendFriendRequest = async () => {
    if (!selectedProfile || !selectedProfile.id) return;
    
    try {
        const res = await fetch(`${API_URL}/friends/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ recipientId: selectedProfile.id })
        });
        
        const data = await res.json();
        if (res.ok) {
            Alert.alert("Succès", "Demande d'ami envoyée !");
            setSelectedProfile(null);
        } else {
            Alert.alert("Info", data.message || "Impossible d'envoyer la demande.");
        }
    } catch (error) {
        Alert.alert("Erreur", "Erreur réseau.");
    }
  };

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [inviteMode, setInviteMode] = useState('friends'); // 'friends' or 'online'

  const fetchFriends = async () => {
    if (!token) return;
    setLoadingFriends(true);
    try {
        const endpoint = inviteMode === 'friends' ? '/friends' : '/users/status/online';
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            if (inviteMode === 'friends') {
                setFriends(data.filter(f => f.isOnline)); // Only show online friends
            } else {
                setFriends(data); // Already filtered by backend
            }
        }
    } catch (error) {
        console.error("Error fetching friends:", error);
    } finally {
        setLoadingFriends(false);
    }
  };

  useEffect(() => {
      if (showInviteModal) {
          fetchFriends();
      }
  }, [inviteMode, showInviteModal]);

  const handleInviteFriendToGame = (friendId) => {
      socket.emit('invite_friend', {
          recipientId: friendId,
          betAmount: params.betAmount,
          timeControl: params.timeControl,
          gameId: params.gameId
      });
      Alert.alert("Invitation envoyée", "En attente de la réponse...");
      setShowInviteModal(false);
  };

  const renderInviteModal = () => (
      <Modal
          visible={showInviteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowInviteModal(false)}
      >
          <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1} 
              onPress={() => setShowInviteModal(false)}
          >
              <View style={[styles.modalContent, { height: '70%', width: '90%' }]} onStartShouldSetResponder={() => true}>
                  <Text style={styles.modalPseudo}>Inviter un joueur</Text>
                  
                  {/* Onglets */}
                  <View style={{flexDirection: 'row', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333'}}>
                      <TouchableOpacity 
                          style={{flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: inviteMode === 'friends' ? 2 : 0, borderBottomColor: '#f1c40f'}}
                          onPress={() => setInviteMode('friends')}
                      >
                          <Text style={{color: inviteMode === 'friends' ? '#f1c40f' : '#ccc', fontWeight: 'bold'}}>Amis</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                          style={{flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: inviteMode === 'online' ? 2 : 0, borderBottomColor: '#f1c40f'}}
                          onPress={() => setInviteMode('online')}
                      >
                          <Text style={{color: inviteMode === 'online' ? '#f1c40f' : '#ccc', fontWeight: 'bold'}}>En ligne</Text>
                      </TouchableOpacity>
                  </View>

                  <Text style={{color:'#ccc', marginBottom: 10}}>
                      {inviteMode === 'friends' ? 'Amis en ligne :' : 'Tous les joueurs en ligne :'}
                  </Text>
                  
                  {loadingFriends ? (
                      <ActivityIndicator size="large" color="#f1c40f" />
                  ) : (
                      <FlatList
                          data={friends}
                          keyExtractor={item => item._id}
                          ListEmptyComponent={
                              <Text style={{color: '#999', textAlign: 'center'}}>
                                  {inviteMode === 'friends' ? 'Aucun ami en ligne.' : 'Aucun joueur en ligne.'}
                              </Text>
                          }
                          renderItem={({ item }) => (
                              <TouchableOpacity 
                                  style={{
                                      flexDirection: 'row', 
                                      alignItems: 'center', 
                                      padding: 10, 
                                      borderBottomWidth: 1, 
                                      borderBottomColor: '#333',
                                      width: '100%'
                                  }}
                                  onPress={() => handleInviteFriendToGame(item._id)}
                              >
                                  <View style={{position: 'relative'}}>
                                     <Image 
                                        source={item.avatar ? getAvatarSource(item.avatar) : { uri: 'https://i.pravatar.cc/150' }} 
                                        style={{width: 40, height: 40, borderRadius: 20, marginRight: 10}} 
                                     />
                                     <View style={{
                                         position: 'absolute', 
                                         bottom: 0, 
                                         right: 10, 
                                         width: 10, 
                                         height: 10, 
                                         borderRadius: 5, 
                                         backgroundColor: '#2ecc71',
                                         borderWidth: 1,
                                         borderColor: '#000'
                                     }} />
                                  </View>
                                  <View style={{flex: 1}}>
                                      <Text style={{color: '#fff', fontSize: 16}}>{item.pseudo}</Text>
                                      {item.country && <Text style={{color: '#888', fontSize: 12}}>{item.country}</Text>}
                                  </View>
                                  <Ionicons name="paper-plane-outline" size={24} color="#f1c40f" />
                              </TouchableOpacity>
                          )}
                      />
                  )}

                  <TouchableOpacity 
                      style={[styles.closeButton, { marginTop: 20 }]} 
                      onPress={() => setShowInviteModal(false)}
                  >
                      <Text style={styles.closeButtonText}>Fermer</Text>
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>
  );

  const handleQuitGame = () => {
    if (params.isWaiting && params.gameId) {
        Alert.alert(
            "Annuler la partie ?",
            "Voulez-vous fermer la salle et récupérer votre mise ?",
            [
                { text: "Non", style: "cancel" },
                { 
                    text: "Oui, quitter", 
                    style: "destructive",
                    onPress: () => {
                        socket.emit('quit_waiting_room', { gameId: params.gameId, userId: user?._id });
                        setShowGameMenu(false);
                        navigation.navigate('Social');
                    }
                }
            ]
        );
        return;
    }

    Alert.alert(
        "Quitter la partie ?",
        "Vous perdrez automatiquement la partie.",
        [
            { text: "Annuler", style: "cancel" },
            { 
                text: "Quitter", 
                style: "destructive",
                onPress: () => {
                    if (mode === 'online') {
                        socket.emit('resign');
                    }
                    setShowGameMenu(false);
                    navigation.navigate('Home');
                }
            }
        ]
    );
  };

  const renderGameMenu = () => (
    <Modal
        visible={showGameMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGameMenu(false)}
    >
        <TouchableOpacity 
            style={styles.gameMenuOverlay} 
            activeOpacity={1} 
            onPress={() => setShowGameMenu(false)}
        >
            <View style={styles.menuContent} onStartShouldSetResponder={() => true}>
                <TouchableOpacity style={styles.menuItem} onPress={handleQuitGame}>
                    <Ionicons name="exit-outline" size={24} color="#ffffffff" />
                    <Text style={[styles.menuText, { color: '#ffffffff' }]}>Quitter la partie</Text>
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />

                <TouchableOpacity style={styles.menuItem} onPress={() => { dispatch(toggleSound()); setShowGameMenu(false); }}>
                    <Ionicons name={isSoundEnabled ? "volume-high" : "volume-mute"} size={24} color="#ffffffff" />
                    <Text style={styles.menuText}>Son des pions : {isSoundEnabled ? "Activé" : "Désactivé"}</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity style={styles.menuItem} onPress={() => setShowGameMenu(false)}>
                    <Text style={styles.closeMenuText}>Fermer</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
  );

  const renderProfileModal = () => (
    <Modal
        visible={!!selectedProfile}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedProfile(null)}
    >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setSelectedProfile(null)}
        >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                 {selectedProfile?.avatar ? (
                    <Image source={getAvatarSource(selectedProfile.avatar)} style={styles.modalAvatar} />
                 ) : (
                    <Ionicons name="person-circle-outline" size={100} color="#ccc" />
                 )}
                 <Text style={styles.modalPseudo}>{selectedProfile?.pseudo}</Text>
                 {selectedProfile?.level && (
                    <Text style={{color: '#f59e0b', fontSize: 16, marginBottom: 5, fontWeight: 'bold'}}>
                        Niveau {selectedProfile.level}
                    </Text>
                 )}
                 {selectedProfile?.country && <Text style={styles.modalFlag}>{selectedProfile.country}</Text>}
                 
                 {(mode === 'online' || mode === 'live' || mode === 'spectator') && selectedProfile?.id && selectedProfile.id !== (user?._id || user?.id) && (
                     <TouchableOpacity style={styles.friendButton} onPress={handleSendFriendRequest}>
                        <Ionicons name="person-add" size={20} color="white" style={{marginRight: 8}} />
                        <Text style={styles.friendButtonText}>Demander en ami</Text>
                     </TouchableOpacity>
                 )}
                 
                 <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => setSelectedProfile(null)}
                 >
                    <Text style={styles.closeButtonText}>Fermer</Text>
                 </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
  );

  const renderWaitingForOpponentOverlay = () => {
      const isWaitingForOpponent = mode === 'live' && !params.players?.white;
      
      if (!isWaitingForOpponent) return null;

      return (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999 }]}>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#f1c40f" style={{ marginBottom: 20 }} />
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>En attente d'un adversaire...</Text>
                  <Text style={{ color: '#ccc', fontSize: 16, textAlign: 'center', maxWidth: '80%', marginBottom: 30 }}>
                      Invitez un ami ou attendez qu'un joueur rejoigne la salle.
                  </Text>
                  
                  <TouchableOpacity 
                      style={[styles.closeButton, { backgroundColor: '#e74c3c', width: 200 }]}
                      onPress={() => {
                           if (params.gameId) {
                               socket.emit('quit_waiting_room', { gameId: params.gameId, userId: user?._id });
                           }
                           navigation.goBack();
                      }}
                  >
                      <Text style={styles.closeButtonText}>Annuler</Text>
                  </TouchableOpacity>
              </View>
          </View>
      );
  };

  const renderLocalPlayer = (player) => {
    const isCurrent = currentPlayer === player.color;
    // En mode tournoi ou si un temps est défini, on affiche le chronomètre
    const showTimer = localConfig?.mode === 'tournament' || timeControl;
    
    return (
        <TouchableOpacity 
            style={[
                styles.playerContainer, 
                isCurrent && styles.activePlayer,
                { height: 100 }
            ]}
            activeOpacity={1}
        >
             {isCurrent && !gameOver && (
                <Animated.View style={{ 
                    position: 'absolute', 
                    top: -25, 
                    left: 0, 
                    right: 0, 
                    alignItems: 'center',
                    zIndex: 10,
                    elevation: 10,
                    transform: [{ translateY: arrowAnim }]
                }}>
                    <GradientArrow size={36} />
                </Animated.View>
            )}

            <View style={[styles.avatarContainer, { alignItems: 'center', width: '100%', marginBottom: 5 }]}>
                <Ionicons name="person-circle-outline" size={40} color="#fff" />
            </View>

            <Text style={[
                styles.playerName, 
                { 
                    bottom: 35, 
                    right: 25, 
                    marginTop: 0, 
                    marginBottom: 5, 
                    width: '100%', 
                    position: 'relative',
                }
            ]} numberOfLines={1}>{player.pseudo}</Text>

            <View style={{ marginTop: 0, alignItems: 'center', justifyContent: 'center' }}>
                {player.color === 'black' ? (
                    <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#FF0000',
                        backgroundColor: "#ffffffff", 
                        justifyContent: 'center',
                        alignItems: 'center',
                        left: 42,
                        top: 3,
                    }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0000' }} />
                    </View>
                ) : (
                    <View style={{ 
                        width: 22, 
                        height: 22, 
                        borderRadius: 11,
                        borderWidth: 1,
                        borderColor: "#0000FF",
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        backgroundColor: "#ffffffff", 
                        left: 42,
                        top: 3,
                    }}>
                        <Ionicons name="close" size={20} color="#0000FF"  />
                    </View>
                )}
            </View>

            {timeControl && (
                <View style={{ position: 'absolute', bottom: 5, width: '100%', alignItems: 'center' }}>
                    <View style={[styles.chronoPrincipal, { bottom: 0, marginTop: 0 }]}>
                        <Text style={[styles.chronoPrincipalTexte, { color: getCouleurChrono(isCurrent ? timeLeft : timeControl, timeControl), fontSize: 12, marginBottom: 2 }]}>
                            ⏱️ {formatTemps(isCurrent ? timeLeft : timeControl)}
                        </Text>
                        <View style={[styles.progressBar, { height: 4 }]}>
                            <View style={[
                                styles.progressFill, 
                                { 
                                    width: `${((isCurrent ? timeLeft : timeControl) / timeControl) * 100}%`, 
                                    backgroundColor: getCouleurChrono(isCurrent ? timeLeft : timeControl, timeControl) 
                                }
                            ]} />
                        </View>
                    </View>
                    
                    {/* TIMEOUTS COUNT */}
                          <View style={[styles.timeoutsContainer, { bottom: 0 }]}>
                              <View style={{ flexDirection: 'row' }}>
                                {[...Array(5)].map((_, i) => (
                                    <View 
                                        key={i} 
                                        style={{
                                            width: 8, 
                                            height: 8, 
                                            borderRadius: 4, 
                                            backgroundColor: i < (timeouts[player.color] || 0) ? '#FFD700' : '#4ade80', // Yellow : Green
                                            marginHorizontal: 2,
                                            borderWidth: 0.5,
                                            borderColor: 'rgba(0,0,0,0.2)'
                                        }} 
                                    />
                                ))}
                              </View>
                              {(localConfig?.mode === 'tournament' || tournamentTotalGames > 1) && (
                                  <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: 'bold', marginTop: 3 }}>
                                      🏆 {tournamentScore[player.color] || 0}
                                  </Text>
                              )}
                          </View>
                </View>
            )}
        </TouchableOpacity>
    );
  };

  const renderPlayer = (player, isCurrent, bubbleMessage) => (
    <TouchableOpacity 
      style={[
          styles.playerContainer, 
          isCurrent && styles.activePlayer,
           (mode === 'online' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && { height: 132 }
          // mode === 'online' && { 
          //     height: 180, // Increased height for better spacing
          //     justifyContent: 'flex-start', 
          //     paddingTop: 10,
          //     alignItems: 'center'
          // }
      ]}
      onPress={() => setSelectedProfile(player)}
      activeOpacity={0.8}
    >
      {(mode === 'online' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && isCurrent && !gameOver && (player === player1 || mode === 'spectator' || mode === 'ai' || mode === 'local') && (
        <Animated.View style={{ 
            position: 'absolute', 
            top: -25, 
            left: 0, 
            right: 0, 
            alignItems: 'center',
            zIndex: 10,
            elevation: 10,
            transform: [{ translateY: arrowAnim }]
        }}>
            <GradientArrow size={36} />
        </Animated.View>
      )}
      <View style={[
          styles.avatarContainer,
          (mode === 'online' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && { alignItems: 'center', width: '100%', marginBottom: 5 }
      ]}>
        {player.avatar ? (
          <Image source={getAvatarSource(player.avatar)} style={[
              styles.avatar,
              (mode === 'online' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && { left: 0 } // Reset offset for online mode
          ]} />
        ) : (
          <Ionicons name="person-circle-outline" size={40} color="#fff" />
        )}
      </View>
      
      <Text style={[
          styles.playerName,
          (mode === 'online' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && { 
              bottom: 35, 
              right: 25, 
              marginTop: 0,
              marginBottom: 5,
              width: '100%',
              position: 'relative'
          }
      ]} numberOfLines={1}>{player.pseudo}</Text>
      
      {(mode === 'online' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && (
          <View style={[
              styles.playerCoinsContainer,
              { 
                  position: 'relative', 
                  bottom: 35, 
                  right: 25, 
                  marginTop: 0, 
                  marginBottom: 5,
                  width: '100%' 
              }
          ]}>
              {player.coins != null && (
                  <Text style={styles.playerCoinsText}>💰 {player.coins.toLocaleString()}</Text>
              )}
              <Text style={[styles.playerCoinsText, { fontSize: 11, color: '#e5e7eb', marginTop: 2 }]}>
                  Coups: {board.filter(p => p.player === player.color).length}
              </Text>
          </View>
      )}

      {/* Pawn Indicator (Red Circle / Blue Cross) */}
      <View style={{ marginTop: 0, alignItems: 'center', justifyContent: 'center' }}>
          {player.color === 'black' ? (
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: '#FF0000',
                backgroundColor: "#ffffffff", 
                justifyContent: 'center',
                alignItems: 'center',
                left: 42,
                top: 3,
              }}>
                  <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#FF0000',
                  }} />
              </View>
          ) : (
              <View style={{ 
                width: 22, 
                height: 22, 
                borderRadius: 11,
                borderWidth: 1,
                borderColor: "#0000FF",
                justifyContent: 'center', 
                alignItems: 'center', 
                backgroundColor: "#ffffffff", 
                left: 42,
                top: 3,
                }}>
                  <Ionicons name="close" size={20} color="#0000FF"  />
              </View>
          )}
      </View>



      {/* ONLINE INFO FOOTER (Timer + Timeouts) */}
      {(mode === 'online' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && (
          <View style={{ position: 'absolute', bottom: 5, width: '100%', alignItems: 'center' }}>
              {/* CHRONOMÈTRE */}
              {!gameOver && timeControl && (
                 <View style={styles.chronoPrincipal}>
                    <Text style={[styles.chronoPrincipalTexte, { color: getCouleurChrono(isCurrent ? timeLeft : timeControl, timeControl) }]}>
                        ⏱️ {formatTemps(isCurrent ? timeLeft : timeControl)}
                    </Text>
                    <View style={styles.progressBar}>
                        <View style={[
                            styles.progressFill, 
                            { 
                                width: `${((isCurrent ? timeLeft : timeControl) / timeControl) * 100}%`, 
                                backgroundColor: getCouleurChrono(isCurrent ? timeLeft : timeControl, timeControl) 
                            }
                        ]} />
                    </View>
                 </View>
              )}

              {/* TIMEOUTS COUNT */}
              <View style={styles.timeoutsContainer}>
                  <View style={{ flexDirection: 'row' }}>
                    {[...Array(5)].map((_, i) => (
                        <View 
                            key={i} 
                            style={{
                                width: 8, 
                                height: 8, 
                                borderRadius: 4, 
                                backgroundColor: i < (timeouts[player.color] || 0) ? '#FFD700' : '#4ade80', // Yellow : Green
                                marginHorizontal: 2,
                                borderWidth: 0.5,
                                borderColor: 'rgba(0,0,0,0.2)'
                            }} 
                        />
                    ))}
                  </View>
              </View>
          </View>
      )}

      {/* MESSAGE BUBBLE */}
      {bubbleMessage && (
          <View style={styles.bubbleContainer}>
              {bubbleMessage.type === 'emoji' ? (
                  <Text style={styles.bubbleEmoji}>{bubbleMessage.content}</Text>
              ) : (
                  <Text style={styles.bubbleText} numberOfLines={3}>{bubbleMessage.content}</Text>
              )}
          </View>
      )}
    </TouchableOpacity>
  );

  // Zoom Logic
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(baseScale, pinchScale);
  const lastScale = useRef(1);

  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true }
  );

  const [isPanEnabled, setIsPanEnabled] = useState(false);

  const onPinchHandlerStateChange = event => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      // Limiter le zoom entre 1x (taille normale) et 3x
      lastScale.current = Math.max(1, Math.min(lastScale.current, 3));
      baseScale.setValue(lastScale.current);
      pinchScale.setValue(1);
      
      // Activer le déplacement uniquement si on est zoomé
      setIsPanEnabled(lastScale.current > 1.05);

      // --- Recalculer la position pour rester dans les limites (Clamping) ---
      const s = lastScale.current;
      const contentWidth = BOARD_WIDTH * s;
      const contentHeight = BOARD_HEIGHT * s;
      
      const containerW = containerDimensions.current.width;
      const containerH = containerDimensions.current.height;

      // Si le contenu est plus petit que le conteneur, on force à 0 (centré)
      const maxDX = Math.max(0, (contentWidth - containerW) / 2);
      const maxDY = Math.max(0, (contentHeight - containerH) / 2);

      let currentX = lastOffset.current.x;
      let currentY = lastOffset.current.y;

      // Clamper les valeurs
      let clampedX = Math.max(-maxDX, Math.min(currentX, maxDX));
      let clampedY = Math.max(-maxDY, Math.min(currentY, maxDY));

      // Mettre à jour lastOffset
      lastOffset.current = { x: clampedX, y: clampedY };

      // Animation de "Snap Back" si nécessaire
      translateX.flattenOffset();
      translateY.flattenOffset();

      Animated.parallel([
        Animated.spring(translateX, {
          toValue: clampedX,
          useNativeDriver: true,
          friction: 5,
        }),
        Animated.spring(translateY, {
          toValue: clampedY,
          useNativeDriver: true,
          friction: 5,
        })
      ]).start(() => {
        translateX.setOffset(clampedX);
        translateX.setValue(0);
        translateY.setOffset(clampedY);
        translateY.setValue(0);
      });
    }
  };

  // Pan Logic (Déplacement)
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });
  const containerDimensions = useRef({ width: width, height: height });

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = event => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // Calculer la position finale proposée
      const currentX = lastOffset.current.x + event.nativeEvent.translationX;
      const currentY = lastOffset.current.y + event.nativeEvent.translationY;

      // Calculer les limites en fonction du zoom actuel
      const s = lastScale.current;
      const contentWidth = BOARD_WIDTH * s;
      const contentHeight = BOARD_HEIGHT * s;
      
      const containerW = containerDimensions.current.width;
      const containerH = containerDimensions.current.height;

      // Le maximum qu'on peut décaler est la moitié de l'excédent de taille
      // Si le contenu est plus petit que le conteneur, on force à 0 (centré)
      const maxDX = Math.max(0, (contentWidth - containerW) / 2);
      const maxDY = Math.max(0, (contentHeight - containerH) / 2);

      // Clamper les valeurs
      let clampedX = Math.max(-maxDX, Math.min(currentX, maxDX));
      let clampedY = Math.max(-maxDY, Math.min(currentY, maxDY));

      // Mettre à jour lastOffset
      lastOffset.current = { x: clampedX, y: clampedY };

      // Animation de "Snap Back" vers la position clampée
      translateX.flattenOffset();
      translateY.flattenOffset();

      Animated.parallel([
        Animated.spring(translateX, {
          toValue: clampedX,
          useNativeDriver: true,
          friction: 5,
        }),
        Animated.spring(translateY, {
          toValue: clampedY,
          useNativeDriver: true,
          friction: 5,
        })
      ]).start(() => {
        // Préparer pour le prochain geste
        translateX.setOffset(clampedX);
        translateX.setValue(0);
        translateY.setOffset(clampedY);
        translateY.setValue(0);
      });
    }
  };

  const checkWinner = (row, col, player, boardToCheck = board) => {
    const directions = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal \
      [1, -1]  // Diagonal /
    ];

    for (let [dx, dy] of directions) {
      let count = 1;
      let line = [{row, col}];
      
      // Check forward
      let r = row + dx;
      let c = col + dy;
      while (
        boardToCheck.some(s => s.row === r && s.col === c && s.player === player)
      ) {
        line.push({row: r, col: c});
        count++;
        r += dx;
        c += dy;
      }

      // Check backward
      r = row - dx;
      c = col - dy;
      while (
        boardToCheck.some(s => s.row === r && s.col === c && s.player === player)
      ) {
        line.push({row: r, col: c});
        count++;
        r -= dx;
        c -= dy;
      }

      if (count >= 5) return line;
    }
    return null;
  };

  const playSound = async (player) => {
    if (isSoundEnabled === false) return;
    try {
      const source = player === 'black' 
        ? require('../../assets/song/PionRouge.mp3') 
        : require('../../assets/song/boutonBlue2.mp3');
      const { sound } = await Audio.Sound.createAsync(source);
      
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing sound', error);
    }
  };

  // Fonction pour vérifier si c'est le tour de l'IA
  const estTourIA = () => {
    if (mode !== 'ai' || !configIA || !configIA.couleurs || gameOver) return false;
    const couleurIA = configIA.couleurs.ia;
    return currentPlayer === couleurIA;
  };

  // EFFET : Jouer le tour de l'IA automatiquement
  useEffect(() => {
    if (estTourIA() && !iaEnReflexion) {
        // Petit délai pour que l'interface se mette à jour
        const timer = setTimeout(() => {
            jouerTourIA();
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameOver, iaEnReflexion]);

  // EFFET : Premier coup si l'IA commence
  useEffect(() => {
    if (mode === 'ai' && configIA.premierJoueur === 'ia' && board.length === 0) {
        const timer = setTimeout(() => {
            jouerTourIA();
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, []);

  // Animation flèche
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const skullScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (gameOver && winningLine && winningLine.length > 0) {
        Animated.loop(
            Animated.sequence([
                Animated.timing(skullScale, {
                    toValue: 1.5,
                    duration: 500,
                    useNativeDriver: true
                }),
                Animated.timing(skullScale, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true
                })
            ])
        ).start();
    } else {
        skullScale.setValue(1);
    }
  }, [gameOver, winningLine]);

  useEffect(() => {
    const isPlayerTurn = (mode === 'ai' && !estTourIA()) || (mode === 'local' && currentPlayer === player1.color) || (mode === 'online') || (mode === 'live') || (mode === 'spectator');
    if (isPlayerTurn && !gameOver) {
        Animated.loop(
            Animated.sequence([
                Animated.timing(arrowAnim, {
                    toValue: 10,
                    duration: 500,
                    useNativeDriver: true
                }),
                Animated.timing(arrowAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true
                })
            ])
        ).start();
    } else {
        arrowAnim.setValue(0);
        arrowAnim.stopAnimation();
    }
  }, [currentPlayer, gameOver, iaEnReflexion, mode]);


  // FONCTION : Jouer le tour de l'IA
  const jouerTourIA = async () => {
    setIaEnReflexion(true);

    // Délais selon la vitesse
    const delais = {
        instantane: 100,
        rapide: 500,
        normal: 1200,
        lent: 2000,
        reflexion: 3000
    };

    const delai = delais[configIA.vitesseIA] || 1200;

    // Attendre le délai
    await new Promise(resolve => setTimeout(resolve, delai));

    // Calculer le coup de l'IA
    const coup = calculerCoupIA(board, configIA.difficulte, currentPlayer);

    if (coup) {
        setDernierCoupIA(coup);

        // Générer message
        const messages = [
            "Intéressant...",
            "Hmm, voyons voir",
            "Stratégie en cours",
            "Bon coup !",
            "Essayons ceci",
            "Analysons...",
            "Parfait !",
            "C'est parti !"
        ];

        setMessageIA(messages[Math.floor(Math.random() * messages.length)]);

        // Jouer le coup (appeler handlePress logic locally to avoid recursion check block)
        setTimeout(() => {
            // Logique de placement du pion
            playSound(currentPlayer);
            const newStone = { row: coup.row, col: coup.col, player: currentPlayer };
            const newBoard = [...board, newStone];
            setBoard(newBoard);

            const winLine = checkWinner(coup.row, coup.col, currentPlayer);
            if (winLine) {
                setWinningLine(winLine);
                AudioController.playVictorySound(isSoundEnabled);
                setWinner(currentPlayer);
                setGameOver(true);
                setTimeout(() => {
                   updateStatsIA(configIA.difficulte, false);
                   
                   // Tournament Logic (IA Win)
                   let newScore = { ...tournamentScore };
                   let isTournament = configIA.mode === 'tournament';
                   let tournamentOver = false;
                   let nextGameNumber = tournamentGameNumber;

                   if (isTournament) {
                       newScore[currentPlayer] += 1;
                       setTournamentScore(newScore);
                       
                       // Check if tournament is over
                       if (tournamentGameNumber >= tournamentTotalGames) {
                           tournamentOver = true;
                       } else {
                            // Check if impossible to catch up (Best of N logic)
                            const userColor = configIA.couleurs.joueur;
                            const iaColor = configIA.couleurs.ia;
                            const scoreUser = newScore[userColor];
                            const scoreIA = newScore[iaColor];
                            const remainingGames = tournamentTotalGames - tournamentGameNumber;
                            
                            // If leading player is ahead by more than remaining games
                            if (Math.abs(scoreUser - scoreIA) > remainingGames) {
                                tournamentOver = true;
                            }
                       }
                       
                       if (!tournamentOver) {
                           nextGameNumber += 1;
                       }
                   }

                   // Prepare next ConfigIA
                   const nextConfigIA = {
                       ...configIA,
                       tournamentSettings: isTournament ? {
                           totalGames: tournamentTotalGames,
                           gameNumber: tournamentOver ? 1 : nextGameNumber,
                           score: tournamentOver ? { black: 0, white: 0 } : newScore
                       } : null
                   };

                   setResultData({
                       victoire: false,
                       gains: 0,
                       montantPari: params.betAmount || 0,
                       adversaire: { pseudo: 'Ordinateur (IA)' },
                       difficulte: configIA.difficulte,
                       configIA: nextConfigIA,
                       type: 'ia',
                       isTournament,
                       tournamentScore: newScore,
                       tournamentOver,
                       gameNumber: tournamentGameNumber,
                       totalGames: tournamentTotalGames
                   });
                   setShowResultModal(true);
                }, 500);
            } else {
                setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
                if (timeControl) setTimeLeft(timeControl);
            }
            setIaEnReflexion(false);
        }, 300);
    } else {
        setIaEnReflexion(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handlePress = (row, col) => {
    if (gameOver) return;
    if (mode === 'spectator') return;
    
    // En mode IA, bloquer les clics pendant le tour de l'IA
    if (mode === 'ai' && iaEnReflexion) {
        return;
    }

    // En mode IA, bloquer si c'est le tour de l'IA
    if (mode === 'ai' && estTourIA()) {
        return; // L'IA jouera via jouerTourIA()
    }

    // ONLINE MODE LOGIC
    if (mode === 'online' || mode === 'online_custom' || mode === 'live') {
        const myId = user?._id || user?.id;
        const blackId = getPlayerId(playersData?.black);
        const whiteId = getPlayerId(playersData?.white);
        
        let myColor = null;
        if (blackId && myId && blackId.toString() === myId.toString()) myColor = 'black';
        else if (whiteId && myId && whiteId.toString() === myId.toString()) myColor = 'white';
        
        console.log('[handlePress] Check:', { 
            currentPlayer, 
            myColor, 
            userId: myId, 
            blackId,
            whiteId,
            isMyTurn: currentPlayer === myColor,
            boardSize: board.length,
            socketConnected: socket.connected
        });

        if (!myColor) {
             console.log('Cannot determine my color');
             return;
        }

        if (currentPlayer !== myColor) return; // Ce n'est pas mon tour
        
        // Vérifier si la case est occupée
        if (board.some(s => s.row === row && s.col === col)) return;

        // --- PRE-SELECTION SYSTEM ---
        // Si c'est le premier clic ou un clic sur une autre case -> Sélectionner (Ghost Stone)
        if (!selectedCell || selectedCell.row !== row || selectedCell.col !== col) {
            setSelectedCell({ row, col });
            return;
        }
        // Si c'est le deuxième clic sur la même case -> Confirmer
        setSelectedCell(null);

        // Jouer le coup
        playSound(currentPlayer);
        
        // Emit socket event
        if (socket.connected) {
            socket.emit('make_move', {
                gameId: params.gameId,
                userId: myId,
                player: myColor,
                row, 
                col
            });
        } else {
            console.log('[handlePress] Socket disconnected, attempting reconnect...');
            socket.connect();
            // Retry emit after short delay or alert user
            Alert.alert('Erreur connexion', 'Connexion au serveur perdue. Tentative de reconnexion...');
            
            // Tentative de reconnexion immédiate et envoi
            setTimeout(() => {
                if (socket.connected) {
                     socket.emit('make_move', {
                        gameId: params.gameId,
                        userId: myId,
                        player: myColor,
                        row, 
                        col
                    });
                }
            }, 1000);
        }
        
        return;
    }

    // Check if cell is occupied
    if (board.some(s => s.row === row && s.col === col)) return;

    // --- PRE-SELECTION SYSTEM ---
    // Si c'est le premier clic ou un clic sur une autre case -> Sélectionner (Ghost Stone)
    if (!selectedCell || selectedCell.row !== row || selectedCell.col !== col) {
        setSelectedCell({ row, col });
        return;
    }
    // Si c'est le deuxième clic sur la même case -> Confirmer
    setSelectedCell(null);

    playSound(currentPlayer);

    const newStone = { row, col, player: currentPlayer };
    const newBoard = [...board, newStone];
    setBoard(newBoard);

    const winLine = checkWinner(row, col, currentPlayer);
    if (winLine) {
      setWinningLine(winLine);
      AudioController.playVictorySound(isSoundEnabled);
      setWinner(currentPlayer);
      setGameOver(true);
      
      if (mode === 'ai') {
         setTimeout(() => {
            updateStatsIA(configIA.difficulte, true);
            
            // Tournament Logic
            let newScore = { ...tournamentScore };
            let isTournament = configIA.mode === 'tournament';
            let tournamentOver = false;
            let nextGameNumber = tournamentGameNumber;

            if (isTournament) {
                newScore[currentPlayer] += 1;
                // Update local state immediately for UI consistency if needed
                setTournamentScore(newScore);
                
                // Check if tournament is over
                if (tournamentGameNumber >= tournamentTotalGames) {
                    tournamentOver = true;
                } else {
                     // Check if impossible to catch up (Best of N logic)
                     const userColor = configIA.couleurs.joueur;
                     const iaColor = configIA.couleurs.ia;
                     const scoreUser = newScore[userColor];
                     const scoreIA = newScore[iaColor];
                     const remainingGames = tournamentTotalGames - tournamentGameNumber;
                     
                     // If leading player is ahead by more than remaining games
                     if (Math.abs(scoreUser - scoreIA) > remainingGames) {
                         tournamentOver = true;
                     }
                }

                if (!tournamentOver) {
                    nextGameNumber += 1;
                }
            }

            // Prepare next ConfigIA
            // Alternate starting player for tournament
            let nextPremierJoueur = configIA.premierJoueur;
            if (isTournament && !tournamentOver) {
                 nextPremierJoueur = configIA.premierJoueur === 'ia' ? 'me' : 'ia';
            }

            const nextConfigIA = {
                ...configIA,
                premierJoueur: nextPremierJoueur,
                tournamentSettings: isTournament ? {
                    totalGames: tournamentTotalGames,
                    gameNumber: tournamentOver ? 1 : nextGameNumber,
                    score: tournamentOver ? { black: 0, white: 0 } : newScore
                } : null
            };

            // Calcul des gains (Mise * 1.9 pour 90% de profit)
            const profit = Math.floor((params.betAmount || 0) * 0.9);
            const totalReturn = (params.betAmount || 0) + profit;
            
            if (params.betAmount > 0) {
                dispatch(updateUser({ coins: user.coins + totalReturn }));
            }

            setResultData({
                victoire: true,
                gains: profit,
                montantPari: params.betAmount || 0,
                adversaire: { pseudo: 'Ordinateur (IA)' },
                difficulte: configIA.difficulte,
                configIA: nextConfigIA,
                type: 'ia',
                isTournament,
                tournamentScore: newScore,
                tournamentOver,
                gameNumber: tournamentGameNumber,
                totalGames: tournamentTotalGames
            });
             setShowResultModal(true);
         }, 500);
      } else {
          setTimeout(() => {
              // Tournament Logic for Local
              let newScore = { ...tournamentScore };
              // Determine if tournament mode is active based on localConfig or tournamentSettings presence
              let isTournament = localConfig.mode === 'tournament' || (initialTournamentSettings && initialTournamentSettings.totalGames > 1);
              let tournamentOver = false;
              let nextGameNumber = tournamentGameNumber;

              if (isTournament) {
                  newScore[currentPlayer] += 1;
                  setTournamentScore(newScore);
                  
                  if (tournamentGameNumber >= tournamentTotalGames) {
                      tournamentOver = true;
                  } else {
                       // Check for early win
                       const blackScore = newScore.black;
                       const whiteScore = newScore.white;
                       const remainingGames = tournamentTotalGames - tournamentGameNumber;
                       
                       if (Math.abs(blackScore - whiteScore) > remainingGames) {
                           tournamentOver = true;
                       }
                  }
                  
                  if (!tournamentOver) {
                      nextGameNumber += 1;
                  }
              }

              // Prepare next localConfig
              // Alternate starting player for tournament
              let nextStartingPlayer = localConfig.startingPlayer || 'black';
              if (isTournament && !tournamentOver) {
                  nextStartingPlayer = (localConfig.startingPlayer || 'black') === 'black' ? 'white' : 'black';
              }

              const nextLocalConfig = {
                  ...localConfig,
                  startingPlayer: nextStartingPlayer,
                  tournamentSettings: isTournament ? {
                      totalGames: tournamentTotalGames,
                      gameNumber: tournamentOver ? 1 : nextGameNumber,
                      score: tournamentOver ? { black: 0, white: 0 } : newScore
                  } : null
              };

              setResultData({
                  victoire: true,
                  winnerColor: currentPlayer,
                  type: 'local',
                  localConfig: nextLocalConfig,
                  isTournament,
                  tournamentScore: newScore,
                  tournamentOver,
                  gameNumber: tournamentGameNumber,
                  totalGames: tournamentTotalGames
              });
              setShowResultModal(true);
          }, 500);
      }
      return;
    }

    if (newBoard.length === ROWS * COLS) {
        setGameOver(true);
        if (mode === 'local') {
             setTimeout(() => {
                 let newScore = { ...tournamentScore };
                 let isTournament = localConfig.mode === 'tournament' || (initialTournamentSettings && initialTournamentSettings.totalGames > 1);
                 let tournamentOver = false;
                 let nextGameNumber = tournamentGameNumber;

                 if (isTournament) {
                     if (tournamentGameNumber >= tournamentTotalGames) {
                         tournamentOver = true;
                     } else {
                          const blackScore = newScore.black;
                          const whiteScore = newScore.white;
                          const remainingGames = tournamentTotalGames - tournamentGameNumber;

                          if (Math.abs(blackScore - whiteScore) > remainingGames) {
                              tournamentOver = true;
                          }
                     }
                 }

                 if (!tournamentOver) {
                     nextGameNumber += 1;
                 }

                 // Alternate starting player for tournament (even if draw)
                 let nextStartingPlayer = localConfig.startingPlayer || 'black';
                 if (isTournament && !tournamentOver) {
                     nextStartingPlayer = (localConfig.startingPlayer || 'black') === 'black' ? 'white' : 'black';
                 }

                 const nextLocalConfig = {
                     ...localConfig,
                     startingPlayer: nextStartingPlayer,
                     tournamentSettings: isTournament ? {
                         totalGames: tournamentTotalGames,
                         gameNumber: tournamentOver ? 1 : nextGameNumber,
                         score: tournamentOver ? { black: 0, white: 0 } : newScore
                     } : null
                 };

                 setResultData({
                     victoire: false,
                     winnerColor: null,
                     reason: 'draw',
                     type: 'local',
                     localConfig: nextLocalConfig,
                     isTournament,
                     tournamentScore: newScore,
                     tournamentOver,
                     gameNumber: tournamentGameNumber,
                     totalGames: tournamentTotalGames
                 });
                 setShowResultModal(true);
            }, 500);
            return;
        } else if (mode === 'ai') {
             setTimeout(() => {
                 updateStatsIA(configIA.difficulte, false);
                 
                 let newScore = { ...tournamentScore };
                 let isTournament = configIA.mode === 'tournament';
                 let tournamentOver = false;
                 let nextGameNumber = tournamentGameNumber;

                 if (isTournament) {
                      if (tournamentGameNumber >= tournamentTotalGames) {
                          tournamentOver = true;
                      } else {
                          const userColor = configIA.couleurs.joueur;
                          const iaColor = configIA.couleurs.ia;
                          const scoreUser = newScore[userColor];
                          const scoreIA = newScore[iaColor];
                          const remainingGames = tournamentTotalGames - tournamentGameNumber;
                          
                          if (Math.abs(scoreUser - scoreIA) > remainingGames) {
                              tournamentOver = true;
                          }
                      }
                 }

                 if (!tournamentOver) {
                     nextGameNumber += 1;
                 }

                 // Alternate starting player for tournament
                 let nextPremierJoueur = configIA.premierJoueur;
                 if (isTournament && !tournamentOver) {
                      nextPremierJoueur = configIA.premierJoueur === 'ia' ? 'me' : 'ia';
                 }

                 const nextConfigIA = {
                     ...configIA,
                     premierJoueur: nextPremierJoueur,
                     tournamentSettings: isTournament ? {
                         totalGames: tournamentTotalGames,
                         gameNumber: tournamentOver ? 1 : nextGameNumber,
                         score: tournamentOver ? { black: 0, white: 0 } : newScore
                     } : null
                 };

                 setResultData({
                     victoire: false,
                     winnerColor: null,
                     reason: 'draw',
                     gains: params.betAmount || 0,
                     montantPari: params.betAmount || 0,
                     adversaire: { pseudo: 'Ordinateur (IA)' },
                     difficulte: configIA.difficulte,
                     configIA: nextConfigIA,
                     type: 'ia',
                     isTournament,
                     tournamentScore: newScore,
                     tournamentOver,
                     gameNumber: tournamentGameNumber,
                     totalGames: tournamentTotalGames
                 });
                 setShowResultModal(true);
             }, 500);
             return;
        }
    }

    setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
    if (timeControl) setTimeLeft(timeControl);
  };

  // --- REMATCH & NEW GAME LISTENERS ---
  useEffect(() => {
    // Reset state when gameId changes (New Game via Rematch or Matchmaking)
    if (params.gameId) {
        setBoard([]);
        setGameOver(false);
        setWinner(null);
        setWinningLine(null);
        setRematchRequested(false);
        setResultData(null);
        setShowResultModal(false);
        setTimeouts({ black: 0, white: 0 });
        setTournamentScore({ black: 0, white: 0 });
        setTournamentGameNumber(1);
        if (params.timeControl) setTimeLeft(params.timeControl);
        
        // Ensure current player is set correctly based on new params
        if (params.currentTurn) setCurrentPlayer(params.currentTurn);
    }
  }, [params.gameId, params.currentTurn, params.timeControl]);

  useEffect(() => {
    if (mode === 'online' || mode === 'online_custom' || mode === 'live') {
        const handleRematchRequested = (data) => {
             Alert.alert(
                 'Revanche !',
                 'Votre adversaire souhaite rejouer. Acceptez-vous ?',
                 [
                     { 
                         text: 'Refuser', 
                         onPress: () => socket.emit('respond_rematch', { gameId: params.gameId, accepted: false }),
                         style: 'cancel'
                     },
                     { 
                         text: 'Accepter', 
                         onPress: () => {
                             if (user.coins < params.betAmount) {
                                 Alert.alert('Erreur', 'Pas assez de coins pour rejouer.');
                                 return;
                             }
                             socket.emit('respond_rematch', { gameId: params.gameId, accepted: true });
                         } 
                     }
                 ]
             );
        };

        const handleRematchDeclined = () => {
            setRematchRequested(false);
            Alert.alert('Refusé', 'Votre adversaire a décliné la revanche.');
        };

        const handleRematchFailed = (msg) => {
            setRematchRequested(false);
            Alert.alert('Erreur', msg || 'La revanche a échoué.');
        };

        socket.on('rematch_requested', handleRematchRequested);
        socket.on('rematch_declined', handleRematchDeclined);
        socket.on('rematch_failed', handleRematchFailed);

        return () => {
            socket.off('rematch_requested', handleRematchRequested);
            socket.off('rematch_declined', handleRematchDeclined);
            socket.off('rematch_failed', handleRematchFailed);
        };
    }
  }, [mode, params.gameId, user, navigation, params.betAmount]);

  const updateStatsIA = async (difficulte, victoire) => {
    try {
      const savedStats = await AsyncStorage.getItem('statsIA');
      let statsObj = savedStats ? JSON.parse(savedStats) : {
        facile: { jouees: 0, gagnees: 0 },
        moyen: { jouees: 0, gagnees: 0 },
        difficile: { jouees: 0, gagnees: 0 }
      };

      if (!statsObj.facile) statsObj.facile = { jouees: 0, gagnees: 0 };
      if (!statsObj.moyen) statsObj.moyen = { jouees: 0, gagnees: 0 };
      if (!statsObj.difficile) statsObj.difficile = { jouees: 0, gagnees: 0 };

      if (statsObj[difficulte]) {
        statsObj[difficulte].jouees += 1;
        if (victoire) {
          statsObj[difficulte].gagnees += 1;
        }
      }

      await AsyncStorage.setItem('statsIA', JSON.stringify(statsObj));
      setStatsIA(statsObj[difficulte]);
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const renderResultModal = () => {
      if (!showResultModal || !resultData) return null;

      const { victoire, gains, montantPari, adversaire, raisonVictoire, raisonDefaite, timeouts, type, difficulte, reason, isTournament, tournamentOver } = resultData;
      const tauxVictoire = statsIA ? ((statsIA.gagnees / statsIA.jouees) * 100).toFixed(0) : 0;

      const isDraw = reason === 'draw';
      const isTournamentDraw = type === 'local' && isTournament && tournamentOver && resultData.tournamentScore?.black === resultData.tournamentScore?.white;

      return (
          <View 
            style={styles.modalOverlay} 
            pointerEvents="box-none"
          >
              <View style={[styles.resultCard, (type === 'online' || type === 'live' || type === 'ia') && { padding: 16, width: '90%' }]}>
              <Text style={[styles.emojiResult, (type === 'online' || type === 'live' || type === 'ia') && { fontSize: 40, marginBottom: 5 }]}>
                {isDraw || isTournamentDraw ? '🤝' : (victoire ? '🏆' : '😢')}
              </Text>
              <Text style={[styles.titreResult, (type === 'online' || type === 'live' || type === 'ia') && { fontSize: 24, marginBottom: 5 }]}>
                {isDraw || isTournamentDraw ? 'MATCH NUL' : (victoire ? 'VICTOIRE !' : 'DÉFAITE')}
              </Text>
              
              {(type === 'online' || type === 'live' || type === 'ia') && (
                  <>
                      <Text style={[styles.adversaireResult, { marginBottom: 10 }]}>Contre {adversaire?.pseudo || 'Adversaire'}</Text>
                          
                          {raisonVictoire === 'timeout_adverse' && (
                              <View style={styles.raisonContainer}>
                                  <Text style={styles.raisonTexte}>⏰ Votre adversaire a dépassé le temps limite</Text>
                              </View>
                          )}
                          
                          {raisonVictoire === 'disconnect' && (
                              <View style={styles.raisonContainer}>
                                  <Text style={styles.raisonTexte}>🔌 Adversaire déconnecté</Text>
                              </View>
                          )}

                          {raisonDefaite === 'timeout' && (
                              <View style={[styles.raisonContainer, styles.raisonDefaite]}>
                                  <Text style={[styles.raisonTexte, styles.raisonTexteDefaite]}>⏰ Vous avez dépassé le temps limite</Text>
                              </View>
                          )}

                          {isDraw ? (
                              <View style={[styles.gainsContainer, { padding: 10, marginBottom: 10, backgroundColor: '#34495e' }]}>
                                  <Text style={styles.gainsLabel}>Mise remboursée :</Text>
                                  <Text style={[styles.gainsMontant, { fontSize: 24, color: '#ecf0f1' }]}>🪙 {gains.toLocaleString()}</Text>
                              </View>
                          ) : (
                              victoire ? (
                                  <View style={[styles.gainsContainer, { padding: 10, marginBottom: 10 }]}>
                                      <Text style={styles.gainsLabel}>Vous avez gagné :</Text>
                                      <Text style={[styles.gainsMontant, { fontSize: 24 }]}>+🪙 {gains.toLocaleString()}</Text>
                                  </View>
                              ) : (
                                  <View style={[styles.perteContainer, { padding: 10, marginBottom: 10 }]}>
                                      <Text style={styles.perteLabel}>Vous avez perdu :</Text>
                                      <Text style={[styles.perteMontant, { fontSize: 24 }]}>-🪙 {montantPari.toLocaleString()}</Text>
                                  </View>
                              )
                          )}
                      </>
                  )}

                  {type === 'ia' && (
                      <>
                          {statsIA && (
                              <View style={styles.statsContainer}>
                                  <Text style={styles.statsLabel}>Mode {difficulte.charAt(0).toUpperCase() + difficulte.slice(1)}</Text>
                                  <Text style={styles.statsTaux}>{tauxVictoire}% de victoires</Text>
                                  <Text style={styles.statsParties}>{statsIA.jouees} parties jouées</Text>
                              </View>
                          )}
                      </>
                  )}

                  {type === 'local' && (
                       <Text style={styles.messageResult}>
                           {isTournamentDraw ? 'Match nul – pas de victoire pour le tournoi' : (isDraw ? 'Match nul !' : `Le joueur ${resultData.winnerColor === 'black' ? 'Rouge' : 'Bleu'} a gagné !`)}
                       </Text>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                      {type === 'online' && mode !== 'spectator' && (
                        <TouchableOpacity 
                            style={[
                                styles.boutonRejouer, 
                                { 
                                    backgroundColor: rematchRequested ? '#9ca3af' : '#f59e0b', 
                                      width: victoire ? '78%' : '100%', 
                                      marginBottom: 0, 
                                      flex: 0 
                                  }
                              ]} 
                              disabled={rematchRequested}
                              onPress={() => {
                                  if (user.coins < montantPari) {
                                      Alert.alert('Solde insuffisant', 'Vous n\'avez pas assez de coins pour rejouer.');
                                      return;
                                  }
                                  setRematchRequested(true);
                                  socket.emit('request_rematch', { gameId: params.gameId });
                              }}
                          >
                              <Text style={styles.boutonTexteResult}>
                                  {rematchRequested ? 'Demande envoyée...' : (isTournament ? '🔄 Nouveau Tournoi' : (victoire ? '🔄 Rejouer' : '🔄 Revanche (Même mise)'))}
                              </Text>
                          </TouchableOpacity>
                      )}

                      {victoire && (
                          <TouchableOpacity 
                              style={[
                                  styles.boutonRejouer, 
                                  { 
                                      backgroundColor: '#f1c40f', 
                                      width: type === 'online' ? '20%' : '100%', 
                                      marginBottom: 0, 
                                      flex: 0 
                                  }
                              ]} 
                              onPress={async () => {
                                  try {
                                      const message = type === 'online'
                                          ? `Je viens de gagner contre ${adversaire?.pseudo || 'un adversaire'} sur DeadPions ! 🏆💰\nViens m'affronter !`
                                          : (type === 'ia' 
                                              ? `Je viens de battre l'IA en mode ${difficulte} sur DeadPions ! 🤖🏆\nPeux-tu faire mieux ?`
                                              : `Victoire sur DeadPions ! 🏆`);
                                      
                                      await Share.share({
                                          message,
                                          title: 'Ma victoire sur DeadPions'
                                      });
                                  } catch (error) {
                                      console.log('Error sharing:', error);
                                  }
                              }}
                          >
                              <Text style={styles.boutonTexteResult}>
                                 <Ionicons name="share-social-outline" size={28} color="#fff" />
                              </Text>
                          </TouchableOpacity>
                      )}
                  </View>

                  <View style={styles.boutonsResult}>
                      {type === 'live' ? (
                          <>
                              {/* Afficher les options de gestion uniquement pour le créateur */}
                              {(() => {
                                  const creatorId = params.roomConfig?.createur?._id || params.roomConfig?.createur?.id;
                                  const userId = user?._id || user?.id;
                                  const isCreator = creatorId && userId && creatorId.toString() === userId.toString();
                                  
                                  return isCreator ? (
                                      <>
                                          <TouchableOpacity 
                                               style={[styles.boutonRejouer, { backgroundColor: '#f59e0b', marginBottom: 10 }]} 
                                               onPress={() => {
                                                   setRematchRequested(true);
                                                   socket.emit('request_rematch', { gameId: params.gameId });
                                               }}
                                               disabled={rematchRequested}
                                           >
                                               <Text style={styles.boutonTexteResult}>
                                                   {rematchRequested ? 'Demande envoyée...' : (isTournament ? '🔄 Nouveau tournoi' : '🔄 Rejouer')}
                                               </Text>
                                           </TouchableOpacity>

                                          <TouchableOpacity 
                                              style={[styles.boutonRejouer, { backgroundColor: '#3b82f6', marginBottom: 10 }]} 
                                              onPress={() => {
                                                  setShowResultModal(false);
                                                  if (params.roomConfig) {
                                                      navigation.replace('SalleAttenteLive', { configSalle: params.roomConfig });
                                                  } else {
                                                      navigation.navigate('Home');
                                                  }
                                              }}
                                          >
                                              <Text style={styles.boutonTexteResult}>👥 Choisir un autre adversaire</Text>
                                          </TouchableOpacity>
                                      </>
                                  ) : null;
                              })()}

                              <TouchableOpacity 
                                  style={styles.boutonMenuResult} 
                                  onPress={() => {
                                      setShowResultModal(false);
                                      navigation.navigate('Home');
                                  }}
                              >
                                  <Text style={styles.boutonTexteResult}>🏠 Menu</Text>
                              </TouchableOpacity>
                          </>
                      ) : (
                          <>
                              <TouchableOpacity 
                                  style={styles.boutonRejouer} 
                                  onPress={() => {
                                      setShowResultModal(false);
                                      if (type === 'online') {
                                          navigation.navigate('Home');
                                      } else if (type === 'online_custom') {
                                          navigation.navigate('Home');
                                      } else if (type === 'ia') {
                                          navigation.replace('Game', { modeJeu: 'ia', configIA: resultData.configIA, betAmount: montantPari });
                                      } else if (type === 'local') {
                                          if (resultData.localConfig) {
                                              navigation.replace('Game', { mode: 'local', localConfig: resultData.localConfig });
                                          } else {
                                              navigation.replace('Game', { mode: 'local' });
                                          }
                                      } else {
                                          navigation.replace('Game', { modeJeu: 'local' });
                                      }
                                  }}
                              >
                                  <Text style={styles.boutonTexteResult}>
                                      {type === 'online' ? '🔙 Changer d\'adversaire' : 
                                      (type === 'online_custom' ? '🏠 Quitter' : 
                                      (type === 'ia' && isTournament && !tournamentOver ? '➡️ Match Suivant' : 
                                      (type === 'ia' && isTournament && tournamentOver ? '🔄 Nouveau Tournoi' : 
                                      (type === 'local' && isTournament && !tournamentOver ? '➡️ Match Suivant' :
                                      (type === 'local' && isTournament && tournamentOver ? '🔄 Nouveau Tournoi' : '🔄 Rejouer')))))}
                                  </Text>
                              </TouchableOpacity>

                              <TouchableOpacity 
                                  style={styles.boutonMenuResult} 
                                  onPress={() => {
                                      setShowResultModal(false);
                                      navigation.navigate('Home');
                                  }}
                              >
                                  <Text style={styles.boutonTexteResult}>🏠 Menu</Text>
                              </TouchableOpacity>
                          </>
                      )}
                  </View>
              </View>
          </View>
      );
  };

  const renderFloatingMenu = () => {
    // Case 1: Live, Online, AI, Local -> Enhanced Menu
    if (mode === 'live' || mode === 'online_custom' || mode === 'online' || mode === 'ai' || mode === 'ia' || mode === 'local') {
        const isLocal = mode === 'local';
        const fabStyle = isLocal ? { left: undefined, right: 20 } : {};
        
        // Identify if current user is the Creator of the Live Room
        const isLiveCreator = mode === 'live' && (params.roomConfig?.createur?._id || params.roomConfig?.createur?.id) === (user?._id || user?.id);

        return (
            <>
                {showGameMenu && (
                    <View style={[styles.liveMenuContainer, isLocal ? { left: undefined, right: 0, alignItems: 'flex-end' } : {}]}>
                        <TouchableOpacity 
                            style={[styles.menuFab, fabStyle, { bottom: 170, backgroundColor: '#e74c3c' }]} 
                            onPress={() => {
                                setShowGameMenu(false);
                                
                                if (isLiveCreator) {
                                    Alert.alert(
                                        "Gestion du Live",
                                        "Que voulez-vous faire ?",
                                        [
                                            { text: "Annuler", style: "cancel" },
                                            { 
                                                text: "Arrêter le Live", 
                                                onPress: () => {
                                                    socket.emit('stop_live_room', { gameId: params.gameId });
                                                    navigation.navigate('Home');
                                                }, 
                                                style: 'destructive' 
                                            }
                                        ]
                                    );
                                } else {
                                    Alert.alert(
                                        mode === 'live' ? "Quitter le live" : "Quitter la partie",
                                        mode === 'live' ? "Voulez-vous vraiment quitter cette partie ?" : "Voulez-vous vraiment quitter la partie ?",
                                        [
                                            { text: "Annuler", style: "cancel" },
                                            { 
                                                text: "Quitter", 
                                                onPress: () => {
                                                    if (mode === 'live' || mode === 'online_custom' || mode === 'online') {
                                                        socket.emit('resign');
                                                    }
                                                    navigation.goBack();
                                                }, 
                                                style: 'destructive' 
                                            }
                                        ]
                                    );
                                }
                            }}
                        >
                            <Ionicons name="log-out-outline" size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.menuFab, fabStyle, { bottom: 100, backgroundColor: isSoundEnabled ? '#3b82f6' : '#95a5a6' }]} 
                            onPress={() => dispatch(toggleSound())}
                        >
                            <Ionicons name={isSoundEnabled ? "volume-high" : "volume-mute"} size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Main Toggle Button */}
                <TouchableOpacity 
                    style={[styles.menuFab, fabStyle]}
                    onPress={() => setShowGameMenu(!showGameMenu)}
                >
                    <Ionicons name={showGameMenu ? "close" : "menu"} size={30} color="#fff" />
                </TouchableOpacity>
            </>
        );
    } 
    
    // Case 2: Spectator -> Quit Button
    if (mode === 'spectator') {
        return (
            <TouchableOpacity 
                style={[styles.menuFab, { backgroundColor: '#e74c3c' }]}
                onPress={() => {
                    Alert.alert(
                        "Quitter",
                        "Voulez-vous quitter le mode spectateur ?",
                        [
                            { text: "Annuler", style: "cancel" },
                            { 
                                text: "Quitter", 
                                onPress: () => navigation.goBack(), 
                                style: 'destructive' 
                            }
                        ]
                    );
                }}
            >
                <Ionicons name="log-out-outline" size={30} color="#fff" />
            </TouchableOpacity>
        );
    }

    // Case 3: Local / Friend -> Simple Menu (triggers Modal)
    return (
        <TouchableOpacity 
            style={styles.menuFab}
            onPress={() => setShowGameMenu(true)}
        >
            <Ionicons name="menu" size={30} color="#fff" />
        </TouchableOpacity>
    );
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
    >
      <View style={styles.header}>
        {renderProfileModal()}
        {mode !== 'live' && mode !== 'online_custom' && mode !== 'online' && mode !== 'ai' && mode !== 'ia' && mode !== 'local' && renderGameMenu()}
        {mode === 'spectator' && (
            <View style={{ position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, zIndex: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>👁️ Mode Spectateur</Text>
            </View>
        )}
        {mode === 'local' ? (
             // MODE LOCAL : Joueur 2 (Haut Droite Inversé)
             <View style={[styles.headerIA, { justifyContent: localConfig?.mode === 'tournament' ? 'space-between' : 'flex-end', alignItems: 'center' }]}>
                 {localConfig?.mode === 'tournament' && (
                     <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                         <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
                             Match {tournamentGameNumber} / {tournamentTotalGames}
                         </Text>
                         <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 2 }}>
                             <Text style={{ color: '#f1c40f', fontSize: 12, fontWeight: 'bold' }}>
                                 {tournamentScore[player1.color] || 0}
                             </Text>
                             <Text style={{ color: '#fff', fontSize: 12, marginHorizontal: 4 }}>-</Text>
                             <Text style={{ color: '#f1c40f', fontSize: 12, fontWeight: 'bold' }}>
                                 {tournamentScore[player2.color] || 0}
                             </Text>
                         </View>
                     </View>
                 )}
                 <View style={{ transform: [{ rotate: '180deg' }] }}>
                     {renderLocalPlayer(player2)}
                 </View>
             </View>
        ) : (
             // MODE PVP (Online / Live / AI) : Affichage normal
            (!gameOver || (mode !== 'online' && mode !== 'live' && mode !== 'spectator')) && (
            <View style={styles.headerPVP}>


                <View style={styles.playersWrapper}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      {renderPlayer(player1, currentPlayer === player1.color, bubbles.player1)}
                      {player1.country && (
                          <View style={{ alignItems: 'center', marginLeft: 10 }}>
                              <Text style={[styles.flagOutsideRight, { marginLeft: 0 }]}>{player1.country}</Text>
                              {(mode === 'online_custom' || mode === 'online' || mode === 'live' || mode === 'ai') && tournamentTotalGames > 1 && (
                                  <Text style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: 14 }}>
                                      {tournamentScore[player1.color] || 0}
                                  </Text>
                              )}
                          </View>
                      )}
                  </View>
                  <View style={{ alignItems: 'center' }}>
                      <Text style={styles.vsText}>VS</Text>
                      {(mode === 'online_custom' || mode === 'online' || mode === 'live' || mode === 'ai') && tournamentTotalGames > 1 && (
                          <View style={{ marginTop: 2, alignItems: 'center' }}>
                              <Text style={{ color: '#ccc', fontSize: 10 }}>
                                  Match {tournamentGameNumber}/{tournamentTotalGames}
                              </Text>
                          </View>
                      )}
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      {player2.country && (
                          <View style={{ alignItems: 'center', marginRight: 10 }}>
                              <Text style={[styles.flagOutsideLeft, { marginRight: 0 }]}>{player2.country}</Text>
                              {(mode === 'online_custom' || mode === 'online' || mode === 'live' || mode === 'ai') && tournamentTotalGames > 1 && (
                                  <Text style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: 14 }}>
                                      {tournamentScore[player2.color] || 0}
                                  </Text>
                              )}
                          </View>
                      )}
                      {renderPlayer(player2, currentPlayer === player2.color, bubbles.player2)}
                  </View>
                </View>
            </View>
            )
        )}
      </View>
      
      {/* Indicateur du tour actuel en mode IA */}
      {/* {mode === 'ai' && (
          <View style={styles.tourIndicateur}>
              <Text style={styles.tourTexte}>
                  {estTourIA() 
                      ? '🤖 Tour de l\'IA' 
                      : '👤 Votre tour'}
              </Text>
          </View>
      )} */}

      <View style={[styles.boardContainer, (mode === 'online' || mode === 'live') && { marginTop: gameOver ? -50 : 40 }]} onLayout={(e) => containerDimensions.current = e.nativeEvent.layout}>
        {waitingForNextRound && (
            <View style={styles.waitingOverlay}>
                <ActivityIndicator size="large" color="#f1c40f" />
                <Text style={styles.waitingText}>En attente de l'adversaire...</Text>
            </View>
        )}
        <PanGestureHandler
          enabled={isPanEnabled}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanHandlerStateChange}
          minPointers={1}
          maxPointers={1}
        >
          <Animated.View>
            <PinchGestureHandler
              onGestureEvent={onPinchGestureEvent}
              onHandlerStateChange={onPinchHandlerStateChange}
            >
              <Animated.View style={{ transform: [{ translateX }, { translateY }, { scale }] }}>
                <Svg width={BOARD_WIDTH} height={BOARD_HEIGHT}>
                {/* Fond du plateau pour lisibilité */}
                <Rect 
                    x={PADDING_LEFT - 10} 
                    y={PADDING_TOP - 10} 
                    width={(COLS - 1) * CELL_SIZE + 20} 
                    height={(ROWS - 1) * CELL_SIZE + 20} 
                    fill="rgba(255, 255, 255, 1)" // Couleur bois clair
                    rx="5"
                    onPress={() => setSelectedCell(null)} // Click background to cancel selection
                />

                {/* Lignes verticales et Lettres (A-R) */}
                {Array.from({ length: COLS }).map((_, i) => {
                    const x = PADDING_LEFT + i * CELL_SIZE;
                    const isRedCol = [0, 6, 12].includes(i);
                    return (
                        <React.Fragment key={`v-${i}`}>
                            <SvgText
                                x={x}
                                y={PADDING_TOP - 2}
                                fontSize="10"
                                fontWeight="bold"
                                fill={isRedCol ? "red" : "#000000ff"}
                                textAnchor="middle"
                            >
                                {LETTERS[i]}
                            </SvgText>
                            <SvgText
                                x={x}
                                y={PADDING_TOP + (ROWS - 1) * CELL_SIZE + 9}
                                fontSize="10"
                                fontWeight="bold"
                                fill={isRedCol ? "red" : "#000000ff"}
                                textAnchor="middle"
                            >
                                {LETTERS[i]}
                            </SvgText>
                            <Line
                                x1={x}
                                y1={PADDING_TOP}
                                x2={x}
                                y2={PADDING_TOP + (ROWS - 1) * CELL_SIZE}
                                stroke={isRedCol ? "red" : "#8B4513"}
                                strokeWidth={isRedCol ? "1.4" : "1"}
                            />
                        </React.Fragment>
                    );
                })}

                {/* Lignes horizontales et Numéros (1-30) */}
                {Array.from({ length: ROWS }).map((_, i) => {
                    const y = PADDING_TOP + i * CELL_SIZE;
                    const isRedRow = [0, 6, 12, 18, 24].includes(i);
                    return (
                        <React.Fragment key={`h-${i}`}>
                            <SvgText
                                x={PADDING_LEFT - 10}
                                y={y + 3}
                                fontSize="10"
                                fontWeight="bold"
                                fill={isRedRow ? "red" : "#fff"}
                                textAnchor="end"
                            >
                                {i + 1}
                            </SvgText>
                            <SvgText
                                x={PADDING_LEFT + (COLS - 1) * CELL_SIZE + 10}
                                y={y + 3}
                                fontSize="10"
                                fontWeight="bold"
                                fill={isRedRow ? "red" : "#fff"}
                                textAnchor="start"
                            >
                                {i + 1}
                            </SvgText>
                            <Line
                                x1={PADDING_LEFT}
                                y1={y}
                                x2={PADDING_LEFT + (COLS - 1) * CELL_SIZE}
                                y2={y}
                                stroke={isRedRow ? "red" : "#8B4513"}
                                strokeWidth={isRedRow ? "1.4" : "1"}
                            />
                        </React.Fragment>
                    );
                })}

                {/* Zones de clic (Intersections) */}
                {Array.from({ length: ROWS }).map((_, row) =>
                  Array.from({ length: COLS }).map((_, col) => (
                    <Circle
                      key={`touch-${row}-${col}`}
                      cx={PADDING_LEFT + col * CELL_SIZE}
                      cy={PADDING_TOP + row * CELL_SIZE}
                      r={CELL_SIZE / 2}
                      fill="transparent"
                      onPress={() => handlePress(row, col)}
                    />
                  ))
                )}

                {/* Pions placés */}
                {board.map((stone, index) => {
                  const cx = PADDING_LEFT + stone.col * CELL_SIZE;
                  const cy = PADDING_TOP + stone.row * CELL_SIZE;
                  const r = (CELL_SIZE / 2) * 0.6; // Réduction de la taille à 60% de la demi-cellule

                  if (stone.player === 'black') {
                    // Rond Rouge
                    return (
                      <Circle
                        key={index}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="#FF0000"
                        stroke="#8B0000"
                        strokeWidth="1"
                      />
                    );
                  } else {
                    // Croix Bleue
                    const crossSize = r * 0.8;
                    return (
                      <React.Fragment key={index}>
                        <Line
                          x1={cx - crossSize}
                          y1={cy - crossSize}
                          x2={cx + crossSize}
                          y2={cy + crossSize}
                          stroke="#0000FF"
                          strokeWidth="2" // Bordure un peu plus fine pour la petite taille
                          strokeLinecap="round"
                        />
                        <Line
                          x1={cx + crossSize}
                          y1={cy - crossSize}
                          x2={cx - crossSize}
                          y2={cy + crossSize}
                          stroke="#0000FF"
                          strokeWidth="2" // Bordure un peu plus fine pour la petite taille
                          strokeLinecap="round"
                        />
                      </React.Fragment>
                    );
                  }
                })}

                {/* Guides de visée (Crosshair) lors de la pré-sélection */}
                {selectedCell && (
                    <React.Fragment>
                        {/* Ligne Horizontale du guide */}
                        <Line
                            x1={PADDING_LEFT}
                            y1={PADDING_TOP + selectedCell.row * CELL_SIZE}
                            x2={PADDING_LEFT + (COLS - 1) * CELL_SIZE}
                            y2={PADDING_TOP + selectedCell.row * CELL_SIZE}
                            stroke="#FFD700" // Or/Jaune pour la visibilité
                            strokeWidth="2"
                            strokeDasharray="5, 5" // Pointillés
                            opacity={0.8}
                        />
                        {/* Ligne Verticale du guide */}
                        <Line
                            x1={PADDING_LEFT + selectedCell.col * CELL_SIZE}
                            y1={PADDING_TOP}
                            x2={PADDING_LEFT + selectedCell.col * CELL_SIZE}
                            y2={PADDING_TOP + (ROWS - 1) * CELL_SIZE}
                            stroke="#FFD700"
                            strokeWidth="2"
                            strokeDasharray="5, 5" // Pointillés
                            opacity={0.8}
                        />
                    </React.Fragment>
                )}

                {/* Ghost Stone (Pre-selection) */}
                {selectedCell && !board.some(s => s.row === selectedCell.row && s.col === selectedCell.col) && (
                    (() => {
                        const cx = PADDING_LEFT + selectedCell.col * CELL_SIZE;
                        const cy = PADDING_TOP + selectedCell.row * CELL_SIZE;
                        const r = (CELL_SIZE / 2) * 0.6;
                        
                        if (currentPlayer === 'black') {
                             return (
                                 <Circle
                                     cx={cx}
                                     cy={cy}
                                     r={r}
                                     fill="#FF0000"
                                     stroke="#8B0000"
                                     strokeWidth="1"
                                     opacity={0.5}
                                     onPress={() => handlePress(selectedCell.row, selectedCell.col)}
                                 />
                             );
                        } else {
                             const crossSize = r * 0.8;
                             return (
                                 <React.Fragment>
                                     <Line
                                         x1={cx - crossSize} y1={cy - crossSize}
                                         x2={cx + crossSize} y2={cy + crossSize}
                                         stroke="#0000FF"
                                         strokeWidth="2"
                                         strokeLinecap="round"
                                         opacity={0.5}
                                         onPress={() => handlePress(selectedCell.row, selectedCell.col)}
                                     />
                                     <Line
                                         x1={cx + crossSize} y1={cy - crossSize}
                                         x2={cx - crossSize} y2={cy + crossSize}
                                         stroke="#0000FF"
                                         strokeWidth="2"
                                         strokeLinecap="round"
                                         opacity={0.5}
                                         onPress={() => handlePress(selectedCell.row, selectedCell.col)}
                                     />
                                 </React.Fragment>
                             );
                        }
                    })()
                )}

                {/* Highlight Winning Line */}
                {winningLine && winningLine.length > 0 && (() => {
                    const sorted = [...winningLine].sort((a, b) => a.row - b.row || a.col - b.col);
                    const start = sorted[0];
                    const end = sorted[sorted.length - 1];
                    const x1 = PADDING_LEFT + start.col * CELL_SIZE;
                    const y1 = PADDING_TOP + start.row * CELL_SIZE;
                    const x2 = PADDING_LEFT + end.col * CELL_SIZE;
                    const y2 = PADDING_TOP + end.row * CELL_SIZE;
                    
                    return (
                        <React.Fragment>
                        <Line
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="#000000"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                        {/* Animated Skull on the 5th winning pawn (last placed in the winning line) */}
                        {/* Skull is now handled by Animated.View overlay below Svg */}
                        </React.Fragment>
                    );
                })()}

                {/* Highlight du dernier coup de l'IA */}
                {dernierCoupIA && configIA?.animationsActives && (
                    <Circle
                        cx={PADDING_LEFT + dernierCoupIA.col * CELL_SIZE}
                        cy={PADDING_TOP + dernierCoupIA.row * CELL_SIZE}
                        r={12}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={3}
                        opacity={0.7}
                    />
                )}
                </Svg>

                {/* Animated Skull Overlay */}
                {winningLine && winningLine.length > 0 && (() => {
                   const lastMove = board[board.length - 1];
                   if (lastMove && winningLine.some(wm => wm.row === lastMove.row && wm.col === lastMove.col)) {
                       const cx = PADDING_LEFT + lastMove.col * CELL_SIZE;
                       const cy = PADDING_TOP + lastMove.row * CELL_SIZE;
                       const size = CELL_SIZE * 0.8;
                       
                       return (
                           <Animated.Text
                               style={{
                                   position: 'absolute',
                                   left: cx - size / 2,
                                   top: cy - size / 2,
                                   width: size,
                                   height: size,
                                   fontSize: size * 0.8,
                                   textAlign: 'center',
                                   textAlignVertical: 'center',
                                   lineHeight: size, // Helps centering vertically on iOS
                                   transform: [{ scale: skullScale }],
                                   zIndex: 100
                               }}
                           >
                               💀
                           </Animated.Text>
                       );
                   }
                   return null;
                })()}
              </Animated.View>
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* Message de fin */}
      {gameOver && mode === 'ai' && (
        <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>
                {winner === (configIA.couleurs.joueur === 'black' ? 'black' : 'white') 
                    ? '🎉 Vous avez gagné !' 
                    : '😢 L\'IA a gagné !'}
            </Text>
        </View>
      )}

      {null}

      {(mode === 'online' || mode === 'online_custom' || mode === 'spectator' || mode === 'live') && (
        <>
            {/* Waiting Overlay */}
            {((params.isWaiting && mode !== 'live') || (mode === 'live' && !player2.id)) && !gameOver && (
                <View style={[styles.modalOverlay, { zIndex: 50, justifyContent: 'center', paddingBottom: 0 }]}>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 15, alignItems: 'center', width: '80%' }}>
                        <ActivityIndicator size="large" color="#f1c40f" style={{ marginBottom: 15 }} />
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>En attente d'un adversaire...</Text>
                        <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center' }}>
                            {mode === 'live' ? "La partie commencera dès qu'un joueur rejoindra la salle." : "Invitez un ami pour commencer la partie"}
                        </Text>
                        
                        {mode === 'live' && (
                            <View style={{ width: '100%', alignItems: 'center', marginTop: 20 }}>
                                <TouchableOpacity 
                                    style={{ width: '100%', padding: 12, backgroundColor: '#2ecc71', borderRadius: 8, marginBottom: 10, alignItems: 'center' }}
                                    onPress={() => {
                                        setInviteMode('online');
                                        setShowInviteModal(true);
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Inviter un joueur</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={{ width: '100%', padding: 12, backgroundColor: 'rgba(255, 59, 48, 0.8)', borderRadius: 8, alignItems: 'center' }}
                                    onPress={() => navigation.goBack()}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Quitter</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Invite Friend FAB - Only for Custom Online Games or Waiting State */}
            {(mode === 'online_custom' || params.isWaiting) && !gameOver && (
                <TouchableOpacity 
                    style={[styles.menuFab, { bottom: 240, backgroundColor: '#2ecc71' }]} 
                    onPress={() => setShowInviteModal(true)}
                >
                    <Ionicons name="person-add" size={30} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Menu FAB Logic Moved to renderFloatingMenu at the end */}
            {/* Chat FAB (Texte) - Standard Online Only */}
            {(mode === 'online' || mode === 'online_custom') && (
            <TouchableOpacity 
                style={styles.chatFab}
                onPress={() => setActiveModal('chat')}
            >
                <Ionicons name="chatbox-ellipses" size={30} color="#fff" />
            </TouchableOpacity>
            )}

            {/* Emoji FAB (Réactions) - Standard Online Only */}
            {(mode === 'online' || mode === 'online_custom') && (
            <TouchableOpacity 
                style={styles.emojiFab}
                onPress={() => setActiveModal('emoji')}
            >
                <Ionicons name="happy" size={30} color="#fff" />
            </TouchableOpacity>
            )}

            {/* Live Chat Overlay - Live & Spectator Only */}
            {(mode === 'live' || mode === 'spectator') && (
                <LiveChatOverlay 
                    messages={chatMessages}
                    onSendMessage={(text) => {
                        const msg = { 
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            type: 'texte', 
                            auteur: user?.pseudo || 'Moi', 
                            estMoi: true, 
                            contenu: text, 
                            timestamp: new Date() 
                        };
                        const socketData = { type: 'MESSAGE_TEXTE', message: text };
                        envoyerMessageChat(msg, socketData);
                    }}
                    onSendReaction={(emoji) => {
                        const msg = { 
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            type: 'emoji', 
                            auteur: user?.pseudo || 'Moi', 
                            estMoi: true, 
                            contenu: emoji, 
                            timestamp: new Date() 
                        };
                        const socketData = { type: 'MESSAGE_EMOJI', emoji: emoji };
                        envoyerMessageChat(msg, socketData);
                    }}
                    currentUser={user}
                />
            )}

            {/* Voice Chat - Not for Custom Online Games or Standard Online Games */}
            {mode !== 'online_custom' && mode !== 'online' && (
                <View style={styles.voiceContainer}>
                     <VoiceChat
                        gameId={params.gameId}
                        userId={user?._id || user?.id}
                        socket={socket}
                        isSpectator={mode === 'spectator'}
                     />
                </View>
            )}

            {/* Modal Commun */}
            <Modal
                visible={activeModal !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={[styles.chatModalOverlay, { paddingBottom: keyboardHeight > 0 ? keyboardHeight : 100 }]}>
                    <View style={styles.chatModalContent}>
                        <View style={styles.chatModalHeader}>
                            <Text style={styles.chatModalTitle}>
                                {activeModal === 'chat' ? 'Discussion' : 'Réactions'}
                            </Text>
                            <TouchableOpacity onPress={() => setActiveModal(null)}>
                                <Ionicons name="close-circle" size={30} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                        <ChatEnLigne
                            matchId={params.gameId}
                            monPseudo={user?.pseudo || 'Vous'}
                            adversairePseudo={params.opponent?.pseudo || 'Adversaire'}
                            onEnvoyerMessage={envoyerMessageChat}
                            messages={chatMessages}
                            displayMode={activeModal === 'chat' ? 'text' : 'emoji'}
                        />
                    </View>
                </View>
            </Modal>
        </>
      )}

      {/* FOOTER USER PROFILE (MODE LOCAL) */}
      {mode === 'local' && (
        <View style={{ 
            position: 'absolute', 
            bottom: -5, 
            width: '100%', 
            padding: 20, 
            flexDirection: 'row',
            justifyContent: 'flex-start'
        }}>
            {/* Joueur 1 (Bas Gauche) */}
            {renderLocalPlayer(player1)}
        </View>
      )}
      {/* SPECTATOR UI OVERLAY */}
      {mode === 'spectator' && reduxPlayers.me && reduxPlayers.opponent && (
          <View style={styles.spectatorOverlay}>
              <View style={styles.spectatorPlayers}>
                <PlayerProfileCard player={reduxPlayers.me} isMe={true} />
                <Text style={styles.vsText}>VS</Text>
                <PlayerProfileCard player={reduxPlayers.opponent} isMe={false} />
              </View>
              {reduxSpectators.length > 0 && (
                  <View style={styles.spectatorList}>
                      <Text style={styles.spectatorLabel}>Spectateurs:</Text>
                      <FlatList 
                          data={reduxSpectators}
                          horizontal
                          renderItem={({item}) => <PlayerProfileCard player={item} style={{ transform: [{ scale: 0.8 }] }} />}
                          keyExtractor={item => item.id}
                      />
                  </View>
              )}
          </View>
      )}

      <CoinsFeedback 
          visible={feedback.visible} 
          amount={feedback.amount} 
          onFinish={() => setFeedback({ visible: false, amount: 0 })}
      />
      {renderInviteModal()}
      {renderResultModal()}
      {renderFloatingMenu()}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  spectatorOverlay: {
      position: 'absolute',
      top: 50,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 20,
  },
  spectatorPlayers: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      padding: 10,
  },
  vsText: {
      color: '#fff',
      fontWeight: 'bold',
      marginHorizontal: 10,
      fontSize: 16,
      fontStyle: 'italic',
  },
  spectatorList: {
      marginTop: 10,
      alignItems: 'center',
  },
  spectatorLabel: {
      color: '#aaa',
      fontSize: 10,
      marginBottom: 2,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    paddingTop: 40,
    marginBottom: 10,
    zIndex: 10
  },
  headerPVP: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingBottom: 10,
  },
  headerIA: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(4, 28, 85, 0.5)',
    borderRadius: 10,
    marginRight: 10,
  },


  playersWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  playerContainer: {
    position: 'relative',
    alignItems: 'center',
    padding: 5,
    borderRadius: 10,
    width: width * 0.3,
    height: 125,
    borderWidth: 1,
    borderColor: '#f1c40f6c',
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
  },
  activePlayer: {
    height: 125,
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderWidth: 1,
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 5,
    left: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffffff',
  },
  flag: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    fontSize: 16,
  },
  playerName: {
    color: '#fff',
    fontWeight: 'bold',
    bottom: 45,
    right: 20,
    fontSize: 12,
    marginTop: 5,
    maxWidth: 80,
    textAlign: 'center',
  },
  voiceContainer: {
    position: 'absolute',
    top: 100, // Ajustez selon votre layout
    right: 10,
    zIndex: 20,
  },
  playerCoinsContainer: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  playerCoinsText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timer: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timerWarning: {
    color: '#e74c3c',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  vsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  turnText: {
    color: '#fff',
    fontSize: 18,
    marginRight: 10,
  },
  playerIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  hintText: {
    color: '#ccc',
    fontSize: 14,
  },
  // Nouveaux styles pour IA
  joueurContainer: {
    alignItems: 'center',
    flex: 1
  },
  joueurLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4
  },
  avatarJoueur: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6'
  },
  avatarJoueurTexte: {
    fontSize: 24
  },
  vs: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginHorizontal: 8
  },
  profilIAContainer: {
     flex: 0.5
    // maxWidth: '55%',
  },
  tourIndicateur: {
    backgroundColor: '#dbeafe',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  tourTexte: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d4ed8'
  },
  gameOverContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 24,
    borderRadius: 16,
    width: 300,
    zIndex: 20
  },
  gameOverText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  },
  footerIA: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    maxWidth: '65%',
  },
  userProfileContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  avatarContainerBig: {
    position: 'relative',
    marginRight: 10,
  },
  avatarBig: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  flagBig: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 18,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  textContainer: {
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 1,
  },
  pseudoBig: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  turnTextSmall: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  pawnIndicatorContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pawnRedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FF0000',
  },
  activeUserContainer: {
    borderColor: '#FFD700',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 15
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#eee',
  },
  modalPseudo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  modalFlag: {
    fontSize: 30,
    marginBottom: 20,
  },
  friendButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 10,
    alignItems: 'center',
  },
  friendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16,
  },
  flagOutsideRight: {
    fontSize: 30,
    marginLeft: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  flagOutsideLeft: {
    fontSize: 30,
    marginRight: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  gameMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  menuContent: {
    backgroundColor: '#041c55',
    padding: 20,
    borderRadius: 20,
    width: '70%',
    marginLeft: 20,
    marginBottom: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuText: {
    fontSize: 18,
    marginLeft: 15,
    color: '#ffffffff',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
    width: '100%',
  },
  closeMenuText: {
    color: '#ff0000ff',
    
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
    fontWeight: 'bold',
  },
  timeoutsContainer: {
    marginTop: 2,
    bottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeoutsTexte: {
    fontSize: 10,
    fontWeight: '600',
    color: '#991b1b',
  },
  chronoPrincipal: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
    bottom: 25,
  },
  chronoPrincipalTexte: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  avertissementIA: {
      backgroundColor: '#fef3c7',
      padding: 8,
      borderRadius: 8,
      marginTop: 8,
      borderWidth: 2,
      borderColor: '#f59e0b'
  },
  avertissementTexte: {
      fontSize: 12,
      fontWeight: '600',
      color: '#92400e',
      textAlign: 'center'
  },
  waitingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      borderRadius: 10,
  },
  waitingText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 20,
  },
  // Chat Styles
  chatFab: {
    position: 'absolute',
    bottom: 20,
    right: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 100
  },
  emojiFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eab308',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 100
  },
  voiceContainer: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    zIndex: 100,
  },
  menuFab: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 100
  },
  liveMenuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 99,
  },
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  chatModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '80%',
    height: 300,
    elevation: 10,
    overflow: 'hidden'
  },
  chatModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  chatModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  bubbleContainer: {
    position: 'absolute',
    bottom: -50,
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 50,
    maxWidth: 200,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bubbleText: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    // fontWeight: '500',
  },
  bubbleEmoji: {
    fontSize: 28,
  },
  // Result Modal Styles
  modalOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
    zIndex: 1000,
  },
  resultCard: {
    backgroundColor: 'rgba(31, 52, 100, 1)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '95%',
    maxWidth: 500,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  emojiResult: {
    fontSize: 60,
    marginBottom: 10,
  },
  titreResult: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  adversaireResult: {
    fontSize: 16,
    color: '#ffffffff',
    marginBottom: 20,
  },
  messageResult: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  gainsContainer: {
    backgroundColor: '#f1c40fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  gainsLabel: {
    fontSize: 14,
    color: '#ffffffff',
    marginBottom: 4,
  },
  gainsMontant: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffffff',
  },
  perteContainer: {
    backgroundColor: '#f1c40fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  perteLabel: {
    fontSize: 14,
    color: '#ffffffff',
    marginBottom: 4,
  },
  perteMontant: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffffff',
  },
  raisonContainer: {
    backgroundColor: '#ecfccb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  raisonDefaite: {
      backgroundColor: '#fee2e2',
  },
  raisonTexte: {
      fontSize: 14,
      fontWeight: '600',
      color: '#3f6212',
      textAlign: 'center'
  },
  raisonTexteDefaite: {
      color: '#991b1b',
  },
  statsContainer: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20
  },
  statsLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4
  },
  statsTaux: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 2
  },
  statsParties: {
    fontSize: 12,
    color: '#9ca3af'
  },
  boutonsResult: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  boutonRejouer: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonMenuResult: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonTexteResult: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
});

export default GameScreen;
