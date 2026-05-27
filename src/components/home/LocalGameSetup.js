import React, { useState, memo, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getResponsiveSize } from '../../utils/responsive';
import { playButtonSound } from '../../utils/soundManager';
import { ONLINE_TIME_OPTIONS } from '../../utils/constants';
import { modalTheme } from '../../utils/modalTheme';
import { T } from '../../utils/theme';

const CYBER_CYAN = '#5BD2FF';
const CYBER_EDGE = 'rgba(150, 180, 255, 0.18)';

const LocalGameSetup = memo(({ visible, onClose, navigation }) => {
  const { t } = useTranslation();
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
                            <Text style={styles.friendsModalTitle}>{t('local.title')}</Text>

                            {/* MODE DE JEU */}
                            <Text style={styles.friendsLabel}>{t('setup.game_mode_label')}</Text>
                            <View style={styles.optionsRow}>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, localMode === 'simple' && styles.friendsOptionButtonActive]}
                                    onPress={() => { playButtonSound(); setLocalMode('simple'); }}
                                >
                                    <Text style={[styles.friendsOptionText, localMode === 'simple' && styles.friendsOptionTextActive]}>{t('setup.simple')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, localMode === 'tournament' && styles.friendsOptionButtonActive]}
                                    onPress={() => { playButtonSound(); setLocalMode('tournament'); }}
                                >
                                    <Text style={[styles.friendsOptionText, localMode === 'tournament' && styles.friendsOptionTextActive]}>{t('setup.tournament')}</Text>
                                </TouchableOpacity>
                            </View>

                            {localMode === 'tournament' && (
                                <>
                                    <Text style={styles.friendsLabel}>{t('setup.series_length_label')}</Text>
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
                            <Text style={styles.friendsLabel}>{t('setup.time_per_turn_label')}</Text>
                            <View style={styles.optionsRow}>
                                {ONLINE_TIME_OPTIONS.map(opt => (
                                    <TouchableOpacity 
                                        key={opt.labelKey} 
                                        style={[styles.friendsOptionButton, localTime === opt.value && styles.friendsOptionButtonActive]}
                                        onPress={() => { playButtonSound(); setLocalTime(opt.value); }}
                                    >
                                        <Text style={[styles.friendsOptionText, localTime === opt.value && styles.friendsOptionTextActive]}>
                                            {t(opt.labelKey)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { playButtonSound(); onClose(); }}>
                                    <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); setStep(2); }}>
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextActive]}>{t('common.next')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: getResponsiveSize(18), justifyContent: 'center', position: 'relative' }}>
                                <TouchableOpacity
                                    onPress={() => { playButtonSound(); setStep(1); }}
                                    style={{ position: 'absolute', left: 0, padding: getResponsiveSize(10), zIndex: 10 }}
                                    hitSlop={{ top: getResponsiveSize(15), bottom: getResponsiveSize(15), left: getResponsiveSize(15), right: getResponsiveSize(15) }}
                                >
                                    <Ionicons name="arrow-back" size={getResponsiveSize(24)} color={CYBER_CYAN} />
                                </TouchableOpacity>
                                <Text style={[styles.friendsModalTitle, { marginBottom: 0 }]}>{t('local.config_title')}</Text>
                            </View>
                            
                            {/* QUI COMMENCE */}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>{t('setup.who_starts_label')}</Text>
                                <View style={{ flexDirection: 'row', gap: getResponsiveSize(10), width: '100%' }}>
                                    {['joueur1', 'joueur2', 'aleatoire'].map(opt => (
                                        <TouchableOpacity
                                            key={opt}
                                            style={{
                                                flex: 1,
                                                paddingVertical: getResponsiveSize(12),
                                                backgroundColor: localPremierJoueur === opt ? CYBER_CYAN : T.bg3,
                                                borderRadius: getResponsiveSize(T.radiusSm),
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: localPremierJoueur === opt ? CYBER_CYAN : CYBER_EDGE
                                            }}
                                            onPress={() => { playButtonSound(); setLocalPremierJoueur(opt); }}
                                        >
                                            <Text style={{
                                                fontSize: getResponsiveSize(14),
                                                fontWeight: 'bold',
                                                color: localPremierJoueur === opt ? '#05060B' : T.textDim
                                            }}>
                                                {opt === 'joueur1' ? t('game.player1') : opt === 'joueur2' ? t('game.player2') : t('common.random')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* COULEUR JOUEUR 1 */}
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>{t('local.player1_color_label')}</Text>
                                <View style={{ flexDirection: 'row', gap: getResponsiveSize(10), width: '100%' }}>
                                     {[
                                        { id: 'noir', icon: '🔴', label: t('colors.red') },
                                        { id: 'blanc', icon: '✖', label: t('colors.blue') },
                                        { id: 'aleatoire', icon: '🎲', label: t('common.random_short') }
                                      ].map(opt => (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={{
                                                flex: 1,
                                                paddingVertical: getResponsiveSize(12),
                                                backgroundColor: localCouleurJoueur1 === opt.id ? CYBER_CYAN : T.bg3,
                                                borderRadius: getResponsiveSize(T.radiusSm),
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: localCouleurJoueur1 === opt.id ? CYBER_CYAN : CYBER_EDGE
                                            }}
                                            onPress={() => { playButtonSound(); setLocalCouleurJoueur1(opt.id); }}
                                        >
                                            <Text style={{ fontSize: getResponsiveSize(18), marginBottom: getResponsiveSize(4) }}>{opt.icon}</Text>
                                            <Text style={{
                                                fontSize: getResponsiveSize(14),
                                                fontWeight: 'bold',
                                                color: localCouleurJoueur1 === opt.id ? '#05060B' : T.textDim
                                            }}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { playButtonSound(); setStep(1); }}>
                                    <Text style={styles.modalButtonText}>{t('common.back')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); handleStartGame(); }}>
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextActive]}>{t('matchmaking.play_btn')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
    maxHeight: '72%',
    position: 'relative',
    overflow: 'hidden',
  },
  friendsModalTitle: {
    ...modalTheme.title,
    fontSize: getResponsiveSize(22),
    textTransform: 'uppercase'
  },
  friendsLabel: {
    fontSize: getResponsiveSize(14),
    color: T.textDim,
    marginBottom: getResponsiveSize(8),
    marginTop: getResponsiveSize(8),
    fontWeight: '700',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: getResponsiveSize(8),
    gap: getResponsiveSize(8),
  },
  friendsOptionButton: {
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(6),
    borderRadius: getResponsiveSize(T.radiusPill),
    borderWidth: 1,
    borderColor: CYBER_EDGE,
    margin: getResponsiveSize(4),
    backgroundColor: T.bg3,
    minWidth: '10%',
    alignItems: 'center',
  },
  friendsOptionButtonActive: {
    backgroundColor: CYBER_CYAN,
    borderColor: CYBER_CYAN,
    shadowColor: CYBER_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(8),
    elevation: 6,
  },
  friendsOptionText: {
    color: T.textDim,
    fontSize: getResponsiveSize(12),
    fontWeight: 'bold',
  },
  friendsOptionTextActive: {
    color: '#05060B',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: getResponsiveSize(14),
    gap: getResponsiveSize(8),
  },
  modalButtonCancel: {
    flex: 1,
    ...modalTheme.button,
  },
  modalButtonConfirm: {
    flex: 1,
    ...modalTheme.button,
    backgroundColor: CYBER_CYAN,
    borderColor: CYBER_CYAN,
    shadowColor: CYBER_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(8),
    elevation: 6,
  },
  modalButtonText: {
    ...modalTheme.buttonText,
    textTransform: 'uppercase'
  },
  modalButtonTextActive: {
    color: '#05060B',
  },
  sectionContainer: {
    width: '100%',
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(12),
    marginBottom: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: T.borderSoft
  },
  sectionTitle: {
    color: T.textDim,
    fontSize: getResponsiveSize(14),
    marginBottom: getResponsiveSize(10),
    textAlign: 'center'
  },
});

export default LocalGameSetup;
