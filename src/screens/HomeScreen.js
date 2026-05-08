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
import { translations } from '../utils/translations';
import { AudioController } from '../utils/AudioController';
import { socket } from '../utils/socket';
import { useCoinsContext } from '../context/CoinsContext';
import { getResponsiveSize } from '../utils/responsive';
import { appAlert } from '../services/appAlert';

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

// ─── Constantes de layout ─────────────────────────────────────────────────────
// Même layout sur iPhone et iPad (objectif : rendu iPad identique au rendu iPhone)
const CARD_GAP = 16;
const SECTION_PADDING = 20;

const HomeScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
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

  const spinValue  = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  const [onlineAnim]   = useState(new Animated.Value(1));
  const [computerAnim] = useState(new Animated.Value(1));
  const [friendsAnim]  = useState(new Animated.Value(1));
  const [localAnim]    = useState(new Animated.Value(1));

  const { syncBalance, isSyncing, lastSync } = useCoinsContext();
  const t = translations[settings.language] || translations.fr;

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
      appAlert('Connexion requise', 'Connectez-vous pour jouer en ligne.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
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
      appAlert('Connexion requise', 'Connectez-vous pour jouer avec des amis.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
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
    if (user?._id) {
      if (!socket.connected) socket.connect();
      socket.emit('join_user_room', user._id);
    }
  }, [user]);

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
      const handleError = (msg) => appAlert('Erreur', msg);
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
        t={t}
        navigation={navigation}
        onSearch={() => {
          if (!user || !token) {
            appAlert('Connexion requise', 'Connectez-vous pour rechercher des joueurs.', [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
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
            isIPadAir105 && styles.iPadAirCardsWrapper,
            isIPadPro11 && styles.iPadPro11CardsWrapper,
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
                label={t.online}
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
                label={t.computer}
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
                label={t.friends}
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
                label={t.local}
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
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderTopLeftRadius: getResponsiveSize(20),
    borderTopRightRadius: getResponsiveSize(20),
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
    color: 'rgba(4, 28, 85, 0.95)',
    fontSize: getResponsiveSize(17),
    fontWeight: 'bold',
    paddingBottom: getResponsiveSize(4),
  },
});

// ─── Styles principaux ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    borderRadius: getResponsiveSize(15),
    borderWidth: getResponsiveSize(3),
    borderColor: 'rgba(4, 28, 85, 0.95)',
    shadowColor: 'rgba(255,255,255,1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: getResponsiveSize(4),
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
