import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ImageBackground, ScrollView, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { socket } from '../utils/socket';
import { translations } from '../utils/translations';
import { playButtonSound } from '../utils/soundManager';
import { getResponsiveSize } from '../utils/responsive';

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
      Alert.alert('Erreur', msg);
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
      Alert.alert('Timeout', 'Aucun adversaire trouvé. Vos coins ont été remboursés.');
    }
    return () => clearInterval(interval);
  }, [enAttenteMatch, tempsRestant]);

  const demarrerRecherche = () => {
    if (soldeCoins < montantPari) {
      Alert.alert('Solde insuffisant', `Il vous faut ${montantPari} coins.`);
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
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    borderRadius: getResponsiveSize(25),
                                    marginHorizontal: getResponsiveSize(10),
                                    borderWidth: getResponsiveSize(1),
                                    borderColor: 'rgba(241, 196, 15, 0.3)'
                                }}>
                                    <Text 
                                        style={{ 
                                            color: '#f1c40f', 
                                            fontSize: getResponsiveSize(14), 
                                            opacity: 0.5, 
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
                                            color: '#f1c40f', 
                                            fontSize: getResponsiveSize(22), 
                                            fontWeight: 'bold', 
                                            width: getResponsiveSize(120),
                                            textAlign: 'center',
                                            textShadowColor: 'rgba(0, 0, 0, 0.75)',
                                            textShadowOffset: {width: getResponsiveSize(-1), height: getResponsiveSize(1)},
                                            textShadowRadius: getResponsiveSize(10)
                                        }}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.5}
                                    >
                                        {montantPari.toLocaleString()}
                                    </Text>

                                    <Text 
                                        style={{ 
                                            color: '#f1c40f', 
                                            fontSize: getResponsiveSize(14), 
                                            opacity: 0.5, 
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    backgroundColor: 'rgba(4, 28, 85, 0.9)',
  },
  backButton: {
    padding: getResponsiveSize(5),
  },
  title: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    color: '#fff',
  },
  coinContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: getResponsiveSize(8),
    borderRadius: getResponsiveSize(15),
  },
  coinText: {
    color: '#f1c40f',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(16),
  },
  content: {
    flex: 1,
    padding: getResponsiveSize(20),
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: getResponsiveSize(16),
    color: '#f1c40f',
    alignSelf: 'flex-start',
    marginBottom: getResponsiveSize(10),
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: getResponsiveSize(10),
    paddingBottom: getResponsiveSize(20),
  },
  betButton: {
    paddingVertical: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(12),
    borderRadius: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: getResponsiveSize(10),
  },
  selectedBet: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f',
  },
  disabledBet: {
    opacity: 0.5,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  betText: {
    color: '#fff',
    fontSize: getResponsiveSize(14),
  },
  selectedBetText: {
    color: '#041c55',
    fontWeight: 'bold',
  },
  disabledBetText: {
    color: '#aaa',
  },
  playButton: {
    backgroundColor: '#2ecc71',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(10),
    alignItems: 'center',
    marginTop: getResponsiveSize(20),
    marginBottom: getResponsiveSize(40),
    minWidth: getResponsiveSize(120),
  },
  playButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#ccc',
    marginRight: getResponsiveSize(10),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: getResponsiveSize(20),
    marginBottom: getResponsiveSize(40),
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: getResponsiveSize(30),
    borderRadius: getResponsiveSize(20),
  },
  waitingText: {
    color: '#fff',
    fontSize: getResponsiveSize(22),
    marginTop: getResponsiveSize(20),
    fontWeight: 'bold',
  },
  // selectionContainer: {
  //   backgroundColor: 'rgba(4, 28, 85, 0.7)', // Blue transparent background
  //   borderRadius: 20,
  //   padding: 20,
  //   width: '100%',
  //   alignItems: 'center',
  // },

  containerTimes: {
    width: '100%',
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: getResponsiveSize(2),
    },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(3),
    elevation: 5,
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
  },
  timerText: {
    color: '#f1c40f',
    fontSize: getResponsiveSize(40),
    fontWeight: 'bold',
    marginVertical: getResponsiveSize(20),
  },
  infoText: {
    color: '#ccc',
    fontSize: getResponsiveSize(16),
    marginBottom: getResponsiveSize(30),
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(30),
    borderRadius: getResponsiveSize(25),
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(16),
  },
});

export default ConfigurationJeuEnLigne;
