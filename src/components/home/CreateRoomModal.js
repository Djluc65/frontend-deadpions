import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playButtonSound } from '../../utils/soundManager';
import { getResponsiveSize } from '../../utils/responsive';
import { modalTheme } from '../../utils/modalTheme';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const modalMaxHeight = windowHeight * 0.7 + getResponsiveSize(20);

  return (
    <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
    >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.friendsModalContent, { maxHeight: modalMaxHeight }]} onPress={() => {}}>
            <ScrollView
              contentContainerStyle={{ alignItems: 'center', width: '100%', paddingBottom: getResponsiveSize(24) }}
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
            >
            <Text style={styles.friendsModalTitle}>{t('friends_menu.play_with_friend')}</Text>
            
            <Text style={styles.friendsLabel}>{t('setup.game_mode_label')}</Text>
            <View style={styles.optionsRow}>
                <TouchableOpacity 
                    style={[styles.friendsOptionButton, inviteMode === 'simple' && styles.friendsOptionButtonActive]}
                    onPress={() => { playButtonSound(); setInviteMode('simple'); }}
                >
                    <Text style={[styles.friendsOptionText, inviteMode === 'simple' && styles.friendsOptionTextActive]}>{t('setup.simple')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.friendsOptionButton, inviteMode === 'tournament' && styles.friendsOptionButtonActive]}
                    onPress={() => { playButtonSound(); setInviteMode('tournament'); }}
                >
                    <Text style={[styles.friendsOptionText, inviteMode === 'tournament' && styles.friendsOptionTextActive]}>{t('setup.tournament')}</Text>
                </TouchableOpacity>
            </View>

            {inviteMode === 'tournament' && (
                <>
                    <Text style={styles.friendsLabel}>{t('setup.series_length_label')}</Text>
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

            <Text style={styles.friendsLabel}>{t('setup.bet_label')}</Text>
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

            <Text style={styles.friendsLabel}>{t('setup.time_per_turn_label')}</Text>
            <View style={styles.optionsRow}>
                {[null, 30, 60, 90, 120].map(time => (
                    <TouchableOpacity 
                        key={time} 
                        style={[styles.friendsOptionButton, inviteTime === time && styles.friendsOptionButtonActive]}
                        onPress={() => { playButtonSound(); setInviteTime(time); }}
                    >
                        <Text style={[styles.friendsOptionText, inviteTime === time && styles.friendsOptionTextActive]}>
                            {time === null
                              ? t('matchmaking.no_timer')
                              : time === 30
                                ? t('time.30s')
                                : time === 60
                                  ? t('time.1min')
                                  : time === 90
                                    ? t('time.1min30')
                                    : time === 120
                                      ? t('time.2min')
                                      : `${time}s`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.friendsLabel}>{t('setup.who_starts_label')}</Text>
            <View style={styles.optionsRow}>
                {[
                    { label: t('setup.me'), value: 'host' },
                    { label: t('game.opponent'), value: 'guest' },
                    { label: t('common.random'), value: 'random' }
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

            <Text style={styles.friendsLabel}>{t('setup.my_color_label')}</Text>
            <View style={styles.optionsRow}>
                {[
                    { label: t('colors.blue'), value: 'white' }, // Blue maps to white in logic
                    { label: t('colors.red'), value: 'black' }, // Red maps to black in logic
                    { label: t('common.random'), value: 'random' }
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
                  <Text style={[styles.modalButtonText, styles.modalButtonCancelText]} numberOfLines={1}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); handleCreateRoom(); }}>
                  <Text style={styles.modalButtonText} numberOfLines={1}>{t('common.create')}</Text>
              </TouchableOpacity>
            </View>

            </ScrollView>
        </Pressable>
        </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: modalTheme.overlay,
  friendsModalContent: modalTheme.card,
  friendsModalTitle: modalTheme.title,
  friendsLabel: {
    fontSize: getResponsiveSize(14),
    color: '#f1c40f',
    alignSelf: 'center',
    textAlign: 'center',
    marginBottom: getResponsiveSize(5),
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
    fontSize: getResponsiveSize(12),
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
  modalButtonsFixed: {
    position: 'absolute',
    left: getResponsiveSize(16),
    right: getResponsiveSize(16),
    bottom: getResponsiveSize(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  modalButtonCancel: {
    flex: 1,
    ...modalTheme.buttonBase,
    ...modalTheme.buttonCancel,
    alignItems: 'center',
    paddingVertical: getResponsiveSize(10),
  },
  modalButtonConfirm: {
    flex: 1,
    ...modalTheme.buttonBase,
    ...modalTheme.buttonPrimary,
    alignItems: 'center',
    paddingVertical: getResponsiveSize(10),
  },
  modalButtonText: {
    ...modalTheme.buttonTextBase,
    ...modalTheme.buttonTextPrimary,
    fontSize: getResponsiveSize(13)
  },
  modalButtonCancelText: modalTheme.buttonTextOnDark,
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
