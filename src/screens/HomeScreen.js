import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ImageBackground, TouchableOpacity, useWindowDimensions, Animated, Easing, Modal, Switch, Pressable, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useDispatch, useSelector } from 'react-redux';
import { toggleMusic, toggleSound, setLanguage } from '../redux/slices/settingsSlice';
import { API_URL } from '../config';
import { playButtonSound } from '../utils/soundManager';
import { translations } from '../utils/translations';
import { AudioController } from '../utils/AudioController';
import { socket } from '../utils/socket';
import { BET_OPTIONS, ONLINE_TIME_OPTIONS } from '../utils/constants';
import { useCoinsContext } from '../context/CoinsContext';
import { getResponsiveSize, isTablet } from '../utils/responsive';

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

// Components imported above

const HomeScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const settings = useSelector(state => state.settings || { isMusicEnabled: true, isSoundEnabled: true, language: 'fr' });
  const [settingsVisible, setSettingsVisible] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  
  const { syncBalance } = useCoinsContext();

  useFocusEffect(
    useCallback(() => {
      // Synchroniser les coins à chaque fois que l'écran d'accueil est affiché
      syncBalance();
    }, [])
  );

  const t = translations[settings.language] || translations.fr;

  const handlePlaySound = async () => {
    await playButtonSound();
  };

  const [onlineAnim] = useState(new Animated.Value(1));
  const [computerAnim] = useState(new Animated.Value(1));
  const [friendsAnim] = useState(new Animated.Value(1));
  const [localAnim] = useState(new Animated.Value(1));

  // Menu Amis & États de Création de Salle
  const [friendsMenuVisible, setFriendsMenuVisible] = useState(false);
  const [liveConfigVisible, setLiveConfigVisible] = useState(false);

  // Online Game Config State
  const [onlineConfigVisible, setOnlineConfigVisible] = useState(false);

  // AI Game Config State
  const [aiConfigVisible, setAiConfigVisible] = useState(false);

  // Local Game Config State
  const [localConfigVisible, setLocalConfigVisible] = useState(false);

  const startPulse = (anim) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
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
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (user && user._id) {
        if (!socket.connected) socket.connect();
        socket.emit('join_user_room', user._id);
    }
  }, [user]);

  useEffect(() => {
    // Vérifier si nous sommes en mode rematch avant de jouer la musique
    if (!AudioController.isRematchMode) {
      AudioController.playHomeMusic(settings.isMusicEnabled);
    }

    return () => {
      // Arrêter seulement si le composant est démonté (ex: déconnexion)
      AudioController.stopHomeMusic();
    };
  }, [settings.isMusicEnabled]);

  const handleRoomCreated = (data) => {
    navigation.navigate('Game', {
        mode: 'online_custom',
        gameId: data.gameId,
        players: data.players,
        currentTurn: 'black',
        betAmount: data.betAmount,
        timeControl: data.timeControl,
        gameType: data.mode,
        tournamentSettings: data.tournamentSettings,
        isWaiting: true
    });
  };

  useEffect(() => {
    if (user && user._id) {
        socket.on('room_created', handleRoomCreated);
        
        const handleError = (message) => {
            Alert.alert('Erreur', message);
        };
        socket.on('error', handleError);

        return () => {
            socket.off('room_created', handleRoomCreated);
            socket.off('error', handleError);
        };
    }
  }, [user, navigation]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Handlers for new components are internal to those components


  // AI Modals extracted to AiGameSetup.js


  // Local Modals extracted to LocalGameSetup.js


  // Online Modals extracted to OnlineGameSetup.js

  // --- Modale de Paramètres ---
  // Affiche les options de musique, son et langue
  // Extracted to SettingsModal.js

  // Friends Modals extracted to FriendsGameSetup.js

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <SettingsModal 
        visible={settingsVisible} 
        onClose={() => setSettingsVisible(false)} 
        handlePlaySound={handlePlaySound} 
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
      
      <HomeHeader 
        user={user} 
        t={t} 
        navigation={navigation} 
        onSearch={() => console.log('Search clicked')} 
        onSettings={() => setSettingsVisible(true)} 
        onPlaySound={handlePlaySound} 
      />

      <View style={styles.logoContainer}>
        <Animated.Image 
          source={require('../../assets/images/LogoDeadPions2.png')} 
          style={[
            styles.logo, 
            { 
              transform: [{ scale: pulseValue }],
              width: isTablet ? width * 0.5 : width * 0.8,
              height: isTablet ? width * 0.5 : width * 0.8,
            }
          ]}
          resizeMode="contain"
        />
        
        {/* Early Access Banner */}
        {/* {user?.isEarlyAccess && (
          <View style={{
            backgroundColor: 'rgba(241, 196, 15, 0.2)',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20,
            marginTop: -20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#f1c40f',
            alignItems: 'center'
          }}>
            <Text style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
              🎉 Lancement DeadPions
            </Text>
            <Text style={{ color: 'white', fontSize: 14, textAlign: 'center' }}>
              Premium offert jusqu'au {new Date(user.earlyAccessEndDate).toLocaleDateString()} !
            </Text>
          </View> */}
        {/* )} */}
      </View>

      <View style={[styles.container, { paddingBottom: getResponsiveSize(100) }]}>
        <View style={styles.row}>
          <GameCard
            onPress={() => setOnlineConfigVisible(true)}
            onPlaySound={handlePlaySound}
            style={[styles.liveCard, styles.halfCard]}
          >
            <View style={styles.liveContent}>
              <View style={styles.liveIconWrapper}>
                <Ionicons name="phone-portrait-outline" size={getResponsiveSize(24)} color="#f1c40f" />
                <Animated.View style={{ transform: [{ scale: onlineAnim }, { rotate: spin }] }}>
                  <Ionicons name="globe-outline" size={getResponsiveSize(40)} color="#f1c40f" />
                </Animated.View>
                <Ionicons name="phone-portrait-outline" size={getResponsiveSize(24)} color="#f1c40f"/>
              </View>
              <Text style={styles.liveText}>{t.online}</Text>
            </View>
          </GameCard>
          <GameCard 
            onPress={() => setAiConfigVisible(true)} 
            onPlaySound={handlePlaySound}
            style={[styles.liveCard, styles.halfCard]}
          >
            <View style={styles.liveContent}>
              <View style={styles.liveIconWrapper}>
                <Ionicons name="desktop-outline" size={getResponsiveSize(24)} color="#f1c40f" />
                <Animated.View style={{ transform: [{ scale: computerAnim }] }}>
                  <Ionicons name="hardware-chip-outline" size={getResponsiveSize(40)} color="#f1c40f" />
                </Animated.View>
                <Ionicons name="desktop-outline" size={getResponsiveSize(24)} color="#f1c40f" />
              </View>
              <Text style={styles.liveText}>{t.computer}</Text>
            </View>
          </GameCard>
        </View>
        <View style={styles.row}>
          <GameCard 
            onPress={() => setFriendsMenuVisible(true)} 
            onPlaySound={handlePlaySound}
            style={[styles.liveCard, styles.halfCard]}
          >
            <View style={styles.liveContent}>
              <View style={styles.liveIconWrapper}>
                <Ionicons name="person-outline" size={getResponsiveSize(24)} color="#f1c40f" />
                <Animated.View style={{ transform: [{ scale: friendsAnim }] }}>
                  <Ionicons name="people-outline" size={getResponsiveSize(40)} color="#f1c40f" />
                </Animated.View>
                <Ionicons name="person-add-outline" size={getResponsiveSize(24)} color="#f1c40f" />
              </View>
              <Text style={styles.liveText}>{t.friends}</Text>
            </View>
          </GameCard>

          <GameCard 
          onPress={() => setLocalConfigVisible(true)} 
          onPlaySound={handlePlaySound}
          style={[styles.liveCard, styles.halfCard]}
        >
            <View style={styles.liveContent}>
              <View style={styles.liveIconWrapper}>
                <Ionicons name="phone-portrait-outline" size={getResponsiveSize(24)} color="#f1c40f" />
                <Animated.View style={{ transform: [{ scale: localAnim }] }}>
                  <Ionicons name="game-controller-outline" size={getResponsiveSize(40)} color="#f1c40f" />
                </Animated.View>
                <Ionicons name="phone-portrait-outline" size={getResponsiveSize(24)} color="#f1c40f" />
              </View>
              <Text style={styles.liveText}>{t.local}</Text>
            </View>
          </GameCard>
        </View>

        {/* Animation Duel de Pions */}
        <BattleAnimation />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    bottom: getResponsiveSize(45),
  },
  logo: {
    // Taille dynamique dans le composant
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: getResponsiveSize(20),
    gap: getResponsiveSize(20),
    width: '100%',
    bottom: '18%',
    paddingBottom: getResponsiveSize(100),
  },
  row: {
    flexDirection: 'row',
    gap: getResponsiveSize(20),
    justifyContent: 'space-between',
  },
  halfCard: {
    flex: 1,
  },
  liveCard: {
  borderWidth: getResponsiveSize(3),
  top: getResponsiveSize(130),
  borderColor: 'rgba(4, 28, 85, 0.95)',

  // shadow bottom
  shadowColor: 'rgba(255, 255, 255, 1)',
  shadowOffset: { width: 0, height: 0 }, // ↓ vers le bas
  shadowOpacity: 0.6,
  shadowRadius: getResponsiveSize(4),
},
  liveContent: {
    alignItems: 'center',
    width: '100%',
  },
  liveIconWrapper: {
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderTopLeftRadius: getResponsiveSize(24),
    borderTopRightRadius: getResponsiveSize(24),
    padding: getResponsiveSize(16),
    marginBottom: getResponsiveSize(10),
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
    flexDirection: 'row',
    gap: getResponsiveSize(5),
  },
  liveText: {
    color: 'rgba(4, 28, 85, 0.95)',
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    // textShadowColor: 'rgba(4, 28, 85, 1)',
    // textShadowOffset: { width: 2, height: 2 },
    // textShadowRadius: 1,
  },
});

export default HomeScreen;
