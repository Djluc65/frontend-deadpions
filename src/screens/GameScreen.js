import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ImageBackground, Dimensions, ScrollView, Animated, Image, Modal, Keyboard, Platform, Share, ActivityIndicator, FlatList, AppState, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import EmojiAnimation from '../components/EmojiAnimation';
import LottieView from "lottie-react-native";
import { useSelector, useDispatch } from 'react-redux';
import Svg, { Line, Circle, Text as SvgText, Rect, Defs, LinearGradient, RadialGradient, Stop, Path, G } from 'react-native-svg';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { API_URL } from '../config';
import { calculerCoupIA } from '../utils/IAEngine';
import { socket } from '../utils/socket';
import { updateUser, updateUserCoins } from '../redux/slices/authSlice';
import { setPlayers, setSpectators } from '../redux/slices/gameSlice';
import { toggleSound } from '../redux/slices/settingsSlice';
import { AudioController } from '../utils/AudioController';
import { playButtonSound } from '../utils/soundManager';
import { getAvatarSource } from '../utils/avatarUtils';
import { getEmojiSource } from '../utils/emojis';
import ProfilIA from './ProfilIA';
import ChatEnLigne from '../components/ChatEnLigne';
import VoiceChat from '../components/VoiceChat';
import LiveChatOverlay from '../components/LiveChatOverlay';
import { useCoinsContext } from '../context/CoinsContext';
import PlayerProfileCard from '../components/PlayerProfileCard';
import PlayerHUD from '../components/PlayerHUD';
import CustomAlert from '../components/CustomAlert';
import VersusAnimation from '../components/VersusAnimation';
import NextMatchModal from '../components/NextMatchModal';
import FlyingEmoji from '../components/FlyingEmoji';
import PionSVG from '../components/PionSVG';
import { useAdManager } from '../ads/AdSystem';
import { appAlert } from '../services/appAlert';
import { modalTheme } from '../utils/modalTheme';
import { getTournamentProgress } from '../utils/constants';
import { T } from '../utils/theme';

import { isTablet, getResponsiveSize, SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/responsive';
import ResponsiveWrapper from '../components/ResponsiveWrapper';

import { useResponsive } from '../hooks/useResponsive';

const width = SCREEN_WIDTH;
const height = SCREEN_HEIGHT;

const LETTERS = 'ABCDEFGHIJKLMNOPQRST'.split('');

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

const AnimatedG = Animated.createAnimatedComponent(G);

const Pawn = ({ color, x, y, r, opacity = 1, onPress, skin }) => {
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, []);

    if (skin) {
        // Map 'black' -> 'red', 'white' -> 'blue' for PionSVG colors
        const displayColor = color === 'black' ? 'red' : 'blue';
        return (
            <AnimatedG 
                style={{ transform: [{ translateX: x }, { translateY: y }, { scale }] }}
                opacity={opacity}
                onPress={onPress}
            >
                <G x={-r} y={-r}>
                   <PionSVG type={skin} color={displayColor} size={r * 2} />
                </G>
            </AnimatedG>
        );
    }

    if (color === 'black') {
        const reducedR = r * 0.8; // Réduction de taille pour pion rouge
        return (
            <AnimatedG 
                style={{ transform: [{ translateX: x }, { translateY: y }, { scale }] }}
                opacity={opacity}
                onPress={onPress}
            >
                {/* Shadow */}
                <Circle cx={0} cy={2} r={reducedR} fill="black" opacity={0.2} />
                {/* Main Body */}
                <Circle cx={0} cy={0} r={reducedR} fill="url(#redGradient)" stroke="#500000" strokeWidth={1} />
                {/* Shine/Highlight */}
                <Circle cx={-reducedR*0.3} cy={-reducedR*0.3} r={reducedR*0.4} fill="white" opacity={0.3} />
            </AnimatedG>
        );
    } else {
        const s = r * 0.9 * 0.8; // Réduction de taille pour pion bleu
        return (
            <AnimatedG 
                style={{ transform: [{ translateX: x }, { translateY: y }, { scale }] }}
                opacity={opacity}
                onPress={onPress}
            >
                {/* Shadow */}
                <Line x1={-s} y1={-s+2} x2={s} y2={s+2} stroke="black" strokeWidth={4} strokeLinecap="round" opacity={0.2} />
                <Line x1={s} y1={-s+2} x2={-s} y2={s+2} stroke="black" strokeWidth={4} strokeLinecap="round" opacity={0.2} />
                
                {/* Body */}
                <Line x1={-s} y1={-s} x2={s} y2={s} stroke="url(#blueGradient)" strokeWidth={4} strokeLinecap="round" />
                <Line x1={s} y1={-s} x2={-s} y2={s} stroke="url(#blueGradient)" strokeWidth={4} strokeLinecap="round" />
            </AnimatedG>
        );
    }
};

const GameScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { width, height } = useResponsive();
  
  // Configuration du plateau dynamique (Phase 2 Item 6)
  const isTab = width >= 600;
  const COLS = isTab ? 20 : 15;
  const ROWS = 19;
  const PADDING_LEFT = getResponsiveSize(40);
  const PADDING_TOP = getResponsiveSize(35);
  const PADDING_RIGHT = getResponsiveSize(40);
  const PADDING_BOTTOM = getResponsiveSize(35);

  const CELL_DIVISOR = width >= 1024 ? 11.5 : isTab ? 18.5 : 13.5;
  const CELL_SIZE = Math.min(width * 0.9, height * 0.7) / CELL_DIVISOR;
  const BOARD_WIDTH = Math.max(width, PADDING_LEFT + (COLS - 1) * CELL_SIZE + PADDING_RIGHT);
  const BOARD_HEIGHT = PADDING_TOP + (ROWS - 1) * CELL_SIZE + PADDING_BOTTOM;

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
  const { setFeedback, debit, credit, refund } = useCoinsContext();
  const { showAds, showRewarded } = useAdManager();
  const user = useSelector(state => state.auth.user);
  const { players: reduxPlayers, spectators: reduxSpectators } = useSelector(state => state.game);
  const canBet = Boolean(user?.isPremium || user?.isEarlyAccess);
  if ((mode === 'ai' || mode === 'ia') && !canBet && (params.betAmount || 0) > 0) {
      params.betAmount = 0;
  }

  const getPlayerId = (p) => p?._id || p?.id;
  const currentUserId = getPlayerId(user);

  const [playersData, setPlayersData] = useState(params.players || {});
  const [timeControlSetting, setTimeControlSetting] = useState(() => {
    const v = params.timeControl ?? configIA?.timeControl ?? localConfig?.timeControl;
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  });

  const playersDataRef = useRef(playersData);
  const timeControlSettingRef = useRef(timeControlSetting);
  const userRef = useRef(user);
  const boardRef = useRef(board); // Ref for board to access in socket callbacks
  
  useEffect(() => {
      playersDataRef.current = playersData;
      timeControlSettingRef.current = timeControlSetting;
      userRef.current = user;
      boardRef.current = board;
  }, [playersData, timeControlSetting, user, board]);

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

  const [opponent, setOpponent] = useState(params.opponent || null);
  const [isWaitingState, setIsWaitingState] = useState(!!(params && params.isWaiting));

  const iaColors = configIA?.couleurs || { joueur: 'black', ia: 'white' };

  // Define players early to avoid ReferenceError in useEffect
  const player1 = {
    id: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? getPlayerId(playersData?.black) : currentUserId,
    pseudo: mode === 'local' ? t('game.player1') : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.black?.pseudo : (user?.pseudo || t('game.player1')),
    avatar: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.black?.avatar : user?.avatar,
    country: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.black?.country : user?.country,
    coins: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? playersData?.black?.coins : ((mode === 'online_custom' || mode === 'live') && isLocalPlayerWhite ? playersData?.white?.coins : user?.coins),
    level: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite) ? (playersData?.black?.niveau || playersData?.black?.level) : (user?.niveau || user?.level),
    color: mode === 'ai' 
      ? iaColors.joueur 
      : mode === 'local'
      ? (localConfig.player1Color || 'black')
      : mode === 'online' 
      ? (getPlayerId(playersData?.black)?.toString() === currentUserId?.toString() ? 'black' : 'white')
      : (mode === 'spectator' || mode === 'online_custom' || mode === 'live') ? (isLocalPlayerWhite ? 'white' : 'black') : 'black'
  };

  const handleNextMatchConfirm = () => {
    if (mode === 'spectator') return;
    playButtonSound();
    if (mode === 'online' || mode === 'online_custom' || mode === 'live') {
      isRematching.current = true;
      AudioController.setRematchMode(true);
      setWaitingForNextRound(true);
      setCurrentPlayer(null);
      setSelectedCell(null);
      socket.emit('player_ready_next_round', {
        gameId: params.gameId,
        userId: user._id
      });
    } else if (mode === 'ai' || mode === 'ia') {
      isRematching.current = true;
      AudioController.setRematchMode(true);
      setNextMatchVisible(false);
      if (nextAiConfig) {
        navigation.replace('Game', { modeJeu: 'ia', configIA: nextAiConfig, betAmount: params.betAmount || 0 });
      } else {
        // Fallback: relancer avec la config IA courante si la prochaine n'est pas définie
        navigation.replace('Game', { modeJeu: 'ia', configIA: configIA, betAmount: params.betAmount || 0 });
      }
    }
  };

  const player2 = {
    id: ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite)
      ? getPlayerId(playersData?.white)
      : (mode === 'online'
        ? (getPlayerId(opponent) || getPlayerId(route.params?.opponent))
        : getPlayerId(playersData?.black)),
    pseudo: mode === 'ai'
      ? t('game.ai_name')
      : mode === 'local'
      ? t('game.player2')
      : mode === 'online'
      ? (opponent?.pseudo || route.params?.opponent?.pseudo || t('game.opponent'))
      : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite)
        ? (playersData?.white?.pseudo || t('game.waiting_short'))
        : (playersData?.black?.pseudo || ((mode === 'online_custom' || mode === 'live' || mode === 'spectator') ? t('game.waiting_short') : t('game.player2'))),
    avatar: mode === 'online'
      ? (opponent?.avatar || route.params?.opponent?.avatar)
      : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite)
        ? playersData?.white?.avatar
        : playersData?.black?.avatar,
    country: mode === 'online'
      ? (opponent?.country || route.params?.opponent?.country)
      : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite)
        ? playersData?.white?.country
        : playersData?.black?.country,
    coins: opponentCoins ?? (mode === 'online'
      ? (opponent?.coins ?? route.params?.opponent?.coins)
      : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite)
        ? playersData?.white?.coins
        : playersData?.black?.coins),
    level: mode === 'online'
      ? (opponent?.niveau || opponent?.level || route.params?.opponent?.niveau || route.params?.opponent?.level)
      : ((mode === 'spectator' || mode === 'online_custom' || mode === 'live') && !isLocalPlayerWhite)
        ? (playersData?.white?.niveau || playersData?.white?.level)
        : (playersData?.black?.niveau || playersData?.black?.level),
    color: mode === 'ai' 
      ? iaColors.ia 
      : mode === 'local'
      ? (localConfig.player2Color || 'white')
      : mode === 'online'
        ? (getPlayerId(playersData?.black)?.toString() === currentUserId?.toString() ? 'white' : 'black')
        : (mode === 'spectator' || mode === 'online_custom' || mode === 'live') ? (isLocalPlayerWhite ? 'black' : 'white') : 'white'
  };

  const getSkin = (stoneColor) => {
    if (player1.color === stoneColor) {
      return user?.pawnSkin;
    }
    if (player2.color === stoneColor) {
      const opponentData = stoneColor === 'black' ? playersData?.black : playersData?.white;
      return opponentData?.pawnSkin;
    }
    return null;
  };


  // Custom Alert State
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [] });
  
  // Tournament Next Match Modal State
  const [nextMatchVisible, setNextMatchVisible] = useState(false);
    const [nextMatchTimer, setNextMatchTimer] = useState(30);
    const [hasClickedNextMatch, setHasClickedNextMatch] = useState(false);
    const nextMatchIntervalRef = useRef(null);
  const [alertData, setAlertData] = useState(null);
  const [roundOverData, setRoundOverData] = useState(null);
  const [nextAiConfig, setNextAiConfig] = useState(null);
  // Waiting message for spectators while opponent left / creator choosing
  const [waitingMessage, setWaitingMessage] = useState(null);
  const [liveStartedAtMs, setLiveStartedAtMs] = useState(() => {
      const ts = Number(params?.liveStartedAt);
      return (mode === 'live' && Number.isFinite(ts) && ts > 0) ? ts : null;
  });
  const [liveElapsedSec, setLiveElapsedSec] = useState(0);
  const liveElapsedIntervalRef = useRef(null);
  const [bottomPlayerHudHeight, setBottomPlayerHudHeight] = useState(0);

  // Versus Animation State
  const [showVersusAnim, setShowVersusAnim] = useState(false);
  const hasShownVersus = useRef(false);

  useEffect(() => {
    const isPlayer2Ready = player2 && player2.pseudo && player2.pseudo !== t('game.waiting_short');
    const shouldShow = 
        (mode === 'ai') || 
        (mode === 'online') || 
        (mode === 'online_custom' && isPlayer2Ready) || 
        (mode === 'live' && isPlayer2Ready);

    if (shouldShow && !hasShownVersus.current) {
        setShowVersusAnim(true);
        hasShownVersus.current = true;
    }
  }, [mode, player2?.pseudo]);

  const isExitingRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastHandledActionRequestIdRef = useRef(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const showAlert = (title, message, buttons = []) => {
      if (isExitingRef.current) return;
      if (!isMountedRef.current) return;
      setCustomAlert({ visible: true, title, message, buttons });
  };

  const formatElapsed = (seconds) => {
      const s = Math.max(0, Math.floor(Number(seconds) || 0));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      const two = (n) => `${n}`.padStart(2, '0');
      if (h > 0) return `${h}:${two(m)}:${two(ss)}`;
      return `${m}:${two(ss)}`;
  };

  useEffect(() => {
      if (liveElapsedIntervalRef.current) {
          clearInterval(liveElapsedIntervalRef.current);
          liveElapsedIntervalRef.current = null;
      }

      if (mode !== 'live' || !liveStartedAtMs || gameOver) {
          setLiveElapsedSec(0);
          return;
      }

      const tick = () => {
          const diff = Date.now() - liveStartedAtMs;
          setLiveElapsedSec(Math.max(0, Math.floor(diff / 1000)));
      };

      tick();
      liveElapsedIntervalRef.current = setInterval(tick, 1000);
      return () => {
          if (liveElapsedIntervalRef.current) {
              clearInterval(liveElapsedIntervalRef.current);
              liveElapsedIntervalRef.current = null;
          }
      };
  }, [mode, liveStartedAtMs, gameOver]);



  // Disable swipe back on iOS to prevent accidental exit
  useEffect(() => {
    navigation.setOptions({
        gestureEnabled: false,
    });
  }, [navigation]);

  // Synchroniser les pièces utilisateur Redux avec les paramètres de jeu si disponibles (corrige l'affichage initial après la mise)
  useEffect(() => {
    if ((mode === 'online' || mode === 'online_custom' || mode === 'live') && params.players) {
        const myId = user?._id || user?.id;
        let myGameCoins = null;
        
        // Trouver mes pièces dans params.players
        if (getPlayerId(params.players.black)?.toString() === myId?.toString()) {
            myGameCoins = params.players.black.coins;
        } else if (getPlayerId(params.players.white)?.toString() === myId?.toString()) {
            myGameCoins = params.players.white.coins;
        }

        // Si trouvé et différent des pièces utilisateur actuelles, mettre à jour Redux
        if (myGameCoins !== null && myGameCoins !== undefined && user?.coins !== myGameCoins) {
            console.log(`[GameScreen] Syncing initial coins from params: ${user?.coins} -> ${myGameCoins}`);
            dispatch(updateUserCoins(myGameCoins));
        }
    }
  }, [params.players, mode]);

    // EFFET : Déduction de la mise pour le mode IA
    useEffect(() => {
        if ((mode === 'ai' || mode === 'ia') && params.betAmount > 0) {
            const isTournament = params.configIA?.mode === 'tournament';
            const gameNumber = params.configIA?.tournamentSettings?.gameNumber || 1;
            
            // Si c'est un tournoi, on ne paie qu'au premier match
            if (isTournament && gameNumber > 1) {
                return;
            }

            const currentCoins = user?.coins || 0;
            if (params.betAmount > currentCoins) {
                const manque = params.betAmount - currentCoins;
                showAlert(
                    t('game.insufficient_balance'),
                    t('game.missing_coins', { amount: Number(manque).toLocaleString() }),
                    [
                        { text: t('game.shop'), onPress: () => navigation.navigate('Home', { screen: 'Magasin' }) },
                        { text: t('common.back'), style: 'cancel', onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')) }
                    ]
                );
                return;
            }

            // Déduire la mise au début de la partie (ou du tournoi)
            debit(params.betAmount, isTournament ? 'Inscription Tournoi IA' : 'Mise partie IA', { 
                gameId: params.gameId || 'local_ia',
                mode: 'ia',
                isTournament
            }).catch(err => {
                const message = err?.message || '';
                if (typeof message === 'string' && message.includes('Solde insuffisant')) {
                    const missingMatch = message.match(/Manque\s+(\d+)\s+coins/i);
                    const manque = missingMatch ? Number(missingMatch[1]) : null;
                    showAlert(
                        t('game.insufficient_balance'),
                        manque !== null ? t('game.missing_coins', { amount: Number(manque).toLocaleString() }) : t('game.not_enough_coins'),
                        [
                            { text: t('game.shop'), onPress: () => navigation.navigate('Home', { screen: 'Magasin' }) },
                            { text: t('common.back'), style: 'cancel', onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')) }
                        ]
                    );
                    return;
                }

                console.log('Débit IA échoué:', err);
                showAlert(t('common.error'), t('game.bet_debit_failed'), [
                    { text: t('common.back'), style: 'cancel', onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')) }
                ]);
            });
        }
    }, []);

  // Initialiser l'état du jeu Redux
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
  
  // État de pré-sélection
  const [selectedCell, setSelectedCell] = useState(null); // { row, col }

  // Effacer la sélection au changement de tour ou fin de partie
  useEffect(() => {
      setSelectedCell(null);
  }, [currentPlayer, gameOver, mode]);
  
  // Modal state for player profile
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'chat', 'emoji', null
  const [flyingEmojis, setFlyingEmojis] = useState([]);
  const [flyingTexts, setFlyingTexts] = useState([]);

  const triggerFlyingEmoji = (emoji, senderId) => {
    // Only in PVP modes (Online, Live, Spectator)
    if (mode !== 'online' && mode !== 'online_custom' && mode !== 'live' && mode !== 'spectator') return;

    // Determine positions
    // Player 1 (Left) - Player 2 (Right)
    const player1Pos = { x: SCREEN_WIDTH * 0.25, y: getResponsiveSize(100) };
    const player2Pos = { x: SCREEN_WIDTH * 0.75, y: getResponsiveSize(100) };
    
    let start, end;
    
    // Check if sender is Player 1
    // Note: player1.id might be string or number
    if (senderId?.toString() === player1.id?.toString()) {
        start = player1Pos;
        end = player2Pos;
    } else if (senderId?.toString() === player2.id?.toString()) {
        start = player2Pos;
        end = player1Pos;
    } else {
        // Fallback or ignore (e.g. spectator chat)
        return;
    }
    
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setFlyingEmojis(prev => [...prev, { id, emoji, start, end }]);
    
    // Cleanup after animation (1.5s + buffer)
    setTimeout(() => {
        setFlyingEmojis(prev => prev.filter(e => e.id !== id));
    }, 2000);
  };

  const triggerFlyingText = (text, senderId) => {
    if (mode !== 'online' && mode !== 'online_custom') return;
    const message = typeof text === 'string' ? text.trim() : '';
    if (!message) return;

    const player1Pos = { x: SCREEN_WIDTH * 0.25, y: getResponsiveSize(100) };
    const player2Pos = { x: SCREEN_WIDTH * 0.75, y: getResponsiveSize(100) };

    let start, end;
    if (senderId?.toString() === player1.id?.toString()) {
        start = player1Pos;
        end = player2Pos;
    } else if (senderId?.toString() === player2.id?.toString()) {
        start = player2Pos;
        end = player1Pos;
    } else {
        return;
    }

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setFlyingTexts(prev => [...prev, { id, text: message, start, end }]);
    setTimeout(() => {
        setFlyingTexts(prev => prev.filter(e => e.id !== id));
    }, 2000);
  };
  const [chatMessages, setChatMessages] = useState([]);
  const [showLobbyMessages, setShowLobbyMessages] = useState(true);
  const [bubbles, setBubbles] = useState({ player1: null, player2: null });
  const [rematchRequested, setRematchRequested] = useState(false);
  const isRematching = useRef(false);
  const pendingReplaceGameIdRef = useRef(null);
  const listenersReadyRef = useRef(false);
  const hasJoinedRoomRef = useRef(false);
  const lastUserRoomJoinedRef = useRef(null);
  const lastLiveRoomJoinedRef = useRef(null);
  const syncReadyRef = useRef(true);

  useEffect(() => {
    if (bubbles.player1) {
        const timer = setTimeout(() => {
            setBubbles(prev => ({ ...prev, player1: null }));
        }, 4000);
        return () => clearTimeout(timer);
    }
  }, [bubbles.player1]);

  // Ensure socket is identified for online modes (user room only)
  useEffect(() => {
    const userId = user?._id || user?.id;
    const shouldJoin = Boolean(userId) && (mode === 'online' || mode === 'online_custom' || mode === 'spectator' || mode === 'live');
    if (!shouldJoin) {
      lastUserRoomJoinedRef.current = null;
      return;
    }
    if (!socket.connected) socket.connect();

    const join = () => {
      const id = user?._id || user?.id;
      if (!id) return;
      if (lastUserRoomJoinedRef.current === id) return;
      socket.emit('join_user_room', id);
      lastUserRoomJoinedRef.current = id;
    };

    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [user?._id, user?.id, mode]);

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

  // Timer state (seconds left for current player) + timeouts
  const timeControl = timeControlSetting;
  const [timeLeft, setTimeLeft] = useState(timeControl);
  const [timeouts, setTimeouts] = useState({ black: 0, white: 0 });
  const timeLeftRef = useRef(timeLeft);
  const turnDeadlineRef = useRef(null);
  const lastTurnKeyRef = useRef(null);
  const timeoutHandledRef = useRef(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const setTurnTimer = useCallback((seconds) => {
    if (seconds === null || seconds === undefined) {
      turnDeadlineRef.current = null;
      timeoutHandledRef.current = false;
      setTimeLeft(null);
      return;
    }

    const n = Number(seconds);
    if (!Number.isFinite(n) || n <= 0) {
      turnDeadlineRef.current = null;
      timeoutHandledRef.current = false;
      setTimeLeft(null);
      return;
    }

    const sec = Math.max(1, Math.floor(n));
    turnDeadlineRef.current = Date.now() + sec * 1000;
    timeoutHandledRef.current = false;
    setTimeLeft(sec);
  }, []);

  const getInitialPlayer = () => {
    if (params.currentTurn) return params.currentTurn;
    if (mode === 'ai') {
        const premier = configIA?.premierJoueur;
        if (premier === 'ia') {
            return iaColors.ia;
        } else {
            return iaColors.joueur;
        }
    }
    if (mode === 'local') {
        return localConfig.startingPlayer || 'black';
    }
    return 'black';
  };

  const [currentPlayer, setCurrentPlayer] = useState(getInitialPlayer());
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [statsIA, setStatsIA] = useState(null);

  // Joue le son correspondant au résultat dès que la fenêtre de résultat s'affiche.
  useEffect(() => {
    if (!showResultModal || !resultData) return;
    const { victoire, reason, isTournament, tournamentOver, tournamentScore: ts, type } = resultData;
    const isDraw = reason === 'draw' || reason === 'cancel_by_agreement' ||
      ((type === 'local' || type === 'ia' || type === 'ai') && isTournament && tournamentOver && ts?.black === ts?.white);
    AudioController.playResultSound(victoire, isDraw, isSoundEnabled);
  }, [showResultModal, resultData]);
  
  // Nouveaux états pour l'IA
  const [iaEnReflexion, setIaEnReflexion] = useState(false);
  const [messageIA, setMessageIA] = useState('');
  const [dernierCoupIA, setDernierCoupIA] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [isSpectatorMode, setIsSpectatorMode] = useState(false);

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
      if (pendingReplaceGameIdRef.current && params?.gameId && params.gameId === pendingReplaceGameIdRef.current) {
        pendingReplaceGameIdRef.current = null;
      }
  }, [params]);

  // --- ONLINE MODE LOGIC ---
  useEffect(() => {
    if (mode !== 'online' && mode !== 'spectator' && mode !== 'online_custom' && mode !== 'live') return;

    const initialParams = paramsRef.current;

    if (mode === 'spectator' && initialParams.gameId) {
        socket.emit('join_spectator', { gameId: initialParams.gameId });
    } else if (mode === 'live' && initialParams.gameId) {
        if (lastLiveRoomJoinedRef.current !== initialParams.gameId) {
            socket.emit('join_live_room', { gameId: initialParams.gameId });
            lastLiveRoomJoinedRef.current = initialParams.gameId;
        }
    }

    const handleSpectatorJoined = (data) => {
        setBoard(data.board || []);
        setCurrentPlayer(data.currentTurn);
        setSelectedCell(null);
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
        if (data.players) {
            const pBlack = data.players.black;
            const pWhite = data.players.white;
            const isBlackMe = (getPlayerId(pBlack)?.toString() === currentUserId?.toString());
            const newOpponent = isBlackMe ? pWhite : pBlack;
            if (newOpponent) {
                setOpponent(newOpponent);
                if (newOpponent.coins != null) setOpponentCoins(newOpponent.coins);
            }
            dispatch(setPlayers(data.players));
        }
        if (data.timeControl !== undefined) {
            const tc = data.timeControl === null ? null : Number(data.timeControl);
            if (tc === null) {
                if (timeControlSettingRef.current !== null) setTimeControlSetting(null);
                setTurnTimer(null);
            } else if (Number.isFinite(tc)) {
                if (tc !== timeControlSettingRef.current) setTimeControlSetting(tc);
                setTurnTimer(tc);
            }
        }
        if (data.timeouts) {
            setTimeouts(data.timeouts);
        }
    };

    const handleGameStart = (data) => {
        const currentParams = paramsRef.current;
        // console.log('Game start received in GameScreen:', data);

        const currentGameId = currentParams.gameId || currentParams.roomId || currentParams.matchId;
        if (currentGameId && data?.gameId && data.gameId !== currentGameId) {
             if (pendingReplaceGameIdRef.current === data.gameId) return;
             pendingReplaceGameIdRef.current = data.gameId;
             console.log('New Game ID detected, reloading screen...');
             isRematching.current = mode !== 'live';
             if (mode !== 'live') {
               AudioController.setRematchMode(true);
             }

             // Reset local state aggressively before navigation to avoid UI artifacts
             setBoard([]);
             setWinningLine(null);
             setGameOver(false);
             setShowResultModal(false);
             setNextMatchVisible(false);
             setWaitingForNextRound(false);
             setWaitingMessage(null);
             setCurrentPlayer(null);
             setSelectedCell(null);
             setTurnTimer(null);
             setTimeouts({ black: 0, white: 0 });
             setTournamentScore({ black: 0, white: 0 });
             setTournamentGameNumber(1);

             // Calculer le nouvel adversaire pour mettre à jour les coins dans les params
             const pBlack = data?.players?.black;
             const pWhite = data?.players?.white;
             // Utiliser currentUserId pour identifier l'adversaire
             const isBlackMe = (pBlack?.id || pBlack?._id)?.toString() === currentUserId?.toString();
             const newOpponent = isBlackMe ? pWhite : pBlack;

             navigation.replace('Game', {
                 ...currentParams, 
                 gameId: data.gameId,
                 roomId: data.gameId,
                 players: data.players,
                 opponent: newOpponent,
                 betAmount: data.betAmount,
                 timeControl: data.timeControl,
                 tournamentSettings: data.tournamentSettings,
                 currentTurn: data.currentTurn
             });
             return;
        }

        // Reset even if same gameId
        syncReadyRef.current = true;
        setIsWaitingState(false);
        setBoard(Array.isArray(data.board) ? data.board : []);
        setWinningLine(null);
        setGameOver(false);
        setSelectedCell(null);
        setShowResultModal(false);
        setNextMatchVisible(false);
        setWaitingForNextRound(false);
        setWaitingMessage(null);
        setCurrentPlayer(data.currentTurn ?? null);
        setTimeouts({ black: 0, white: 0 });
        if (mode === 'live') {
            const ts = Number(data?.liveStartedAt);
            setLiveStartedAtMs(Number.isFinite(ts) && ts > 0 ? ts : Date.now());
        } else {
            setLiveStartedAtMs(null);
        }
        if (data.tournamentSettings) {
            setTournamentScore(data.tournamentSettings.score);
            setTournamentGameNumber(data.tournamentSettings.gameNumber);
            setTournamentTotalGames(data.tournamentSettings.totalGames);
        } else {
            setTournamentScore({ black: 0, white: 0 });
            setTournamentGameNumber(1);
        }

        if (data.players && JSON.stringify(data.players) !== JSON.stringify(playersDataRef.current)) {
            setPlayersData(data.players);
        }

        // Trigger Versus Animation for Online/Live
        if (!hasShownVersus.current && (mode === 'online' || mode === 'live')) {
            setShowVersusAnim(true);
            hasShownVersus.current = true;
        }

        if (data.timeControl !== undefined) {
            const tc = data.timeControl === null ? null : Number(data.timeControl);
            if (tc === null) {
                if (timeControlSettingRef.current !== null) setTimeControlSetting(null);
                setTurnTimer(null);
            } else if (Number.isFinite(tc)) {
                if (tc !== timeControlSettingRef.current) setTimeControlSetting(tc);
                setTurnTimer(tc);
            }
        }
        setWinner(null);
    };

    const handleMoveMade = (data) => {
      const { row, col, player, nextTurn, newAutoPlayCount } = data;

      setBoard(prev => {
        if (prev.some(m => m.row === row && m.col === col)) return prev;
        return [...prev, { row, col, player }];
      });

      setCurrentPlayer(nextTurn);
      if (nextTurn === null) {
          setWaitingForNextRound(true); // Lock board immediately while waiting for game/round over event
      }

      setTurnTimer(timeControl);

      if (newAutoPlayCount !== undefined) {
          setTimeouts(prev => ({ ...prev, [player]: newAutoPlayCount }));
      }

      // Ne jouer le son que pour le coup de l'adversaire — le joueur local
      // a déjà entendu son son à la confirmation du clic (handlePress).
      const myId = (userRef.current?._id || userRef.current?.id || '').toString();
      const blackId = getPlayerId(playersDataRef.current?.black)?.toString();
      const myColor = blackId && myId && blackId === myId ? 'black' : 'white';
      if (player !== myColor) {
        playSound(player);
      }
    };

    const handleGameOver = (data) => {
      const currentParams = paramsRef.current;
      setGameOver(true);
      setWaitingForNextRound(false);
      if (data.winner) setWinner(data.winner);
      
      // Fallback tournoi en ligne: si le serveur renvoie 'game_over' (ex: timeout 5 fois)
      // et que la manche n'est PAS décisive, afficher la fenêtre "Match suivant".
      // On calcule alors le score/nextGameNumber si le serveur ne les fournit pas.
    const tournamentProgress = getTournamentProgress({
      mode,
      tournamentSettings: currentParams?.tournamentSettings,
      tournamentTotalGames,
      tournamentGameNumber,
      tournamentOver: data?.tournamentOver,
    });

    if (tournamentProgress) {
        const winnerColor = data?.winner;
        const isRoundEnd = data?.reason === 'round_over' || data?.reason === 'victory';
        if (isRoundEnd && !tournamentProgress.isLastGame) {
          const currentScore = data?.score || tournamentScore || { black: 0, white: 0 };
          const newScore = data?.score ? data.score : (
            winnerColor ? {
              ...currentScore,
              [winnerColor]: (currentScore[winnerColor] || 0) + 1
            } : currentScore
          );

          const totalGames = tournamentProgress.totalGames;
          const currentGameNumber = tournamentProgress.currentGameNumber;
          const nextGameNumber = (typeof data?.nextGameNumber === 'number') ? data.nextGameNumber : tournamentProgress.nextGameNumber;
          const remainingGames = totalGames - currentGameNumber;
          const blackScore = newScore.black || 0;
          const whiteScore = newScore.white || 0;
          const wouldBeTournamentOver = (currentGameNumber >= totalGames) || (Math.abs(blackScore - whiteScore) > remainingGames);

          if (!wouldBeTournamentOver) {
            // Calculer la ligne gagnante pour l'effet visuel
            if (winnerColor) {
              const currentBoard = boardRef.current;
              const playerStones = currentBoard.filter(s => s.player === winnerColor);
              for (let s of playerStones) {
                const line = checkWinner(s.row, s.col, winnerColor, currentBoard);
                if (line) {
                  setWinningLine(line);
                  break;
                }
              }
            }
            setTimeout(() => {
              setAlertData({
                title: t('game.match_finished', { number: nextGameNumber - 1 }),
                message: winnerColor === 'black'
                  ? `${currentParams.players?.black?.pseudo || t('game.player1')} ${t('game.wins')} \n${t('game.score_label')}: ${blackScore} - ${whiteScore}`
                  : winnerColor === 'white'
                    ? `${currentParams.players?.white?.pseudo || t('game.player2')} ${t('game.wins')} \n${t('game.score_label')}: ${blackScore} - ${whiteScore}`
                    : `${t('game.draw')}\n${t('game.score_label')}: ${blackScore} - ${whiteScore}`
              });
              setNextMatchVisible(true);
              // Démarrer un timer de 30s comme NextMatchModal par défaut
              setNextMatchTimer(30);
              setHasClickedNextMatch(false);
              if (nextMatchIntervalRef.current) clearInterval(nextMatchIntervalRef.current);
              nextMatchIntervalRef.current = setInterval(() => {
                setNextMatchTimer(prev => {
                  if (prev <= 1) {
                    clearInterval(nextMatchIntervalRef.current);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            }, 500);
            return;
          }
          // Si c'est décisif, ne rien faire ici: le serveur doit envoyer 'tournament_over'/'tournament_draw'
        }
      }

      if (data.updatedCoins) {
          const myId = user?._id || user?.id;
          const opponentId = player2.id;

          if (data.updatedCoins[myId] !== undefined) {
             dispatch(updateUserCoins(data.updatedCoins[myId]));
          }
          if (data.updatedCoins[opponentId] !== undefined) {
             setOpponentCoins(data.updatedCoins[opponentId]);
          }

          // Mettre à jour les coins des deux joueurs dans playersData
          setPlayersData(prev => {
              if (!prev) return prev;
              const updated = { ...prev };
              const blackId = getPlayerId(prev.black);
              const whiteId = getPlayerId(prev.white);

              if (blackId && data.updatedCoins[blackId] !== undefined) {
                  updated.black = { ...prev.black, coins: data.updatedCoins[blackId] };
              }
              if (whiteId && data.updatedCoins[whiteId] !== undefined) {
                  updated.white = { ...prev.white, coins: data.updatedCoins[whiteId] };
              }

              return updated;
          });

      }

      // Le son de résultat est joué par le useEffect sur showResultModal.

      const isWinner = data.winnerId?.toString() === (user?._id || user?.id).toString();
      
      if (isWinner && data.gains > 0) {
          setFeedback({ visible: true, amount: data.gains, type: 'CREDIT' });
      } else if ((data.reason === 'draw' || data.reason === 'cancel_by_agreement') && (currentParams.betAmount || 0) > 0) {
          setFeedback({ visible: true, amount: currentParams.betAmount || 0, type: 'REMBOURSEMENT' });
      }

      if (data.reason === 'resign' && (mode === 'online' || mode === 'online_custom')) {
        const loserPseudo = opponent?.pseudo || t('game.opponent');
        const coinsMsg = (data.gains || 0) > 0 ? `\n🏆 +${data.gains} ${t('game.coins_credited')}` : '';
        if (isWinner) {
          showAlert(
            t('game.victory_forfeit_title'),
            t('game.victory_forfeit_msg', { pseudo: loserPseudo }) + coinsMsg,
            [
              {
                text: t('game.great'),
                onPress: () => {
                  try { setShowGameMenu(false); } catch (_) {}
                  navigation.navigate('Home');
                }
              }
            ],
            { cancelable: false }
          );
          return;
        }

        showAlert(
          t('game.game_over_title'),
          t('game.you_left_game'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                try { setShowGameMenu(false); } catch (_) {}
                navigation.navigate('Home');
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }

      setTimeout(() => {
            setResultData({
                victoire: isWinner,
                gains: data.gains || 0,
                montantPari: currentParams.betAmount || 0,
                adversaire: opponent,
                raisonVictoire: isWinner && data.reason === 'timeout' ? 'timeout_adverse' : null,
                raisonDefaite: !isWinner && data.reason === 'timeout' ? 'timeout' : null,
                timeouts: data.timeouts,
                type: mode,
                isTournament: !!currentParams.tournamentSettings,
                reason: data.reason
            });
        setShowResultModal(true);
      }, 1500);
    };

    const handleOpponentDisconnected = () => {
       const currentParams = paramsRef.current;
       setGameOver(true);
       setWaitingForNextRound(false);
       setResultData({
         victoire: true,
         gains: Math.floor((currentParams.betAmount || 0) * 2 * 0.95),
         montantPari: currentParams.betAmount || 0,
         adversaire: opponent,
         raisonVictoire: 'disconnect',
         type: mode
       });
       setShowResultModal(true);
    };

    const handleBalanceUpdated = (newBalance) => {
      dispatch(updateUserCoins(newBalance));
    };

    const handlePlayersCoinsUpdated = ({ updatedCoins } = {}) => {
      if (!updatedCoins) return;

      const myId = (userRef.current?._id || userRef.current?.id || '').toString();
      if (myId && updatedCoins[myId] !== undefined) {
        dispatch(updateUserCoins(updatedCoins[myId]));
      }

      const opponentId = player2?.id?.toString?.() || '';
      if (opponentId && updatedCoins[opponentId] !== undefined) {
        setOpponentCoins(updatedCoins[opponentId]);
      }

      setPlayersData(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        const blackId = getPlayerId(prev.black)?.toString?.();
        const whiteId = getPlayerId(prev.white)?.toString?.();

        if (blackId && updatedCoins[blackId] !== undefined) {
          updated.black = { ...prev.black, coins: updatedCoins[blackId] };
        }
        if (whiteId && updatedCoins[whiteId] !== undefined) {
          updated.white = { ...prev.white, coins: updatedCoins[whiteId] };
        }
        return updated;
      });
    };

    const handleMessageTexte = (data) => {
        const msgId = data.id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        const nouveauMessage = {
            id: msgId,
            type: 'texte',
            auteur: data.senderPseudo || opponent?.pseudo || 'Adversaire',
            estMoi: false,
            contenu: data.message,
            timestamp: new Date()
        };
        
        setChatMessages(prev => {
            if (prev.some(msg => msg.id === msgId)) return prev;
            return [...prev, nouveauMessage];
        });

        if (mode === 'online' || mode === 'online_custom') {
            triggerFlyingText(data.message, data.senderId);
        }

        const senderIdStr = (data.senderId || '').toString();
        const p1IdStr = (player1.id || '').toString();
        const p2IdStr = (player2.id || '').toString();
        if (senderIdStr && senderIdStr === p1IdStr) {
            setBubbles(prev => ({ ...prev, player1: { content: data.message, type: 'text' } }));
            return;
        }
        if (senderIdStr && senderIdStr === p2IdStr) {
            setBubbles(prev => ({ ...prev, player2: { content: data.message, type: 'text' } }));
            return;
        }
        if (mode !== 'spectator' && mode !== 'live') {
            setBubbles(prev => ({ ...prev, player2: { content: data.message, type: 'text' } }));
        }
    };

    const handleMessageEmoji = (data) => {
        // Trigger Flying Emoji
        triggerFlyingEmoji(data.emoji, data.senderId);

        const msgId = data.id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        const nouveauMessage = {
            id: msgId,
            type: 'emoji',
            auteur: data.senderPseudo || opponent?.pseudo || 'Adversaire',
            estMoi: false,
            contenu: data.emoji,
            timestamp: new Date()
        };
        
        setChatMessages(prev => {
            if (prev.some(msg => msg.id === msgId)) return prev;
            return [...prev, nouveauMessage];
        });

        const senderIdStr = (data.senderId || '').toString();
        const p1IdStr = (player1.id || '').toString();
        const p2IdStr = (player2.id || '').toString();
        if (senderIdStr && senderIdStr === p1IdStr) {
            setBubbles(prev => ({ ...prev, player1: { content: data.emoji, type: 'emoji' } }));
            return;
        }
        if (senderIdStr && senderIdStr === p2IdStr) {
            setBubbles(prev => ({ ...prev, player2: { content: data.emoji, type: 'emoji' } }));
            return;
        }
        if (mode !== 'spectator' && mode !== 'live') {
            setBubbles(prev => ({ ...prev, player2: { content: data.emoji, type: 'emoji' } }));
        }
    };

    const handleRoundOver = (data) => {
        setRoundOverData(data);
        setWaitingForNextRound(false);
        setSelectedCell(null);

        // Calculate winning line for visual effect
        if (data.winner) {
            const currentBoard = boardRef.current;
            const playerStones = currentBoard.filter(s => s.player === data.winner);
            for (let s of playerStones) {
                const line = checkWinner(s.row, s.col, data.winner, currentBoard);
                if (line) {
                    setWinningLine(line);
                    break;
                }
            }
        }
        setWinner(data.winner);
        setGameOver(true);

        setTimeout(() => {
             setAlertData({
                 title: t('game.match_finished', { number: data.nextGameNumber - 1 }),
                 message: `${data.winner === 'black'
                     ? (params.players?.black?.pseudo || t('game.player1'))
                     : (params.players?.white?.pseudo || t('game.player2'))
                 } ${t('game.wins')} \n${t('game.score_label')}: ${data.score.black} - ${data.score.white}`
             });
         
             setNextMatchVisible(true); 
             
             // Start 30s timer
             setNextMatchTimer(30);
             setHasClickedNextMatch(false);
             if (nextMatchIntervalRef.current) clearInterval(nextMatchIntervalRef.current);
             nextMatchIntervalRef.current = setInterval(() => {
                 setNextMatchTimer(prev => {
                     if (prev <= 1) {
                         clearInterval(nextMatchIntervalRef.current);
                         return 0;
                     }
                     return prev - 1;
                 });
             }, 1000);
        }, 500);
    };

    const handleStartNextRound = (data) => {
        setWaitingForNextRound(false);
        setBoard(Array.isArray(data?.board) ? data.board : []);
        setTimeouts({ black: 0, white: 0 });
        setTournamentScore(data.score);
        setTournamentGameNumber(data.nextGameNumber);
        setCurrentPlayer(data.nextTurn);
        setSelectedCell(null);
        if (data.timeControl !== undefined) {
            const tc = data.timeControl === null ? null : Number(data.timeControl);
            if (tc === null) {
                if (timeControlSettingRef.current !== null) setTimeControlSetting(null);
                setTurnTimer(null);
            } else if (Number.isFinite(tc)) {
                if (tc !== timeControlSettingRef.current) setTimeControlSetting(tc);
                setTurnTimer(tc);
            }
        }

        // Reset game state for next round
        setGameOver(false);
        setWinner(null);
        setWinningLine(null);
        
        // Stop next match timer
        if (nextMatchIntervalRef.current) clearInterval(nextMatchIntervalRef.current);
        setNextMatchVisible(false);
    };

    const handleTournamentOver = (data) => {
        setGameOver(true);
        setWaitingForNextRound(false);
        if (data.winner) setWinner(data.winner);
        
        // Handle coin updates
        if (data.updatedCoins) {
            const myId = user?._id || user?.id;
            const opponentId = player2.id;

            if (data.updatedCoins[myId] !== undefined) {
               dispatch(updateUserCoins(data.updatedCoins[myId]));
            }
            if (data.updatedCoins[opponentId] !== undefined) {
               setOpponentCoins(data.updatedCoins[opponentId]);
            }
        }

        // Le son de résultat est joué par le useEffect sur showResultModal.

        const isWinner = data.winnerId?.toString() === (user?._id || user?.id).toString();
        const hasWinner = !!data.winnerId;
        if (!hasWinner && (params.betAmount || 0) > 0) {
            setFeedback({ visible: true, amount: params.betAmount || 0, type: 'REMBOURSEMENT' });
        }
        
        setTimeout(() => {
             setResultData({
                 victoire: isWinner,
                 gains: data.gains || 0,
                 montantPari: params.betAmount || 0,
                 adversaire: opponent,
                 raisonVictoire: hasWinner ? 'tournament_win' : null,
                 raisonDefaite: hasWinner ? 'tournament_loss' : null,
                 isTournament: true,
                 tournamentScore: data.score,
                 reason: data.reason,
                 type: mode
             });
             setShowResultModal(true);
        }, 1500);
    };

    const handleGameRejoined = (data) => {
        try {
            syncReadyRef.current = true;
            if (Array.isArray(data.board)) setBoard(data.board);
            if (data.currentTurn) setCurrentPlayer(data.currentTurn);
            if (data.timeControl !== undefined) {
                const tc = data.timeControl === null ? null : Number(data.timeControl);
                if (tc === null) {
                    if (timeControlSettingRef.current !== null) setTimeControlSetting(null);
                    setTurnTimer(null);
                } else if (Number.isFinite(tc)) {
                    if (tc !== timeControlSettingRef.current) setTimeControlSetting(tc);
                    setTurnTimer(tc);
                }
            }
            if (data.tournamentSettings) {
                if (data.tournamentSettings.score) setTournamentScore(data.tournamentSettings.score);
                if (data.tournamentSettings.gameNumber) setTournamentGameNumber(data.tournamentSettings.gameNumber);
                if (data.tournamentSettings.totalGames !== undefined) setTournamentTotalGames(data.tournamentSettings.totalGames);
            }
            if (data.players) {
                setPlayersData(data.players);
                const pBlack = data.players.black;
                const pWhite = data.players.white;
                const isBlackMe = (getPlayerId(pBlack)?.toString() === currentUserId?.toString());
                const newOpponent = isBlackMe ? pWhite : pBlack;
                if (newOpponent) {
                    setOpponent(newOpponent);
                    if (newOpponent.coins != null) setOpponentCoins(newOpponent.coins);
                }
                dispatch(setPlayers(data.players));
                if (data.players.white && data.players.black) setIsWaitingState(false);
            }
        } catch (e) {
        }
    };

    const handleSocketError = (msg) => {
        if (msg === 'Not your turn' || msg === 'Not your turn.') {
            return;
        }
        console.log('Socket error:', msg);
        if (msg === 'Cell occupied') {
            if ((mode === 'online' || mode === 'online_custom') && params.gameId) {
                console.log('Board desync detected, requesting full state via join_custom_game');
                socket.emit('join_custom_game', { gameId: params.gameId });
            }
            return;
        }
    };

    const handleTournamentAutoWin = (data) => {
        if (nextMatchIntervalRef.current) clearInterval(nextMatchIntervalRef.current);
        setNextMatchVisible(false);
        handleTournamentOver({
            winner: data.winner,
            winnerId: data.winnerId,
            reason: data.reason,
            gains: data.gains,
            updatedCoins: data.updatedCoins,
            score: data.score
        });
    };

    const handleTournamentDraw = (data) => {
        if (nextMatchIntervalRef.current) clearInterval(nextMatchIntervalRef.current);
        setNextMatchVisible(false);
        handleTournamentOver({
            winner: null,
            winnerId: null,
            reason: 'draw_timeout',
            updatedCoins: data.updatedCoins,
            score: data.score,
            gains: 0
        });
    };

    const handleLiveRoomClosed = () => {
        if (isExitingRef.current) return;
        showAlert(t('game.live_ended_title'), t('game.live_ended_msg'), [
            { text: t('common.ok'), onPress: () => navigation.navigate('Home'), style: 'cancel' }
        ]);
    };

    const handleLiveGameEnded = (data) => {
        setGameOver(true);
        setWaitingForNextRound(false);
        setSelectedCell(null);
        setShowGameMenu(false);

        const myId = (userRef.current?._id || userRef.current?.id || '').toString();
        const winnerId = (data?.winner?.id || data?.winner?._id || '').toString();
        const loserId = (data?.loser?.id || data?.loser?._id || '').toString();
        const isWinner = Boolean(myId && winnerId && myId === winnerId);
        const isLoser = Boolean(myId && loserId && myId === loserId);

        if (isExitingRef.current && !isWinner) return;

        const winnerPseudo = data?.winner?.pseudo;
        const loserPseudo = data?.loser?.pseudo;
        const rawCoinsAwarded = data?.coinsAwarded;
        const coinsAwarded = typeof rawCoinsAwarded === 'number' ? rawCoinsAwarded : Number(rawCoinsAwarded) || 0;
        const isCreatorLeaving = Boolean(data?.isCreatorLeaving);
        const winnerBalance = typeof data?.winnerBalance === 'number' ? data.winnerBalance : null;
        const loserBalance = typeof data?.loserBalance === 'number' ? data.loserBalance : null;

        if (isWinner && coinsAwarded > 0) {
            setFeedback({ visible: true, amount: coinsAwarded, type: 'CREDIT' });
        }

        if (isWinner && typeof winnerBalance === 'number') {
            dispatch(updateUserCoins(winnerBalance));
        } else if (isLoser && typeof loserBalance === 'number') {
            dispatch(updateUserCoins(loserBalance));
        }

        try {
            syncBalance();
        } catch (_) {}

        if (isWinner) {
            const coinsMsg = coinsAwarded > 0 ? `\n🏆 +${coinsAwarded} ${t('game.coins_credited')}` : '';
            showAlert(
                t('game.victory_forfeit_title'),
                t('game.victory_forfeit_msg', { pseudo: loserPseudo || t('game.opponent') }) + coinsMsg,
                [
                    {
                        text: t('game.great'),
                        onPress: () => {
                            try {
                                syncBalance();
                            } catch (_) {}

                            if (isCreatorLeaving) {
                                navigation.navigate('Home');
                            }
                        }
                    }
                ],
                { cancelable: false }
            );
            return;
        }

        if (isLoser) {
            try {
                syncBalance();
            } catch (_) {}
            return;
        }

        const msg = winnerPseudo
            ? `${winnerPseudo} ${t('game.wins_by_forfeit')}${coinsAwarded > 0 ? `\n${t('game.gain_label')}: +${coinsAwarded} ${t('game.coins')}` : ''}`
            : `${t('game.game_over_title')}${coinsAwarded > 0 ? `\n${t('game.gain_label')}: +${coinsAwarded} ${t('game.coins')}` : ''}`;

        showAlert(t('game.game_over_title'), msg, [{ text: t('common.ok'), onPress: () => {} }]);
    };

    const handleOpponentLeftLive = () => {
        if (isExitingRef.current) return;
        if (mode === 'spectator') {
            setShowResultModal(false);
            setNextMatchVisible(false);
            setWaitingForNextRound(true);
            setWaitingMessage(t('game.opponent_left_waiting'));
            showAlert(
                t('game.opponent_left_title'),
                t('game.opponent_left_spectator_msg'),
                [
                    { text: t('common.ok'), onPress: () => {} }
                ]
            );
            return;
        }
        const creatorId = params.roomConfig?.createur?._id || params.roomConfig?.createur?.id;
        const userId = user?._id || user?.id;
        const isCreator = creatorId && userId && creatorId.toString() === userId.toString();
        if (!isCreator) {
            // Non créateur: rester silencieux (utilisé pour certains flux), ne rien afficher ici
            if (params.roomConfig) {
                navigation.replace('SalleAttenteLive', { configSalle: params.roomConfig });
            } else {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('Home');
                }
            }
            return;
        }
        showAlert(
            t('game.opponent_left_title'),
            t('game.opponent_left_live_msg'),
            [
                {
                    text: t('game.wait_another_player'),
                    onPress: () => {
                        socket.emit('reset_live_opponent', { gameId: params.gameId });
                        if (params.roomConfig) {
                            navigation.replace('SalleAttenteLive', { configSalle: params.roomConfig, roomId: params.gameId });
                        } else {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('Home');
                            }
                        }
                    }
                },
                {
                    text: t('game.stop_live'),
                    style: 'destructive',
                    onPress: () => {
                        isExitingRef.current = true;
                        socket.emit('stop_live_room', { gameId: params.gameId, userId: user?._id || user?.id });
                        navigation.navigate('Home');
                    }
                }
            ],
            { cancelable: false }
        );
    };

    const handleDowngradedToSpectator = () => {
        if (isExitingRef.current) return;
        setShowResultModal(false);
        if (params.roomConfig) {
            navigation.replace('SalleAttenteLive', { configSalle: params.roomConfig });
        } else {
            navigation.navigate('Home');
        }
    };

    const handleLiveGameCancelled = (data) => {
        if (isExitingRef.current) return;
        setBoard([]);
        setWinningLine(null);
        setWinner(null);
        setGameOver(false);
        setShowResultModal(false);
        setNextMatchVisible(false);
        setCurrentPlayer(null);
        setSelectedCell(null);
        setTimeouts({ black: 0, white: 0 });
        setTurnTimer(null);
        setLiveStartedAtMs(null);
        setLiveElapsedSec(0);
        setWaitingForNextRound(true);
        setShowGameMenu(false);
        setWaitingMessage(t('game.game_cancelled_waiting'));

        const myId = (userRef.current?._id || userRef.current?.id || '').toString();
        const updatedCoins = data?.updatedCoins || {};
        if (myId && updatedCoins[myId] !== undefined) {
            dispatch(updateUserCoins(updatedCoins[myId]));
        }

        const betAmount = Number(data?.betAmount ?? paramsRef.current?.betAmount ?? 0) || 0;
        const refundMsg = betAmount > 0 ? `\n🪙 ${t('game.bet_refunded')}: ${betAmount.toLocaleString()}` : '';
        const currentParams = paramsRef.current || {};
        const creatorId = currentParams?.roomConfig?.createur?._id || currentParams?.roomConfig?.createur?.id;
        const isCreator = creatorId && myId && creatorId.toString() === myId.toString();
        const gameId = currentParams.gameId || currentParams.roomId || currentParams.matchId;

        if (isCreator) {
            showAlert(
                t('game.game_cancelled_title'),
                `${t('game.cancel_accepted_both')}${refundMsg}\n\n${t('game.can_restart')}`,
                [
                    {
                        text: t('game.back_to_room'),
                        style: 'cancel',
                        onPress: () => {
                            if (currentParams.roomConfig) {
                                navigation.replace('SalleAttenteLive', { configSalle: currentParams.roomConfig, roomId: gameId });
                            } else {
                                navigation.navigate('Home');
                            }
                        }
                    },
                    {
                        text: t('game.restart'),
                        onPress: () => {
                            try { socket.emit('start_live_game', { gameId }); } catch (_) {}
                        }
                    }
                ],
                { cancelable: false }
            );
            return;
        }

        showAlert(
            t('game.game_cancelled_title'),
            `${t('game.cancel_accepted_both')}${refundMsg}\n\n${t('game.waiting_creator')}`,
            [{ text: t('common.ok'), style: 'cancel' }],
            { cancelable: false }
        );
    };

    const handleActionRequested = (data) => {
        if (isExitingRef.current) return;
        if (mode === 'spectator') return;
        if (isSpectatorMode) return;
        if (gameOver) return;

        const myId = (userRef.current?._id || userRef.current?.id || '').toString();
        const toUserId = (data?.toUserId || '').toString();
        const requestId = (data?.requestId || '').toString();
        const type = (data?.type || '').toString();

        if (!myId || !requestId || toUserId !== myId) return;
        if (lastHandledActionRequestIdRef.current === requestId) return;
        lastHandledActionRequestIdRef.current = requestId;

        const fromPseudo = data?.fromPseudo || opponent?.pseudo || t('game.opponent');
        const currentParams = paramsRef.current;
        const isTournament = !!currentParams?.tournamentSettings;
        const title = type === 'cancel' ? t('game.cancel_request_title') : t('game.abandon_request_title');
        const message = type === 'cancel'
            ? (
                isTournament
                  ? t('game.cancel_request_tournament_msg', { pseudo: fromPseudo })
                  : t('game.cancel_request_msg', { pseudo: fromPseudo })
              )
            : t('game.abandon_request_msg', { pseudo: fromPseudo });

        showAlert(title, message, [
            {
                text: t('game.refuse'),
                style: "cancel",
                onPress: () => {
                    playButtonSound();
                    try { socket.emit('respond_action', { requestId, accepted: false }); } catch (_) {}
                }
            },
            {
                text: t('game.accept'),
                style: "destructive",
                onPress: () => {
                    playButtonSound();
                    try { socket.emit('respond_action', { requestId, accepted: true }); } catch (_) {}
                }
            }
        ]);
    };

    const handleActionResolved = (data) => {
        if (isExitingRef.current) return;
        const myId = (userRef.current?._id || userRef.current?.id || '').toString();
        const fromUserId = (data?.fromUserId || '').toString();
        if (!myId || fromUserId !== myId) return;

        const currentParams = paramsRef.current;
        const isTournament = !!currentParams?.tournamentSettings;
        const type = (data?.type || '').toString();
        const accepted = !!data?.accepted;
        const reason = (data?.reason || '').toString();

        if (!accepted) {
            const msg =
                reason === 'expired' ? t('game.request_expired') :
                reason === 'move_started' ? t('game.request_cancelled_started') :
                reason === 'too_early' ? t('game.request_refused_too_early') :
                t('game.request_refused');
            showAlert(t('game.request_title'), msg, [{ text: t('common.ok'), style: 'cancel' }]);
            return;
        }

        showAlert(
            t('game.request_accepted_title'),
            type === 'cancel'
              ? (isTournament ? t('game.round_will_replay') : t('game.game_will_cancel'))
              : t('game.opponent_accepted_abandon'),
            [{ text: t('common.ok'), style: 'cancel' }]
        );
    };

    listenersReadyRef.current = true;
    if (user && (mode === 'online' || mode === 'online_custom') && params.gameId && !hasJoinedRoomRef.current) {
        console.log('Attempting to rejoin game room (with listeners ready):', params.gameId);
        socket.emit('join_custom_game', { gameId: params.gameId });
        hasJoinedRoomRef.current = true;
    }

    socket.on('spectator_joined', handleSpectatorJoined);
    socket.on('game_start', handleGameStart);
    socket.on('game_rejoined', handleGameRejoined);
    socket.on('move_made', handleMoveMade);
    socket.on('game_over', handleGameOver);
    socket.on('opponent_disconnected', handleOpponentDisconnected);
    socket.on('opponent_left_live', handleOpponentLeftLive);
    socket.on('live_room_closed', handleLiveRoomClosed);
    socket.on('live_game_ended', handleLiveGameEnded);
    socket.on('live_game_cancelled', handleLiveGameCancelled);
    socket.on('downgraded_to_spectator', handleDowngradedToSpectator);
    socket.on('action_requested', handleActionRequested);
    socket.on('action_resolved', handleActionResolved);
    socket.on('balance_updated', handleBalanceUpdated);
    socket.on('players_coins_updated', handlePlayersCoinsUpdated);
    socket.on('MESSAGE_TEXTE', handleMessageTexte);
    socket.on('MESSAGE_EMOJI', handleMessageEmoji);
    socket.on('round_over', handleRoundOver);
    socket.on('start_next_round', handleStartNextRound);
    socket.on('tournament_over', handleTournamentOver);
    socket.on('tournament_auto_win', handleTournamentAutoWin);
    socket.on('tournament_draw', handleTournamentDraw);
    socket.on('error', handleSocketError);

    return () => {
      listenersReadyRef.current = false;
      socket.off('spectator_joined', handleSpectatorJoined);
      socket.off('game_start', handleGameStart);
      socket.off('game_rejoined', handleGameRejoined);
      socket.off('move_made', handleMoveMade);
      socket.off('game_over', handleGameOver);
      socket.off('opponent_disconnected', handleOpponentDisconnected);
      socket.off('opponent_left_live', handleOpponentLeftLive);
      socket.off('live_room_closed', handleLiveRoomClosed);
      socket.off('live_game_ended', handleLiveGameEnded);
      socket.off('live_game_cancelled', handleLiveGameCancelled);
      socket.off('downgraded_to_spectator', handleDowngradedToSpectator);
      socket.off('action_requested', handleActionRequested);
      socket.off('action_resolved', handleActionResolved);
      socket.off('balance_updated', handleBalanceUpdated);
      socket.off('players_coins_updated', handlePlayersCoinsUpdated);
      socket.off('MESSAGE_TEXTE', handleMessageTexte);
      socket.off('MESSAGE_EMOJI', handleMessageEmoji);
      socket.off('round_over', handleRoundOver);
      socket.off('start_next_round', handleStartNextRound);
      socket.off('tournament_over', handleTournamentOver);
      socket.off('tournament_auto_win', handleTournamentAutoWin);
      socket.off('tournament_draw', handleTournamentDraw);
      socket.off('error', handleSocketError);
    };
  }, [mode, navigation, user, isSoundEnabled, player1.id, player2.id, params.gameId, isSpectatorMode]);

  useEffect(() => {
    if (isWaitingState && user && (mode === 'online' || mode === 'online_custom') && params.gameId && listenersReadyRef.current && !hasJoinedRoomRef.current) {
        console.log('Waiting state: ensuring joined to game room:', params.gameId);
        socket.emit('join_custom_game', { gameId: params.gameId });
        hasJoinedRoomRef.current = true;
    }
  }, [isWaitingState, user, mode, params.gameId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
        if (next === 'active' && user && (mode === 'online' || mode === 'online_custom') && params.gameId && listenersReadyRef.current) {
            syncReadyRef.current = false;
            console.log('Foreground: rejoining game room for resync:', params.gameId);
            socket.emit('join_custom_game', { gameId: params.gameId });
            hasJoinedRoomRef.current = true;
        }
    });
    return () => sub.remove();
  }, [user, mode, params.gameId]);

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
      
      // Trigger Flying Emoji if it's an emoji
      if (socketMsg.type === 'MESSAGE_EMOJI') {
          triggerFlyingEmoji(socketMsg.emoji, user?._id || user?.id);
      }
      if (socketMsg.type === 'MESSAGE_TEXTE') {
          triggerFlyingText(socketMsg.message, user?._id || user?.id);
      }

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
    AudioController.notifyGameEnter();
    AudioController.playGameMusic(isMusicEnabled);

    return () => {
      AudioController.notifyGameExit();
      if (!isRematching.current) {
          // Stop Game music and play Home music ONLY if not rematching
          AudioController.stopGameMusic();
          AudioController.playHomeMusic(isMusicEnabled);
      }
      isRematching.current = false;
    };
  }, [isMusicEnabled, params.gameId]);



  // Déterminer les noms pour l'affichage
  const joueurNoir = mode === 'ai'
    ? (iaColors.joueur === 'black' ? t('game.you') : configIA?.difficulte || t('game.ai_name'))
    : t('game.player1');

  const joueurBlanc = mode === 'ai'
    ? (iaColors.joueur === 'white' ? t('game.you') : configIA?.difficulte || t('game.ai_name'))
    : t('game.player2');

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
            showAlert(t('common.success'), t('game.friend_request_sent'), [{ text: t('common.ok'), style: 'cancel' }]);
            setSelectedProfile(null);
        } else {
            showAlert(t('common.info'), data.message || t('game.friend_request_failed'), [{ text: t('common.ok'), style: 'cancel' }]);
        }
    } catch (error) {
        showAlert(t('common.error'), t('errors.network'), [{ text: t('common.ok'), style: 'cancel' }]);
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
      appAlert(t('game.invite_sent'), t('game.waiting_response'));
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
              onPress={() => {
                  playButtonSound();
                  setShowInviteModal(false);
              }}
          >
              <View style={[styles.modalContent, { height: '70%', width: '90%' }]} onStartShouldSetResponder={() => true}>
                  <Text style={styles.modalPseudo}>{t('game.invite_player')}</Text>
                  
                  {/* Onglets */}
                  <View style={{flexDirection: 'row', marginBottom: getResponsiveSize(15), borderBottomWidth: getResponsiveSize(1), borderBottomColor: '#f1c40f'}}>
                      <TouchableOpacity 
                          style={{flex: 1, padding: getResponsiveSize(10), alignItems: 'center', borderBottomWidth: inviteMode === 'friends' ? 2 : 0, borderBottomColor: '#f1c40f'}}
                          onPress={() => {
                              playButtonSound();
                              setInviteMode('friends');
                          }}
                      >
                          <Text style={{color: inviteMode === 'friends' ? '#f1c40f' : '#fff', fontWeight: 'bold'}}>{t('game.friends_tab')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                          style={{flex: 1, padding: getResponsiveSize(10), alignItems: 'center', borderBottomWidth: inviteMode === 'online' ? 2 : 0, borderBottomColor: '#f1c40f'}}
                          onPress={() => {
                              playButtonSound();
                              setInviteMode('online');
                          }}
                      >
                          <Text style={{color: inviteMode === 'online' ? '#f1c40f' : '#fff', fontWeight: 'bold'}}>{t('game.online_tab')}</Text>
                      </TouchableOpacity>
                  </View>

                  <Text style={{color:'#fff', marginBottom: getResponsiveSize(10)}}>
                      {inviteMode === 'friends' ? t('game.online_friends_label') : t('game.all_online_players_label')}
                  </Text>
                  
                  {loadingFriends ? (
                      <ActivityIndicator size="large" color="#f1c40f" />
                  ) : (
                      <FlatList
                          data={friends}
                          keyExtractor={item => item._id}
                          ListEmptyComponent={
                              <Text style={{color: '#999', textAlign: 'center'}}>
                                  {inviteMode === 'friends' ? t('game.no_online_friends') : t('game.no_online_players')}
                              </Text>
                          }
                          renderItem={({ item }) => (
                              <TouchableOpacity 
                                  style={{
                                      flexDirection: 'row', 
                                      alignItems: 'center', 
                                      padding: getResponsiveSize(10), 
                                      borderBottomWidth: 1, 
                                      borderBottomColor: 'rgba(241, 196, 15, 0.3)',
                                      width: '100%'
                                  }}
                                  onPress={() => {
                                      playButtonSound();
                                      handleInviteFriendToGame(item._id);
                                  }}
                              >
                                  <View style={{position: 'relative'}}>
                                     <Image 
                                        source={item.avatar ? getAvatarSource(item.avatar) : { uri: 'https://i.pravatar.cc/150' }} 
                                        style={{width: getResponsiveSize(40), height: getResponsiveSize(40), borderRadius: getResponsiveSize(20), marginRight: getResponsiveSize(10)}} 
                                     />
                                     <View style={{
                                         position: 'absolute', 
                                         bottom: 0, 
                                         right: getResponsiveSize(10), 
                                         width: getResponsiveSize(10), 
                                         height: getResponsiveSize(10), 
                                         borderRadius: getResponsiveSize(5), 
                                         backgroundColor: '#2ecc71',
                                         borderWidth: 1,
                                         borderColor: '#000'
                                     }} />
                                  </View>
                                  <View style={{flex: 1}}>
                                      <Text style={{color: '#fff', fontSize: getResponsiveSize(16)}}>{item.pseudo}</Text>
                                      {item.country && <Text style={{color: '#888', fontSize: getResponsiveSize(12)}}>{item.country}</Text>}
                                  </View>
                                  <Ionicons name="paper-plane-outline" size={24} color="#f1c40f" />
                              </TouchableOpacity>
                          )}
                      />
                  )}

                  <TouchableOpacity
                      style={[styles.closeButton, { marginTop: 20 }]}
                      onPress={() => {
                          playButtonSound();
                          setShowInviteModal(false);
                      }}
                  >
                      <Text style={styles.closeButtonText}>{t('common.close')}</Text>
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>
  );

  const handleQuitGame = () => {
    if (isWaitingState && params.gameId) {
        appAlert(
            t('game.cancel_game_title'),
            t('game.cancel_game_waiting_msg'),
            [
                { text: t('common.no'), style: "cancel" },
                {
                    text: t('game.yes_quit'),
                    style: "destructive",
                    onPress: () => {
                        socket.emit('quit_waiting_room', { gameId: params.gameId, userId: user?._id });
                        setIsWaitingState(false);
                        setShowGameMenu(false);
                        navigation.navigate('Social');
                    }
                }
            ]
        );
        return;
    }

    if (mode === 'live' && params.gameId) {
        const myId = user?._id || user?.id;
        const creatorId = params.roomConfig?.createur?._id || params.roomConfig?.createur?.id || params.roomConfig?.createurId;
        const isCreator = Boolean(myId && creatorId && myId.toString() === creatorId.toString());

        if (isSpectatorMode) {
            appAlert(t('game.quit_title'), t('game.go_home_msg'), [
                { text: t('common.cancel'), style: "cancel" },
                {
                    text: t('game.home'),
                    onPress: () => {
                        isExitingRef.current = true;
                        setShowGameMenu(false);
                        navigation.navigate('Home');
                    }
                }
            ]);
            return;
        }

        if (!isCreator) {
            appAlert(t('game.quit_live_title'), t('game.choose_option'), [
                { text: t('common.cancel'), style: "cancel" },
                {
                    text: t('game.keep_watching'),
                    onPress: () => {
                        playButtonSound();
                        setIsSpectatorMode(true);
                        setShowGameMenu(false);
                        if (myId) {
                            socket.emit('switch_to_spectator', { gameId: params.gameId, userId: myId });
                        }
                    }
                },
                {
                    text: t('game.go_home'),
                    style: "destructive",
                    onPress: () => {
                        playButtonSound();
                        isExitingRef.current = true;
                        setShowGameMenu(false);
                        if (myId) {
                            socket.emit('player_forfeit_live', { gameId: params.gameId, userId: myId });
                        }
                        navigation.navigate('Home');
                    }
                }
            ]);
            return;
        }

        appAlert(t('game.quit_live_title'), t('game.quit_lose_auto'), [
            { text: t('common.cancel'), style: "cancel" },
            {
                text: t('game.quit'),
                style: "destructive",
                onPress: () => {
                    playButtonSound();
                    isExitingRef.current = true;
                    setShowGameMenu(false);
                    if (myId) {
                        socket.emit('player_forfeit_live', { gameId: params.gameId, userId: myId });
                    }
                    navigation.navigate('Home');
                }
            }
        ]);
        return;
    }

    appAlert(
        t('game.quit_title'),
        t('game.quit_lose_auto'),
        [
            { text: t('common.cancel'), style: "cancel" },
            {
                text: t('game.quit'),
                style: "destructive",
                onPress: () => {
                    if (mode === 'online' || mode === 'online_custom') {
                        socket.emit('resign');
                    }
                    setShowGameMenu(false);
                    navigation.navigate('Home');
                }
            }
        ]
    );
  };

  const sendActionRequest = (type) => {
    const gameId = params.gameId || params.roomId || params.matchId;
    if (!gameId) return;
    if (mode === 'spectator') return;
    if (gameOver) return;

    // Fermer le menu de jeu immédiatement (s'il était ouvert).
    // Ne PAS appeler setCustomAlert ici — la modale de confirmation est déjà
    // en train de se fermer via onClose() dans CustomAlert, et rappeler
    // visible=false pendant l'animation iOS provoque un crash natif UIKit.
    setShowGameMenu(false);
    setActiveModal(null);

    // Délai de 400ms : laisse l'animation de fermeture de la modale iOS (~250ms)
    // se terminer avant tout nouvel appel réseau et tout nouvel affichage de modale.
    setTimeout(() => {
      try {
        socket.emit('request_action', { gameId, type }, (res) => {
          if (!res?.ok) {
            showAlert(t('common.error'), res?.message || t('game.request_send_failed'), [{ text: t('common.ok'), style: 'cancel' }]);
          }
          // Si ok : pas de nouveau Modal — handleActionResolved notifiera le résultat
          // quand l'adversaire accepte ou refuse.
        });
      } catch (e) {
        showAlert(t('common.error'), t('game.request_send_failed'), [{ text: t('common.ok'), style: 'cancel' }]);
      }
    }, 400);
  };

  const handleRequestCancel = () => {
    playButtonSound();
    const currentParams = paramsRef.current;
    const isTournament = !!currentParams?.tournamentSettings;
    showAlert(
      t('game.cancel_game_menu_title'),
      isTournament
        ? t('game.cancel_game_tournament_desc')
        : t('game.cancel_game_desc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.send'), onPress: () => { sendActionRequest('cancel'); } }
      ]
    );
  };

  const handleRequestAbandon = () => {
    playButtonSound();
    showAlert(
      t('game.abandon_menu_title'),
      t('game.abandon_desc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.send'), style: 'destructive', onPress: () => { sendActionRequest('abandon'); } }
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
            onPress={() => {
                playButtonSound();
                setShowGameMenu(false);
            }}
        >
            <View style={styles.menuContent} onStartShouldSetResponder={() => true}>
                <TouchableOpacity style={styles.menuItem} onPress={() => { playButtonSound(); handleQuitGame(); }}>
                    <Ionicons name="exit-outline" size={24} color="#ffffffff" />
                    <Text style={[styles.menuText, { color: '#ffffffff' }]}>{t('game.quit_game')}</Text>
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />

                {(mode === 'online' || mode === 'online_custom' || mode === 'live') && !isSpectatorMode && (
                  <>
                    <TouchableOpacity
                      style={[styles.menuItem, { opacity: (!gameOver && (Array.isArray(board) ? board.filter(s => s && s.player === player1.color).length : 0) >= 20 && !!(params.gameId || params.roomId || params.matchId)) ? 1 : 0.45 }]}
                      onPress={() => {
                        playButtonSound();
                        if (gameOver) {
                          showAlert(t('common.info'), t('game.game_already_over'), [{ text: t('common.ok'), style: 'cancel' }]);
                          return;
                        }
                        const myPlacedStonesCount = Array.isArray(board) ? board.filter(s => s && s.player === player1.color).length : 0;
                        if (myPlacedStonesCount < 20) {
                          showAlert(t('common.info'), t('game.cancel_min_20_stones'), [{ text: t('common.ok'), style: 'cancel' }]);
                          return;
                        }
                        if (!(params.gameId || params.roomId || params.matchId)) {
                          showAlert(t('common.error'), t('game.missing_game_id'), [{ text: t('common.ok'), style: 'cancel' }]);
                          return;
                        }
                        handleRequestCancel();
                      }}
                    >
                        <Ionicons name="close-circle-outline" size={24} color="#ffffffff" />
                        <Text style={styles.menuText}>{t('game.cancel_game_menu_title')}</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                      style={[styles.menuItem, { opacity: (!gameOver && !!(params.gameId || params.roomId || params.matchId)) ? 1 : 0.45 }]}
                      onPress={() => {
                        playButtonSound();
                        if (gameOver) {
                          showAlert(t('common.info'), t('game.game_already_over'), [{ text: t('common.ok'), style: 'cancel' }]);
                          return;
                        }
                        if (!(params.gameId || params.roomId || params.matchId)) {
                          showAlert(t('common.error'), t('game.missing_game_id'), [{ text: t('common.ok'), style: 'cancel' }]);
                          return;
                        }
                        handleRequestAbandon();
                      }}
                    >
                        <Ionicons name="hand-left-outline" size={24} color="#ffffffff" />
                        <Text style={styles.menuText}>{t('game.abandon_menu_title')}</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />
                  </>
                )}

                <TouchableOpacity style={styles.menuItem} onPress={() => { playButtonSound(); dispatch(toggleSound()); setShowGameMenu(false); }}>
                    <Ionicons name={isSoundEnabled ? "volume-high" : "volume-mute"} size={24} color="#ffffffff" />
                    <Text style={styles.menuText}>{t('game.pawn_sound')}: {isSoundEnabled ? t('game.sound_on') : t('game.sound_off')}</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity style={styles.menuItem} onPress={() => { playButtonSound(); setShowGameMenu(false); }}>
                    <Text style={styles.closeMenuText}>{t('common.close')}</Text>
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
            onPress={() => {
                playButtonSound();
                setSelectedProfile(null);
            }}
        >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                 {selectedProfile?.avatar ? (
                    <Image source={getAvatarSource(selectedProfile.avatar)} style={styles.modalAvatar} />
                 ) : (
                    <Ionicons name="person-circle-outline" size={100} color="#ccc" />
                 )}
                 <Text style={styles.modalPseudo}>{selectedProfile?.pseudo}</Text>
                 {selectedProfile?.level && (
                    <Text style={{color: '#f59e0b', fontSize: getResponsiveSize(16), marginBottom: 5, fontWeight: 'bold'}}>
                        {t('profile.level')} {selectedProfile.level}
                    </Text>
                 )}
                 {selectedProfile?.country && <Text style={styles.modalFlag}>{selectedProfile.country}</Text>}
                 
                 {(mode === 'online' || mode === 'live' || mode === 'spectator') && selectedProfile?.id && selectedProfile.id !== (user?._id || user?.id) && (
                     <TouchableOpacity style={styles.friendButton} onPress={() => { playButtonSound(); handleSendFriendRequest(); }}>
                        <Ionicons name="person-add" size={getResponsiveSize(20)} color="white" style={{marginRight: getResponsiveSize(8)}} />
                        <Text style={styles.friendButtonText}>{t('social.add_friend')}</Text>
                     </TouchableOpacity>
                 )}
                 
                 <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                        playButtonSound();
                        setSelectedProfile(null);
                    }}
                 >
                    <Text style={styles.closeButtonText}>{t('common.close')}</Text>
                 </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
  );

  const renderWaitingForOpponentOverlay = () => {
      const isWaitingForOpponent = mode === 'live' && !params.players?.white;
      
      if (!isWaitingForOpponent) return null;

      return (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }]}>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#f1c40f" style={{ marginBottom: 20 }} />
                  <Text style={{ color: '#fff', fontSize: getResponsiveSize(20), fontWeight: 'bold', marginBottom: 10 }}>{t('game.waiting_opponent_title')}</Text>
                  <Text style={{ color: '#fff', fontSize: getResponsiveSize(16), textAlign: 'center', maxWidth: '80%', marginBottom: 30 }}>
                      {t('game.invite_or_wait')}
                  </Text>
                  
                  <TouchableOpacity
                      style={[styles.closeButton, { width: getResponsiveSize(200) }]}
                      onPress={() => {
                           playButtonSound();
                           if (params.gameId) {
                               socket.emit('quit_waiting_room', { gameId: params.gameId, userId: user?._id });
                           }
                           if (navigation.canGoBack()) {
                               navigation.goBack();
                           } else {
                               navigation.navigate('Home');
                           }
                      }}
                  >
                      <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
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
                { height: getResponsiveSize(100) }
            ]}
            activeOpacity={1}
        >
             {isCurrent && !gameOver && (
                <Animated.View style={{ 
                    position: 'absolute', 
                    top: getResponsiveSize(-25), 
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
                    bottom: getResponsiveSize(35), 
                    right: getResponsiveSize(25), 
                    marginTop: 0, 
                    marginBottom: 5, 
                    width: '100%', 
                    position: 'relative',
                }
            ]} numberOfLines={1}>{player.pseudo}</Text>

            <View style={{ marginTop: 0, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{
                    width: getResponsiveSize(12),
                    height: getResponsiveSize(12),
                    borderRadius: getResponsiveSize(6),
                    backgroundColor: player.color === 'black' ? '#F4B41A' : '#ECE6D6',
                    borderWidth: 1,
                    borderColor: player.color === 'black' ? '#9A6800' : '#8A8F9C',
                    left: getResponsiveSize(42),
                    top: getResponsiveSize(3),
                }} />
            </View>

            {timeControl && (
                <View style={{ position: 'absolute', bottom: 14, width: '100%', alignItems: 'center' }}>
                    <View style={[styles.chronoPrincipal, { bottom: 0, marginTop: 0 }]}>
                    <Text style={[styles.chronoPrincipalTexte, { color: (isCurrent ? timeLeft : timeControl) <= 10 ? '#E85D4A' : '#F4B41A', fontSize: getResponsiveSize(12), marginBottom: 2 }]}>
                        ⏱️ {formatTemps(isCurrent ? timeLeft : timeControl)}
                    </Text>
                    </View>
                    
                    {/* TIMEOUTS COUNT */}
                          <View style={[styles.timeoutsContainer, { bottom: 0 }]}>
                              <View style={{ flexDirection: 'row' }}>
                                {[...Array(5)].map((_, i) => (
                                    <View 
                                        key={i} 
                                        style={{
                                            width: getResponsiveSize(8), 
                                            height: getResponsiveSize(8), 
                                            borderRadius: getResponsiveSize(4), 
                                            backgroundColor: i < (timeouts[player.color] || 0) ? '#E63946' : '#2EC27E', // Red : Green
                                            marginHorizontal: getResponsiveSize(2),
                                            borderWidth: getResponsiveSize(0.5),
                                            borderColor: 'rgba(0,0,0,0.2)'
                                        }} 
                                    />
                                ))}
                              </View>
                              {(localConfig?.mode === 'tournament' || tournamentTotalGames > 1) && (
                                  <Text style={{ color: '#FFD700', fontSize: getResponsiveSize(10), fontWeight: 'bold', marginTop: 3 }}>
                                      🏆 {tournamentScore[player.color] || 0}
                                  </Text>
                              )}
                          </View>
                </View>
            )}
            {/* Barre timer fine (design spec) */}
            {timeControl && (
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, {
                        width: `${Math.min(100, ((isCurrent ? timeLeft : timeControl) / timeControl) * 100)}%`,
                        backgroundColor: (isCurrent ? timeLeft : timeControl) <= 10 ? '#E85D4A' : '#F4B41A',
                    }]} />
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
           (mode === 'online' || mode === 'online_custom' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && { height: getResponsiveSize(132) }
          // mode === 'online' && { 
          //     height: 180, // Increased height for better spacing
          //     justifyContent: 'flex-start', 
          //     paddingTop: 10,
          //     alignItems: 'center'
          // }
      ]}
      onPress={() => {
          playButtonSound();
          setSelectedProfile(player);
      }}
      activeOpacity={0.8}
    >
      {(mode === 'online' || mode === 'online_custom' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && isCurrent && !gameOver && (player === player1 || mode === 'spectator' || mode === 'ai' || mode === 'local') && (
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
          (mode === 'online' || mode === 'online_custom' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && { alignItems: 'center', width: '100%', marginBottom: 5 }
      ]}>
        {player.avatar ? (
          <Image source={getAvatarSource(player.avatar)} style={[
              styles.avatar,
              (mode === 'online' || mode === 'online_custom' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && { left: 0 } // Reset offset for online mode
          ]} />
        ) : (
          <Ionicons name="person-circle-outline" size={40} color="#fff" />
        )}
      </View>
      
      <Text style={[
          styles.playerName,
          (mode === 'online' || mode === 'online_custom' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && { 
              bottom: getResponsiveSize(35), 
              right: getResponsiveSize(25), 
              marginTop: 0,
              marginBottom: 5,
              width: '100%',
              position: 'relative'
          }
      ]} numberOfLines={1}>{player.pseudo}</Text>
      
      {(mode === 'online' || mode === 'online_custom' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && (
          <View style={[
              styles.playerCoinsContainer,
              { 
                  position: 'relative', 
                  bottom: getResponsiveSize(35), 
                  right: getResponsiveSize(25), 
                  marginTop: 0, 
                  marginBottom: 5,
                  width: '100%' 
              }
          ]}>
              {player?.coins != null && (
                  <Text style={styles.playerCoinsText}>💰 {Number(player.coins).toLocaleString()}</Text>
              )}
              <Text style={[styles.playerCoinsText, { fontSize: getResponsiveSize(11), color: '#e5e7eb', marginTop: 2 }]}>
                  {t('game.moves')}: {board.filter(p => p.player === player.color).length}
              </Text>
          </View>
      )}

      {/* Pawn Indicator */}
      <View style={{ marginTop: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
              width: getResponsiveSize(12),
              height: getResponsiveSize(12),
              borderRadius: getResponsiveSize(6),
              backgroundColor: player.color === 'black' ? '#F4B41A' : '#ECE6D6',
              borderWidth: 1,
              borderColor: player.color === 'black' ? '#9A6800' : '#8A8F9C',
              left: getResponsiveSize(42),
              top: getResponsiveSize(3),
          }} />
      </View>



      {/* ONLINE INFO FOOTER (Timer + Timeouts) */}
      {(mode === 'online' || mode === 'online_custom' || mode === 'live' || mode === 'spectator' || mode === 'ai' || mode === 'local') && (
          <View style={{ position: 'absolute', bottom: 14, width: '100%', alignItems: 'center' }}>
              {/* CHRONOMÈTRE */}
              {!gameOver && timeControl && (
                 <View style={styles.chronoPrincipal}>
                    <Text style={[styles.chronoPrincipalTexte, { color: (isCurrent ? timeLeft : timeControl) <= 10 ? '#E85D4A' : '#F4B41A' }]}>
                        ⏱️ {formatTemps(isCurrent ? timeLeft : timeControl)}
                    </Text>
                 </View>
              )}

              {/* TIMEOUTS COUNT */}
              <View style={styles.timeoutsContainer}>
                  <View style={{ flexDirection: 'row' }}>
                    {[...Array(5)].map((_, i) => (
                        <View
                            key={i}
                            style={{
                                width: getResponsiveSize(8),
                                height: getResponsiveSize(8),
                                borderRadius: getResponsiveSize(4),
                                backgroundColor: i < (timeouts[player.color] || 0) ? '#E63946' : '#2EC27E',
                                marginHorizontal: getResponsiveSize(2),
                                borderWidth: getResponsiveSize(0.5),
                                borderColor: 'rgba(0,0,0,0.2)'
                            }}
                        />
                    ))}
                  </View>
              </View>
          </View>
      )}
      {/* Barre timer fine (design spec) */}
      {timeControl && (
          <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                  width: `${Math.min(100, ((isCurrent ? timeLeft : timeControl) / timeControl) * 100)}%`,
                  backgroundColor: (isCurrent ? timeLeft : timeControl) <= 10 ? '#E85D4A' : '#F4B41A',
              }]} />
          </View>
      )}

      {/* MESSAGE BUBBLE */}
      {bubbleMessage && (
          <View style={styles.bubbleContainer}>
              {bubbleMessage.type === 'emoji' ? (
                  getEmojiSource(bubbleMessage.content) ? (
                    <EmojiAnimation
                        source={getEmojiSource(bubbleMessage.content)}
                        style={{ width: 60, height: 60 }}
                    />
                  ) : (
                    <Text style={styles.bubbleEmoji}>{bubbleMessage.content}</Text>
                  )
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

      // ✨ NOUVELLE LOGIQUE : Si l'utilisateur dézoome en dessous de 1, retour à l'état initial
      if (lastScale.current <= 1) {
        lastScale.current = 1;
        baseScale.setValue(1);
        pinchScale.setValue(1);
        setIsPanEnabled(false);

        // Réinitialiser la position à (0, 0) - position initiale
        lastOffset.current = { x: 0, y: 0 };

        translateX.flattenOffset();
        translateY.flattenOffset();

        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          })
        ]).start(() => {
          translateX.setOffset(0);
          translateX.setValue(0);
          translateY.setOffset(0);
          translateY.setValue(0);
        });

        return; // On arrête ici, pas besoin du reste du code
      }

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
        r >= 0 && r < ROWS && c >= 0 && c < COLS &&
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
        r >= 0 && r < ROWS && c >= 0 && c < COLS &&
        boardToCheck.some(s => s.row === r && s.col === c && s.player === player)
      ) {
        line.push({row: r, col: c});
        count++;
        r -= dx;
        c -= dy;
      }

      if (count === 5) return line;
    }
    return null;
  };

  const checkDraw = (boardToCheck) => {
    // Cas 1 : plateau plein
    if (boardToCheck.length === ROWS * COLS) return true;
    
    // Optimisation : ne vérifier l'impasse que si le plateau est suffisamment rempli
    // (par exemple > 60%) pour éviter des calculs inutiles en début de partie
    if (boardToCheck.length < ROWS * COLS * 0.6) return false;

    // Créer une Map pour un accès O(1)
    const boardMap = new Map();
    boardToCheck.forEach(s => boardMap.set(`${s.row},${s.col}`, s.player));

    // Cas 2 : aucun joueur ne peut plus aligner 5
    const canWin = (player) => {
      const directions = [[0,1],[1,0],[1,1],[1,-1]];
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          for (let [dx, dy] of directions) {
            let canAlign = true;
            for (let k = 0; k < 5; k++) {
              const r = row + dx * k;
              const c = col + dy * k;
              
              if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { 
                  canAlign = false; 
                  break; 
              }
              
              const cellPlayer = boardMap.get(`${r},${c}`);
              if (cellPlayer && cellPlayer !== player) {
                  canAlign = false; 
                  break; 
              }
            }
            if (canAlign) return true;
          }
        }
      }
      return false;
    };

    return !canWin('black') && !canWin('white');
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
      // console.log('Error playing sound', error);
    }
  };

  // Fonction pour vérifier si c'est le tour de l'IA
  const estTourIA = () => {
    if (mode !== 'ai' || gameOver) return false;
    const couleurIA = iaColors.ia;
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
    if (!coup || coup.row < 0 || coup.row >= ROWS || coup.col < 0 || coup.col >= COLS) {
        setIaEnReflexion(false);
        return;
    }
    if (coup) {
        setDernierCoupIA(coup);

        // Générer message
        const messages = [
            t('game.ai_msg_1'),
            t('game.ai_msg_2'),
            t('game.ai_msg_3'),
            t('game.ai_msg_4'),
            t('game.ai_msg_5'),
            t('game.ai_msg_6'),
            t('game.ai_msg_7'),
            t('game.ai_msg_8'),
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
                            const userColor = iaColors.joueur;
                            const iaColor = iaColors.ia;
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
                       premierJoueur: isTournament && !tournamentOver ? (configIA.premierJoueur === 'ia' ? 'joueur' : 'ia') : configIA.premierJoueur,
                       tournamentSettings: isTournament ? {
                           totalGames: tournamentTotalGames,
                           gameNumber: tournamentOver ? 1 : nextGameNumber,
                           score: tournamentOver ? { black: 0, white: 0 } : newScore,
                           starterPartie1: configIA.tournamentSettings?.starterPartie1
                       } : null
                   };

                   // IA Tournament: utiliser la fenêtre "Match suivant" comme en Jeu en ligne
                   if (isTournament && !tournamentOver) {
                       const userColor = iaColors.joueur;
                       const iaColor = iaColors.ia;
                       const scoreUser = newScore[userColor] || 0;
                       const scoreIA = newScore[iaColor] || 0;
                       
                       setNextAiConfig(nextConfigIA);
                       setAlertData({
                           title: t('game.match_finished', { number: tournamentGameNumber }),
                           message: `${t('game.score_label')}: ${scoreUser} - ${scoreIA}\n${t('game.next_match')}: ${t('game.match_number', { number: nextGameNumber, total: tournamentTotalGames })}`
                       });
                       setNextMatchVisible(true);
                       } else {
                       const userColor = iaColors.joueur;
                       const iaColor = iaColors.ia;
                       const isTournamentDrawFinal = isTournament && tournamentOver && (newScore[userColor] === newScore[iaColor]);
                       if (isTournamentDrawFinal) {
                           if (params.betAmount > 0) {
                               refund(params.betAmount, 'Remboursement Tournoi IA (Match Nul)', { 
                                   gameId: params.gameId || 'local_ia',
                                   mode: 'ia',
                                   isTournament
                               }).catch(err => console.error('Erreur remboursement IA (tournoi nul):', err));
                           }
                           setResultData({
                               victoire: false,
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
                       } else {
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
                       }
                   }
                }, 500);
            } else if (checkDraw(newBoard)) {
                setGameOver(true);
                setIaEnReflexion(false);
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
                           const userColor = iaColors.joueur;
                           const iaColor = iaColors.ia;
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
                      nextPremierJoueur = configIA.premierJoueur === 'ia' ? 'joueur' : 'ia';
                 }

                 const nextConfigIA = {
                     ...configIA,
                     premierJoueur: nextPremierJoueur,
                     tournamentSettings: isTournament ? {
                         totalGames: tournamentTotalGames,
                         gameNumber: tournamentOver ? 1 : nextGameNumber,
                         score: tournamentOver ? { black: 0, white: 0 } : newScore,
                         starterPartie1: configIA.tournamentSettings?.starterPartie1
                     } : null
                 };

                 if (params.betAmount > 0) {
                     refund(params.betAmount, 'Remboursement Match Nul IA', { gameId: params.gameId || 'local_ia' })
                         .catch(err => console.error('Erreur remboursement IA:', err));
                 }

                 if (isTournament && !tournamentOver) {
                     const userColor = iaColors.joueur;
                     const iaColor = iaColors.ia;
                     const scoreUser = newScore[userColor] || 0;
                     const scoreIA = newScore[iaColor] || 0;
                     setNextAiConfig(nextConfigIA);
                     setAlertData({
                         title: t('game.match_finished', { number: tournamentGameNumber }),
                         message: `${t('game.score_label')}: ${scoreUser} - ${scoreIA}\n${t('game.next_match')}: ${t('game.match_number', { number: nextGameNumber, total: tournamentTotalGames })}`
                     });
                     setNextMatchVisible(true);
                 } else {
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
                 }
                }, 500);
            } else {
                setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
                setTurnTimer(timeControl);
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
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (gameOver) return;
    if (waitingForNextRound) return; // Prevent moves while waiting for next round/game over
    if (mode === 'spectator' || isSpectatorMode) return;
    if (!syncReadyRef.current && (mode === 'online' || mode === 'online_custom' || mode === 'live')) return;
    
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
        
        /* console.log('[handlePress] Check:', { 
            currentPlayer, 
            myColor, 
            userId: myId, 
            blackId,
            whiteId,
            isMyTurn: currentPlayer === myColor,
            boardSize: board.length,
            socketConnected: socket.connected
        }); */

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
            appAlert(t('game.connection_error'), t('game.connection_lost'));

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
                     const userColor = iaColors.joueur;
                     const iaColor = iaColors.ia;
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

            // Calcul des gains (Pot total * 0.95)
            // Modification pour synchronisation globale et tournoi
            let profit = 0;
            let totalReturn = 0;
            
            const userColor = iaColors.joueur;
            const iaColor = iaColors.ia;
            
            const didUserWinGame = currentPlayer === userColor;
            const isUserWinnerOfTournament = newScore[userColor] > newScore[iaColor];
            
            const shouldAwardGains = (!isTournament && didUserWinGame) || (isTournament && tournamentOver && isUserWinnerOfTournament);

            if (shouldAwardGains) {
                const betAmount = params.betAmount || 0;
                totalReturn = Math.floor(betAmount * 2 * 0.95);
                profit = totalReturn - betAmount;
            }
            
            if (params.betAmount > 0 && totalReturn > 0) {
                credit(totalReturn, isTournament ? 'Victoire Tournoi IA' : 'Victoire IA', { 
                    gameId: params.gameId || 'local_ia',
                    mode: 'ia',
                    isTournament
                }).catch(err => console.error('Erreur credit gain IA:', err));
            }

            if (isTournament && !tournamentOver) {
                const scoreUserDisplay = newScore[userColor] || 0;
                const scoreIADisplay = newScore[iaColor] || 0;
                setNextAiConfig(nextConfigIA);
                setAlertData({
                    title: t('game.match_finished', { number: tournamentGameNumber }),
                    message: `${t('game.score_label')}: ${scoreUserDisplay} - ${scoreIADisplay}\n${t('game.next_match')}: ${t('game.match_number', { number: nextGameNumber, total: tournamentTotalGames })}`
                });
                setNextMatchVisible(true);
            } else {
                // Fin de tournoi IA: vérifier égalité -> remboursement
                const isTournamentDrawFinal = isTournament && tournamentOver && (newScore[userColor] === newScore[iaColor]);
                if (isTournamentDrawFinal) {
                    if (params.betAmount > 0) {
                        refund(params.betAmount, 'Remboursement Tournoi IA (Match Nul)', { 
                            gameId: params.gameId || 'local_ia',
                            mode: 'ia',
                            isTournament
                        }).catch(err => console.error('Erreur remboursement IA (tournoi nul):', err));
                    }
                    setResultData({
                        victoire: false,
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
                } else {
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
                }
            }
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

    if (checkDraw(newBoard)) {
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
                           const userColor = iaColors.joueur;
                           const iaColor = iaColors.ia;
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

                 if (params.betAmount > 0) {
                     refund(params.betAmount, 'Remboursement Match Nul IA', { gameId: params.gameId || 'local_ia' })
                         .catch(err => console.error('Erreur remboursement IA:', err));
                 }

                 if (isTournament && !tournamentOver) {
                     const userColor = iaColors.joueur;
                     const iaColor = iaColors.ia;
                     const scoreUser = newScore[userColor] || 0;
                     const scoreIA = newScore[iaColor] || 0;
                     setNextAiConfig(nextConfigIA);
                     setAlertData({
                         title: t('game.match_finished', { number: tournamentGameNumber }),
                         message: `${t('game.score_label')}: ${scoreUser} - ${scoreIA}\n${t('game.next_match')}: ${t('game.match_number', { number: nextGameNumber, total: tournamentTotalGames })}`
                     });
                     setNextMatchVisible(true);
                 } else {
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
                 }
             }, 500);
             return;
        }
    }

    setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
    setTurnTimer(timeControl);
  };

  const jouerCoupLocalOuIAParTimer = useCallback((row, col, player) => {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    playSound(player);
    const newStone = { row, col, player };
    const newBoard = [...board, newStone];
    setBoard(newBoard);

    const winLine = checkWinner(row, col, player);
    if (winLine) {
      setWinningLine(winLine);
      setWinner(player);
      setGameOver(true);
      return;
    }

    if (newBoard.length === ROWS * COLS) {
      setGameOver(true);
      return;
    }

    setCurrentPlayer(player === 'black' ? 'white' : 'black');
    setTurnTimer(timeControl);
  }, [board, isSoundEnabled, timeControl]);

  const handleLocalTimeout = useCallback(() => {
    if (mode !== 'local' || !currentPlayer) return;
    const player = currentPlayer;
    setTimeouts(prev => {
      const current = prev[player] || 0;
      const next = current + 1;
      const updated = { ...prev, [player]: next };

      if (next >= 5) {
        const winnerColor = player === 'black' ? 'white' : 'black';

        let newScore = { ...tournamentScore };
        const isTournament =
          localConfig.mode === 'tournament' ||
          (initialTournamentSettings && initialTournamentSettings.totalGames > 1);
        let tournamentOver = false;
        let nextGameNumber = tournamentGameNumber;

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
          nextStartingPlayer =
            (localConfig.startingPlayer || 'black') === 'black' ? 'white' : 'black';
        }

        const nextLocalConfig = {
          ...localConfig,
          startingPlayer: nextStartingPlayer,
          tournamentSettings: isTournament
            ? {
                totalGames: tournamentTotalGames,
                gameNumber: tournamentOver ? 1 : nextGameNumber,
                score: tournamentOver ? { black: 0, white: 0 } : newScore
              }
            : null
        };

        setGameOver(true);
        setResultData({
          victoire: true,
          winnerColor,
          type: 'local',
          reason: 'timeout',
          localConfig: nextLocalConfig,
          isTournament,
          tournamentScore: newScore,
          tournamentOver,
          gameNumber: tournamentGameNumber,
          totalGames: tournamentTotalGames,
          timeouts: updated
        });
        setShowResultModal(true);
        return updated;
      }

      let move;
      if (board.length === 0) {
        move = { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) };
      } else {
        move = calculerCoupIA(board, 'facile', player);
      }

      if (move) {
        jouerCoupLocalOuIAParTimer(move.row, move.col, player);
      }

      return updated;
    });
  }, [
    mode,
    currentPlayer,
    board,
    jouerCoupLocalOuIAParTimer,
    tournamentScore,
    localConfig,
    initialTournamentSettings,
    tournamentGameNumber,
    tournamentTotalGames
  ]);

  const handleAiTimeout = useCallback(() => {
    if (mode !== 'ai') return;
    const humanColor = iaColors.joueur;
    if (currentPlayer !== humanColor) return;

    setTimeouts(prev => {
      const current = prev[humanColor] || 0;
      const next = current + 1;
      const updated = { ...prev, [humanColor]: next };

      if (next >= 5) {
        const winnerColor = iaColors.ia;
        setGameOver(true);

        const isTournament = configIA?.mode === 'tournament';

        if (isTournament) {
          const newScore = { ...tournamentScore };
          const userColor = iaColors.joueur;
          const iaColor = iaColors.ia;
          newScore[iaColor] = (newScore[iaColor] || 0) + 1;
          setTournamentScore(newScore);

          let tournamentOver = false;
          let nextGameNumber = tournamentGameNumber;

          if (tournamentGameNumber >= tournamentTotalGames) {
            tournamentOver = true;
          } else {
            const scoreUser = newScore[userColor] || 0;
            const scoreIA = newScore[iaColor] || 0;
            const remainingGames = tournamentTotalGames - tournamentGameNumber;
            if (Math.abs(scoreUser - scoreIA) > remainingGames) {
              tournamentOver = true;
            }
          }

          if (!tournamentOver) {
            nextGameNumber += 1;
          }

          const nextConfigIA = {
            ...configIA,
            tournamentSettings: {
              totalGames: tournamentTotalGames,
              gameNumber: tournamentOver ? 1 : nextGameNumber,
              score: tournamentOver ? { black: 0, white: 0 } : newScore
            }
          };

          if (!tournamentOver) {
            setNextAiConfig(nextConfigIA);
            const scoreUserDisplay = newScore[userColor] || 0;
            const scoreIADisplay = newScore[iaColor] || 0;
            setAlertData({
              title: t('game.match_finished', { number: tournamentGameNumber }),
              message: `${t('game.score_label')}: ${scoreUserDisplay} - ${scoreIADisplay}\n${t('game.next_match')}: ${t('game.match_number', { number: nextGameNumber, total: tournamentTotalGames })}`
            });
            setNextMatchVisible(true);
          } else {
            const scoreUser = newScore[userColor] || 0;
            const scoreIA = newScore[iaColor] || 0;
            const isTournamentDrawFinal = scoreUser === scoreIA;

            if (isTournamentDrawFinal && (params.betAmount || 0) > 0) {
              refund(params.betAmount, 'Remboursement Tournoi IA (Match Nul)', {
                gameId: params.gameId || 'local_ia',
                mode: 'ia',
                isTournament: true
              }).catch(err => console.error('Erreur remboursement IA (tournoi nul):', err));
            }

            setResultData({
              victoire: scoreUser > scoreIA,
              reason: isTournamentDrawFinal ? 'draw' : 'timeout',
              gains: isTournamentDrawFinal ? (params.betAmount || 0) : 0,
              montantPari: params.betAmount || 0,
              adversaire: { pseudo: 'Ordinateur (IA)' },
              difficulte: configIA?.difficulte,
              configIA: nextConfigIA,
              type: 'ia',
              isTournament: true,
              tournamentScore: newScore,
              tournamentOver: true,
              gameNumber: tournamentGameNumber,
              totalGames: tournamentTotalGames,
              timeouts: updated
            });
            setShowResultModal(true);
          }
        } else {
          setResultData({
            victoire: false,
            reason: 'timeout',
            type: 'ia',
            winnerColor,
            difficulte: configIA?.difficulte,
            timeouts: updated,
            configIA: configIA
          });
          setShowResultModal(true);
        }

        return updated;
      }

      const difficulte = configIA?.difficulte || 'moyen';
      let move;
      if (board.length === 0) {
        move = { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) };
      } else {
        move = calculerCoupIA(board, difficulte, humanColor);
      }
      
      if (move) {
        jouerCoupLocalOuIAParTimer(move.row, move.col, humanColor);
      }

      return updated;
    });
  }, [mode, currentPlayer, board, jouerCoupLocalOuIAParTimer, configIA, iaColors, tournamentScore, tournamentGameNumber, tournamentTotalGames]);

  const handleOnlineTimeout = useCallback(() => {
    if (!(mode === 'online' || mode === 'online_custom' || mode === 'live')) return;
    if (!playersData || !user) return;

    const myId = user._id || user.id;
    const blackId = getPlayerId(playersData.black);
    const whiteId = getPlayerId(playersData.white);

    let myColor = null;
    if (blackId && myId && blackId.toString() === myId.toString()) myColor = 'black';
    else if (whiteId && myId && whiteId.toString() === myId.toString()) myColor = 'white';

    if (!myColor) return;
    if (currentPlayer !== myColor) return;

    let move;
    if (board.length === 0) {
      move = { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) };
    } else {
      move = calculerCoupIA(board, 'moyen', myColor);
    }

    if (!move || move.row < 0 || move.row >= ROWS || move.col < 0 || move.col >= COLS) return;

    if (socket.connected) {
      socket.emit('make_move', {
        gameId: params.gameId,
        userId: myId,
        player: myColor,
        row: move.row,
        col: move.col,
        isAutoPlay: true
      });
    } else {
      socket.connect();
      appAlert(t('game.connection_error'), t('game.connection_lost'));
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('make_move', {
            gameId: params.gameId,
            userId: myId,
            player: myColor,
            row: move.row,
            col: move.col,
            isAutoPlay: true
          });
        }
      }, 1000);
    }
  }, [mode, playersData, user, currentPlayer, board, params.gameId]);

  // Minuteur multi‑modes (Local, IA, En ligne / Live / Spectateur)
  useEffect(() => {
    const validModes = ['local', 'ai', 'online', 'online_custom', 'live', 'spectator'];
    // Ajout de la vérification isWaitingState pour ne pas démarrer le timer dans la salle d'attente
    if (!validModes.includes(mode) || !timeControl || gameOver || waitingForNextRound || !currentPlayer || isWaitingState) return;

    // Pour les modes réseau, attendre que les 2 joueurs soient présents
    if ((mode === 'online' || mode === 'online_custom' || mode === 'live' || mode === 'spectator') && 
        (!playersData || !playersData.white || !playersData.black)) return;

    const turnKey = `${(paramsRef.current?.gameId || '')}:${currentPlayer}`;
    if (lastTurnKeyRef.current !== turnKey) {
      lastTurnKeyRef.current = turnKey;
      setTurnTimer(timeControl);
    } else if (!turnDeadlineRef.current) {
      const fallback = Number.isFinite(timeLeftRef.current) ? timeLeftRef.current : timeControl;
      setTurnTimer(fallback);
    }

    const intervalId = setInterval(() => {
      if (!turnDeadlineRef.current) return;
      const remaining = Math.max(0, Math.ceil((turnDeadlineRef.current - Date.now()) / 1000));

      if (remaining === 0 && !timeoutHandledRef.current) {
        timeoutHandledRef.current = true;
        if (mode === 'local') {
          handleLocalTimeout();
        } else if (mode === 'ai') {
          handleAiTimeout();
        } else if (mode === 'online' || mode === 'online_custom' || mode === 'live') {
          handleOnlineTimeout();
        }
      }

      setTimeLeft(prev => (prev === remaining ? prev : remaining));
    }, 250);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    mode,
    timeControl,
    gameOver,
    waitingForNextRound,
    currentPlayer,
    isWaitingState,
    playersData,
    handleLocalTimeout,
    handleAiTimeout,
    handleOnlineTimeout
  ]);

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
        setTurnTimer(params.timeControl ?? null);
        
        // Ensure current player is set correctly based on new params
        if (params.currentTurn) setCurrentPlayer(params.currentTurn);
    }
  }, [params.gameId, params.currentTurn, params.timeControl]);

  useEffect(() => {
    if (mode === 'online' || mode === 'online_custom' || mode === 'live') {
        const handleRematchRequested = (data) => {
             const gameIdToUse = data?.gameId || paramsRef.current?.gameId;
             const requiredBet = Number(paramsRef.current?.betAmount ?? 0);
             const myCoins = Number(user?.coins ?? 0);
             showAlert(
                 t('game.rematch_request'),
                 t('game.rematch_received_msg'),
                 [
                     {
                         text: t('game.refuse'),
                         onPress: () => {
                             if (!gameIdToUse) return;
                             socket.emit('respond_rematch', { gameId: gameIdToUse, accepted: false });
                         },
                         style: 'cancel'
                     },
                     {
                         text: t('game.accept'),
                         onPress: () => {
                             if (!gameIdToUse) return;
                             if (myCoins < requiredBet) {
                                 showAlert(t('common.error'), t('game.not_enough_coins_replay'), [{ text: t('common.ok'), style: 'cancel' }]);
                                 return;
                             }
                             socket.emit('respond_rematch', { gameId: gameIdToUse, accepted: true });
                         }
                     }
                 ]
             );
        };

        const handleRematchDeclined = () => {
            setRematchRequested(false);
            showAlert(t('game.rematch_declined_title'), t('game.rematch_declined_msg'), [{ text: t('common.ok'), style: 'cancel' }]);
        };

        const handleRematchFailed = (msg) => {
            setRematchRequested(false);
            showAlert(t('common.error'), msg || t('game.rematch_failed'), [{ text: t('common.ok'), style: 'cancel' }]);
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
      const isCancel = reason === 'cancel_by_agreement';
      const isTournamentDraw = (type === 'local' || type === 'ia' || type === 'ai') && isTournament && tournamentOver && resultData.tournamentScore?.black === resultData.tournamentScore?.white;
      const canShowOpponent = (type === 'online' || type === 'live' || type === 'ia' || type === 'ai');
      const isAiResult = type === 'ia' || type === 'ai';
      const isLiveResult = type === 'live';
      const fullHeightResult = isAiResult || isLiveResult;

      return (
          <ImageBackground source={require('../../assets/images/Background2-4.png')} style={styles.resultOverlay}>
              <View style={styles.bgOverlay} pointerEvents="none" />
              <View
                style={[
                  styles.resultCard,
                  {
                    maxHeight: Math.round(height * 0.92),
                    padding: getResponsiveSize(isTablet ? 24 : 18),
                  },
                  fullHeightResult && { height: Math.round(height * 0.9) },
                ]}
                pointerEvents={mode === 'spectator' ? 'none' : 'auto'}
              >
                  <Text style={styles.emojiResult}>
                    {isDraw || isTournamentDraw || isCancel ? '🤝' : (victoire ? '🏆' : '😢')}
                  </Text>
                  <Text style={styles.titreResult}>
                    {isCancel ? t('game.result_cancelled') : (isDraw || isTournamentDraw ? t('game.result_draw') : (victoire ? t('game.result_victory') : t('game.result_defeat')))}
                  </Text>

                  {(type === 'live' || type === 'online' || type === 'online_custom' || type === 'ai' || type === 'ia') && resultData?.isTournament && (
                      <Text style={styles.scoreTournament}>
                          Score: {(tournamentScore?.black ?? 0)} - {(tournamentScore?.white ?? 0)}
                      </Text>
                  )}

                  {canShowOpponent && (
                      <Text style={styles.adversaireResult} numberOfLines={1}>
                          {t('game.against')} {adversaire?.pseudo || t('game.opponent')}
                      </Text>
                  )}

                  <ScrollView
                    style={[styles.resultScroll, fullHeightResult ? { flex: 1 } : { maxHeight: Math.round(height * 0.58) }]}
                    contentContainerStyle={[styles.resultScrollContent, isLiveResult && { paddingBottom: getResponsiveSize(30) }]}
                    showsVerticalScrollIndicator={false}
                  >
                      <View style={styles.miniBoardWrapper}>
                          <Text style={styles.miniBoardLabel}>{t('game.final_board')}</Text>
                          <View style={styles.resultMiniBoard}>
                              {(() => {
                                  const miniWidth = getResponsiveSize(isTablet ? 170 : (isLiveResult ? 122 : 135));
                                  const cell = miniWidth / COLS;
                                  const miniHeight = cell * ROWS;
                                  const originX = cell / 2;
                                  const originY = cell / 2;
                                  const last = board.length > 0 ? board[board.length - 1] : null;
                                  return (
                                      <Svg width={miniWidth} height={miniHeight}>
                                          <Rect x={0} y={0} width={miniWidth} height={miniHeight} fill="#0E1320" rx={getResponsiveSize(10)} />

                                          {Array.from({ length: COLS }).map((_, col) => {
                                              const x = originX + col * cell;
                                              return (
                                                  <Line
                                                      key={`mini-v-${col}`}
                                                      x1={x}
                                                      y1={originY}
                                                      x2={x}
                                                      y2={originY + (ROWS - 1) * cell}
                                                      stroke="#1F2840"
                                                      strokeWidth="0.8"
                                                      opacity={0.85}
                                                  />
                                              );
                                          })}

                                          {Array.from({ length: ROWS }).map((_, row) => {
                                              const y = originY + row * cell;
                                              return (
                                                  <Line
                                                      key={`mini-h-${row}`}
                                                      x1={originX}
                                                      y1={y}
                                                      x2={originX + (COLS - 1) * cell}
                                                      y2={y}
                                                      stroke="#1F2840"
                                                      strokeWidth="0.8"
                                                      opacity={0.85}
                                                  />
                                              );
                                          })}

                                          {board.map((stone, index) => {
                                              const cx = originX + stone.col * cell;
                                              const cy = originY + stone.row * cell;
                                              const r = cell * 0.35;
                                              const isBlack = stone.player === 'black';
                                              const fill = isBlack ? '#ff0808ff' : '#4dabf7';
                                              const stroke = isBlack ? '#500000' : '#1e272fff';

                                              return (
                                                  <Circle
                                                      key={`mini-stone-${stone.row}-${stone.col}-${index}`}
                                                      cx={cx}
                                                      cy={cy}
                                                      r={r}
                                                      fill={fill}
                                                      stroke={stroke}
                                                      strokeWidth={0.8}
                                                  />
                                              );
                                          })}

                                          {last && (
                                              <Circle
                                                  cx={originX + last.col * cell}
                                                  cy={originY + last.row * cell}
                                                  r={cell * 0.12}
                                                  fill="#E85D4A"
                                                  opacity={0.9}
                                              />
                                          )}
                                      </Svg>
                                  );
                              })()}
                          </View>
                      </View>

                      {canShowOpponent && (
                          <>
                              {raisonVictoire === 'timeout_adverse' && (
                                  <View style={styles.raisonContainer}>
                                      <Text style={styles.raisonTexte}>⏰ {t('game.opponent_timeout')}</Text>
                                  </View>
                              )}

                              {raisonVictoire === 'disconnect' && (
                                  <View style={styles.raisonContainer}>
                                      <Text style={styles.raisonTexte}>🔌 {t('game.opponent_disconnected')}</Text>
                                  </View>
                              )}

                              {raisonDefaite === 'timeout' && (
                                  <View style={[styles.raisonContainer, styles.raisonDefaite]}>
                                      <Text style={[styles.raisonTexte, styles.raisonTexteDefaite]}>⏰ {t('game.you_timeout')}</Text>
                                  </View>
                              )}
                          </>
                      )}

                      {(isDraw || isTournamentDraw || isCancel) ? (
                          <View style={styles.drawContainer}>
                              <Text style={styles.drawLabel}>{t('game.bet_refunded')} :</Text>
                              <Text style={styles.drawMontant}>🪙 {Number(gains ?? 0).toLocaleString()}</Text>
                          </View>
                      ) : (
                          victoire ? (
                              <View style={styles.gainsContainer}>
                                  <Text style={styles.gainsLabel}>{t('game.you_won_label')} :</Text>
                                  <Text style={styles.gainsMontant}>+🪙 {Number(gains ?? 0).toLocaleString()}</Text>
                              </View>
                          ) : (
                              <View style={styles.perteContainer}>
                                  <Text style={styles.perteLabel}>{t('game.you_lost_label')} :</Text>
                                  <Text style={styles.perteMontant}>-🪙 {Number(montantPari ?? 0).toLocaleString()}</Text>
                              </View>
                          )
                      )}

                      {!victoire && !isDraw && !isCancel && !isTournamentDraw && showAds && mode !== 'spectator' && (
                          <TouchableOpacity
                              style={styles.boutonRewardedResult}
                              onPress={() => {
                                  playButtonSound();
                                  showRewarded({ amount: 10, reason: 'Récompense défaite', metadata: { source: 'defeat_reward', context: type } });
                              }}
                          >
                              <Text style={styles.boutonRewardedTexteResult}>🎁 {t('game.watch_ad_reward')}</Text>
                          </TouchableOpacity>
                      )}

                      {type === 'ia' && statsIA && (
                          <View style={styles.statsContainer}>
                              <Text style={styles.statsLabel}>{t('game.ai_mode_label')} {difficulte.charAt(0).toUpperCase() + difficulte.slice(1)}</Text>
                              <Text style={styles.statsTaux}>{tauxVictoire}% {t('game.win_rate_label')}</Text>
                              <Text style={styles.statsParties}>{statsIA.jouees} {t('game.games_played_label')}</Text>
                          </View>
                      )}

                      {type === 'local' && (
                           <Text style={styles.messageResult}>
                               {isTournamentDraw ? t('game.draw_no_winner') : (isDraw ? t('game.draw_exclaim') : t('game.local_winner', { color: resultData.winnerColor === 'black' ? t('game.color_red') : t('game.color_blue') }))}
                           </Text>
                      )}

                  <View style={styles.resultTopActionsRow}>
                      {(type === 'online' || type === 'online_custom') && mode !== 'spectator' && (
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
                                  playButtonSound();
                                  if (user.coins < montantPari) {
                                      showAlert(t('game.insufficient_balance'), t('game.not_enough_coins_replay'), [{ text: t('common.ok'), style: 'cancel' }]);
                                      return;
                                  }
                                  
                                  // Pour online_custom, si le tournoi est fini, le créateur peut vouloir relancer
                                  // Mais l'action par défaut ici est request_rematch
                                  setRematchRequested(true);
                                  socket.emit('request_rematch', { gameId: params.gameId });
                              }}
                          >
                              <Text style={styles.boutonTexteResult}>
                                  {rematchRequested ? t('game.request_sent_short') : (isTournament && tournamentOver ? `🔄 ${t('game.new_tournament')}` : (victoire ? `🔄 ${t('game.replay')}` : `🔄 ${t('game.rematch_same_bet')}`))}
                              </Text>
                          </TouchableOpacity>
                      )}

                      {victoire && mode !== 'spectator' && (
                          <TouchableOpacity 
                              style={[
                                  styles.boutonRejouer, 
                                  { 
                                      backgroundColor: '#f1c40f', 
                                      width: (type === 'online' || type === 'online_custom') ? '20%' : '100%', 
                                      marginBottom: 0, 
                                      flex: 0 
                                  }
                              ]} 
                              onPress={async () => {
                                  playButtonSound();
                                  try {
                                      const message = type === 'online'
                                          ? t('game.share_win_online', { pseudo: adversaire?.pseudo || t('game.opponent') })
                                          : (type === 'ia'
                                              ? t('game.share_win_ai', { difficulte })
                                              : t('game.share_win_generic'));

                                      await Share.share({
                                          message,
                                          title: t('game.share_title')
                                      });
                                  } catch (error) {
                                      // console.log('Error sharing:', error);
                                  }
                              }}
                          >
                              <Text style={styles.boutonTexteResult}>
                                 <Ionicons name="share-social-outline" size={getResponsiveSize(18)} color="#fff" />
                              </Text>
                          </TouchableOpacity>
                      )}
                  </View>

                  {mode === 'spectator' && (
                      <View style={styles.spectatorNoteContainer}>
                          <Text style={styles.spectatorNote}>{t('game.spectator_result_note')}</Text>
                      </View>
                  )}

                  {mode !== 'spectator' && (
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
                                                   playButtonSound();
                                                   setRematchRequested(true);
                                                   socket.emit('request_rematch', { gameId: params.gameId });
                                               }}
                                               disabled={rematchRequested}
                                           >
                                               <Text style={styles.boutonTexteResult}>
                                                   {rematchRequested ? t('game.request_sent_short') : `🔄 ${t('game.new_tournament')}`}
                                               </Text>
                                           </TouchableOpacity>

                                          <TouchableOpacity 
                                              style={[styles.boutonRejouer, { backgroundColor: '#3b82f6', marginBottom: 10 }]} 
                                              onPress={() => {
                                                  playButtonSound();
                                                  setShowResultModal(false);
                                                  socket.emit('reset_live_opponent', { gameId: params.gameId });
                                                  if (params.roomConfig) {
                                                      navigation.replace('SalleAttenteLive', { configSalle: params.roomConfig, autoInvite: true });
                                                  } else {
                                                      navigation.navigate('Home');
                                                  }
                                              }}
                                          >
                                              <Text style={styles.boutonTexteResult}>👥 {t('game.choose_opponent')}</Text>
                                          </TouchableOpacity>
                                      </>
                                  ) : null;
                              })()}

                              <TouchableOpacity 
                                  style={styles.boutonMenuResult} 
                                  onPress={() => {
                                      playButtonSound();
                                      setShowResultModal(false);
                                      const creatorId = params.roomConfig?.createur?._id || params.roomConfig?.createur?.id;
                                      const userId = user?._id || user?.id;
                                      const isCreator = creatorId && userId && creatorId.toString() === userId.toString();
                                      if (isCreator) {
                                          isExitingRef.current = true;
                                          socket.emit('stop_live_room', { gameId: params.gameId, userId: user?._id || user?.id });
                                      }
                                      navigation.navigate('Home');
                                  }}
                              >
                                  <Text style={styles.boutonTexteResult}>🛑 {t('game.stop_live')}</Text>
                              </TouchableOpacity>
                          </>
                      ) : (
                          <>
                              <TouchableOpacity 
                                  style={styles.boutonRejouer} 
                                  onPress={() => {
                                      playButtonSound();
                                      if (type === 'online') {
                                          setShowResultModal(false);
                                          navigation.navigate('Home');
                                      } else if (type === 'online_custom') {
                                          setShowResultModal(false);
                                          navigation.navigate('Home');
                                      } else if (type === 'ia' || type === 'ai') {
                                          const currentCoins = user?.coins || 0;
                                          const needsDebit = (montantPari > 0) && (!isTournament || tournamentOver);
                                          if (needsDebit && currentCoins < montantPari) {
                                              const manque = montantPari - currentCoins;
                                              showAlert(
                                                  t('game.insufficient_balance'),
                                                  t('game.missing_coins', { amount: Number(manque).toLocaleString() }),
                                                  [
                                                      { text: t('game.shop'), onPress: () => navigation.navigate('Home', { screen: 'Magasin' }) },
                                                      { text: t('common.ok'), style: 'cancel' }
                                                  ]
                                              );
                                              return;
                                          }

                                          setShowResultModal(false);
                                          isRematching.current = true;
                                          AudioController.setRematchMode(true);
                                          
                                          let nextConfig = resultData.configIA || configIA;
                                          if (!isTournament) {
                                              nextConfig = { ...nextConfig, mode: 'simple', tournamentSettings: null };
                                          }
                                          
                                          navigation.replace('Game', { modeJeu: 'ia', configIA: nextConfig, betAmount: montantPari });
                                      } else if (type === 'local') {
                                          setShowResultModal(false);
                                          isRematching.current = true;
                                          AudioController.setRematchMode(true);
                                          if (resultData.localConfig) {
                                              navigation.replace('Game', { mode: 'local', localConfig: resultData.localConfig });
                                          } else {
                                              navigation.replace('Game', { mode: 'local' });
                                          }
                                      } else {
                                          setShowResultModal(false);
                                          isRematching.current = true;
                                          AudioController.setRematchMode(true);
                                          navigation.replace('Game', { modeJeu: 'local' });
                                      }
                                  }}
                              >
                                  <Text style={styles.boutonTexteResult}>
                                      {(() => {
                                        if (type === 'online') return `🔙 ${t('game.change_opponent')}`;
                                        if (type === 'online_custom') return `🏠 ${t('game.quit')}`;
                                        const isAi = type === 'ia' || type === 'ai';
                                        if (isAi && isTournament && !tournamentOver) return `➡️ ${t('game.next_match_btn')}`;
                                        if (isAi && isTournament && tournamentOver) return `🔄 ${t('game.new_tournament')}`;
                                        if (type === 'local' && isTournament && !tournamentOver) return `➡️ ${t('game.next_match_btn')}`;
                                        if (type === 'local' && isTournament && tournamentOver) return `🔄 ${t('game.new_tournament')}`;
                                        return `🔄 ${t('game.replay')}`;
                                      })()}
                                  </Text>
                              </TouchableOpacity>

                              <TouchableOpacity 
                                  style={styles.boutonMenuResult} 
                                  onPress={() => {
                                      playButtonSound();
                                      setShowResultModal(false);
                                      navigation.navigate('Home');
                                  }}
                              >
                                  <Text style={styles.boutonTexteResult}>🏠 {t('game.menu')}</Text>
                              </TouchableOpacity>
                          </>
                      )}
                  </View>
                  )}
                  </ScrollView>
              </View>
          </ImageBackground>
      );
  };

  // ── NEW LAYOUT HELPERS ────────────────────────────────────────────────────
  // Renders the compact top HUD (player 2).
  const renderTopHUDNew = () => {
    if (nextMatchVisible) return null;
    const isCurrent = !gameOver && currentPlayer === player2.color;
    const displayTime = timeControl ? (isCurrent ? timeLeft : timeControl) : null;
    const showTournament =
      (mode === 'local' && localConfig?.mode === 'tournament') ||
      (mode !== 'local' && tournamentTotalGames > 1);

    const betAmount = Number(
      params.betAmount ??
      params.roomConfig?.parametres?.betAmount ??
      params.roomConfig?.betAmount ??
      0
    ) || 0;
    const prizeAmount = betAmount > 0 ? Math.floor(betAmount * 2 * 0.95) : 0;

    return (
      <View style={styles.topHUDSection}>
        {showTournament && (
          <View style={styles.tournamentBadge}>
            <Text style={styles.tournamentBadgeText}>
              {t('game.match_number_simple', { number: tournamentGameNumber, total: tournamentTotalGames })}
              {'  '}
              {tournamentScore[player1.color] || 0}–{tournamentScore[player2.color] || 0}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => { playButtonSound(); setSelectedProfile(player2); }}
          activeOpacity={0.85}
          style={styles.hudTouchable}
        >
          <PlayerHUD
            name={player2.pseudo}
            flag={player2.country}
            coins={player2.coins}
            time={displayTime}
            isTurn={isCurrent}
            small={!isTab}
            rotated={mode === 'local'}
            moves={board.filter(p => p.player === player2.color).length}
            pawnColor={player2.color}
            avatar={player2.avatar}
            timeouts={timeouts[player2.color] || 0}
            maxTimeouts={5}
          />
        </TouchableOpacity>

        {mode === 'live' && liveStartedAtMs && !gameOver ? (
          <View style={styles.liveMetaRow}>
            {prizeAmount > 0 ? (
              <View style={[styles.prizeBadge, { marginTop: 0 }]}>
                <Text style={styles.prizeBadgeText}>
                  🏆 {prizeAmount.toLocaleString()} 💰
                </Text>
                <Text style={styles.prizeBadgeSub}>{t('game.to_win')}</Text>
              </View>
            ) : null}
            <View style={[styles.liveDurationBadge, { marginTop: 0 }]}>
              <Text style={styles.liveDurationText}>⏱️ {formatElapsed(liveElapsedSec)}</Text>
            </View>
          </View>
        ) : (
          prizeAmount > 0 && !gameOver ? (
            <View style={styles.prizeBadge}>
              <Text style={styles.prizeBadgeText}>
                🏆 {prizeAmount.toLocaleString()} 💰
              </Text>
              <Text style={styles.prizeBadgeSub}>{t('game.to_win')}</Text>
            </View>
          ) : null
        )}
      </View>
    );
  };

  // Renders the bottom section: popup menu (en flux) + player 1 HUD + action bar.
  const renderBottomSection = () => {
    if (nextMatchVisible) return null;
    const isCurrent = !gameOver && currentPlayer === player1.color;
    const displayTime = timeControl ? (isCurrent ? timeLeft : timeControl) : null;
    const gameId = params.gameId || params.roomId || params.matchId;
    const canShowRequests = (mode === 'online' || mode === 'online_custom') && !isSpectatorMode && mode !== 'spectator';
    const myPlacedStonesCount = Array.isArray(board) ? board.filter(s => s && s.player === player1.color).length : 0;
    const canRequestCancel = !!gameId && !gameOver && myPlacedStonesCount >= 20;
    const canRequestAbandon = !!gameId && !gameOver;

    return (
      <View style={styles.bottomSection}>

        {/* ── HUD joueur 1 ── */}
        <TouchableOpacity
          onPress={() => { playButtonSound(); setSelectedProfile(player1); }}
          activeOpacity={0.85}
          onLayout={(e) => {
            const h = e?.nativeEvent?.layout?.height;
            if (typeof h === 'number' && h > 0) {
              setBottomPlayerHudHeight(prev => (prev === h ? prev : h));
            }
          }}
          style={styles.hudTouchable}
        >
          <PlayerHUD
            name={player1.pseudo}
            flag={player1.country}
            coins={player1.coins}
            time={displayTime}
            isTurn={isCurrent}
            small={!isTab}
            moves={board.filter(p => p.player === player1.color).length}
            pawnColor={player1.color}
            avatar={player1.avatar}
            timeouts={timeouts[player1.color] || 0}
            maxTimeouts={5}
          />
        </TouchableOpacity>

        {/* ── Barre d'actions groupées ── */}
        <View style={styles.actionBar}>

          <View style={styles.actionGroupLeft}>
            {mode !== 'spectator' && (
              <TouchableOpacity
                style={[styles.actionBtn, showGameMenu && styles.actionBtnActive]}
                onPress={() => { playButtonSound(); setShowGameMenu(!showGameMenu); }}
              >
                <Ionicons
                  name={showGameMenu ? 'close' : 'menu'}
                  size={getResponsiveSize(22)}
                  color={showGameMenu ? T.gold : T.text}
                />
              </TouchableOpacity>
            )}

            {(mode === 'live' || mode === 'spectator') && (
              <TouchableOpacity
                style={[styles.actionBtn, !showLobbyMessages && styles.actionBtnActive]}
                onPress={() => { playButtonSound(); setShowLobbyMessages(v => !v); }}
              >
                <Ionicons
                  name={showLobbyMessages ? 'eye-off-outline' : 'eye-outline'}
                  size={getResponsiveSize(22)}
                  color={!showLobbyMessages ? T.gold : T.text}
                />
              </TouchableOpacity>
            )}

            {canShowRequests && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, !canRequestCancel && { opacity: 0.45 }]}
                  onPress={() => {
                    playButtonSound();
                    if (!canRequestCancel) {
                      if (gameOver) {
                        showAlert(t('common.info'), t('game.game_already_over'), [{ text: t('common.ok'), style: 'cancel' }]);
                        return;
                      }
                      if (!gameId) {
                        showAlert(t('common.error'), t('game.missing_game_id'), [{ text: t('common.ok'), style: 'cancel' }]);
                        return;
                      }
                      showAlert(t('common.info'), t('game.cancel_min_20_stones'), [{ text: t('common.ok'), style: 'cancel' }]);
                      return;
                    }
                    handleRequestCancel();
                  }}
                >
                  <Ionicons name="close-circle-outline" size={getResponsiveSize(22)} color={T.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, !canRequestAbandon && { opacity: 0.45 }]}
                  onPress={() => {
                    playButtonSound();
                    if (!canRequestAbandon) {
                      if (gameOver) {
                        showAlert(t('common.info'), t('game.game_already_over'), [{ text: t('common.ok'), style: 'cancel' }]);
                        return;
                      }
                      showAlert(t('common.error'), t('game.missing_game_id'), [{ text: t('common.ok'), style: 'cancel' }]);
                      return;
                    }
                    handleRequestAbandon();
                  }}
                >
                  <Ionicons name="hand-left-outline" size={getResponsiveSize(22)} color={T.text} />
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.actionGroupRight}>
            {(mode === 'online' || mode === 'online_custom') && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, activeModal === 'chat' && styles.actionBtnActive]}
                  onPress={() => { playButtonSound(); setActiveModal(activeModal === 'chat' ? null : 'chat'); }}
                >
                  <Ionicons name="chatbox-ellipses" size={getResponsiveSize(22)} color={activeModal === 'chat' ? T.gold : T.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, activeModal === 'emoji' && styles.actionBtnActive]}
                  onPress={() => { playButtonSound(); setActiveModal(activeModal === 'emoji' ? null : 'emoji'); }}
                >
                  <Ionicons name="happy" size={getResponsiveSize(22)} color={activeModal === 'emoji' ? T.gold : T.text} />
                </TouchableOpacity>
              </>
            )}

            {mode === 'spectator' && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: T.red }]}
                onPress={() => {
                  appAlert(t('game.quit_title'), t('game.quit_spectator_msg'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('game.quit'), style: 'destructive',
                      onPress: () => {
                        if (navigation.canGoBack()) navigation.goBack();
                        else navigation.navigate('Home');
                      },
                    },
                  ]);
                }}
              >
                <Ionicons name="log-out-outline" size={getResponsiveSize(22)} color={T.red} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };
  // ── END NEW LAYOUT HELPERS ────────────────────────────────────────────────

  const renderFloatingMenu = () => {
    if (!showGameMenu) return null;
    if (mode !== 'live' && mode !== 'online_custom' && mode !== 'online' && mode !== 'ai' && mode !== 'ia' && mode !== 'local') return null;

    const isLocal = mode === 'local';
    const fabStyle = isLocal ? { left: undefined, right: getResponsiveSize(20) } : {};
    const isLiveCreator = mode === 'live' && (params.roomConfig?.createur?._id || params.roomConfig?.createur?.id) === (user?._id || user?.id);
    const bottomHudPadding = isTablet ? getResponsiveSize(24) : getResponsiveSize(16);
    const menuBaseBottom = bottomPlayerHudHeight + bottomHudPadding + getResponsiveSize(12);
    const itemGap = getResponsiveSize(38);

    const gameId = params.gameId || params.roomId || params.matchId;
    const myPlacedStonesCount = Array.isArray(board) ? board.filter(s => s && s.player === player1.color).length : 0;
    const canRequestCancel = !!gameId && !gameOver && myPlacedStonesCount >= 20;
    const canShowLiveRequests = mode === 'live' && !isSpectatorMode && mode !== 'spectator';

    return (
      <View style={[styles.liveMenuContainer, isLocal ? { left: undefined, right: 0, alignItems: 'flex-end' } : {}]}>

        {/* Son */}
        <TouchableOpacity
          style={[styles.menuFabSmall, fabStyle, { bottom: menuBaseBottom, backgroundColor: isSoundEnabled ? '#3b82f6' : '#95a5a6' }]}
          onPress={() => { playButtonSound(); dispatch(toggleSound()); }}
        >
          <Ionicons name={isSoundEnabled ? 'volume-high' : 'volume-mute'} size={getResponsiveSize(20)} color="#fff" />
        </TouchableOpacity>

        {canShowLiveRequests && (
          <TouchableOpacity
            style={[styles.menuFabSmall, fabStyle, { bottom: menuBaseBottom + itemGap, backgroundColor: '#3f3f46', opacity: canRequestCancel ? 1 : 0.45 }]}
            onPress={() => {
              playButtonSound();
              if (!canRequestCancel) {
                if (gameOver) {
                  showAlert('Info', 'La partie est déjà terminée.', [{ text: 'OK', style: 'cancel' }]);
                  return;
                }
                if (!gameId) {
                  showAlert('Erreur', 'ID de partie manquant.', [{ text: 'OK', style: 'cancel' }]);
                  return;
                }
                showAlert('Info', "L'annulation est possible à partir de 20 pions posés par vous.", [{ text: 'OK', style: 'cancel' }]);
                return;
              }
              setShowGameMenu(false);
              handleRequestCancel();
            }}
          >
            <Ionicons name="close-circle-outline" size={getResponsiveSize(20)} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Quitter */}
        <TouchableOpacity
              style={[styles.menuFabSmall, fabStyle, { bottom: menuBaseBottom + (canShowLiveRequests ? itemGap * 2 : itemGap), backgroundColor: '#e74c3c' }]}
              onPress={() => {
                playButtonSound();
                setShowGameMenu(false);
                if (isLiveCreator) {
                  showAlert(t('game.live_management'), t('game.what_do_you_want'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('game.stop_live'),
                      style: 'destructive',
                      onPress: () => {
                        isExitingRef.current = true;
                        try { socket.emit('stop_live_room', { gameId: params.gameId, userId: user?._id || user?.id }); } catch (_) {}
                        try { socket.emit('leave_live_room', { gameId: params.gameId }); } catch (_) {}
                        navigation.navigate('Home');
                      },
                    },
                  ]);
                } else {
                  if (mode === 'live') { handleQuitGame(); return; }
                  showAlert(t('game.quit_game'), t('game.quit_game_confirm'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('game.quit'),
                      style: 'destructive',
                      onPress: () => {
                        isExitingRef.current = true;
                        try {
                          if (mode === 'online_custom' || mode === 'online') socket.emit('resign');
                        } catch (_) {}
                        navigation.navigate('Home');
                      },
                    },
                  ]);
                }
              }}
            >
              <Ionicons name="log-out-outline" size={getResponsiveSize(20)} color="#fff" />
            </TouchableOpacity>
      </View>
    );
  };

  return (
    <ResponsiveWrapper>
      <ImageBackground
        source={require('../../assets/images/Background2-4.png')}
        style={styles.background}
      >
      <View style={styles.bgOverlay} pointerEvents="none" />

      {/* Modals sans layout */}
      {renderProfileModal()}
      {mode !== 'live' && mode !== 'online_custom' && mode !== 'online' && mode !== 'ai' && mode !== 'ia' && mode !== 'local' && mode !== 'spectator' && renderGameMenu()}

      {/* Badge spectateur */}
      {(mode === 'spectator' || isSpectatorMode) && (
        <View style={styles.spectatorBadgeWrapper} pointerEvents="none">
          <Text style={styles.spectatorBadgeText}>👁️ {t('game.spectator_mode')}</Text>
        </View>
      )}

      {/* ── HUD joueur 2 (haut) ── */}
      {renderTopHUDNew()}
      
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

      {/* Score overlay spectateur */}
      {mode === 'spectator' && (
          <View style={[styles.spectatorHeaderPills, { pointerEvents: 'none' }]}>
              <View style={styles.spectatorPill}>
                  <Text style={styles.spectatorPillText}>
                      {t('game.score_label')}: {tournamentScore?.black ?? 0} - {tournamentScore?.white ?? 0}{tournamentTotalGames > 1 ? ` · ${t('game.match_number', { number: tournamentGameNumber, total: tournamentTotalGames })}` : ''}
                  </Text>
              </View>
          </View>
      )}

      {/* ── Plateau (flex: 1, centré) ── */}
      <View
        style={styles.boardContainer}
        onLayout={(e) => containerDimensions.current = e.nativeEvent.layout}
        pointerEvents={mode === 'spectator' ? 'none' : 'auto'}
      >
        {waitingForNextRound && (
            <View style={styles.waitingOverlay}>
                <ActivityIndicator style={styles.indicator} size="large" color="#fdd300ff" />
                <Text style={styles.waitingText}>{waitingMessage || t('game.waiting_opponent')}</Text>
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
                <Defs>
                    <RadialGradient id="redGradient" cx="50%" cy="50%" rx="50%" ry="50%" fx="30%" fy="30%" gradientUnits="userSpaceOnUse">
                        <Stop offset="0%" stopColor="#ff6b6b" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#ff0808ff" stopOpacity="1" />
                    </RadialGradient>
                    <LinearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#4dabf7" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#1e272fff" stopOpacity="1" />
                    </LinearGradient>
                </Defs>
                {/* Fond du plateau */}
                <Rect
                    x={PADDING_LEFT - 10}
                    y={PADDING_TOP - 10}
                    width={(COLS - 1) * CELL_SIZE + 20}
                    height={(ROWS - 1) * CELL_SIZE + 20}
                    fill="#0E1320"
                    rx="5"
                    onPress={() => setSelectedCell(null)}
                />

                {/* Lignes verticales et Lettres (A-R) */}
                {Array.from({ length: COLS }).map((_, i) => {
                    const x = PADDING_LEFT + i * CELL_SIZE;
                    const isAccentCol = [0, 7, 14, COLS - 1].includes(i);
                    return (
                        <React.Fragment key={`v-${i}`}>
                            <SvgText
                                x={x}
                                y={PADDING_TOP - getResponsiveSize(3)}
                                fontSize={getResponsiveSize(10)}
                                fontWeight="bold"
                                fill={isAccentCol ? "#F4B41A" : "#8A8F9C"}
                                textAnchor="middle"
                            >
                                {LETTERS[i]}
                            </SvgText>
                            <SvgText
                                x={x}
                                y={PADDING_TOP + (ROWS - 1) * CELL_SIZE + getResponsiveSize(10)}
                                fontSize={getResponsiveSize(10)}
                                fontWeight="bold"
                                fill={isAccentCol ? "#F4B41A" : "#8A8F9C"}
                                textAnchor="middle"
                            >
                                {LETTERS[i]}
                            </SvgText>
                            <Line
                                x1={x}
                                y1={PADDING_TOP}
                                x2={x}
                                y2={PADDING_TOP + (ROWS - 1) * CELL_SIZE}
                                stroke={isAccentCol ? "#F4B41A" : "#e8e8e8db"}
                                strokeWidth={isAccentCol ? "1.2" : "0.8"}
                                opacity={isAccentCol ? 1 : 0.7}
                            />
                        </React.Fragment>
                    );
                })}

                {/* Lignes horizontales et Numéros (1-19) */}
                {Array.from({ length: ROWS }).map((_, i) => {
                    const y = PADDING_TOP + i * CELL_SIZE;
                    const isAccentRow = [0, 6, 12, 18].includes(i);
                    return (
                        <React.Fragment key={`h-${i}`}>
                            <SvgText
                                x={PADDING_LEFT - getResponsiveSize(14)}
                                y={y + getResponsiveSize(3)}
                                fontSize={getResponsiveSize(10)}
                                fontWeight="bold"
                                fill={isAccentRow ? "#F4B41A" : "#e8e8e8db"}
                                textAnchor="start"
                            >
                                {i + 1}
                            </SvgText>
                            <SvgText
                                x={PADDING_LEFT + (COLS - 1) * CELL_SIZE + getResponsiveSize(14)}
                                y={y + getResponsiveSize(3)}
                                fontSize={getResponsiveSize(10)}
                                fontWeight="bold"
                                fill={isAccentRow ? "#F4B41A" : "#e8e8e8db"}
                                textAnchor="end"
                            >
                                {i + 1}
                            </SvgText>
                            <Line
                                x1={PADDING_LEFT}
                                y1={y}
                                x2={PADDING_LEFT + (COLS - 1) * CELL_SIZE}
                                y2={y}
                                stroke={isAccentRow ? "#F4B41A" : "#e8e8e8db"}
                                strokeWidth={isAccentRow ? "1.2" : "0.8"}
                                opacity={isAccentRow ? 1 : 0.7}
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

                {/* Highlight Winning Line (Drawn BEFORE pawns so it is UNDER them) */}
                {winningLine && winningLine.length > 0 && (() => {
                    const sorted = [...winningLine].sort((a, b) => a.row - b.row || a.col - b.col);
                    const start = sorted[0];
                    const end = sorted[sorted.length - 1];
                    const x1 = PADDING_LEFT + start.col * CELL_SIZE;
                    const y1 = PADDING_TOP + start.row * CELL_SIZE;
                    const x2 = PADDING_LEFT + end.col * CELL_SIZE;
                    const y2 = PADDING_TOP + end.row * CELL_SIZE;
                    
                    return (
                        <Line
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="#F4B41A"
                            strokeWidth="8"
                            strokeLinecap="round"
                        />
                    );
                })()}

                {/* Pions placés */ }
                {board.map((stone, index) => {
                  const cx = PADDING_LEFT + stone.col * CELL_SIZE;
                  const cy = PADDING_TOP + stone.row * CELL_SIZE;
                  // Agrandissement des pions (0.85 au lieu de 0.6)
                  const r = (CELL_SIZE / 2) * 0.70;

                  return (
                      <Pawn 
                        key={`${stone.row}-${stone.col}-${index}`}
                        color={stone.player}
                        x={cx}
                        y={cy}
                        r={r}
                        skin={getSkin(stone.player)}
                      />
                  );
                })}

                {/* Marqueur dernier coup */}
                {board.length > 0 && !winningLine && (() => {
                    const last = board[board.length - 1];
                    return (
                        <Circle
                            cx={PADDING_LEFT + last.col * CELL_SIZE}
                            cy={PADDING_TOP + last.row * CELL_SIZE}
                            r={CELL_SIZE * 0.18}
                            fill="#E85D4A"
                            opacity={0.85}
                        />
                    );
                })()}

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
                        const r = (CELL_SIZE / 2) * 0.70;
                        
                        return (
                            <Pawn 
                                color={currentPlayer}
                                x={cx}
                                y={cy}
                                r={r}
                                opacity={0.5}
                                skin={getSkin(currentPlayer)}
                                onPress={() => handlePress(selectedCell.row, selectedCell.col)}
                            />
                        );
                    })()
                )}



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
                                   fontSize: size * 0.6,
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

      {/* ── HUD joueur 1 (bas) ── */}
      {renderBottomSection()}

      {/* Message de fin */}
      {gameOver && mode === 'ai' && (
        <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>
                {winner === (iaColors.joueur === 'black' ? 'black' : 'white')
                    ? `🎉 ${t('game.you_win')}`
                    : `😢 ${t('game.ai_won')}`}
            </Text>
        </View>
      )}

      {null}

      {(mode === 'online' || mode === 'online_custom' || mode === 'spectator' || mode === 'live') && (
        <>
            {/* Waiting Overlay */}
            {((isWaitingState && mode !== 'live') || (mode === 'live' && !player2.id)) && !gameOver && (
                <View style={[styles.modalOverlay, { zIndex: 50, justifyContent: 'center', paddingBottom: 0 }]}>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: getResponsiveSize(20), borderRadius: getResponsiveSize(15), alignItems: 'center', width: '80%' }}>
                        <ActivityIndicator size="large" color="#f1c40f" style={{ marginBottom: getResponsiveSize(15) }} />
                        <Text style={{ color: '#fff', fontSize: getResponsiveSize(18), fontWeight: 'bold', marginBottom: getResponsiveSize(10) }}>{t('game.waiting_opponent_title')}</Text>
                        <Text style={{ color: '#ccc', fontSize: getResponsiveSize(14), textAlign: 'center' }}>
                            {mode === 'live' ? t('game.game_starts_when_joined') : t('game.invite_friend_to_start')}
                        </Text>
                        
                        {false && (mode === 'online_custom' && params?.inviteCode) && (
                          <View style={{ marginTop: getResponsiveSize(16), alignItems: 'center' }}>
                            <Text style={{ color: '#f1c40f', fontWeight: 'bold', letterSpacing: 2, fontSize: getResponsiveSize(18) }}>{params.inviteCode}</Text>
                            <View style={{ backgroundColor: '#fff', padding: getResponsiveSize(8), borderRadius: getResponsiveSize(8), marginTop: getResponsiveSize(10) }}>
                              <QRCode
                                value={`deadpions://invite/${params.inviteCode}`}
                                size={getResponsiveSize(140)}
                                backgroundColor="#ffffff"
                                color="#041c55"
                              />
                            </View>
                            <TouchableOpacity 
                              style={{ marginTop: getResponsiveSize(12), paddingHorizontal: getResponsiveSize(12), paddingVertical: getResponsiveSize(8), borderRadius: getResponsiveSize(8), borderWidth: 1, borderColor: '#f1c40f' }}
                              onPress={async () => {
                                try {
                                  await Share.share({
                                    message: t('game.share_invite_msg', { code: params.inviteCode }),
                                    url: `deadpions://invite/${params.inviteCode}`,
                                    title: t('game.share_invite_title')
                                  });
                                } catch (_) {}
                              }}
                            >
                              <Text style={{ color: '#f1c40f', fontWeight: '600' }}>{t('game.share_link')}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        
                        {mode === 'live' && (
                            <View style={{ width: '100%', alignItems: 'center', marginTop: getResponsiveSize(20) }}>
                                <TouchableOpacity 
                                    style={{ width: '100%', padding: getResponsiveSize(12), backgroundColor: '#2ecc71', borderRadius: getResponsiveSize(8), marginBottom: getResponsiveSize(10), alignItems: 'center' }}
                                    onPress={() => {
                                        setInviteMode('online');
                                        setShowInviteModal(true);
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('game.invite_player')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={{ width: '100%', padding: getResponsiveSize(12), backgroundColor: 'rgba(255, 59, 48, 0.8)', borderRadius: getResponsiveSize(8), alignItems: 'center' }}
                                    onPress={() => {
                                        if (navigation.canGoBack()) {
                                            navigation.goBack();
                                        } else {
                                            navigation.navigate('Home');
                                        }
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('game.quit')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Invite Friend FAB - Only while waiting in Custom Online */}
            {(mode === 'online_custom' && isWaitingState) && !gameOver && (
                <TouchableOpacity 
                    style={[styles.menuFab, { bottom: getResponsiveSize(240), backgroundColor: '#2ecc71' }]} 
                    onPress={() => setShowInviteModal(true)}
                >
                    <Ionicons name="person-add" size={getResponsiveSize(30)} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Live Chat Overlay - Live & Spectator Only */}
            {(mode === 'live' || mode === 'spectator') && (
                <LiveChatOverlay 
                    messages={chatMessages}
                    showMessages={showLobbyMessages}
                    messagesLeftOffset={mode === 'live' ? getResponsiveSize(20) : getResponsiveSize(20)}
                    inputLeftOffset={getResponsiveSize(100)}
                    bottomOffset={mode === 'live' ? (isTablet ? getResponsiveSize(24) : getResponsiveSize(6)) : undefined}
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
                <View style={[styles.voiceContainer, mode === 'live' ? { top: undefined, bottom: isTablet ? getResponsiveSize(24) : getResponsiveSize(10) } : null]}>
                     <VoiceChat
                        gameId={params.gameId}
                        userId={user?._id || user?.id}
                        socket={socket}
                        isSpectator={mode === 'spectator'}
                     />
                </View>
            )}

            {/* Modal Commun — messages & réactions */}
            <Modal
                visible={activeModal !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActiveModal(null)}
            >
                <Pressable
                    style={[styles.chatModalOverlay, { paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0 }]}
                    onPress={() => setActiveModal(null)}
                >
                    <Pressable style={styles.chatModalContent} onPress={() => {}}>
                        {/* En-tête */}
                        <View style={styles.chatModalHeader}>
                            <View style={styles.chatModalHeaderLeft}>
                                <Ionicons
                                    name={activeModal === 'chat' ? 'chatbox-ellipses' : 'happy'}
                                    size={getResponsiveSize(16)}
                                    color={T.gold}
                                />
                                <Text style={styles.chatModalTitle}>
                                    {activeModal === 'chat' ? t('game.chat_title') : t('game.reactions_title')}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.chatModalClose}
                                onPress={() => { playButtonSound(); setActiveModal(null); }}
                            >
                                <Ionicons name="close" size={getResponsiveSize(18)} color={T.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <ChatEnLigne
                            matchId={params.gameId}
                            monPseudo={user?.pseudo || 'Vous'}
                            adversairePseudo={opponent?.pseudo || 'Adversaire'}
                            onEnvoyerMessage={envoyerMessageChat}
                            messages={chatMessages}
                            displayMode={activeModal === 'chat' ? 'text' : 'emoji'}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </>
      )}

      {renderInviteModal()}
      {renderResultModal()}
      {renderFloatingMenu()}

      <NextMatchModal
        visible={nextMatchVisible}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        initialTimer={(mode === 'ai' || mode === 'ia') ? 0 : 30}
        onConfirm={mode === 'spectator' ? undefined : handleNextMatchConfirm}
        readOnly={mode === 'spectator'}
        readOnlyLabel="En attente de la décision de l'hôte..."
        cardStyle={mode === 'live' ? { alignItems: 'center' } : undefined}
        titleStyle={[styles.alertTitle, mode === 'live' ? { textAlign: 'center' } : null]}
        messageStyle={[styles.alertMessage, mode === 'live' ? { textAlign: 'center' } : null]}
        timerStyle={{
          color: '#fbbf24',
          fontSize: getResponsiveSize(18),
          marginVertical: getResponsiveSize(10),
          textAlign: 'center',
          fontWeight: 'bold'
        }}
        buttonStyle={styles.nextMatchButton}
        buttonTextStyle={styles.nextMatchButtonText}
      />

      <CustomAlert 
          visible={customAlert.visible}
          title={customAlert.title}
          message={customAlert.message}
          buttons={customAlert.buttons}
          onClose={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
      />

      <VersusAnimation 
          player1={player1}
          player2={player2}
          visible={mode !== 'local' && showVersusAnim}
          onFinish={() => setShowVersusAnim(false)}
      />

      {flyingEmojis.map(fe => (
          <FlyingEmoji 
              key={fe.id} 
              emoji={fe.emoji} 
              start={fe.start} 
              end={fe.end} 
          />
      ))}
      {flyingTexts.map(ft => (
          <FlyingEmoji
              key={ft.id}
              text={ft.text}
              start={ft.start}
              end={ft.end}
          />
      ))}
      </ImageBackground>
    </ResponsiveWrapper>
  );
};

const styles = StyleSheet.create({
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  spectatorOverlay: {
      position: 'absolute',
      top: getResponsiveSize(50),
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 20,
  },
  spectatorPlayers: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: getResponsiveSize(20),
      padding: getResponsiveSize(10),
  },
  vsText: {
      color: '#fff',
      fontWeight: 'bold',
      marginHorizontal: getResponsiveSize(10),
      fontSize: getResponsiveSize(16),
      fontStyle: 'italic',
  },
  spectatorList: {
      marginTop: getResponsiveSize(10),
      alignItems: 'center',
  },
  spectatorLabel: {
      color: '#aaa',
      fontSize: getResponsiveSize(10),
      marginBottom: getResponsiveSize(2),
  },
  spectatorHeaderPills: {
      position: 'absolute',
      top: getResponsiveSize(10),
      alignSelf: 'center',
      flexDirection: 'row',
      gap: getResponsiveSize(8),
      zIndex: 15
  },
  spectatorPill: {
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(6),
      borderRadius: getResponsiveSize(20),
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)'
  },
  spectatorPillText: {
      color: '#fff',
      fontWeight: 'bold'
  },
  spectatorNoteContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: getResponsiveSize(10)
  },
  spectatorNote: {
      color: '#e5e7eb',
      fontSize: getResponsiveSize(14),
      fontStyle: 'italic'
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // ── Nouveau layout ─────────────────────────────────────────────────────────
  topHUDSection: {
    paddingTop: isTablet ? getResponsiveSize(48) : getResponsiveSize(44),
    paddingHorizontal: getResponsiveSize(10),
    paddingBottom: getResponsiveSize(4),
    zIndex: 10,
  },
  bottomSection: {
    paddingHorizontal: getResponsiveSize(10),
    paddingBottom: isTablet ? getResponsiveSize(24) : getResponsiveSize(16),
    paddingTop: getResponsiveSize(4),
    zIndex: 10,
  },
  hudTouchable: {
    width: '100%',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: getResponsiveSize(8),
    paddingTop: getResponsiveSize(6),
    paddingHorizontal: getResponsiveSize(4),
  },
  actionGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(8),
  },
  actionGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(8),
  },
  actionBtn: {
    width: getResponsiveSize(38),
    height: getResponsiveSize(38),
    borderRadius: getResponsiveSize(T.radiusMd),
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    borderColor: T.gold,
    backgroundColor: 'rgba(244,180,26,0.15)',
    shadowColor: T.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  tournamentBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(244,180,26,0.12)',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: getResponsiveSize(T.radiusPill),
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(3),
    marginBottom: getResponsiveSize(6),
  },
  tournamentBadgeText: {
    color: T.gold,
    fontSize: getResponsiveSize(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prizeBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(6),
    marginTop: getResponsiveSize(6),
    backgroundColor: 'rgba(244,180,26,0.10)',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: getResponsiveSize(T.radiusPill),
    paddingHorizontal: getResponsiveSize(14),
    paddingVertical: getResponsiveSize(4),
  },
  prizeBadgeText: {
    color: T.gold,
    fontSize: getResponsiveSize(14),
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  prizeBadgeSub: {
    color: T.textMuted,
    fontSize: getResponsiveSize(10),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  liveMetaRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveSize(10),
    marginTop: getResponsiveSize(6),
  },
  liveDurationBadge: {
    alignSelf: 'center',
    marginTop: getResponsiveSize(6),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: getResponsiveSize(T.radiusPill),
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(3),
  },
  liveDurationText: {
    color: T.textMuted,
    fontSize: getResponsiveSize(11),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  spectatorBadgeWrapper: {
    position: 'absolute',
    top: getResponsiveSize(8),
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  spectatorBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(T.radiusPill),
    overflow: 'hidden',
  },
  // ── Ancien layout (gardé pour compatibilité) ───────────────────────────────
  header: {
    paddingTop: isTablet ? getResponsiveSize(80) : getResponsiveSize(40),
    marginBottom: getResponsiveSize(10),
    zIndex: 10,
    ...(isTablet && { flexShrink: 0 }),
  },
  headerPVP: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(10),
    backgroundColor: 'rgba(14,19,32,0.92)',
    paddingBottom: getResponsiveSize(10),
    ...(isTablet && { minHeight: 160 }),
  },
  headerIA: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(10),
    width: '100%',
  },
  backButton: {
    padding: getResponsiveSize(8),
    backgroundColor: 'rgba(4, 28, 85, 0.5)',
    borderRadius: getResponsiveSize(10),
    marginRight: getResponsiveSize(10),
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
    padding: getResponsiveSize(5),
    borderRadius: getResponsiveSize(10),
    width: isTablet ? SCREEN_WIDTH * 0.20 : SCREEN_WIDTH * 0.3,
    height: getResponsiveSize(125),
    borderWidth: 1,
    borderColor: '#1F2840',
    backgroundColor: '#0E1320',
    overflow: 'hidden',
  },
  activePlayer: {
    height: getResponsiveSize(125),
    backgroundColor: '#0E1320',
    borderWidth: 1,
    borderColor: '#F4B41A',
    shadowColor: '#F4B41A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: getResponsiveSize(5),
    left: getResponsiveSize(20),
  },
  avatar: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: '#ffffffff',
  },
  flag: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    fontSize: getResponsiveSize(16),
  },
  playerName: {
    color: '#ECE6D6',
    fontWeight: '700',
    bottom: getResponsiveSize(45),
    right: getResponsiveSize(20),
    fontSize: getResponsiveSize(12),
    marginTop: getResponsiveSize(5),
    maxWidth: getResponsiveSize(80),
    textAlign: 'center',
  },
  voiceContainer: {
    position: 'absolute',
    top: getResponsiveSize(100), // Ajustez selon votre layout
    right: getResponsiveSize(10),
    zIndex: 20,
  },
  playerCoinsContainer: {
    position: 'absolute',
    bottom: getResponsiveSize(25),
    right: getResponsiveSize(20),
    alignItems: 'center',
    justifyContent: 'center',
    width: getResponsiveSize(80),
  },
  playerCoinsText: {
    color: '#FFD700',
    fontSize: getResponsiveSize(10),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timer: {
    color: '#fff',
    fontSize: getResponsiveSize(14),
    fontWeight: 'bold',
    marginTop: getResponsiveSize(4),
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(2),
    borderRadius: getResponsiveSize(10),
  },
  timerWarning: {
    color: '#e74c3c',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  colorIndicator: {
    width: getResponsiveSize(10),
    height: getResponsiveSize(10),
    borderRadius: getResponsiveSize(5),
  },
  vsText: {
    color: '#F4B41A',
    fontWeight: '900',
    fontSize: getResponsiveSize(18),
    letterSpacing: 1,
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardContainerWithResult: {
    paddingBottom: getResponsiveSize(isTablet ? 260 : 220) + getResponsiveSize(12),
  },
  footer: {
    padding: getResponsiveSize(20),
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  turnText: {
    color: '#fff',
    fontSize: getResponsiveSize(18),
    marginRight: getResponsiveSize(10),
  },
  playerIndicator: {
    width: getResponsiveSize(20),
    height: getResponsiveSize(20),
    borderRadius: getResponsiveSize(10),
  },
  hintText: {
    color: '#ccc',
    fontSize: getResponsiveSize(14),
  },
  // Nouveaux styles pour IA
  joueurContainer: {
    alignItems: 'center',
    flex: 1
  },
  joueurLabel: {
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: getResponsiveSize(4)
  },
  avatarJoueur: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25),
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6'
  },
  avatarJoueurTexte: {
    fontSize: getResponsiveSize(24)
  },
  vs: {
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
    color: '#9ca3af',
    marginHorizontal: getResponsiveSize(8)
  },
  profilIAContainer: {
     flex: 0.5
    // maxWidth: '55%',
  },
  tourIndicateur: {
    backgroundColor: '#dbeafe',
    padding: getResponsiveSize(8),
    borderRadius: getResponsiveSize(8),
    marginHorizontal: getResponsiveSize(20),
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  tourTexte: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#1d4ed8'
  },
  gameOverContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: getResponsiveSize(-150) }, { translateY: getResponsiveSize(-50) }],
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: getResponsiveSize(24),
    borderRadius: getResponsiveSize(16),
    width: getResponsiveSize(300),
    zIndex: 20
  },
  gameOverText: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  },
  footerIA: {
    position: 'absolute',
    bottom: getResponsiveSize(30),
    left: getResponsiveSize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(20),
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
    marginRight: getResponsiveSize(10),
  },
  avatarBig: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25),
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  flagBig: {
    position: 'absolute',
    bottom: getResponsiveSize(-2),
    right: getResponsiveSize(-2),
    fontSize: getResponsiveSize(18),
    backgroundColor: '#fff',
    borderRadius: getResponsiveSize(8),
    overflow: 'hidden',
  },
  textContainer: {
    justifyContent: 'center',
    marginRight: getResponsiveSize(10),
    flexShrink: 1,
  },
  pseudoBig: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: getResponsiveSize(2),
  },
  turnTextSmall: {
    fontSize: getResponsiveSize(12),
    color: '#6b7280',
    fontWeight: '500',
  },
  pawnIndicatorContainer: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pawnRedCircle: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    borderRadius: getResponsiveSize(12),
    borderWidth: 3,
    borderColor: '#FF0000',
  },
  activeUserContainer: {
    borderColor: '#FFD700',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: getResponsiveSize(10),
    elevation: 15
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTheme.overlay.backgroundColor,
    justifyContent: modalTheme.overlay.justifyContent,
    alignItems: modalTheme.overlay.alignItems
  },
  modalContent: {
    ...modalTheme.card,
    width: isTablet ? '50%' : '80%',
  },
  modalAvatar: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    borderRadius: getResponsiveSize(50),
    marginBottom: getResponsiveSize(10),
    borderWidth: 2,
    borderColor: '#f1c40f',
  },
  modalPseudo: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(5),
    color: '#fff',
  },
  modalFlag: {
    fontSize: getResponsiveSize(30),
    marginBottom: getResponsiveSize(20),
  },
  friendButton: {
    flexDirection: 'row',
    ...modalTheme.button,
    ...modalTheme.buttonActive,
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(25),
    marginTop: getResponsiveSize(10),
    alignItems: 'center',
  },
  friendButtonText: {
    ...modalTheme.buttonText,
    ...modalTheme.buttonTextActive,
    fontSize: getResponsiveSize(16),
  },
  closeButton: {
    ...modalTheme.buttonBase,
    ...modalTheme.buttonDestructive,
    marginTop: getResponsiveSize(20),
  },
  closeButtonText: {
    ...modalTheme.buttonTextBase,
    ...modalTheme.buttonTextOnDark,
  },
  flagOutsideRight: {
    fontSize: getResponsiveSize(30),
    marginLeft: getResponsiveSize(10),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: getResponsiveSize(10)
  },
  flagOutsideLeft: {
    fontSize: getResponsiveSize(30),
    marginRight: getResponsiveSize(10),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: getResponsiveSize(10)
  },
  gameMenuOverlay: {
    flex: 1,
    backgroundColor: modalTheme.overlay.backgroundColor,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  menuContent: {
    ...modalTheme.card,
    width: '70%',
    maxWidth: getResponsiveSize(300),
    marginLeft: getResponsiveSize(20),
    marginBottom: getResponsiveSize(110),
    alignItems: 'stretch',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(15),
  },
  menuText: {
    fontSize: getResponsiveSize(18),
    marginLeft: getResponsiveSize(15),
    color: '#ffffffff',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1c40f',
    width: '100%',
  },
  closeMenuText: {
    color: '#fff',
    
    fontSize: getResponsiveSize(16),
    textAlign: 'center',
    width: '100%',
    fontWeight: 'bold',
  },
  timeoutsContainer: {
    marginTop: getResponsiveSize(2),
    bottom: getResponsiveSize(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeoutsTexte: {
    fontSize: getResponsiveSize(10),
    fontWeight: '600',
    color: '#991b1b',
  },
  chronoPrincipal: {
    marginTop: getResponsiveSize(8),
    width: '100%',
    alignItems: 'center',
    bottom: getResponsiveSize(25),
  },
  chronoPrincipalTexte: {
    fontSize: getResponsiveSize(14),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: getResponsiveSize(4),
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#1F2840',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  avertissementIA: {
      backgroundColor: '#fef3c7',
      padding: getResponsiveSize(8),
      borderRadius: getResponsiveSize(8),
      marginTop: getResponsiveSize(8),
      borderWidth: 2,
      borderColor: '#f59e0b'
  },
  avertissementTexte: {
      fontSize: getResponsiveSize(12),
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
      backgroundColor: 'rgba(0, 0, 0, 0.83)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      borderRadius: getResponsiveSize(10),
  },
  waitingText: {
      color: '#ffffffc9',
      fontSize: getResponsiveSize(18),
      fontWeight: 'bold',
      marginTop: getResponsiveSize(20),
      top: getResponsiveSize(30),
  },

  indicator: {
    top: getResponsiveSize(30),
  },
  // Chat Styles
  chatFab: {
    position: 'absolute',
    bottom: getResponsiveSize(20),
    right: getResponsiveSize(90),
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(30),
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(3),
    zIndex: 100
  },
  emojiFab: {
    position: 'absolute',
    bottom: getResponsiveSize(20),
    right: getResponsiveSize(20),
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(30),
    backgroundColor: '#eab308',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(3),
    zIndex: 100
  },
  voiceContainer: {
    position: 'absolute',
    bottom: getResponsiveSize(28),
    right: getResponsiveSize(20),
    zIndex: 100,
  },
  menuFab: {
    position: 'absolute',
    bottom: getResponsiveSize(20),
    left: getResponsiveSize(20),
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(30),
    backgroundColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(3),
    zIndex: 100
  },
  menuFabSmall: {
    position: 'absolute',
    bottom: getResponsiveSize(20),
    left: getResponsiveSize(20),
    width: getResponsiveSize(34),
    height: getResponsiveSize(34),
    borderRadius: getResponsiveSize(17),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(3),
    zIndex: 100
  },
  liveMenuContainer: {
    position: 'absolute',
    bottom: 35,
    left: 0,
    zIndex: 99,
  },
  chatModalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'flex-end',
  },
  chatModalContent: {
    backgroundColor: T.bg2,
    borderTopLeftRadius: getResponsiveSize(T.radiusXl),
    borderTopRightRadius: getResponsiveSize(T.radiusXl),
    borderWidth: 1,
    borderColor: T.borderSoft,
    borderBottomWidth: 0,
    width: isTablet ? '60%' : '100%',
    alignSelf: 'center',
    height: getResponsiveSize(340),
    overflow: 'hidden',
    ...T.shadowCard,
  },
  chatModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(12),
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.bg3,
  },
  chatModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(8),
  },
  chatModalTitle: {
    fontSize: getResponsiveSize(13),
    fontWeight: '800',
    color: T.text,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chatModalClose: {
    width: getResponsiveSize(30),
    height: getResponsiveSize(30),
    borderRadius: getResponsiveSize(T.radiusSm),
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleContainer: {
    position: 'absolute',
    bottom: -getResponsiveSize(50),
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(15),
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8),
    minWidth: getResponsiveSize(50),
    maxWidth: getResponsiveSize(200),
    elevation: 6,
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(3),
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
  },
  bubbleText: {
    color: '#fff',
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    textAlign: 'center',
    // fontWeight: '500',
  },
  bubbleEmoji: {
    fontSize: getResponsiveSize(28),
  },
  // Result Modal Styles
  resultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(16),
    zIndex: 1000,
  },
  resultCard: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusXl),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    width: '100%',
    maxWidth: getResponsiveSize(400),
    borderWidth: 1.5,
    borderColor: T.gold,
    ...T.shadowCard,
  },
  resultScroll: {
    width: '100%',
    alignSelf: 'stretch',
    marginTop: getResponsiveSize(10),
  },
  resultScrollContent: {
    paddingBottom: getResponsiveSize(18),
  },
  resultTopActionsRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
    width: '100%',
    marginTop: getResponsiveSize(8),
    marginBottom: getResponsiveSize(10),
    alignItems: 'center',
  },
  miniBoardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(12),
  },
  miniBoardLabel: {
    fontSize: getResponsiveSize(12),
    fontWeight: '800',
    color: T.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: getResponsiveSize(8),
  },
  resultMiniBoard: {
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  resultPanelWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: getResponsiveSize(12),
    alignItems: 'center',
    zIndex: 1200,
  },
  resultPanelCard: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusXl),
    padding: getResponsiveSize(16),
    width: '100%',
    maxWidth: getResponsiveSize(440),
    height: getResponsiveSize(isTablet ? 260 : 220),
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  resultPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: getResponsiveSize(12),
    marginBottom: getResponsiveSize(10),
  },
  resultPanelHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  resultPanelMiniBoard: {
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
  },
  resultPanelBody: {
    flex: 1,
  },
  resultPanelBodyContent: {
    paddingBottom: getResponsiveSize(10),
  },
  emojiResult: {
    fontSize: getResponsiveSize(40),
    marginBottom: getResponsiveSize(4),
  },
  titreResult: {
    fontSize: getResponsiveSize(20),
    fontWeight: '900',
    color: T.text,
    marginBottom: getResponsiveSize(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreTournament: {
    color: T.gold,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: getResponsiveSize(6),
  },
  adversaireResult: {
    fontSize: getResponsiveSize(14),
    color: T.textMuted,
    marginBottom: getResponsiveSize(6),
  },
  messageResult: {
    fontSize: getResponsiveSize(14),
    color: T.textMuted,
    textAlign: 'center',
    marginBottom: getResponsiveSize(20),
  },
  gainsContainer: {
    backgroundColor: 'rgba(46,194,126,0.1)',
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(14),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: 'rgba(46,194,126,0.3)',
  },
  gainsLabel: {
    fontSize: getResponsiveSize(13),
    color: T.green,
    marginBottom: getResponsiveSize(6),
    fontWeight: '600',
  },
  gainsMontant: {
    fontSize: getResponsiveSize(30),
    fontWeight: '900',
    color: T.green,
    marginBottom: getResponsiveSize(4),
  },
  perteContainer: {
    backgroundColor: 'rgba(230,57,70,0.1)',
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(14),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.3)',
  },
  perteLabel: {
    fontSize: getResponsiveSize(13),
    color: T.red,
    marginBottom: getResponsiveSize(6),
    fontWeight: '600',
  },
  perteMontant: {
    fontSize: getResponsiveSize(30),
    fontWeight: '900',
    color: T.red,
  },
  drawContainer: {
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(14),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  drawLabel: {
    fontSize: getResponsiveSize(13),
    color: T.textDim,
    marginBottom: getResponsiveSize(6),
    fontWeight: '600',
  },
  drawMontant: {
    fontSize: getResponsiveSize(30),
    fontWeight: '900',
    color: T.gold,
  },
  raisonContainer: {
    backgroundColor: 'rgba(46,194,126,0.1)',
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(T.radiusSm),
    marginBottom: getResponsiveSize(10),
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46,194,126,0.3)',
  },
  raisonDefaite: {
      backgroundColor: 'rgba(230,57,70,0.1)',
      borderColor: 'rgba(230,57,70,0.3)',
  },
  raisonTexte: {
      fontSize: getResponsiveSize(12),
      fontWeight: '700',
      color: T.green,
      textAlign: 'center',
  },
  raisonTexteDefaite: {
      color: T.red,
  },
  statsContainer: {
    backgroundColor: T.bg3,
    padding: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusMd),
    width: '100%',
    alignItems: 'center',
    marginBottom: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  statsLabel: {
    fontSize: getResponsiveSize(12),
    color: T.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: getResponsiveSize(8),
  },
  statsTaux: {
    fontSize: getResponsiveSize(28),
    fontWeight: '900',
    color: T.blue,
    marginBottom: getResponsiveSize(4),
  },
  statsParties: {
    fontSize: getResponsiveSize(12),
    color: T.textMuted,
  },
  boutonsResult: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
    width: '100%',
  },
  boutonRejouer: {
    flex: 1,
    backgroundColor: T.blue,
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    justifyContent: 'center',
    ...T.shadowBtn,
  },
  boutonMenuResult: {
    flex: 1,
    backgroundColor: T.bg3,
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  boutonRewardedResult: {
    width: '100%',
    backgroundColor: T.gold,
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: T.goldDeep,
    ...T.shadowBtn,
  },
  boutonTexteResult: {
    color: T.text,
    fontSize: getResponsiveSize(13),
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  boutonRewardedTexteResult: {
    color: '#1B1305',
    fontSize: getResponsiveSize(12),
    fontWeight: '800',
    textAlign: 'center',
  },
  overlay: { 
     flex: 1, 
     backgroundColor: "rgba(0,0,0,0.6)", 
     justifyContent: "center", 
     alignItems: "center"
   }, 
 
   customAlertContainer: { 
     width: "85%", 
     backgroundColor: "#1e1e1e", 
     borderRadius: getResponsiveSize(15), 
     padding: getResponsiveSize(20), 
     alignItems: "center", 
     borderWidth: 2, 
     borderColor: "#FFD700",
     top: getResponsiveSize(320) 
   }, 
 
   alertTitle: { 
     fontSize: getResponsiveSize(18), 
     fontWeight: "bold", 
     color: "#FFD700", 
     marginBottom: getResponsiveSize(10) 
   }, 
 
   alertMessage: { 
     color: "#fff", 
     textAlign: "center", 
     marginBottom: getResponsiveSize(20) 
   }, 
 
   nextMatchButton: { 
     backgroundColor: "#FFD700", 
     paddingVertical: getResponsiveSize(10), 
     paddingHorizontal: getResponsiveSize(25), 
     borderRadius: getResponsiveSize(10) 
   }, 
 
   nextMatchButtonText: { 
     fontWeight: "bold", 
     color: "#000" 
   }
});

export default GameScreen;
