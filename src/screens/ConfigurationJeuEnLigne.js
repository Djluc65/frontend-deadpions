import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ScrollView, ActivityIndicator } from 'react-native';
import { T } from '../utils/theme';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { socket } from '../utils/socket';
import { translations } from '../utils/translations';
import { playButtonSound } from '../utils/soundManager';
import { getResponsiveSize } from '../utils/responsive';
import { appAlert } from '../services/appAlert';

import { updateUser } from '../redux/slices/authSlice';

const ConfigurationJeuEnLigne = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const settings = useSelector(state => state.settings);
  const t = translations[settings.language] || translations.fr;

  const [soldeCoins, setSoldeCoins] = useState(user?.coins || 0);
  const [montantPari, setMontantPari] = useState(500);
  const [timeControl, setTimeControl] = useState(30);
  const [step, setStep] = useState(1); // 1: Bet, 2: Time
  const [enAttenteMatch, setEnAttenteMatch] = useState(false);
  const [tempsRestant, setTempsRestant] = useState(120);

  // Sync local coins with Redux user coins
  useEffect(() => {
    if (user) {
      setSoldeCoins(user.coins);
    }
  }, [user]);

  const montantsDisponibles = [
    100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 
    100000, 250000, 500000, 1000000, 2500000, 5000000, 
    10000000, 25000000, 50000000, 100000000, 250000000, 
    500000000, 1000000000, 2500000000, 5000000000
  ];

  const timeOptions = [
    { label: 'Sans chrono', value: null },
    { label: '30 s', value: 30 },
    { label: '1 min', value: 60 },
    { label: '1 min 30s', value: 90 },
    { label: '2 min', value: 120 }
  ];

  useEffect(() => {
    // Socket setup
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('balance_updated', (newBalance) => {
      setSoldeCoins(newBalance);
      dispatch(updateUser({ coins: newBalance }));
    });

    socket.on('game_start', (data) => {
      if (enAttenteMatch) {
        setEnAttenteMatch(false);
        navigation.navigate('Game', { 
          mode: 'online',
          gameId: data.gameId,
          players: data.players,
          currentTurn: data.currentTurn,
          betAmount: data.betAmount,
          timeControl: data.timeControl, // Receive time control
          opponent: data.players.black.id.toString() === (user._id || user.id).toString() ? data.players.white : data.players.black
      });
    }
  });

    socket.on('error', (msg) => {
      appAlert('Erreur', msg);
      setEnAttenteMatch(false);
    });

    socket.on('search_cancelled', () => {
        setEnAttenteMatch(false);
    });

    return () => {
      socket.off('balance_updated');
      socket.off('game_start');
      socket.off('error');
      socket.off('search_cancelled');
    };
  }, [navigation, user, enAttenteMatch]);

  useEffect(() => {
    let interval = null;
    if (enAttenteMatch && tempsRestant > 0) {
      interval = setInterval(() => {
        setTempsRestant((prev) => prev - 1);
      }, 1000);
    } else if (tempsRestant === 0 && enAttenteMatch) {
      // Timeout
      annulerRecherche();
      appAlert('Timeout', 'Aucun adversaire trouvé. Vos coins ont été remboursés.');
    }
    return () => clearInterval(interval);
  }, [enAttenteMatch, tempsRestant]);

  const demarrerRecherche = () => {
    if (soldeCoins < montantPari) {
      appAlert('Solde insuffisant', `Il vous faut ${montantPari} coins.`);
      return;
    }

    setEnAttenteMatch(true);
    setTempsRestant(120);
    
    socket.emit('find_game', {
      id: user._id,
      pseudo: user.pseudo,
      betAmount: montantPari,
      timeControl: timeControl
    });
  };

  const annulerRecherche = () => {
    socket.emit('cancel_search', {
      id: user._id,
      betAmount: montantPari
    });
    setEnAttenteMatch(false);
  };

  return (
    <ImageBackground
      source={require('../../assets/images/Background2-4.png')}
      style={styles.container}
    >
      <View style={styles.bgOverlay} pointerEvents="none" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { playButtonSound(); navigation.goBack(); }} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(30)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Jeu en Ligne</Text>
        <View style={styles.coinContainer}>
          <Text style={styles.coinText}>💰 {soldeCoins.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {!enAttenteMatch ? (
          <View style={styles.containerTimes}>
              <Text style={styles.subtitle}>Choisissez votre mise :</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: getResponsiveSize(20) }}>
                    {(() => {
                        const availableBets = montantsDisponibles.filter(b => b <= (user?.coins || 0));
                        const effectiveBets = availableBets.length > 0 ? availableBets : [100];
                        const currentIndex = effectiveBets.indexOf(montantPari);
                        
                        const canGoPrev = currentIndex > 0;
                        const canGoNext = currentIndex < effectiveBets.length - 1;

                        return (
                            <>
                                <TouchableOpacity 
                                    onPress={() => {
                                        playButtonSound();
                                        if (canGoPrev) setMontantPari(effectiveBets[currentIndex - 1]);
                                    }}
                                    disabled={!canGoPrev}
                                    style={{ padding: getResponsiveSize(10), opacity: !canGoPrev ? 0.3 : 1 }}
                                >
                                    <Ionicons name="remove-circle-outline" size={getResponsiveSize(40)} color="#fff" />
                                </TouchableOpacity>
                                
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: getResponsiveSize(140),
                                    height: getResponsiveSize(50),
                                    overflow: 'hidden',
                                    backgroundColor: T.bg3,
                                    borderRadius: getResponsiveSize(T.radiusPill),
                                    marginHorizontal: getResponsiveSize(10),
                                    borderWidth: 1,
                                    borderColor: T.border,
                                }}>
                                    <Text
                                        style={{
                                            color: T.gold,
                                            fontSize: getResponsiveSize(14),
                                            opacity: 0.45,
                                            width: getResponsiveSize(70),
                                            textAlign: 'center'
                                        }}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {currentIndex > 0 ? effectiveBets[currentIndex - 1].toLocaleString() : ''}
                                    </Text>

                                    <Text
                                        style={{
                                            color: T.gold,
                                            fontSize: getResponsiveSize(22),
                                            fontWeight: '900',
                                            width: getResponsiveSize(120),
                                            textAlign: 'center',
                                        }}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.5}
                                    >
                                        {montantPari.toLocaleString()}
                                    </Text>

                                    <Text
                                        style={{
                                            color: T.gold,
                                            fontSize: getResponsiveSize(14),
                                            opacity: 0.45,
                                            width: getResponsiveSize(70),
                                            textAlign: 'center'
                                        }}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {currentIndex < effectiveBets.length - 1 ? effectiveBets[currentIndex + 1].toLocaleString() : ''}
                                    </Text>
                                </View>

                                <TouchableOpacity 
                                    onPress={() => {
                                        playButtonSound();
                                        if (canGoNext) setMontantPari(effectiveBets[currentIndex + 1]);
                                    }}
                                    disabled={!canGoNext}
                                    style={{ padding: getResponsiveSize(10), opacity: !canGoNext ? 0.3 : 1 }}
                                >
                                    <Ionicons name="add-circle-outline" size={getResponsiveSize(40)} color="#fff" />
                                </TouchableOpacity>
                            </>
                        );
                    })()}
                </View>

                <Text style={[styles.subtitle, { marginTop: getResponsiveSize(10) }]}>Temps par coup :</Text>
                <View style={styles.grid}>
                  {timeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.betButton,
                        timeControl === option.value && styles.selectedBet
                      ]}
                      onPress={() => { playButtonSound(); setTimeControl(option.value); }}
                    >
                      <Text style={[
                        styles.betText, 
                        timeControl === option.value && styles.selectedBetText
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity style={styles.playButton} onPress={() => { playButtonSound(); demarrerRecherche(); }}>
                    <Text style={styles.playButtonText}>JOUER</Text>
                </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#f1c40f" />
            <Text style={styles.waitingText}>Recherche d'adversaire...</Text>
            <Text style={styles.timerText}>{tempsRestant}s</Text>
            <Text style={styles.infoText}>Mise : {montantPari.toLocaleString()} 💰</Text>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => { playButtonSound(); annulerRecherche(); }}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    backgroundColor: T.bg1,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  backButton: {
    padding: getResponsiveSize(8),
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  title: {
    fontSize: getResponsiveSize(20),
    fontWeight: '800',
    color: T.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  coinContainer: {
    backgroundColor: T.bg2,
    paddingVertical: getResponsiveSize(6),
    paddingHorizontal: getResponsiveSize(12),
    borderRadius: getResponsiveSize(T.radiusPill),
    borderWidth: 1,
    borderColor: T.border,
  },
  coinText: {
    color: T.gold,
    fontWeight: '800',
    fontSize: getResponsiveSize(14),
  },
  content: {
    flex: 1,
    padding: getResponsiveSize(20),
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: getResponsiveSize(14),
    color: T.gold,
    alignSelf: 'flex-start',
    marginBottom: getResponsiveSize(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: getResponsiveSize(10),
    paddingBottom: getResponsiveSize(18),
  },
  betButton: {
    paddingVertical: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusPill),
    borderWidth: 1,
    borderColor: T.borderSoft,
    backgroundColor: T.bg3,
    marginBottom: getResponsiveSize(8),
  },
  selectedBet: {
    backgroundColor: T.gold,
    borderColor: T.gold,
  },
  disabledBet: {
    opacity: 0.4,
  },
  betText: {
    color: T.textDim,
    fontSize: getResponsiveSize(13),
    fontWeight: '600',
  },
  selectedBetText: {
    color: '#1B1305',
    fontWeight: '800',
  },
  disabledBetText: {
    color: T.textMuted,
  },
  playButton: {
    backgroundColor: T.green,
    padding: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    marginTop: getResponsiveSize(18),
    marginBottom: getResponsiveSize(36),
    minWidth: getResponsiveSize(120),
    ...T.shadowBtn,
  },
  playButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(15),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: T.bg3,
    marginRight: getResponsiveSize(10),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: getResponsiveSize(18),
    marginBottom: getResponsiveSize(36),
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg2,
    padding: getResponsiveSize(28),
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  waitingText: {
    color: T.text,
    fontSize: getResponsiveSize(18),
    marginTop: getResponsiveSize(18),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  containerTimes: {
    width: '100%',
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    ...T.shadowCard,
  },
  timerText: {
    color: T.gold,
    fontSize: getResponsiveSize(40),
    fontWeight: '900',
    marginVertical: getResponsiveSize(18),
  },
  infoText: {
    color: T.textDim,
    fontSize: getResponsiveSize(15),
    marginBottom: getResponsiveSize(26),
  },
  cancelButton: {
    backgroundColor: T.red,
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(28),
    borderRadius: getResponsiveSize(T.radiusPill),
    ...T.shadowBtn,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: getResponsiveSize(15),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default ConfigurationJeuEnLigne;
