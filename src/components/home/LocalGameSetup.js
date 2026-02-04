import React, { useState, memo, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ONLINE_TIME_OPTIONS } from '../../utils/constants';

const LocalGameSetup = memo(({ visible, onClose, navigation }) => {
  const [step, setStep] = useState(1);
  const [localMode, setLocalMode] = useState('simple');
  const [localSeriesLength, setLocalSeriesLength] = useState(2);
  const [localTime, setLocalTime] = useState(120);
  const [localPremierJoueur, setLocalPremierJoueur] = useState('aleatoire');
  const [localCouleurJoueur1, setLocalCouleurJoueur1] = useState('noir');

  useEffect(() => {
    if (visible) {
      setStep(1);
    }
  }, [visible]);

  const handleStartGame = () => {
    onClose();

    // Determine Player 1 Color
    let p1Color = localCouleurJoueur1;
    if (localCouleurJoueur1 === 'aleatoire') {
        p1Color = Math.random() < 0.5 ? 'noir' : 'blanc';
    }
    const player1Color = p1Color === 'noir' ? 'black' : 'white';
    const player2Color = player1Color === 'black' ? 'white' : 'black';

    // Determine Starting Color (Turn)
    let startColor = 'black';
    if (localPremierJoueur === 'joueur1') {
        startColor = player1Color;
    } else if (localPremierJoueur === 'joueur2') {
        startColor = player2Color;
    } else if (localPremierJoueur === 'aleatoire') {
        startColor = Math.random() < 0.5 ? player1Color : player2Color;
    }

    navigation.navigate('Game', {
        mode: 'local',
        localConfig: {
            player1Color: player1Color,
            player2Color: player2Color,
            startingPlayer: startColor,
            timeControl: localTime,
            mode: localMode,
            tournamentSettings: localMode === 'tournament' ? {
                totalGames: localSeriesLength,
                gameNumber: 1,
                score: { black: 0, white: 0 }
            } : null
        }
    });
  };

  if (!visible) return null;

  return (
    <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
    >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
            <Pressable style={[styles.friendsModalContent, { maxHeight: '90%', backgroundColor: '#020f2e', borderColor: '#f1c40f', borderWidth: 1 }]} onPress={() => {}}>
                <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                    {step === 1 ? (
                        <>
                            <Text style={[styles.friendsModalTitle, { color: '#f1c40f', textShadowColor: 'rgba(241, 196, 15, 0.5)', textShadowRadius: 10, marginBottom: 30 }]}>Partie Locale</Text>

                            {/* MODE DE JEU */}
                            <Text style={styles.friendsLabel}>Mode de jeu:</Text>
                            <View style={styles.optionsRow}>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, localMode === 'simple' && styles.friendsOptionButtonActive]}
                                    onPress={() => setLocalMode('simple')}
                                >
                                    <Text style={[styles.friendsOptionText, localMode === 'simple' && styles.friendsOptionTextActive]}>Simple</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, localMode === 'tournament' && styles.friendsOptionButtonActive]}
                                    onPress={() => setLocalMode('tournament')}
                                >
                                    <Text style={[styles.friendsOptionText, localMode === 'tournament' && styles.friendsOptionTextActive]}>Tournoi</Text>
                                </TouchableOpacity>
                            </View>

                            {localMode === 'tournament' && (
                                <>
                                    <Text style={styles.friendsLabel}>Nombre de parties:</Text>
                                    <View style={styles.optionsRow}>
                                        {[2, 4, 6, 8, 10].map(num => (
                                            <TouchableOpacity 
                                                key={num} 
                                                style={[styles.friendsOptionButton, localSeriesLength === num && styles.friendsOptionButtonActive]}
                                                onPress={() => setLocalSeriesLength(num)}
                                            >
                                                <Text style={[styles.friendsOptionText, localSeriesLength === num && styles.friendsOptionTextActive]}>{num}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            {/* TEMPS PAR TOUR */}
                            <Text style={styles.friendsLabel}>Temps par tour:</Text>
                            <View style={styles.optionsRow}>
                                {ONLINE_TIME_OPTIONS.map(opt => (
                                    <TouchableOpacity 
                                        key={opt.label} 
                                        style={[styles.friendsOptionButton, localTime === opt.value && styles.friendsOptionButtonActive]}
                                        onPress={() => setLocalTime(opt.value)}
                                    >
                                        <Text style={[styles.friendsOptionText, localTime === opt.value && styles.friendsOptionTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity 
                                style={[styles.friendsCloseButton, { backgroundColor: '#f1c40f', width: '100%', borderRadius: 15, paddingVertical: 15, marginTop: 20 }]}
                                onPress={() => setStep(2)}
                            >
                                <Text style={[styles.friendsCloseButtonText, { color: '#000', fontWeight: 'bold', fontSize: 18 }]}>Suivant</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={{ marginTop: 15, padding: 10 }}
                                onPress={onClose}
                            >
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Annuler</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 30, justifyContent: 'center', position: 'relative' }}>
                                <TouchableOpacity 
                                    onPress={() => setStep(1)}
                                    style={{ position: 'absolute', left: 0, padding: 10, zIndex: 10 }}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                >
                                    <Ionicons name="arrow-back" size={28} color="#f1c40f" />
                                </TouchableOpacity>
                                <Text style={[styles.friendsModalTitle, { color: '#f1c40f', textShadowColor: 'rgba(241, 196, 15, 0.5)', textShadowRadius: 10, marginBottom: 0 }]}>Configuration Locale</Text>
                            </View>
                            
                            {/* QUI COMMENCE */}
                            <View style={{ width: '100%', backgroundColor: '#041c55', borderRadius: 20, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 15, textAlign: 'center' }}>Qui commence ?</Text>
                                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                    {['joueur1', 'joueur2', 'aleatoire'].map(opt => (
                                        <TouchableOpacity 
                                            key={opt} 
                                            style={{ 
                                                flex: 1, 
                                                paddingVertical: 12,
                                                backgroundColor: localPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: localPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                            }} 
                                            onPress={() => setLocalPremierJoueur(opt)}
                                        >
                                            <Text style={{ 
                                                fontSize: 14, 
                                                fontWeight: 'bold',
                                                color: localPremierJoueur === opt ? '#000' : 'rgba(255,255,255,0.6)' 
                                            }}>
                                                {opt === 'joueur1' ? 'Joueur 1' : opt === 'joueur2' ? 'Joueur 2' : 'Aléatoire'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* COULEUR JOUEUR 1 */}
                            <View style={{ width: '100%', backgroundColor: '#041c55', borderRadius: 20, padding: 15, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 15, textAlign: 'center' }}>Couleur Joueur 1</Text>
                                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                     {[
                                        { id: 'noir', icon: '🔴', label: 'Rouge' },
                                        { id: 'blanc', icon: '✖', label: 'Bleu' },
                                        { id: 'aleatoire', icon: '🎲', label: 'Aléa.' }
                                      ].map(opt => (
                                        <TouchableOpacity 
                                            key={opt.id} 
                                            style={{ 
                                                flex: 1, 
                                                paddingVertical: 12,
                                                backgroundColor: localCouleurJoueur1 === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: localCouleurJoueur1 === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                            }} 
                                            onPress={() => setLocalCouleurJoueur1(opt.id)}
                                        >
                                            <Text style={{ fontSize: 20, marginBottom: 5 }}>{opt.icon}</Text>
                                            <Text style={{ 
                                                fontSize: 14, 
                                                fontWeight: 'bold',
                                                color: localCouleurJoueur1 === opt.id ? '#000' : 'rgba(255,255,255,0.6)'
                                            }}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.friendsCloseButton, { backgroundColor: '#f1c40f', width: '100%', borderRadius: 15, paddingVertical: 15 }]}
                                onPress={handleStartGame}
                            >
                                <Text style={[styles.friendsCloseButtonText, { color: '#000', fontWeight: 'bold', fontSize: 18 }]}>JOUER</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={{ marginTop: 15, padding: 10 }}
                                onPress={() => setStep(1)}
                            >
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Retour</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </Pressable>
        </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsModalContent: {
    width: '90%',
    backgroundColor: '#041c55',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendsModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  friendsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginTop: 10,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    width: '100%',
  },
  friendsOptionButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendsOptionButtonActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f',
  },
  friendsOptionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    fontSize: 14,
  },
  friendsOptionTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  friendsCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    marginTop: 10,
  },
  friendsCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocalGameSetup;
