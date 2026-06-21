import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ImageBackground,
  useWindowDimensions, Animated, Easing, Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { API_URL } from '../config';
import { playButtonSound } from '../utils/soundManager';
import { useTranslation } from 'react-i18next';
import { AudioController } from '../utils/AudioController';
import { socket } from '../utils/socket';
import { useCoinsContext } from '../context/CoinsContext';
import { getResponsiveSize, DESKTOP_BREAKPOINT } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import { T } from '../utils/theme';
import Constants from 'expo-constants';

// Components
import HomeHeader from '../components/home/HomeHeader';
import PwaInstallBanner from '../components/PwaInstallBanner';
import CyberBattleAnimation from '../components/CyberBattleAnimation';
import StreakRewardModal from '../components/StreakRewardModal';
import { useStreakSocket } from '../hooks/useStreakSocket';

// ─── Palette cyber ────────────────────────────────────────────────────────────
const CYBER = {
  cyan:   '#5BD2FF',
  mag:    '#C875FF',
  glass:  'rgba(10, 14, 28, 0.92)',
  edge:   'rgba(150, 180, 255, 0.18)',
  gold:   T.gold,
  green:  '#3DFF9A',
  text:   '#EAF2FF',
  dim:    '#8090B5',
  bgDeep: '#05060B',
};

const rs = (n) => getResponsiveSize(n);

// ─── Formatage du compteur ────────────────────────────────────────────────────
const fmt = (n) => {
  if (!n && n !== 0) return '…';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace('.0', '') + 'k';
  return n.toString();
};

// ─── CyberCard ────────────────────────────────────────────────────────────────
// Reproduit le design HTML exact : colonne gauche, icone + titre + sous-titre
const CyberCard = React.memo(({
  color,
  hot = false,
  onPress,
  onPlaySound,
  icon,
  anim,
  label,
  sub,            // texte sous-titre ex: "156k joueurs"
  subDot,         // true = affiche un point pulsant coloré devant le sub
  subDotColor,    // couleur du point (défaut = green)
  useRotation = false,
  spin,
  fullWidth = false,
  minHeight,
  horizontal = false,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const hotAnim  = useRef(new Animated.Value(1)).current;
  const dotAnim  = useRef(new Animated.Value(1)).current;

  // Pulse badge HOT
  useEffect(() => {
    if (!hot) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hotAnim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(hotAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hot]);

  // Pulse dot live
  useEffect(() => {
    if (!subDot) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.2, duration: 900, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [subDot]);

  const iconTransform = [
    { scale: anim },
    ...(useRotation && spin ? [{ rotate: spin }] : []),
  ];

  const dotColor = subDotColor || CYBER.green;

  return (
    <Pressable
      onPress={() => { if (onPlaySound) onPlaySound(); if (onPress) onPress(); }}
      android_ripple={{ color: `${color}22`, foreground: true }}
      style={({ pressed }) => [
        cStyles.card,
        { borderColor: `${color}55`, shadowColor: color },
        fullWidth && { flex: 0, width: '100%' },
        horizontal && cStyles.cardHorizontal,
        isTablet && cStyles.cardTablet,
        minHeight && { minHeight },
        pressed && { opacity: 0.80, transform: [{ scale: 0.965 }] }
      ]}
    >
      {/* Badge HOT */}
      {hot && (
        <Animated.View style={[cStyles.hotBadge, isTablet && cStyles.hotBadgeTablet, { borderColor: `${color}80`, opacity: hotAnim }]}>
          <Text style={[cStyles.hotText, isTablet && cStyles.hotTextTablet, { color }]}>HOT</Text>
        </Animated.View>
      )}

      <View style={horizontal ? cStyles.cardInnerRow : cStyles.cardInnerCol}>
        <View style={[cStyles.iconBox, isTablet && cStyles.iconBoxTablet, { borderColor: `${color}66`, backgroundColor: `${color}22` }]}>
          <Animated.View style={{ transform: iconTransform }}>
            <Ionicons name={icon} size={rs(isTablet ? 24 : 18)} color={color} />
          </Animated.View>
        </View>

        <View style={[cStyles.texts, horizontal && { marginLeft: rs(isTablet ? 14 : 12) }]}>
          <Text style={[cStyles.title, isTablet && cStyles.titleTablet]} numberOfLines={1}>{label}</Text>
          {sub ? (
            <View style={cStyles.subRow}>
              {subDot && (
                <Animated.View style={[cStyles.dot, isTablet && cStyles.dotTablet, { backgroundColor: dotColor, opacity: dotAnim, shadowColor: dotColor }]} />
              )}
              <Text style={[cStyles.sub, isTablet && cStyles.subTablet]} numberOfLines={1}>{sub}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const cStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CYBER.glass,
    borderWidth: 1,
    borderRadius: rs(14),
    paddingVertical: rs(10),
    paddingHorizontal: rs(12),
    flexDirection: 'column',
    gap: rs(6),
    minHeight: rs(84),
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: rs(14),
    elevation: 8,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  cardTablet: {
    paddingVertical: rs(14),
    paddingHorizontal: rs(16),
    gap: rs(8),
    minHeight: rs(110),
    borderRadius: rs(18),
  },
  cardInnerCol: {
    flexDirection: 'column',
    gap: rs(6),
  },
  cardInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHorizontal: {
    minHeight: rs(64),
    paddingVertical: rs(10),
  },
  // ── HOT badge ────────────────────────────────────────────────────────────────
  hotBadge: {
    position: 'absolute',
    top: rs(7),
    right: rs(7),
    borderWidth: 1,
    borderRadius: rs(4),
    paddingHorizontal: rs(5),
    paddingVertical: rs(2),
  },
  hotBadgeTablet: {
    top: rs(10),
    right: rs(10),
    paddingHorizontal: rs(6),
    paddingVertical: rs(3),
    borderRadius: rs(6),
  },
  hotText: {
    fontSize: rs(8),
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hotTextTablet: {
    fontSize: rs(10),
  },
  // ── Icône box ─────────────────────────────────────────────────────────────────
  iconBox: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(8),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxTablet: {
    width: rs(46),
    height: rs(46),
    borderRadius: rs(10),
  },
  // ── Textes ────────────────────────────────────────────────────────────────────
  texts: {
    flexDirection: 'column',
    gap: rs(3),
  },
  title: {
    color: CYBER.text,
    fontSize: rs(15),
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    lineHeight: rs(16),
  },
  titleTablet: {
    fontSize: rs(18),
    lineHeight: rs(19),
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
  },
  dot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: rs(4),
    elevation: 3,
  },
  dotTablet: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
  },
  sub: {
    color: CYBER.dim,
    fontSize: rs(10),
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  subTablet: {
    fontSize: rs(12),
  },
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isTablet  = width >= 768;

  // Streak hooks
  useStreakSocket();

  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const isAndroidEmulator = Platform.OS === 'android' && Constants.isDevice === false;

  const user     = useSelector(state => state.auth.user);
  const token    = useSelector(state => state.auth.token);
  const settings = useSelector(
    state => state.settings || { isMusicEnabled: true, isSoundEnabled: true }
  );

  // ── États modals ──────────────────────────────────────────────────────────────
  const [settingsVisible,     setSettingsVisible]     = useState(false);
  const [searchVisible,       setSearchVisible]       = useState(false);
  const [friendsMenuVisible,  setFriendsMenuVisible]  = useState(false);
  const [liveConfigVisible,   setLiveConfigVisible]   = useState(false);
  const [onlineConfigVisible, setOnlineConfigVisible] = useState(false);
  const [aiConfigVisible,     setAiConfigVisible]     = useState(false);
  const [localConfigVisible,  setLocalConfigVisible]  = useState(false);
  const [rewardsVisible,      setRewardsVisible]      = useState(false);

  // ── Données dynamiques des cartes ────────────────────────────────────────────
  const [onlineCount,  setOnlineCount]  = useState(null);  // nombre joueurs en ligne
  const [friendsCount, setFriendsCount] = useState(null);  // nombre d'amis
  const [tournamentsCount, setTournamentsCount] = useState(null);

  const joinedUserRoomRef = useRef(null);
  const lazyComponentRef  = useRef({});

  // ── Animations icônes ─────────────────────────────────────────────────────────
  const [onlineAnim]   = useState(new Animated.Value(1));
  const [computerAnim] = useState(new Animated.Value(1));
  const [friendsAnim]  = useState(new Animated.Value(1));
  const [localAnim]    = useState(new Animated.Value(1));
  const [tournamentAnim] = useState(new Animated.Value(1));
  const spinValue      = useRef(new Animated.Value(0)).current;

  const { syncBalance, isSyncing, lastSync } = useCoinsContext();
  const { t } = useTranslation();

  // ── Sync coins au focus ───────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const shouldSync = !isSyncing && (!lastSync || Date.now() - lastSync > 15000);
      if (shouldSync) syncBalance();
    }, [isSyncing, lastSync, syncBalance])
  );

  // ── Fetch compteurs dynamiques ────────────────────────────────────────────────
  const fetchCounts = useCallback(async () => {
    if (!token) return;
    try {
      // Nombre de joueurs en ligne (endpoint existant, max 50)
      const onlineRes = await fetch(`${API_URL}/users/status/online`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (onlineRes.ok) {
        const onlineData = await onlineRes.json();
        // +1 pour inclure l'utilisateur lui-même
        setOnlineCount(Array.isArray(onlineData) ? onlineData.length + 1 : null);
      }
    } catch (_) { /* silencieux */ }

    try {
      // Nombre d'amis
      const friendRes = await fetch(`${API_URL}/users/me/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (friendRes.ok) {
        const friendData = await friendRes.json();
        setFriendsCount(Array.isArray(friendData) ? friendData.length : null);
      }
    } catch (_) { /* silencieux */ }

    try {
      const tournRes = await fetch(`${API_URL}/tournaments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tournRes.ok) {
        const tournData = await tournRes.json();
        const mesCount = Array.isArray(tournData.mesCreations) ? tournData.mesCreations.length : 0;
        const actifs = Array.isArray(tournData.disponibles)
          ? tournData.disponibles.length + mesCount
          : Array.isArray(tournData.tournaments)
            ? tournData.tournaments.filter(
                (t) => t.status === 'waiting' || t.status === 'in_progress'
              ).length
            : Array.isArray(tournData)
              ? tournData.length
              : null;
        setTournamentsCount(actifs);
      }
    } catch (_) { /* silencieux */ }
  }, [token]);

  // Fetch au montage et au changement d'utilisateur
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Rafraîchissement au focus (si >30s depuis dernier fetch)
  const lastFetchRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchRef.current > 30_000) {
        lastFetchRef.current = now;
        fetchCounts();
      }
    }, [fetchCounts])
  );

  // Mise à jour du nombre d'amis en temps réel via socket
  useEffect(() => {
    const handleFriendAccepted = () => {
      setFriendsCount(prev => (prev !== null ? prev + 1 : prev));
    };
    socket.on('friend_request_accepted', handleFriendAccepted);
    return () => socket.off('friend_request_accepted', handleFriendAccepted);
  }, []);

  useEffect(() => {
    const handleTournamentAdded = () => {
      setTournamentsCount((prev) => (prev !== null ? prev + 1 : 1));
    };
    const handleTournamentRemoved = () => {
      setTournamentsCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    };
    const handleTournamentUpdated = ({ status }) => {
      if (status === 'finished' || status === 'cancelled') {
        setTournamentsCount((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }
    };

    socket.on('lobby_tournament_added', handleTournamentAdded);
    socket.on('lobby_tournament_removed', handleTournamentRemoved);
    socket.on('lobby_tournament_updated', handleTournamentUpdated);

    return () => {
      socket.off('lobby_tournament_added', handleTournamentAdded);
      socket.off('lobby_tournament_removed', handleTournamentRemoved);
      socket.off('lobby_tournament_updated', handleTournamentUpdated);
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const [logoTaps, setLogoTaps] = useState(0);
  const lastLogoTapRef = useRef(0);

  const handleLogoPress = () => {
    const now = Date.now();
    if (now - lastLogoTapRef.current > 1000) {
      setLogoTaps(1);
    } else {
      const nextTaps = logoTaps + 1;
      setLogoTaps(nextTaps);
      if (nextTaps >= 5) {
        navigation.navigate('AdDiagnostic');
        setLogoTaps(0);
      }
    }
    lastLogoTapRef.current = now;
  };

  const handlePlaySound = async () => { await playButtonSound(); };

  const openOnlineConfig = useCallback(() => {
    if (!user || !token) {
      appAlert(t('auth.login_required'), t('auth.login_required_online'), [
        { text: t('common.later'), style: 'cancel' },
        { text: t('common.login_action'), onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    requestAnimationFrame(() => setOnlineConfigVisible(true));
  }, [navigation, token, user]);

  const openAiConfig = useCallback(() => {
    requestAnimationFrame(() => setAiConfigVisible(true));
  }, []);

  const openFriendsConfig = useCallback(() => {
    if (!user || !token) {
      appAlert(t('auth.login_required'), t('auth.login_required_friends'), [
        { text: t('common.later'), style: 'cancel' },
        { text: t('common.login_action'), onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    requestAnimationFrame(() => setFriendsMenuVisible(true));
  }, [navigation, token, user]);

  const openTournamentLobby = useCallback(() => {
    if (!user || !token) {
      appAlert(t('auth.login_required'), t('auth.login_required_online'), [
        { text: t('common.later'), style: 'cancel' },
        { text: t('common.login_action'), onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    navigation.navigate('TournamentLobby');
  }, [navigation, token, user, t]);

  // ── Quick actions depuis le bouton central (TabNavigation) ───────────────────
  useFocusEffect(
    useCallback(() => {
      const qa = route?.params?.quickAction;
      if (!qa) return;

      if (qa === 'online') openOnlineConfig();
      if (qa === 'computer') openAiConfig();
      if (qa === 'friends') openFriendsConfig();
      if (qa === 'local') requestAnimationFrame(() => setLocalConfigVisible(true));
      if (qa === 'rewards') requestAnimationFrame(() => setRewardsVisible(true));

      navigation.setParams({ quickAction: undefined });
    }, [navigation, openAiConfig, openFriendsConfig, openOnlineConfig, route?.params?.quickAction])
  );

  // ── Animations pulse icônes ───────────────────────────────────────────────────
  const startPulse = (animVal) => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animVal, { toValue: 1.22, duration: 950, useNativeDriver: true }),
        Animated.timing(animVal, { toValue: 1,    duration: 950, useNativeDriver: true }),
      ])
    );
    loop.start();
    return loop;
  };

  useEffect(() => {
    if (isAndroidEmulator) return;
    const loops = [
      startPulse(onlineAnim),
      startPulse(computerAnim),
      startPulse(friendsAnim),
      startPulse(localAnim),
      startPulse(tournamentAnim),
    ];
    return () => loops.forEach(l => l?.stop?.());
  }, [isAndroidEmulator]);

  // Rotation globe
  useEffect(() => {
    if (isAndroidEmulator) return;
    const loop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 4500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [isAndroidEmulator]);

  // ── Socket ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const userId = user?._id || user?.id;
    if (userId) {
      if (joinedUserRoomRef.current === userId) return;
      joinedUserRoomRef.current = userId;
      if (socket.connected) {
        socket.emit('join_user_room', userId);
        return;
      }
      const onConnect = () => {
        socket.emit('join_user_room', userId);
        socket.off('connect', onConnect);
      };
      socket.on('connect', onConnect);
      socket.connect();
      return () => { socket.off('connect', onConnect); };
    }
  }, [user?._id, user?.id]);

  useEffect(() => {
    if (isAndroidEmulator) return;
    if (!AudioController.isRematchMode) {
      AudioController.playHomeMusic(settings.isMusicEnabled);
    }
    return () => AudioController.stopHomeMusic();
  }, [settings.isMusicEnabled]);

  const handleRoomCreated = (data) => {
    navigation.navigate('Game', {
      mode: 'online_custom',
      gameId: data.gameId,
      players: data.players,
      currentTurn: data.currentTurn || 'black',
      betAmount: data.betAmount,
      timeControl: data.timeControl,
      gameType: data.mode,
      tournamentSettings: data.tournamentSettings,
      inviteCode: data.inviteCode || null,
      isWaiting: true,
    });
  };

  useEffect(() => {
    if (user?._id) {
      socket.on('room_created', handleRoomCreated);
      const handleError = (msg) => appAlert(t('common.error'), msg);
      socket.on('error', handleError);
      return () => {
        socket.off('room_created', handleRoomCreated);
        socket.off('error', handleError);
      };
    }
  }, [user, navigation]);

  // ── Interpolations ────────────────────────────────────────────────────────────
  const spinInterp  = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const cardGap     = rs(isTablet ? 16 : isDesktop ? 12 : 8);
  const cardsMaxW   = isDesktop ? 1060 : isTablet ? Math.min(width * 0.85, 800) : undefined;
  const battleLogoSize = Math.round(
    Math.min(
      width * (isDesktop ? 0.18 : isTablet ? 0.35 : 0.38),
      isDesktop ? 220 : isTablet ? 240 + 70 : 160
    ) + (isTablet ? rs(60) + 70 : rs(80))
  );

  // ── Textes sous-titre des cartes ──────────────────────────────────────────────
  const onlineSub  = onlineCount !== null
    ? t('home.players_count', { count: onlineCount })
    : t('home.online_status');
  const friendsSub = friendsCount !== null
    ? t('home.friends_count', { count: friendsCount })
    : t('home.my_friends');
  const tournamentSub = tournamentsCount === null
    ? t('tournament.home_card.loading')
    : tournamentsCount === 0
      ? t('tournament.home_card.none')
      : tournamentsCount === 1
        ? t('tournament.home_card.one')
        : t('tournament.home_card.many', { count: fmt(tournamentsCount) });

  // ── Lazy modals ───────────────────────────────────────────────────────────────
  const lz = lazyComponentRef.current;
  const RewardsModalComp      = rewardsVisible      ? (lz.Rewards      || (lz.Rewards      = require('../components/home/RewardsModal').default))      : null;
  const SettingsModalComp     = settingsVisible     ? (lz.Settings     || (lz.Settings     = require('../components/home/SettingsModal').default))     : null;
  const SearchModalComp       = searchVisible       ? (lz.Search       || (lz.Search       = require('../components/home/UserSearchModal').default))    : null;
  const FriendsSetupComp      = friendsMenuVisible  ? (lz.Friends      || (lz.Friends      = require('../components/home/FriendsGameSetup').default))  : null;
  const LiveSetupComp         = liveConfigVisible   ? (lz.Live         || (lz.Live         = require('../components/home/LiveGameSetup').default))      : null;
  const OnlineSetupComp       = onlineConfigVisible ? (lz.Online       || (lz.Online       = require('../components/home/OnlineGameSetup').default))    : null;
  const AiSetupComp           = aiConfigVisible     ? (lz.Ai           || (lz.Ai           = require('../components/home/AiGameSetup').default))        : null;
  const LocalSetupComp        = localConfigVisible  ? (lz.Local        || (lz.Local        = require('../components/home/LocalGameSetup').default))     : null;

  const BackgroundContainer = isAndroidEmulator ? View : ImageBackground;
  const bgProps = isAndroidEmulator ? null : {
    source: require('../../assets/images/Background2-4.png'),
    resizeMode: 'cover',
    resizeMethod: 'resize',
    progressiveRenderingEnabled: true,
  };

  return (
    <BackgroundContainer
      {...(bgProps || {})}
      style={[styles.bg, isAndroidEmulator && { backgroundColor: CYBER.bgDeep }]}
    >
      <View style={styles.overlay} pointerEvents="none" />
      <PwaInstallBanner />

      {/* ── Modals ── */}
      {rewardsVisible && RewardsModalComp      ? <RewardsModalComp      visible onClose={() => setRewardsVisible(false)} /> : null}
      {settingsVisible && SettingsModalComp    ? <SettingsModalComp     visible onClose={() => setSettingsVisible(false)} handlePlaySound={handlePlaySound} /> : null}
      {searchVisible && SearchModalComp        ? <SearchModalComp       visible onClose={() => setSearchVisible(false)} navigation={navigation} /> : null}
      {friendsMenuVisible && FriendsSetupComp  ? <FriendsSetupComp      visible onClose={() => setFriendsMenuVisible(false)} navigation={navigation} user={user} onOpenLiveConfig={() => setLiveConfigVisible(true)} /> : null}
      {liveConfigVisible && LiveSetupComp      ? <LiveSetupComp         visible onClose={() => setLiveConfigVisible(false)} navigation={navigation} user={user} /> : null}
      {onlineConfigVisible && OnlineSetupComp  ? <OnlineSetupComp       visible onClose={() => setOnlineConfigVisible(false)} navigation={navigation} user={user} /> : null}
      {aiConfigVisible && AiSetupComp          ? <AiSetupComp           visible onClose={() => setAiConfigVisible(false)} navigation={navigation} user={user} /> : null}
      {localConfigVisible && LocalSetupComp    ? <LocalSetupComp        visible onClose={() => setLocalConfigVisible(false)} navigation={navigation} /> : null}
      
      <StreakRewardModal />

      {/* ── Header ── */}
      <HomeHeader
        user={user}
        navigation={navigation}
        onRewards={() => setRewardsVisible(true)}
        onSearch={() => {
          if (!user || !token) {
            appAlert(t('auth.login_required'), t('auth.login_required_search'), [
              { text: t('common.later'), style: 'cancel' },
              { text: t('common.login_action'), onPress: () => navigation.navigate('Login') },
            ]);
            return;
          }
          setSearchVisible(true);
        }}
        onSettings={() => setSettingsVisible(true)}
        onPlaySound={handlePlaySound}
      />

      {/* ── Corps ── */}
      <View style={[styles.body, isDesktop && styles.bodyDesktop]}>

        {/* Animation X vs O */}
        {!isAndroidEmulator && (
          <View style={[styles.battleSection, isTablet && styles.battleSectionTablet]}>
            <Pressable onPress={handleLogoPress}>
              <Animated.Image
                source={require('../../assets/images/LogoDeadPions2.png')}
                style={[
                  styles.battleLogo,
                  { width: battleLogoSize, height: Math.round(battleLogoSize * 0.9) },
                  !isTablet && !isDesktop && { marginTop: -rs(130) },
                  isTablet && { marginTop: -rs(420) },
                ]}
                resizeMode="contain"
              />
            </Pressable>
            <View style={[
              styles.battleAnimWrap,
              isTablet && { overflow: 'visible' },
              {
                maxHeight: isTablet ? rs(160) : isDesktop ? rs(100) : rs(100),
                marginTop: !isTablet && !isDesktop ? -rs(50) : isTablet ? -rs(70) : 0,
              },
            ]}>
              <CyberBattleAnimation />
            </View>
          </View>
        )}

        {/* ── Grille responsive ── */}
        <View
          style={[
            styles.grid,
            { gap: cardGap },
            cardsMaxW && { maxWidth: cardsMaxW, alignSelf: 'center', width: '100%' },
          ]}
        >
          {isDesktop ? (
            <View style={[styles.row, { gap: cardGap }]}>
              <CyberCard
                color={CYBER.cyan}
                hot
                onPress={openOnlineConfig}
                onPlaySound={handlePlaySound}
                icon="globe-outline"
                anim={onlineAnim}
                label={t('home.play_online')}
                sub={onlineSub}
                subDot
                subDotColor={CYBER.green}
                useRotation
                spin={spinInterp}
              />
              <CyberCard
                color={CYBER.mag}
                onPress={openAiConfig}
                onPlaySound={handlePlaySound}
                icon="hardware-chip-outline"
                anim={computerAnim}
                label={t('home.play_computer')}
                sub={t('home.computer_subtitle')}
                subDot={false}
              />
              <CyberCard
                color={CYBER.cyan}
                onPress={openFriendsConfig}
                onPlaySound={handlePlaySound}
                icon="people-outline"
                anim={friendsAnim}
                label={t('home.play_friends')}
                sub={friendsSub}
                subDot={friendsCount !== null && friendsCount > 0}
                subDotColor={CYBER.cyan}
              />
              <CyberCard
                color={CYBER.gold}
                onPress={() => setLocalConfigVisible(true)}
                onPlaySound={handlePlaySound}
                icon="game-controller-outline"
                anim={localAnim}
                label={t('home.play_local')}
                sub={t('home.local_subtitle')}
                subDot={false}
              />
              <CyberCard
                color={CYBER.gold}
                hot={tournamentsCount !== null && tournamentsCount > 0}
                onPress={openTournamentLobby}
                onPlaySound={handlePlaySound}
                icon="trophy-outline"
                anim={tournamentAnim}
                label={t('tournament.home_card.label')}
                sub={tournamentSub}
                subDot={tournamentsCount !== null && tournamentsCount > 0}
                subDotColor={CYBER.gold}
              />
            </View>
          ) : isTablet ? (
            <>
              <View style={[styles.row, { gap: cardGap }]}>
                <CyberCard
                  color={CYBER.cyan}
                  hot
                  onPress={openOnlineConfig}
                  onPlaySound={handlePlaySound}
                  icon="globe-outline"
                  anim={onlineAnim}
                  label={t('home.play_online')}
                  sub={onlineSub}
                  subDot
                  subDotColor={CYBER.green}
                  useRotation
                  spin={spinInterp}
                />
                <CyberCard
                  color={CYBER.mag}
                  onPress={openAiConfig}
                  onPlaySound={handlePlaySound}
                  icon="hardware-chip-outline"
                  anim={computerAnim}
                  label={t('home.play_computer')}
                  sub={t('home.computer_subtitle')}
                  subDot={false}
                />
                <CyberCard
                  color={CYBER.cyan}
                  onPress={openFriendsConfig}
                  onPlaySound={handlePlaySound}
                  icon="people-outline"
                  anim={friendsAnim}
                  label={t('home.play_friends')}
                  sub={friendsSub}
                  subDot={friendsCount !== null && friendsCount > 0}
                  subDotColor={CYBER.cyan}
                />
              </View>
              <View style={[styles.row, { gap: cardGap, justifyContent: 'center' }]}>
                <View style={{ flex: 0.25 }} />
                <CyberCard
                  color={CYBER.gold}
                  onPress={() => setLocalConfigVisible(true)}
                  onPlaySound={handlePlaySound}
                  icon="game-controller-outline"
                  anim={localAnim}
                  label={t('home.play_local')}
                  sub={t('home.local_subtitle')}
                  subDot={false}
                />
                <CyberCard
                  color={CYBER.gold}
                  hot={tournamentsCount !== null && tournamentsCount > 0}
                  onPress={openTournamentLobby}
                  onPlaySound={handlePlaySound}
                  icon="trophy-outline"
                  anim={tournamentAnim}
                  label={t('tournament.home_card.label')}
                  sub={tournamentSub}
                  subDot={tournamentsCount !== null && tournamentsCount > 0}
                  subDotColor={CYBER.gold}
                />
                <View style={{ flex: 0.25 }} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.row, { gap: cardGap }]}>
                <CyberCard
                  color={CYBER.cyan}
                  hot
                  onPress={openOnlineConfig}
                  onPlaySound={handlePlaySound}
                  icon="globe-outline"
                  anim={onlineAnim}
                  label={t('home.play_online')}
                  sub={onlineSub}
                  subDot
                  subDotColor={CYBER.green}
                  useRotation
                  spin={spinInterp}
                />
                <CyberCard
                  color={CYBER.mag}
                  onPress={openAiConfig}
                  onPlaySound={handlePlaySound}
                  icon="hardware-chip-outline"
                  anim={computerAnim}
                  label={t('home.play_computer')}
                  sub={t('home.computer_subtitle')}
                  subDot={false}
                />
              </View>
              <View style={[styles.row, { gap: cardGap }]}>
                <CyberCard
                  color={CYBER.cyan}
                  onPress={openFriendsConfig}
                  onPlaySound={handlePlaySound}
                  icon="people-outline"
                  anim={friendsAnim}
                  label={t('home.play_friends')}
                  sub={friendsSub}
                  subDot={friendsCount !== null && friendsCount > 0}
                  subDotColor={CYBER.cyan}
                />
                <CyberCard
                  color={CYBER.gold}
                  onPress={() => setLocalConfigVisible(true)}
                  onPlaySound={handlePlaySound}
                  icon="game-controller-outline"
                  anim={localAnim}
                  label={t('home.play_local')}
                  sub={t('home.local_subtitle')}
                  subDot={false}
                />
              </View>
              <View style={[styles.row, { gap: cardGap }]}>
                <CyberCard
                  color={CYBER.gold}
                  hot={tournamentsCount !== null && tournamentsCount > 0}
                  onPress={openTournamentLobby}
                  onPlaySound={handlePlaySound}
                  icon="trophy-outline"
                  anim={tournamentAnim}
                  label={t('tournament.home_card.label')}
                  sub={tournamentSub}
                  subDot={tournamentsCount !== null && tournamentsCount > 0}
                  subDotColor={CYBER.gold}
                  fullWidth
                  horizontal
                />
              </View>
            </>
          )}
        </View>
      </View>
    </BackgroundContainer>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 6, 11, 0.58)',
  },
  body: {
    flex: 1,
    paddingHorizontal: rs(14),
    paddingTop: rs(0),
    paddingBottom: rs(140),
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  bodyDesktop: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  battleSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(10),
    minHeight: rs(120),
    maxHeight: rs(260),
  },
  battleSectionTablet: {
    maxHeight: rs(350),
  },
  battleLogo: {
    opacity: 0.95,
    marginBottom: rs(4),
  },
  battleAnimWrap: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
});

export default HomeScreen;
