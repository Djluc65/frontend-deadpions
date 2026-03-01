import React, { memo } from 'react';
import { Modal, Pressable, View, Text, ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import { playButtonSound } from '../../utils/soundManager';

const OnlineConfigModal = memo(({
  visible,
  onClose,
  isSearchingOnline,
  onlineSearchTimer,
  onlineBet,
  onlineMode,
  setOnlineMode,
  onlineSeriesLength,
  setOnlineSeriesLength,
  onlineTime,
  setOnlineTime,
  setOnlineBet,
  handleStartOnlineSearch,
  handleCancelOnlineSearch,
  userCoins,
  betOptions,
  onlineTimeOptions
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
          if (!isSearchingOnline) { playButtonSound(); onClose(); }
      }}
    >
      <Pressable style={styles.modalOverlay} onPress={() => { if (!isSearchingOnline) { playButtonSound(); onClose(); } }}>
        <Pressable style={styles.friendsModalContent} onPress={() => {}}>
          {isSearchingOnline ? (
            <View style={{ alignItems: 'center', width: '100%' }}>
                <Text style={styles.friendsModalTitle}>Recherche d'adversaire...</Text>
                <ActivityIndicator size="large" color="#f1c40f" style={{ marginVertical: getResponsiveSize(20) }} />
                <Text style={{ color: '#f1c40f', fontSize: getResponsiveSize(32), fontWeight: 'bold', marginBottom: getResponsiveSize(10) }}>{onlineSearchTimer}s</Text>
                <Text style={{ color: '#ccc', fontSize: getResponsiveSize(14), marginBottom: getResponsiveSize(20) }}>Mise : {onlineBet.toLocaleString()} 💰</Text>
                
                <TouchableOpacity 
                    style={styles.cancelSearchButton} 
                    onPress={() => { playButtonSound(); handleCancelOnlineSearch(); }}
                >
                    <Text style={styles.cancelSearchButtonText}>Annuler</Text>
                </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                <Text style={styles.friendsModalTitle}>Jeu en ligne</Text>

                <Text style={styles.friendsLabel}>Mode de jeu:</Text>
                <View style={styles.optionsRow}>
                    <TouchableOpacity 
                        style={[styles.friendsOptionButton, onlineMode === 'simple' && styles.friendsOptionButtonActive]}
                        onPress={() => { playButtonSound(); setOnlineMode('simple'); }}
                    >
                        <Text style={[styles.friendsOptionText, onlineMode === 'simple' && styles.friendsOptionTextActive]}>Simple</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.friendsOptionButton, onlineMode === 'tournament' && styles.friendsOptionButtonActive]}
                        onPress={() => { playButtonSound(); setOnlineMode('tournament'); }}
                    >
                        <Text style={[styles.friendsOptionText, onlineMode === 'tournament' && styles.friendsOptionTextActive]}>Tournoi</Text>
                    </TouchableOpacity>
                </View>

                {onlineMode === 'tournament' && (
                    <>
                        <Text style={styles.friendsLabel}>Nombre de parties:</Text>
                        <View style={styles.optionsRow}>
                            {[2, 4, 6, 8, 10].map(num => (
                                <TouchableOpacity 
                                    key={num} 
                                    style={[styles.friendsOptionButton, onlineSeriesLength === num && styles.friendsOptionButtonActive]}
                                    onPress={() => { playButtonSound(); setOnlineSeriesLength(num); }}
                                >
                                    <Text style={[styles.friendsOptionText, onlineSeriesLength === num && styles.friendsOptionTextActive]}>{num}</Text>
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
                        const currentIndex = effectiveBets.indexOf(onlineBet);
                        
                        const canGoPrev = currentIndex > 0;
                        const canGoNext = currentIndex < effectiveBets.length - 1;

                        return (
                            <>
                                <TouchableOpacity 
                                    onPress={() => {
                                        playButtonSound();
                                        if (canGoPrev) setOnlineBet(effectiveBets[currentIndex - 1]);
                                    }}
                                    disabled={!canGoPrev}
                                    style={{ padding: getResponsiveSize(10), opacity: !canGoPrev ? 0.3 : 1 }}
                                >
                                    <Ionicons name="remove-circle-outline" size={getResponsiveSize(40)} color="#fff" />
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
                                        {onlineBet.toLocaleString()}
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
                                        if (canGoNext) setOnlineBet(effectiveBets[currentIndex + 1]);
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

                <Text style={styles.friendsLabel}>Temps par tour:</Text>
                <View style={styles.optionsRow}>
                    {onlineTimeOptions.map(opt => (
                        <TouchableOpacity 
                            key={opt.label} 
                            style={[styles.friendsOptionButton, onlineTime === opt.value && styles.friendsOptionButtonActive]}
                            onPress={() => { playButtonSound(); setOnlineTime(opt.value); }}
                        >
                            <Text style={[styles.friendsOptionText, onlineTime === opt.value && styles.friendsOptionTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { playButtonSound(); onClose(); }}>
                        <Text style={styles.modalButtonText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); handleStartOnlineSearch(); }}>
                        <Text style={styles.modalButtonText}>JOUER</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
          )}
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
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    alignItems: 'center',
    shadowColor: '#f1c40f',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 3,
    shadowRadius: getResponsiveSize(3),
    elevation: 5,
    borderWidth: getResponsiveSize(1),
    borderColor: '#f1c40f',
  },
  friendsModalTitle: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(20),
    color: '#fff',
  },
  friendsLabel: {
    fontSize: getResponsiveSize(16),
    color: '#f1c40f',
    alignSelf: 'flex-start',
    marginBottom: getResponsiveSize(10),
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(10),
    marginBottom: getResponsiveSize(20),
    width: '100%',
  },
  friendsOptionButton: {
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(15),
    borderRadius: getResponsiveSize(15),
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(241, 196, 15, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: getResponsiveSize(5),
  },
  friendsOptionButtonActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: getResponsiveSize(8),
    elevation: 5,
  },
  friendsOptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: getResponsiveSize(16),
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
    gap: getResponsiveSize(15),
  },
  modalButtonCancel: {
    flex: 1,
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(10),
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(10),
    backgroundColor: '#2ecc71',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(16),
  },
  innerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: getResponsiveSize(20),
    borderWidth: getResponsiveSize(4),
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  cancelSearchButton: {
    backgroundColor: '#e74c3c',
    width: '100%',
    paddingVertical: getResponsiveSize(15),
    borderRadius: getResponsiveSize(20),
    borderWidth: getResponsiveSize(2),
    borderColor: '#c0392b',
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: getResponsiveSize(4),
    },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(4.65),
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: getResponsiveSize(10)
  },
  cancelSearchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(18),
    textTransform: 'uppercase'
  },
  betDisplay: {
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
  },
  prevBetText: {
    color: '#f1c40f', 
    fontSize: getResponsiveSize(14), 
    opacity: 0.5, 
    width: getResponsiveSize(70), 
    textAlign: 'center'
  },
  currentBetText: {
    color: '#f1c40f', 
    fontSize: getResponsiveSize(22), 
    fontWeight: 'bold', 
    width: getResponsiveSize(120),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: getResponsiveSize(-1), height: getResponsiveSize(1)},
    textShadowRadius: getResponsiveSize(10)
  },
  nextBetText: {
    color: '#f1c40f', 
    fontSize: getResponsiveSize(14), 
    opacity: 0.5, 
    width: getResponsiveSize(70), 
    textAlign: 'center' 
  }
});

export default OnlineConfigModal;
