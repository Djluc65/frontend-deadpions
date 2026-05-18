import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ImageBackground,
  useWindowDimensions, Animated, Easing, Platform,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { API_URL } from '../config';
import { playButtonSound } from '../utils/soundManager';
import { useTranslation } from 'react-i18next';
import { AudioController } from '../utils/AudioController';
import { socket } from '../utils/socket';
import { useCoinsContext } from '../context/CoinsContext';
import { getResponsiveSize, DESKTOP_BREAKPOINT } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import { T } from '../utils/theme';

// Components
import GameCard from '../components/common/GameCard';
import SettingsModal from '../components/home/SettingsModal';
import AiGameSetup from '../components/home/AiGameSetup';
import LocalGameSetup from '../components/home/LocalGameSetup';
import HomeHeader from '../components/home/HomeHeader';
import OnlineGameSetup from '../components/home/OnlineGameSetup';
import FriendsGameSetup from '../components/home/FriendsGameSetup';
import LiveGameSetup from '../components/home/LiveGameSetup';
import BattleAnimation from '../components/BattleAnimation';
import UserSearchModal from '../components/home/UserSearchModal';
import PwaInstallBanner from '../components/PwaInstallBanner';
import RewardsModal from '../components/home/RewardsModal';

// ─── Constantes de layout ─────────────────────────────────────────────────────
// Même layout sur iPhone et iPad (objectif : rendu iPad identique au rendu iPhone)
const CARD_GAP = 16;
const SECTION_PADDING = 20;

const HomeScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const isIPadAir105 =
    Platform.OS === 'ios' &&
    Platform.isPad &&
    minDim >= 820 &&
    minDim <= 848 &&
    maxDim >= 1100 &&
    maxDim <= 1130;
  const isIPadPro11 =
    Platform.OS === 'ios' &&
    Platform.isPad &&
    minDim >= 820 &&
    minDim <= 848 &&
    maxDim >= 1180 &&
    maxDim <= 1220;
  const user  = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const settings = useSelector(
    state => state.settings || { isMusicEnabled: true, isSoundEnabled: true, language: 'fr' }
  );

  const [settingsVisible,   setSettingsVisible]   = useState(false);
  const [searchVisible,     setSearchVisible]     = useState(false);
  const [friendsMenuVisible,setFriendsMenuVisible]= useState(false);
  const [liveConfigVisible, setLiveConfigVisible] = useState(false);
  const [onlineConfigVisible,setOnlineConfigVisible]=useState(false);
  const [aiConfigVisible,   setAiConfigVisible]   = useState(false);
  const [localConfigVisible,setLocalConfigVisible]= useState(false);
  const [rewardsVisible, setRewardsVisible] = useState(false);

  const spinValue  = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  const [onlineAnim]   = useState(new Animated.Value(1));
  const [computerAnim] = useState(new Animated.Value(1));
  const [friendsAnim]  = useState(new Animated.Value(1));
  const [localAnim]    = useState(new Animated.Value(1));

  const { syncBalance, isSyncing, lastSync } = useCoinsContext();
  const { t } = useTranslation();

  // ── Sync coins on focus ──────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const shouldSync = !isSyncing && (!lastSync || Date.now() - lastSync > 2000);
      if (shouldSync) syncBalance();
    }, [isSyncing, lastSync, syncBalance])
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
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

  // ── Animations ────────────────────────────────────────────────────────────
  const startPulse = (anim) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  useEffect(() => {
    startPulse(onlineAnim);
    startPulse(computerAnim);
    startPulse(friendsAnim);
    startPulse(localAnim);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseValue, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (userId) {
      if (!socket.connected) socket.connect();
      socket.emit('join_user_room', userId);
    }
  }, [user?._id, user?.id]);

  useEffect(() => {
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

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ── Dimensions logo dynamiques ────────────────────────────────────────────
  // Sur iPad on garde la même taille visuelle que sur iPhone (logo non géant)
  const logoSize = isTablet ? (isIPadPro11 ? 290 : (isIPadAir105 ? 270 : 200)) : Math.min(width * 0.68, 380);

  // Taille des icônes dans les cards
  const CARD_ICON_MAIN = getResponsiveSize(40);
  const CARD_ICON_SIDE = getResponsiveSize(24);

  return (
    <ImageBackground
      source={require('../../assets/images/Background2-4.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.bgOverlay} pointerEvents="none" />
      <PwaInstallBanner />
      <RewardsModal
        visible={rewardsVisible}
        onClose={() => setRewardsVisible(false)}
      />
      {/* ── Modals ── */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        handlePlaySound={handlePlaySound}
      />
      <UserSearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        navigation={navigation}
      />
      <FriendsGameSetup
        visible={friendsMenuVisible}
        onClose={() => setFriendsMenuVisible(false)}
        navigation={navigation}
        user={user}
        onOpenLiveConfig={() => setLiveConfigVisible(true)}
      />
      <LiveGameSetup
        visible={liveConfigVisible}
        onClose={() => setLiveConfigVisible(false)}
        navigation={navigation}
        user={user}
      />
      <OnlineGameSetup
        visible={onlineConfigVisible}
        onClose={() => setOnlineConfigVisible(false)}
        navigation={navigation}
        user={user}
      />
      <AiGameSetup
        visible={aiConfigVisible}
        onClose={() => setAiConfigVisible(false)}
        navigation={navigation}
        user={user}
      />
      <LocalGameSetup
        visible={localConfigVisible}
        onClose={() => setLocalConfigVisible(false)}
        navigation={navigation}
      />

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

      {/* ── Corps principal ── */}
      <View style={styles.body}>

        {/* Logo centré — taille calculée, ne chevauche plus les cards */}
        <View
          style={[
            styles.logoWrapper,
            !isTablet && { marginTop: getResponsiveSize(-33) },
          ]}
          pointerEvents="none"
        >
          <Animated.Image
            source={require('../../assets/images/LogoDeadPions2.png')}
            style={[
              styles.logo,
              {
                width: logoSize,
                height: logoSize,
                transform: [{ scale: pulseValue }],
              },
            ]}
            resizeMode="contain"
          />
        </View>

        {/* Cards — grille 2×2 */}
        <View
          style={[
            styles.cardsWrapper,
            isTablet && styles.tabletCardsWrapper,
            isDesktop && styles.desktopCardsWrapper,
            !isDesktop && isIPadAir105 && styles.iPadAirCardsWrapper,
            !isDesktop && isIPadPro11 && styles.iPadPro11CardsWrapper,
          ]}
        >
          <View style={[styles.row, isTablet && styles.tabletRow]}>
            <GameCard
              onPress={openOnlineConfig}
              onPlaySound={handlePlaySound}
              style={[
                styles.card,
                isTablet && styles.cardTablet,
                isIPadAir105 && styles.iPadAirCardTablet,
                isIPadPro11 && styles.iPadPro11CardTablet,
              ]}
            >
              <CardContent
                side1="phone-portrait-outline"
                main="globe-outline"
                side2="phone-portrait-outline"
                mainAnim={onlineAnim}
                spin={spin}
                label={t('home.play_online')}
                mainSize={CARD_ICON_MAIN}
                sideSize={CARD_ICON_SIDE}
                useRotation
                isTablet={isTablet}
                isIPadAir105={isIPadAir105}
                isIPadPro11={isIPadPro11}
              />
            </GameCard>

            <GameCard
              onPress={openAiConfig}
              onPlaySound={handlePlaySound}
              style={[
                styles.card,
                isTablet && styles.cardTablet,
                isIPadAir105 && styles.iPadAirCardTablet,
                isIPadPro11 && styles.iPadPro11CardTablet,
              ]}
            >
              <CardContent
                side1="desktop-outline"
                main="hardware-chip-outline"
                side2="desktop-outline"
                mainAnim={computerAnim}
                label={t('home.play_computer')}
                mainSize={CARD_ICON_MAIN}
                sideSize={CARD_ICON_SIDE}
                isTablet={isTablet}
                isIPadAir105={isIPadAir105}
                isIPadPro11={isIPadPro11}
              />
            </GameCard>
          </View>

          <View style={[styles.row, { marginTop: getResponsiveSize(CARD_GAP) }, isTablet && styles.tabletRow]}>
            <GameCard
              onPress={openFriendsConfig}
              onPlaySound={handlePlaySound}
              style={[
                styles.card,
                isTablet && styles.cardTablet,
                isIPadAir105 && styles.iPadAirCardTablet,
                isIPadPro11 && styles.iPadPro11CardTablet,
              ]}
            >
              <CardContent
                side1="person-outline"
                main="people-outline"
                side2="person-add-outline"
                mainAnim={friendsAnim}
                label={t('home.play_friends')}
                mainSize={CARD_ICON_MAIN}
                sideSize={CARD_ICON_SIDE}
                isTablet={isTablet}
                isIPadAir105={isIPadAir105}
                isIPadPro11={isIPadPro11}
              />
            </GameCard>

            <GameCard
              onPress={() => setLocalConfigVisible(true)}
              onPlaySound={handlePlaySound}
              style={[
                styles.card,
                isTablet && styles.cardTablet,
                isIPadAir105 && styles.iPadAirCardTablet,
                isIPadPro11 && styles.iPadPro11CardTablet,
              ]}
            >
              <CardContent
                side1="phone-portrait-outline"
                main="game-controller-outline"
                side2="phone-portrait-outline"
                mainAnim={localAnim}
                label={t('home.play_local')}
                mainSize={CARD_ICON_MAIN}
                sideSize={CARD_ICON_SIDE}
                isTablet={isTablet}
                isIPadAir105={isIPadAir105}
                isIPadPro11={isIPadPro11}
              />
            </GameCard>
          </View>
        </View>

        {/* BattleAnimation toujours visible en bas */}
        <View style={styles.battleWrapper}>
          <BattleAnimation />
        </View>
      </View>
    </ImageBackground>
  );
};

// ─── Sous-composant card content ─────────────────────────────────────────────
const CardContent = React.memo(({
  side1, main, side2, mainAnim, spin, label,
  mainSize, sideSize, useRotation = false,
  isTablet = false,
  isIPadAir105 = false,
  isIPadPro11 = false,
}) => (
  <View style={cardStyles.content}>
    <View
      style={[
        cardStyles.iconWrapper,
        isIPadAir105 && { paddingVertical: getResponsiveSize(24) },
        isIPadPro11 && { paddingVertical: getResponsiveSize(24) },
      ]}
    >
      <Ionicons name={side1} size={sideSize} color="#f1c40f" />
      <Animated.View style={{
        transform: [
          { scale: mainAnim },
          ...(useRotation && spin ? [{ rotate: spin }] : []),
        ],
      }}>
        <Ionicons name={main} size={mainSize} color="#f1c40f" />
      </Animated.View>
      <Ionicons name={side2} size={sideSize} color="#f1c40f" />
    </View>
    <Text style={cardStyles.label}>{label}</Text>
  </View>
));

const cardStyles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconWrapper: {
    backgroundColor: T.bg3,
    borderWidth: 1.5,
    borderColor: T.gold,
    borderTopLeftRadius: getResponsiveSize(13),
    borderTopRightRadius: getResponsiveSize(13),
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(12),
    marginBottom: getResponsiveSize(8),
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
    flexDirection: 'row',
    gap: getResponsiveSize(5),
  },
  label: {
    color: T.gold,
    fontSize: getResponsiveSize(15),
    fontWeight: '800',
    paddingBottom: getResponsiveSize(4),
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

// ─── Styles principaux ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  // ── Corps sous le header ──────────────────────────────────────────────────
  body: {
    flex: 1,
    paddingHorizontal: getResponsiveSize(SECTION_PADDING),
    justifyContent: 'flex-start',
    paddingBottom: getResponsiveSize(16),
    paddingTop: 0,
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoWrapper: {
    alignItems: 'center',
    marginTop: getResponsiveSize(-8),
    marginBottom: getResponsiveSize(-16),
  },
  logo: {
    // width/height injectés dynamiquement dans le composant
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  cardsWrapper: {
    marginTop: getResponsiveSize(-20),
  },
  tabletCardsWrapper: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  desktopCardsWrapper: {
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
  },
  iPadAirCardsWrapper: {
    maxWidth: 680,
  },
  iPadPro11CardsWrapper: {
    maxWidth: 680,
  },
  row: {
    flexDirection: 'row',
    gap: getResponsiveSize(CARD_GAP),
    justifyContent: 'space-between',
  },
  tabletRow: {
    paddingHorizontal: 0,
  },
  card: {
    padding: getResponsiveSize(5),
    borderRadius: getResponsiveSize(14),
    borderWidth: 1.5,
    borderColor: T.gold,
    shadowColor: T.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTablet: {
    height: getResponsiveSize(200),
  },
  iPadAirCardTablet: {
    height: getResponsiveSize(180),
  },
  iPadPro11CardTablet: {
    height: getResponsiveSize(180),
  },

  // ── BattleAnimation ───────────────────────────────────────────────────────
  battleWrapper: {
    justifyContent: 'center',
  },
});

export default HomeScreen;
