import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';

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
  const { t } = useTranslation();

  return (
    <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
    >
        <Pressable style={styles.modalOverlay} onPress={() => { playButtonSound(); onClose(); }}>
            <Pressable style={[styles.friendsModalContent, { maxHeight: '90%' }]} onPress={() => {}}>
                <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                    <Text style={[styles.friendsModalTitle, { color: '#f1c40f', textShadowColor: 'rgba(241, 196, 15, 0.5)', textShadowRadius: getResponsiveSize(10), marginBottom: getResponsiveSize(30) }]}>{t('setup.options_title')}</Text>

                    {/* MODE DE JEU */}
                    <Text style={styles.friendsLabel}>{t('setup.game_mode_label')}</Text>
                    <View style={styles.optionsRow}>
                        <TouchableOpacity 
                            style={[styles.friendsOptionButton, aiMode === 'simple' && styles.friendsOptionButtonActive]}
                            onPress={() => { playButtonSound(); setAiMode('simple'); }}
                        >
                            <Text style={[styles.friendsOptionText, aiMode === 'simple' && styles.friendsOptionTextActive]}>{t('setup.simple')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.friendsOptionButton, aiMode === 'tournament' && styles.friendsOptionButtonActive]}
                            onPress={() => { playButtonSound(); setAiMode('tournament'); }}
                        >
                            <Text style={[styles.friendsOptionText, aiMode === 'tournament' && styles.friendsOptionTextActive]}>{t('setup.tournament')}</Text>
                        </TouchableOpacity>
                    </View>

                    {aiMode === 'tournament' && (
                        <>
                            <Text style={styles.friendsLabel}>{t('setup.series_length_label')}</Text>
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
                        <Text style={styles.betLabel}>{t('setup.bet_label')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            {(() => {
                                const availableBets = betOptions.filter(b => b <= (userCoins || 0));
                                const effectiveBets = availableBets.length > 0 ? availableBets : [100];
                                const currentIndex = effectiveBets.indexOf(aiBet);
                                const canGoPrev = currentIndex > 0;
                                const canGoNext = currentIndex < effectiveBets.length - 1;

                                return (
                                    <>
                                        <TouchableOpacity onPress={() => { playButtonSound(); canGoPrev && setAiBet(effectiveBets[currentIndex - 1]); }} disabled={!canGoPrev} style={{ padding: getResponsiveSize(10), opacity: !canGoPrev ? 0.3 : 1 }}>
                                            <Ionicons name="remove-circle" size={getResponsiveSize(40)} color="#f1c40f" />
                                        </TouchableOpacity>
                                        <View style={styles.betValueContainer}>
                                            <Text style={styles.betValueText}>{aiBet.toLocaleString()}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => { playButtonSound(); canGoNext && setAiBet(effectiveBets[currentIndex + 1]); }} disabled={!canGoNext} style={{ padding: getResponsiveSize(10), opacity: !canGoNext ? 0.3 : 1 }}>
                                            <Ionicons name="add-circle" size={getResponsiveSize(40)} color="#f1c40f" />
                                        </TouchableOpacity>
                                    </>
                                );
                            })()}
                        </View>
                    </View>

                    {/* TEMPS PAR TOUR */}
                    <Text style={styles.friendsLabel}>{t('setup.time_per_turn_label')}</Text>
                    <View style={styles.optionsRow}>
                        {timeOptions.map(opt => (
                            <TouchableOpacity 
                                key={opt.labelKey ?? opt.label} 
                                style={[styles.friendsOptionButton, aiTimeControl === opt.value && styles.friendsOptionButtonActive]}
                                onPress={() => { playButtonSound(); setAiTimeControl(opt.value); }}
                            >
                                <Text style={[styles.friendsOptionText, aiTimeControl === opt.value && styles.friendsOptionTextActive]}>
                                    {t(opt.labelKey ?? opt.label)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity 
                        style={[styles.friendsCloseButton, { backgroundColor: '#f1c40f', width: '100%', borderRadius: getResponsiveSize(15), paddingVertical: getResponsiveSize(15), marginTop: getResponsiveSize(20) }]}
                        onPress={() => { playButtonSound(); onNext(); }}
                    >
                        <Text style={[styles.friendsCloseButtonText, { color: '#000', fontWeight: 'bold', fontSize: getResponsiveSize(18) }]}>{t('common.next')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={{ marginTop: getResponsiveSize(15), padding: getResponsiveSize(10) }}
                        onPress={() => { playButtonSound(); onClose(); }}
                    >
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: getResponsiveSize(16) }}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </Pressable>
        </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: modalTheme.overlay,
  friendsModalContent: {
    ...modalTheme.card,
    width: '86%',
    alignItems: 'center',
  },
  friendsModalTitle: {
    ...modalTheme.title,
    fontSize: getResponsiveSize(24),
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
  friendsCloseButton: {
    backgroundColor: '#f1c40f',
    paddingVertical: getResponsiveSize(15),
    paddingHorizontal: getResponsiveSize(30),
    borderRadius: getResponsiveSize(30),
    marginTop: getResponsiveSize(5),
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: getResponsiveSize(5),
    elevation: 6,
  },
  friendsCloseButtonText: {
    color: '#041c55',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(18),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  betContainer: {
    width: '100%',
    backgroundColor: '#041c55',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(4),
    marginBottom: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
          borderColor: 'rgba(255,255,255,0.1)'
  },
  betLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: getResponsiveSize(16),
    textAlign: 'center'
  },
  betValueContainer: {
    width: getResponsiveSize(140), 
    height: getResponsiveSize(50), 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: getResponsiveSize(25), 
    marginHorizontal: getResponsiveSize(10), 
    borderWidth: 1, 
    borderColor: '#f1c40f',
    alignItems: 'center',
    justifyContent: 'center'
  },
  betValueText: {
    color: '#f1c40f', 
    fontSize: getResponsiveSize(22), 
    fontWeight: 'bold'
  }
});

export default AIDifficultyModal;
