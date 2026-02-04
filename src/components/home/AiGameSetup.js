import React, { useState, memo, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BET_OPTIONS, ONLINE_TIME_OPTIONS } from '../../utils/constants';

const AiGameSetup = memo(({ visible, onClose, navigation, user }) => {
  const [step, setStep] = useState(1); // 1: Config (Mode, Bet, Time), 2: Options (Diff, Start, Color)
  
  // State from HomeScreen
  const [aiMode, setAiMode] = useState('simple');
  const [aiSeriesLength, setAiSeriesLength] = useState(2);
  const [aiBet, setAiBet] = useState(100);
  const [aiTimeControl, setAiTimeControl] = useState(120);
  
  const [aiDifficulte, setAiDifficulte] = useState('moyen');
  const [aiPremierJoueur, setAiPremierJoueur] = useState('joueur');
  const [aiCouleurJoueur, setAiCouleurJoueur] = useState('noir');
  const [aiVitesse, setAiVitesse] = useState('normal');
  const [aiIndices, setAiIndices] = useState(false);
  const [aiAnimations, setAiAnimations] = useState(true);

  // Reset step when modal opens
  useEffect(() => {
    if (visible) {
      setStep(1);
    }
  }, [visible]);

  // Ensure bet is valid
  useEffect(() => {
    if (visible && user?.coins !== undefined) {
        const maxCoins = user.coins;
        if (aiBet > maxCoins) {
            const validBets = BET_OPTIONS.filter(b => b <= maxCoins);
            if (validBets.length > 0) {
                setAiBet(validBets[validBets.length - 1]);
            } else {
                setAiBet(100);
            }
        }
    }
  }, [visible, user?.coins, aiBet]);

  const handleStartGame = () => {
    if (aiBet > (user?.coins || 0)) {
        Alert.alert('Solde insuffisant', `Vous n'avez pas assez de coins pour parier ${aiBet.toLocaleString()} coins.`);
        return;
    }

    onClose();

    // Determine starting player
    let joueurDebut = aiPremierJoueur;
    if (aiPremierJoueur === 'aleatoire') {
      joueurDebut = Math.random() < 0.5 ? 'joueur' : 'ia';
    }
    
    // Determine colors
    const getCouleurAnglais = (c) => c === 'noir' ? 'black' : 'white';
    
    let couleurJ = aiCouleurJoueur;
    if (aiCouleurJoueur === 'aleatoire') {
        couleurJ = Math.random() < 0.5 ? 'noir' : 'blanc';
    }

    const couleurs = {
        joueur: getCouleurAnglais(couleurJ),
        ia: getCouleurAnglais(couleurJ === 'noir' ? 'blanc' : 'noir')
    };

    navigation.navigate('Game', {
      modeJeu: 'ia',
      betAmount: aiBet,
      configIA: {
        difficulte: aiDifficulte,
        premierJoueur: joueurDebut,
        couleurs: couleurs,
        vitesseIA: aiVitesse,
        indicesActifs: aiIndices,
        chronometreActif: aiTimeControl !== null,
        timeControl: aiTimeControl,
        animationsActives: aiAnimations,
        mode: aiMode,
        tournamentSettings: aiMode === 'tournament' ? {
            totalGames: aiSeriesLength,
            gameNumber: 1,
            score: { black: 0, white: 0 }
        } : null
      }
    });
  };

  const niveaux = [
    { id: 'facile', titre: 'Facile', emoji: '🟢', description: 'Parfait pour débuter' },
    { id: 'moyen', titre: 'Moyen', emoji: '🟡', description: 'Challenge équilibré' },
    { id: 'difficile', titre: 'Difficile', emoji: '🔴', description: 'Pour les experts' }
  ];

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
                            <Text style={[styles.friendsModalTitle, { color: '#f1c40f', textShadowColor: 'rgba(241, 196, 15, 0.5)', textShadowRadius: 10, marginBottom: 30 }]}>Options de jeu</Text>

                            {/* MODE DE JEU */}
                            <Text style={styles.friendsLabel}>Mode de jeu:</Text>
                            <View style={styles.optionsRow}>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, aiMode === 'simple' && styles.friendsOptionButtonActive]}
                                    onPress={() => setAiMode('simple')}
                                >
                                    <Text style={[styles.friendsOptionText, aiMode === 'simple' && styles.friendsOptionTextActive]}>Simple</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, aiMode === 'tournament' && styles.friendsOptionButtonActive]}
                                    onPress={() => setAiMode('tournament')}
                                >
                                    <Text style={[styles.friendsOptionText, aiMode === 'tournament' && styles.friendsOptionTextActive]}>Tournoi</Text>
                                </TouchableOpacity>
                            </View>

                            {aiMode === 'tournament' && (
                                <>
                                    <Text style={styles.friendsLabel}>Nombre de parties:</Text>
                                    <View style={styles.optionsRow}>
                                        {[2, 4, 6, 8, 10].map(num => (
                                            <TouchableOpacity 
                                                key={num} 
                                                style={[styles.friendsOptionButton, aiSeriesLength === num && styles.friendsOptionButtonActive]}
                                                onPress={() => setAiSeriesLength(num)}
                                            >
                                                <Text style={[styles.friendsOptionText, aiSeriesLength === num && styles.friendsOptionTextActive]}>{num}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            {/* MISE */}
                            <View style={{ width: '100%', backgroundColor: '#041c55', borderRadius: 20, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center' }}>Mise (coins)</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                    {(() => {
                                        const availableBets = BET_OPTIONS.filter(b => b <= (user?.coins || 0));
                                        const effectiveBets = availableBets.length > 0 ? availableBets : [100];
                                        const currentIndex = effectiveBets.indexOf(aiBet);
                                        const canGoPrev = currentIndex > 0;
                                        const canGoNext = currentIndex < effectiveBets.length - 1;

                                        return (
                                            <>
                                                <TouchableOpacity onPress={() => canGoPrev && setAiBet(effectiveBets[currentIndex - 1])} disabled={!canGoPrev} style={{ padding: 10, opacity: !canGoPrev ? 0.3 : 1 }}>
                                                    <Ionicons name="remove-circle" size={40} color="#f1c40f" />
                                                </TouchableOpacity>
                                                <View style={{ 
                                                    width: 140, height: 50, 
                                                    backgroundColor: 'rgba(0,0,0,0.3)', 
                                                    borderRadius: 25, 
                                                    marginHorizontal: 10, 
                                                    borderWidth: 1, 
                                                    borderColor: '#f1c40f',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Text style={{ color: '#f1c40f', fontSize: 22, fontWeight: 'bold' }}>{aiBet.toLocaleString()}</Text>
                                                </View>
                                                <TouchableOpacity onPress={() => canGoNext && setAiBet(effectiveBets[currentIndex + 1])} disabled={!canGoNext} style={{ padding: 10, opacity: !canGoNext ? 0.3 : 1 }}>
                                                    <Ionicons name="add-circle" size={40} color="#f1c40f" />
                                                </TouchableOpacity>
                                            </>
                                        );
                                    })()}
                                </View>
                            </View>

                            {/* TEMPS PAR TOUR */}
                            <Text style={styles.friendsLabel}>Temps par tour:</Text>
                            <View style={styles.optionsRow}>
                                {ONLINE_TIME_OPTIONS.map(opt => (
                                    <TouchableOpacity 
                                        key={opt.label} 
                                        style={[styles.friendsOptionButton, aiTimeControl === opt.value && styles.friendsOptionButtonActive]}
                                        onPress={() => setAiTimeControl(opt.value)}
                                    >
                                        <Text style={[styles.friendsOptionText, aiTimeControl === opt.value && styles.friendsOptionTextActive]}>
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
                                <Text style={[styles.friendsModalTitle, { color: '#f1c40f', textShadowColor: 'rgba(241, 196, 15, 0.5)', textShadowRadius: 10, marginBottom: 0 }]}>Configuration IA</Text>
                            </View>
                            
                            {/* DIFFICULTÉ */}
                            <Text style={styles.friendsLabel}>Difficulté:</Text>
                            <View style={{ width: '100%', gap: 10, marginBottom: 20 }}>
                                {niveaux.map((niveau) => (
                                    <TouchableOpacity
                                        key={niveau.id}
                                        style={[
                                            {
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                padding: 15,
                                                backgroundColor: '#041c55',
                                                borderRadius: 20,
                                                borderWidth: 2,
                                                borderColor: aiDifficulte === niveau.id ? '#f1c40f' : 'rgba(255,255,255,0.1)',
                                            }
                                        ]}
                                        onPress={() => setAiDifficulte(niveau.id)}
                                    >
                                        <Text style={{ fontSize: 24, marginRight: 15 }}>{niveau.emoji}</Text>
                                        <View>
                                            <Text style={{ 
                                                fontSize: 18, 
                                                fontWeight: 'bold', 
                                                color: aiDifficulte === niveau.id ? '#f1c40f' : 'white',
                                            }}>
                                                {niveau.titre}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                                                {niveau.description}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* QUI COMMENCE */}
                            <View style={{ width: '100%', backgroundColor: '#041c55', borderRadius: 20, padding: 10, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 15, textAlign: 'center' }}>Qui commence ?</Text>
                                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                    {['joueur', 'ia', 'aleatoire'].map(opt => (
                                        <TouchableOpacity 
                                            key={opt} 
                                            style={{ 
                                                flex: 1, 
                                                paddingVertical: 12,
                                                backgroundColor: aiPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: aiPremierJoueur === opt ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                            }} 
                                            onPress={() => setAiPremierJoueur(opt)}
                                        >
                                            <Text style={{ 
                                                fontSize: 14, 
                                                fontWeight: 'bold',
                                                color: aiPremierJoueur === opt ? '#000' : 'rgba(255,255,255,0.6)' 
                                            }}>
                                                {opt === 'joueur' ? 'Vous' : opt === 'ia' ? 'IA' : 'Aléatoire'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* COULEUR */}
                            <View style={{ width: '100%', backgroundColor: '#041c55', borderRadius: 20, padding: 8, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 15, textAlign: 'center' }}>Votre couleur</Text>
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
                                                paddingVertical: 8,
                                                backgroundColor: aiCouleurJoueur === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.05)',
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: aiCouleurJoueur === opt.id ? '#f1c40f' : 'rgba(255,255,255,0.1)'
                                            }} 
                                            onPress={() => setAiCouleurJoueur(opt.id)}
                                        >
                                            <Text style={{ fontSize: 20, marginBottom: 5 }}>{opt.icon}</Text>
                                            <Text style={{ 
                                                fontSize: 14, 
                                                fontWeight: 'bold',
                                                color: aiCouleurJoueur === opt.id ? '#000' : 'rgba(255,255,255,0.6)'
                                            }}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.friendsCloseButton, { backgroundColor: '#f1c40f', width: '100%', borderRadius: 15, paddingVertical: 10 }]}
                                onPress={handleStartGame}
                            >
                                <Text style={[styles.friendsCloseButtonText, { color: '#000', fontWeight: 'bold', fontSize: 18 }]}>Jouer</Text>
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

export default AiGameSetup;
