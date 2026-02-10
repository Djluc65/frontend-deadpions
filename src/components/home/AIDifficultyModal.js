import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playButtonSound } from '../../utils/soundManager';

const AIDifficultyModal = memo(({
  visible,
  onClose,
  aiMode,
  setAiMode,
  aiSeriesLength,
  setAiSeriesLength,
  aiBet,
  setAiBet,
  aiTimeControl,
  setAiTimeControl,
  onNext,
  userCoins,
  betOptions,
  timeOptions
}) => {
  return (
    <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
    >
        <Pressable style={styles.modalOverlay} onPress={() => { playButtonSound(); onClose(); }}>
            <Pressable style={[styles.friendsModalContent, { maxHeight: '90%', backgroundColor: '#041c55', borderColor: '#f1c40f', borderWidth: 1 }]} onPress={() => {}}>
                <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                    <Text style={[styles.friendsModalTitle, { color: '#f1c40f', textShadowColor: 'rgba(241, 196, 15, 0.5)', textShadowRadius: 10, marginBottom: 30 }]}>Options de jeu</Text>

                    {/* MODE DE JEU */}
                    <Text style={styles.friendsLabel}>Mode de jeu:</Text>
                    <View style={styles.optionsRow}>
                        <TouchableOpacity 
                            style={[styles.friendsOptionButton, aiMode === 'simple' && styles.friendsOptionButtonActive]}
                            onPress={() => { playButtonSound(); setAiMode('simple'); }}
                        >
                            <Text style={[styles.friendsOptionText, aiMode === 'simple' && styles.friendsOptionTextActive]}>Simple</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.friendsOptionButton, aiMode === 'tournament' && styles.friendsOptionButtonActive]}
                            onPress={() => { playButtonSound(); setAiMode('tournament'); }}
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
                                        onPress={() => { playButtonSound(); setAiSeriesLength(num); }}
                                    >
                                        <Text style={[styles.friendsOptionText, aiSeriesLength === num && styles.friendsOptionTextActive]}>{num}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* MISE */}
                    <View style={styles.betContainer}>
                        <Text style={styles.betLabel}>Mise (coins)</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            {(() => {
                                const availableBets = betOptions.filter(b => b <= (userCoins || 0));
                                const effectiveBets = availableBets.length > 0 ? availableBets : [100];
                                const currentIndex = effectiveBets.indexOf(aiBet);
                                const canGoPrev = currentIndex > 0;
                                const canGoNext = currentIndex < effectiveBets.length - 1;

                                return (
                                    <>
                                        <TouchableOpacity onPress={() => { playButtonSound(); canGoPrev && setAiBet(effectiveBets[currentIndex - 1]); }} disabled={!canGoPrev} style={{ padding: 10, opacity: !canGoPrev ? 0.3 : 1 }}>
                                            <Ionicons name="remove-circle" size={40} color="#f1c40f" />
                                        </TouchableOpacity>
                                        <View style={styles.betValueContainer}>
                                            <Text style={styles.betValueText}>{aiBet.toLocaleString()}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => { playButtonSound(); canGoNext && setAiBet(effectiveBets[currentIndex + 1]); }} disabled={!canGoNext} style={{ padding: 10, opacity: !canGoNext ? 0.3 : 1 }}>
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
                        {timeOptions.map(opt => (
                            <TouchableOpacity 
                                key={opt.label} 
                                style={[styles.friendsOptionButton, aiTimeControl === opt.value && styles.friendsOptionButtonActive]}
                                onPress={() => { playButtonSound(); setAiTimeControl(opt.value); }}
                            >
                                <Text style={[styles.friendsOptionText, aiTimeControl === opt.value && styles.friendsOptionTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity 
                        style={[styles.friendsCloseButton, { backgroundColor: '#f1c40f', width: '100%', borderRadius: 15, paddingVertical: 15, marginTop: 20 }]}
                        onPress={() => { playButtonSound(); onNext(); }}
                    >
                        <Text style={[styles.friendsCloseButtonText, { color: '#000', fontWeight: 'bold', fontSize: 18 }]}>Suivant</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={{ marginTop: 15, padding: 10 }}
                        onPress={() => { playButtonSound(); onClose(); }}
                    >
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Annuler</Text>
                    </TouchableOpacity>
                </ScrollView>
            </Pressable>
        </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsModalContent: {
    width: '80%',
    backgroundColor: '#041c55',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  friendsModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
  },
  friendsLabel: {
    fontSize: 16,
    color: '#f1c40f',
    alignSelf: 'flex-start',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    width: '100%',
  },
  friendsOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 5,
  },
  friendsOptionButtonActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  friendsOptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  friendsOptionTextActive: {
    color: '#041c55',
    fontWeight: 'bold',
  },
  friendsCloseButton: {
    backgroundColor: '#f1c40f',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 5,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  friendsCloseButtonText: {
    color: '#041c55',
    fontWeight: 'bold',
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  betContainer: {
    width: '100%',
    backgroundColor: '#041c55',
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  betLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center'
  },
  betValueContainer: {
    width: 140, 
    height: 50, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 25, 
    marginHorizontal: 10, 
    borderWidth: 1, 
    borderColor: '#f1c40f',
    alignItems: 'center',
    justifyContent: 'center'
  },
  betValueText: {
    color: '#f1c40f', 
    fontSize: 22, 
    fontWeight: 'bold'
  }
});

export default AIDifficultyModal;
