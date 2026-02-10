import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playButtonSound } from '../../utils/soundManager';

const CreateRoomModal = memo(({
  visible,
  onClose,
  inviteMode,
  setInviteMode,
  inviteSeriesLength,
  setInviteSeriesLength,
  inviteBet,
  setInviteBet,
  inviteTime,
  setInviteTime,
  handleCreateRoom,
  userCoins,
  betOptions
}) => {
  return (
    <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
    >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.friendsModalContent, { maxHeight: '80%' }]} onPress={() => {}}>
            <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
            <Text style={styles.friendsModalTitle}>Jouer avec un ami</Text>
            
            <Text style={styles.friendsLabel}>Mode de jeu:</Text>
            <View style={styles.optionsRow}>
                <TouchableOpacity 
                    style={[styles.friendsOptionButton, inviteMode === 'simple' && styles.friendsOptionButtonActive]}
                    onPress={() => { playButtonSound(); setInviteMode('simple'); }}
                >
                    <Text style={[styles.friendsOptionText, inviteMode === 'simple' && styles.friendsOptionTextActive]}>Simple</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.friendsOptionButton, inviteMode === 'tournament' && styles.friendsOptionButtonActive]}
                    onPress={() => { playButtonSound(); setInviteMode('tournament'); }}
                >
                    <Text style={[styles.friendsOptionText, inviteMode === 'tournament' && styles.friendsOptionTextActive]}>Tournoi</Text>
                </TouchableOpacity>
            </View>

            {inviteMode === 'tournament' && (
                <>
                    <Text style={styles.friendsLabel}>Nombre de parties:</Text>
                    <View style={styles.optionsRow}>
                        {[2, 4, 6, 8, 10].map(num => (
                            <TouchableOpacity 
                                key={num} 
                                style={[styles.friendsOptionButton, inviteSeriesLength === num && styles.friendsOptionButtonActive]}
                                onPress={() => { playButtonSound(); setInviteSeriesLength(num); }}
                            >
                                <Text style={[styles.friendsOptionText, inviteSeriesLength === num && styles.friendsOptionTextActive]}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            <Text style={styles.friendsLabel}>Mise (coins):</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
                {(() => {
                    const availableBets = betOptions.filter(b => b <= (userCoins || 0));
                    const effectiveBets = availableBets.length > 0 ? availableBets : [100];
                    const currentIndex = effectiveBets.indexOf(inviteBet);
                    
                    const canGoPrev = currentIndex > 0;
                    const canGoNext = currentIndex < effectiveBets.length - 1;

                    return (
                        <>
                            <TouchableOpacity 
                                onPress={() => {
                                    playButtonSound();
                                    if (canGoPrev) setInviteBet(effectiveBets[currentIndex - 1]);
                                }}
                                disabled={!canGoPrev}
                                style={{ padding: 10, opacity: !canGoPrev ? 0.3 : 1 }}
                            >
                                <Ionicons name="remove-circle-outline" size={40} color="#fff" />
                            </TouchableOpacity>
                            
                            <View style={styles.betDisplay}>
                                <Text 
                                    style={styles.prevBetText}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {currentIndex > 0 ? effectiveBets[currentIndex - 1].toLocaleString() : ''}
                                </Text>

                                <Text 
                                    style={styles.currentBetText}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.5}
                                >
                                    {inviteBet.toLocaleString()}
                                </Text>

                                <Text 
                                    style={styles.nextBetText}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {currentIndex < effectiveBets.length - 1 ? effectiveBets[currentIndex + 1].toLocaleString() : ''}
                                </Text>
                            </View>

                            <TouchableOpacity 
                                onPress={() => {
                                    playButtonSound();
                                    if (canGoNext) setInviteBet(effectiveBets[currentIndex + 1]);
                                }}
                                disabled={!canGoNext}
                                style={{ padding: 10, opacity: !canGoNext ? 0.3 : 1 }}
                            >
                                <Ionicons name="add-circle-outline" size={40} color="#fff" />
                            </TouchableOpacity>
                        </>
                    );
                })()}
            </View>

            <Text style={styles.friendsLabel}>Temps par tour:</Text>
            <View style={styles.optionsRow}>
                {[null, 30, 60, 90, 120].map(time => (
                    <TouchableOpacity 
                        key={time} 
                        style={[styles.friendsOptionButton, inviteTime === time && styles.friendsOptionButtonActive]}
                        onPress={() => { playButtonSound(); setInviteTime(time); }}
                    >
                        <Text style={[styles.friendsOptionText, inviteTime === time && styles.friendsOptionTextActive]}>
                            {time ? `${time}s` : '∞'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { playButtonSound(); onClose(); }}>
                <Text style={styles.modalButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); handleCreateRoom(); }}>
                <Text style={styles.modalButtonText}>Créer</Text>
            </TouchableOpacity>
            </View>
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
    shadowOffset: { width: 0, height: 0 },
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    gap: 15,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#2ecc71',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  innerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  betDisplay: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    width: 140,
    height: 50,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.3)'
  },
  prevBetText: {
    color: '#f1c40f', 
    fontSize: 14, 
    opacity: 0.5, 
    width: 70, 
    textAlign: 'center'
  },
  currentBetText: {
    color: '#f1c40f', 
    fontSize: 22, 
    fontWeight: 'bold', 
    width: 120,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  nextBetText: {
    color: '#f1c40f', 
    fontSize: 14, 
    opacity: 0.5, 
    width: 70, 
    textAlign: 'center' 
  }
});

export default CreateRoomModal;
