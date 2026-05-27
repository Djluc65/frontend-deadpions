import React, { useState, memo, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { playButtonSound } from '../../utils/soundManager';
import { BET_OPTIONS, ONLINE_TIME_OPTIONS } from '../../utils/constants';
import { getResponsiveSize } from '../../utils/responsive';
import { appAlert } from '../../services/appAlert';
import { T } from '../../utils/theme';
import { modalTheme } from '../../utils/modalTheme';
import { useAdManager } from '../../ads/AdSystem';
import { ensureDailyReset, selectHardAiUnlockUntil, unlockHardAi } from '../../redux/slices/rewardsSlice';

// ─── Palette cyber locale ─────────────────────────────────────────────────────
const CYBER_CYAN  = '#5BD2FF';
const CYBER_EDGE  = 'rgba(150, 180, 255, 0.18)';
const CYBER_DARK  = '#05060B';

const AiGameSetup = memo(({ visible, onClose, navigation, user }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const hardAiUntil = useSelector(selectHardAiUnlockUntil);
  const hardAiActive = typeof hardAiUntil === 'number' && hardAiUntil > Date.now();
  const { showAds, prepareRewarded, showRewarded } = useAdManager();

  const [step, setStep] = useState(1); // 1: Config (Mode, Bet, Time), 2: Options (Diff, Start, Color)

  // State from HomeScreen
  const [aiMode, setAiMode] = useState('simple');
  const [aiSeriesLength, setAiSeriesLength] = useState(2);
  const [aiBet, setAiBet] = useState(100);
  const [aiTimeControl, setAiTimeControl] = useState(30);

  const [aiDifficulte, setAiDifficulte] = useState('moyen');
  const [aiPremierJoueur, setAiPremierJoueur] = useState('joueur');
  const [aiCouleurJoueur, setAiCouleurJoueur] = useState('noir');
  const [aiVitesse, setAiVitesse] = useState('normal');
  const [aiIndices, setAiIndices] = useState(false);
  const [aiAnimations, setAiAnimations] = useState(true);
  const canBet = Boolean(user?.isPremium || user?.isEarlyAccess);

  // Reset step when modal opens
  useEffect(() => {
    if (visible) {
      setStep(1);
      dispatch(ensureDailyReset({ nowTs: Date.now() }));
      prepareRewarded();
    }
  }, [visible, dispatch, prepareRewarded]);

  // Ensure bet is valid
  useEffect(() => {
    if (!visible) return;
    if (!canBet) {
        if (aiBet !== 0) setAiBet(0);
        return;
    }
    if (user?.coins !== undefined) {
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
  }, [visible, canBet, user?.coins, aiBet]);

  const handleStartGame = () => {
    const effectiveBet = canBet ? aiBet : 0;
    if (effectiveBet > (user?.coins || 0)) {
        const missing = Math.max(0, effectiveBet - (user?.coins || 0));
        appAlert(t('game.insufficient_balance'), t('game.missing_coins', { amount: missing.toLocaleString() }));
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
      betAmount: effectiveBet,
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
    { id: 'facile', titre: t('ai.difficulty_easy'), emoji: '🟢', description: t('ai.difficulty_easy_desc') },
    { id: 'moyen', titre: t('ai.difficulty_medium'), emoji: '🟡', description: t('ai.difficulty_medium_desc') },
    { id: 'difficile', titre: t('ai.difficulty_hard'), emoji: '🔴', description: t('ai.difficulty_hard_desc'), locked: !user?.isPremium && !user?.isEarlyAccess && !hardAiActive }
  ];

  const handleLevelSelect = (level) => {
    if (level.locked) {
      if (!showAds) {
        appAlert(t('ai.locked_title'), t('ai.locked_desc'));
        return;
      }
      appAlert(
        t('ai.hard_mode_title'),
        t('ai.hard_unlock_prompt'),
        [
          { text: t('ai.no_thanks'), style: 'cancel' },
          {
            text: t('ai.watch'),
            onPress: () => {
              dispatch(ensureDailyReset({ nowTs: Date.now() }));
              prepareRewarded();
              setTimeout(() => {
                showRewarded({
                  amount: 0,
                  reason: 'Déblocage mode difficile',
                  metadata: { reward: 'ai_hard' },
                  onEarned: async () => {
                    dispatch(unlockHardAi({ nowTs: Date.now() }));
                    setAiDifficulte('difficile');
                    appAlert(t('rewards.unlocked_title'), t('rewards.hard_ai_unlocked'));
                  }
                });
              }, 350);
            }
          }
        ]
      );
      return;
    }
    setAiDifficulte(level.id);
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
            <Pressable style={[styles.friendsModalContent, { maxHeight: '72%' }]} onPress={() => {}}>
                <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                    {step === 1 ? (
                        <>
                            <Text style={[styles.friendsModalTitle, { marginBottom: getResponsiveSize(18) }]}>{t('setup.options_title')}</Text>

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
                                                style={[styles.numberOptionButton, aiSeriesLength === num && styles.friendsOptionButtonActive]}
                                                onPress={() => { playButtonSound(); setAiSeriesLength(num); }}
                                            >
                                                <Text style={[styles.friendsOptionText, aiSeriesLength === num && styles.friendsOptionTextActive, { fontSize: getResponsiveSize(12) }]}>{num}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            {canBet && (
                                <View style={styles.betContainer}>
                                    <Text style={{ color: T.textDim, fontSize: getResponsiveSize(14), textAlign: 'center' }}>{t('setup.bet_label')}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        {(() => {
                                            const availableBets = BET_OPTIONS.filter(b => b <= (user?.coins || 0));
                                            const effectiveBets = availableBets.length > 0 ? availableBets : [100];
                                            const currentIndex = effectiveBets.indexOf(aiBet);
                                            const canGoPrev = currentIndex > 0;
                                            const canGoNext = currentIndex < effectiveBets.length - 1;

                                            return (
                                                <>
                                                    <TouchableOpacity onPress={() => { playButtonSound(); canGoPrev && setAiBet(effectiveBets[currentIndex - 1]); }} disabled={!canGoPrev} style={{ padding: getResponsiveSize(8), opacity: !canGoPrev ? 0.3 : 1 }}>
                                                        <Ionicons name="remove-circle" size={getResponsiveSize(32)} color={CYBER_CYAN} />
                                                    </TouchableOpacity>
                                                    <View style={styles.betDisplay}>
                                                        <Text style={styles.betText}>{aiBet.toLocaleString()}</Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => { playButtonSound(); canGoNext && setAiBet(effectiveBets[currentIndex + 1]); }} disabled={!canGoNext} style={{ padding: getResponsiveSize(8), opacity: !canGoNext ? 0.3 : 1 }}>
                                                        <Ionicons name="add-circle" size={getResponsiveSize(32)} color={CYBER_CYAN} />
                                                    </TouchableOpacity>
                                                </>
                                            );
                                        })()}
                                    </View>
                                </View>
                            )}

                            {/* TEMPS PAR TOUR */}
                            <Text style={styles.friendsLabel}>{t('setup.time_per_turn_label')}</Text>
                            <View style={styles.optionsRow}>
                                {ONLINE_TIME_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt.labelKey}
                                        style={[styles.friendsOptionButton, aiTimeControl === opt.value && styles.friendsOptionButtonActive]}
                                        onPress={() => { playButtonSound(); setAiTimeControl(opt.value); }}
                                    >
                                        <Text style={[styles.friendsOptionText, aiTimeControl === opt.value && styles.friendsOptionTextActive]}>
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
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>{t('common.next')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : step === 2 ? (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: getResponsiveSize(18), justifyContent: 'center', position: 'relative' }}>
                                <Text style={[styles.friendsModalTitle, { marginBottom: 0 }]}>{t('ai.config_title')}</Text>
                            </View>

                            <Text style={styles.friendsLabel}>{t('ai.difficulty_label')}</Text>
                            <View style={{ width: '100%', gap: getResponsiveSize(10), marginBottom: getResponsiveSize(20) }}>
                                {niveaux.map((niveau) => (
                                    <TouchableOpacity
                                        key={niveau.id}
                                        style={[
                                            styles.difficultyCard,
                                            aiDifficulte === niveau.id && styles.difficultyCardActive,
                                            niveau.locked && { opacity: 0.7 }
                                        ]}
                                        onPress={() => { playButtonSound(); handleLevelSelect(niveau); }}
                                    >
                                        <Text style={{ fontSize: getResponsiveSize(24), marginRight: getResponsiveSize(15) }}>{niveau.emoji}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.difficultyTitle, aiDifficulte === niveau.id && styles.difficultyTitleActive]}>
                                                {niveau.titre}
                                            </Text>
                                            <Text style={{ fontSize: getResponsiveSize(12), color: T.textMuted }}>
                                                {niveau.description}
                                            </Text>
                                        </View>
                                        {niveau.locked && (
                                            <Ionicons name="lock-closed" size={getResponsiveSize(24)} color={CYBER_CYAN} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { playButtonSound(); setStep(1); }}>
                                    <Text style={styles.modalButtonText}>{t('common.back')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); setStep(3); }}>
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>{t('common.next')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: getResponsiveSize(18), justifyContent: 'center', position: 'relative' }}>
                                <Text style={[styles.friendsModalTitle, { marginBottom: 0 }]}>{t('ai.config_title')}</Text>
                            </View>

                            {/* Qui commence */}
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionLabel}>{t('setup.who_starts_label')}</Text>
                                <View style={{ flexDirection: 'row', gap: getResponsiveSize(10), width: '100%' }}>
                                    {['joueur', 'ia', 'aleatoire'].map(opt => (
                                        <TouchableOpacity
                                            key={opt}
                                            style={[
                                                styles.selectBtn,
                                                aiPremierJoueur === opt && styles.selectBtnActive,
                                            ]}
                                            onPress={() => { playButtonSound(); setAiPremierJoueur(opt); }}
                                        >
                                            <Text style={[
                                                styles.selectBtnText,
                                                aiPremierJoueur === opt && styles.selectBtnTextActive,
                                            ]}>
                                                {opt === 'joueur' ? t('game.you') : opt === 'ia' ? t('game.ai_name') : t('common.random')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Couleur joueur */}
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionLabel}>{t('setup.your_color_label')}</Text>
                                <View style={{ flexDirection: 'row', gap: getResponsiveSize(10), width: '100%' }}>
                                    {[
                                        { id: 'noir', icon: '🔴', label: t('colors.red') },
                                        { id: 'blanc', icon: '✖', label: t('colors.blue') },
                                        { id: 'aleatoire', icon: '🎲', label: t('common.random_short') }
                                    ].map(opt => (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={[
                                                styles.selectBtn,
                                                aiCouleurJoueur === opt.id && styles.selectBtnActive,
                                            ]}
                                            onPress={() => { playButtonSound(); setAiCouleurJoueur(opt.id); }}
                                        >
                                            <Text style={{ fontSize: getResponsiveSize(20), marginBottom: getResponsiveSize(4) }}>{opt.icon}</Text>
                                            <Text style={[
                                                styles.selectBtnText,
                                                aiCouleurJoueur === opt.id && styles.selectBtnTextActive,
                                            ]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { playButtonSound(); setStep(2); }}>
                                    <Text style={styles.modalButtonText}>{t('common.back')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButtonConfirm} onPress={() => { playButtonSound(); handleStartGame(); }}>
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>{t('matchmaking.play_btn')}</Text>
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
    alignItems: 'center',
  },
  friendsModalTitle: {
    ...modalTheme.title,
    fontSize: getResponsiveSize(22),
    textTransform: 'uppercase'
  },
  friendsLabel: {
    fontSize: getResponsiveSize(14),
    color: T.textDim,
    alignSelf: 'flex-start',
    marginBottom: getResponsiveSize(8),
    marginTop: getResponsiveSize(8),
    fontWeight: '700',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(8),
    marginBottom: getResponsiveSize(14),
    width: '100%',
  },
  friendsOptionButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: T.bg3,
    paddingVertical: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(5),
    borderRadius: getResponsiveSize(T.radiusSm),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CYBER_EDGE,
  },
  friendsOptionButtonActive: {
    backgroundColor: '#5BD2FF',
    borderColor: '#5BD2FF',
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(6),
    elevation: 4,
  },
  friendsOptionText: {
    color: T.textDim,
    fontWeight: '600',
    fontSize: getResponsiveSize(12),
  },
  friendsOptionTextActive: {
    color: '#05060B',
    fontWeight: 'bold',
  },
  numberOptionButton: {
    minWidth: getResponsiveSize(36),
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    justifyContent: 'center',
    backgroundColor: T.bg3,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: getResponsiveSize(T.radiusSm),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CYBER_EDGE,
  },

  // ── Section mise ─────────────────────────────────────────────────────────────
  betContainer: {
    width: '100%',
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(4),
    marginBottom: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: 'rgba(91, 210, 255, 0.25)',
  },
  betDisplay: {
    width: getResponsiveSize(124),
    height: getResponsiveSize(44),
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderRadius: getResponsiveSize(T.radiusPill),
    marginHorizontal: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: 'rgba(91, 210, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  betText: {
    color: '#5BD2FF',
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
  },

  // ── Cartes de difficulté ──────────────────────────────────────────────────────
  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: getResponsiveSize(15),
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1.5,
    borderColor: CYBER_EDGE,
  },
  difficultyCardActive: {
    borderColor: '#5BD2FF',
    backgroundColor: 'rgba(91, 210, 255, 0.08)',
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveSize(8),
    elevation: 4,
  },
  difficultyTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: T.text,
  },
  difficultyTitleActive: {
    color: '#5BD2FF',
  },

  // ── Sections sélection (qui commence / couleur) ───────────────────────────────
  sectionCard: {
    width: '100%',
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(10),
    marginBottom: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: CYBER_EDGE,
  },
  sectionLabel: {
    color: T.textDim,
    fontSize: getResponsiveSize(14),
    marginBottom: getResponsiveSize(12),
    textAlign: 'center',
    fontWeight: '700',
  },
  selectBtn: {
    flex: 1,
    paddingVertical: getResponsiveSize(10),
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderRadius: getResponsiveSize(T.radiusSm),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CYBER_EDGE,
  },
  selectBtnActive: {
    backgroundColor: '#5BD2FF',
    borderColor: '#5BD2FF',
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(6),
    elevation: 4,
  },
  selectBtnText: {
    fontSize: getResponsiveSize(13),
    fontWeight: '700',
    color: T.textDim,
  },
  selectBtnTextActive: {
    color: '#05060B',
    fontWeight: '800',
  },

  // ── Boutons bas de modal ──────────────────────────────────────────────────────
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: getResponsiveSize(14),
    gap: getResponsiveSize(10),
  },
  modalButtonCancel: {
    flex: 1,
    ...modalTheme.button,
  },
  modalButtonConfirm: {
    flex: 1,
    ...modalTheme.button,
    backgroundColor: '#5BD2FF',
    borderColor: '#5BD2FF',
    shadowColor: '#5BD2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: getResponsiveSize(8),
    elevation: 6,
  },
  modalButtonText: {
    ...modalTheme.buttonText,
    textTransform: 'uppercase',
  },
  modalButtonTextConfirm: {
    color: '#05060B',
  },
});

export default AiGameSetup;
