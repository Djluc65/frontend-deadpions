import React, { useState, memo, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import { playButtonSound } from '../../utils/soundManager';
import { ONLINE_TIME_OPTIONS } from '../../utils/constants';

const LocalGameSetup = memo(({ visible, onClose, navigation }) => {
  const [step, setStep] = useState(1);
  const [localMode, setLocalMode] = useState('simple');
  const [localSeriesLength, setLocalSeriesLength] = useState(2);
  const [localTime, setLocalTime] = useState(30);
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
            <Pressable style={styles.friendsModalContent} onPress={() => {}}>
                <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                    {step === 1 ? (
                        <>
                            <Text style={styles.friendsModalTitle}>Partie Locale</Text>

                            {/* MODE DE JEU */}
                            <Text style={styles.friendsLabel}>Mode de jeu:</Text>
                            <View style={styles.optionsRow}>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, localMode === 'simple' && styles.friendsOptionButtonActive]}
                                    onPress={() => { playButtonSound(); setLocalMode('simple'); }}
                                >
                                    <Text style={[styles.friendsOptionText, localMode === 'simple' && styles.friendsOptionTextActive]}>Simple</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, localMode === 'tournament' && styles.friendsOptionButtonActive]}
                                    onPress={() => { playButtonSound(); setLocalMode('tournament'); }}
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
                                                onPress={() => { playButtonSound(); setLocalSeriesLength(num); }}
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
                                        onPress={() => { playButtonSound(); setLocalTime(opt.value); }}
                                    >
                                        <Text style={[styles.friendsOptionText, localTime === opt.value && styles.friendsOptionTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { playButtonSound(); onClose(); }}>
                                    <Text style={styles.modalButtonText}>Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); setStep(2); }}>
                                    <Text style={styles.modalButtonText}>Suivant</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: getResponsiveSize(30), justifyContent: 'center', position: 'relative' }}>
                                <TouchableOpacity 
                                    onPress={() => { playButtonSound(); setStep(1); }}
                                    style={{ position: 'absolute', left: 0, padding: getResponsiveSize(10), zIndex: 10 }}
                                    hitSlop={{ top: getResponsiveSize(15), bottom: getResponsiveSize(15), left: getResponsiveSize(15), right: getResponsiveSize(15) }}
                                >
                                    <Ionicons name="arrow-back" size={getResponsiveSize(28)} color="#f1c40f" />
                                </TouchableOpacity>
                                <Text style={[styles.friendsModalTitle, { marginBottom: 0 }]}>Configuration Locale</Text>
                            </View>
                            
                            {/* QUI COMMENCE */}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Qui commence ?</Text>
                                <View style={{ flexDirection: 'row', gap: getResponsiveSize(10), width: '100%' }}>
                                    {['joueur1', 'joueur2', 'aleatoire'].map(opt => (
                                        <TouchableOpacity 
                                            key={opt} 
                                            style={{ 
                                                flex: 1, 
                                                paddingVertical: getResponsiveSize(12),
                                                backgroundColor: localPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                                borderRadius: getResponsiveSize(12),
                                                alignItems: 'center',
                                                borderWidth: getResponsiveSize(1),
                                                borderColor: localPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                            }} 
                                            onPress={() => { playButtonSound(); setLocalPremierJoueur(opt); }}
                                        >
                                            <Text style={{ 
                                                fontSize: getResponsiveSize(14), 
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
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Couleur Joueur 1</Text>
                                <View style={{ flexDirection: 'row', gap: getResponsiveSize(10), width: '100%' }}>
                                     {[
                                        { id: 'noir', icon: '🔴', label: 'Rouge' },
                                        { id: 'blanc', icon: '✖', label: 'Bleu' },
                                        { id: 'aleatoire', icon: '🎲', label: 'Aléa.' }
                                      ].map(opt => (
                                        <TouchableOpacity 
                                            key={opt.id} 
                                            style={{ 
                                                flex: 1, 
                                                paddingVertical: getResponsiveSize(12),
                                                backgroundColor: localCouleurJoueur1 === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                                borderRadius: getResponsiveSize(12),
                                                alignItems: 'center',
                                                borderWidth: getResponsiveSize(1),
                                                borderColor: localCouleurJoueur1 === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                            }} 
                                            onPress={() => { playButtonSound(); setLocalCouleurJoueur1(opt.id); }}
                                        >
                                            <Text style={{ fontSize: getResponsiveSize(20), marginBottom: getResponsiveSize(5) }}>{opt.icon}</Text>
                                            <Text style={{ 
                                                fontSize: getResponsiveSize(14), 
                                                fontWeight: 'bold',
                                                color: localCouleurJoueur1 === opt.id ? '#000' : 'rgba(255,255,255,0.6)'
                                            }}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { playButtonSound(); setStep(1); }}>
                                    <Text style={styles.modalButtonText}>Retour</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); handleStartGame(); }}>
                                    <Text style={styles.modalButtonText}>JOUER</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>
                <View style={styles.innerShadow} pointerEvents="none" />
            </Pressable>
        </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsModalContent: {
    width: '90%',
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(25),
    padding: getResponsiveSize(25),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f1c40f',
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: getResponsiveSize(10),
    },
    shadowOpacity: 0.51,
    shadowRadius: getResponsiveSize(13.16),
    elevation: 20,
    position: 'relative',
    overflow: 'hidden',
    maxHeight: '90%',
  },
  innerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: getResponsiveSize(2),
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: getResponsiveSize(23),
  },
  friendsModalTitle: {
    fontSize: getResponsiveSize(28),
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: getResponsiveSize(25),
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: getResponsiveSize(-1), height: getResponsiveSize(1) },
    textShadowRadius: getResponsiveSize(10)
  },
  friendsLabel: {
    fontSize: getResponsiveSize(18),
    color: '#fff',
    marginBottom: getResponsiveSize(10),
    marginTop: getResponsiveSize(10),
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: getResponsiveSize(10),
    gap: getResponsiveSize(10),
  },
  friendsOptionButton: {
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
    margin: getResponsiveSize(5),
    backgroundColor: 'transparent',
    minWidth: '10%',
    alignItems: 'center',
  },
  friendsOptionButtonActive: {
    backgroundColor: '#f1c40f',
  },
  friendsOptionText: {
    color: '#f1c40f',
    fontSize: getResponsiveSize(14),
    fontWeight: 'bold',
  },
  friendsOptionTextActive: {
    color: '#0f2350',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: getResponsiveSize(20),
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#e74c3c',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(15),
    marginRight: getResponsiveSize(10),
    alignItems: 'center',
    borderWidth: getResponsiveSize(1),
    borderColor: '#c0392b',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#2ecc71',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(15),
    marginLeft: getResponsiveSize(10),
    alignItems: 'center',
    borderWidth: getResponsiveSize(1),
    borderColor: '#27ae60',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(16),
    textTransform: 'uppercase',
  },
  sectionContainer: {
    width: '100%',
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(15),
    marginBottom: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(255,255,255,0.1)'
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: getResponsiveSize(16),
    marginBottom: getResponsiveSize(15),
    textAlign: 'center'
  },
});

export default LocalGameSetup;
