import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';

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
  startingSide,
  setStartingSide,
  hostColor,
  setHostColor,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: getResponsiveSize(10) }}>
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
                                style={{ padding: getResponsiveSize(5), opacity: !canGoPrev ? 0.3 : 1 }}
                            >
                                <Ionicons name="remove-circle-outline" size={getResponsiveSize(30)} color="#fff" />
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
                                style={{ padding: getResponsiveSize(5), opacity: !canGoNext ? 0.3 : 1 }}
                            >
                                <Ionicons name="add-circle-outline" size={getResponsiveSize(30)} color="#fff" />
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

            <Text style={styles.friendsLabel}>Qui commence ?</Text>
            <View style={styles.optionsRow}>
                {[
                    { label: 'Moi', value: 'host' },
                    { label: 'Adversaire', value: 'guest' },
                    { label: 'Aléatoire', value: 'random' }
                ].map(opt => (
                    <TouchableOpacity 
                        key={opt.value} 
                        style={[styles.friendsOptionButton, startingSide === opt.value && styles.friendsOptionButtonActive]}
                        onPress={() => { playButtonSound(); setStartingSide(opt.value); }}
                    >
                        <Text style={[styles.friendsOptionText, startingSide === opt.value && styles.friendsOptionTextActive]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.friendsLabel}>Ma couleur :</Text>
            <View style={styles.optionsRow}>
                {[
                    { label: 'Bleu', value: 'white' }, // Blue maps to white in logic
                    { label: 'Rouge', value: 'black' }, // Red maps to black in logic
                    { label: 'Aléatoire', value: 'random' }
                ].map(opt => (
                    <TouchableOpacity 
                        key={opt.value} 
                        style={[styles.friendsOptionButton, hostColor === opt.value && styles.friendsOptionButtonActive]}
                        onPress={() => { playButtonSound(); setHostColor(opt.value); }}
                    >
                        <Text style={[styles.friendsOptionText, hostColor === opt.value && styles.friendsOptionTextActive]}>
                            {opt.label}
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
    borderRadius: getResponsiveSize(15),
    padding: getResponsiveSize(15),
    alignItems: 'center',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 3,
    shadowRadius: getResponsiveSize(3),
    elevation: 5,
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
  },
  friendsModalTitle: {
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(15),
    color: '#fff',
  },
  friendsLabel: {
    fontSize: getResponsiveSize(14),
    color: '#f1c40f',
    alignSelf: 'flex-start',
    marginBottom: getResponsiveSize(5),
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(8),
    marginBottom: getResponsiveSize(15),
    width: '100%',
  },
  friendsOptionButton: {
    paddingVertical: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(12),
    borderRadius: getResponsiveSize(10),
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(241, 196, 15, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: getResponsiveSize(4),
  },
  friendsOptionButtonActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: getResponsiveSize(6),
    elevation: 5,
  },
  friendsOptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: getResponsiveSize(13),
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
    marginTop: getResponsiveSize(10),
    gap: getResponsiveSize(10),
  },
  modalButtonCancel: {
    flex: 1,
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(8),
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(8),
    backgroundColor: '#2ecc71',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(14),
  },
  innerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: getResponsiveSize(15),
    borderWidth: getResponsiveSize(4),
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  betDisplay: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    width: getResponsiveSize(120),
    height: getResponsiveSize(40),
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: getResponsiveSize(20),
    marginHorizontal: getResponsiveSize(8),
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(241, 196, 15, 0.3)'
  },
  prevBetText: {
    color: '#f1c40f', 
    fontSize: getResponsiveSize(12), 
    opacity: 0.5, 
    width: getResponsiveSize(60), 
    textAlign: 'center'
  },
  currentBetText: {
    color: '#f1c40f', 
    fontSize: getResponsiveSize(18), 
    fontWeight: 'bold', 
    width: getResponsiveSize(100),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: getResponsiveSize(-1), height: getResponsiveSize(1)},
    textShadowRadius: getResponsiveSize(10)
  },
  nextBetText: {
    color: '#f1c40f', 
    fontSize: getResponsiveSize(12), 
    opacity: 0.5, 
    width: getResponsiveSize(60), 
    textAlign: 'center' 
  }
});

export default CreateRoomModal;
