import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, ImageBackground, Platform, useWindowDimensions } from 'react-native';
import { T } from '../utils/theme';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { socket } from '../utils/socket';
import { playButtonSound } from '../utils/soundManager';
import { getResponsiveSize } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import { useAdManager } from '../ads/AdSystem';
import { consumeLiveRoom, ensureDailyReset, incrementLiveBonus, selectLiveRemaining } from '../redux/slices/rewardsSlice';

/**
 * Écran de configuration pour la création d'une salle live.
 * Permet à l'utilisateur de définir les paramètres de la salle (nom, confidentialité, spectateurs, etc.).
 */
const ConfigurationSalleLive = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const liveRemaining = useSelector((state) => selectLiveRemaining(state));
  const { showAds, prepareRewarded, showRewarded } = useAdManager();
  // --- États pour les paramètres de la salle ---
  const [nomSalle, setNomSalle] = useState(''); // Nom de la salle
  const [description, setDescription] = useState(''); // Description optionnelle
  const [sallePrivee, setSallePrivee] = useState(false); // Salle privée ou publique
  const [motDePasse, setMotDePasse] = useState(''); // Mot de passe si privée
  const [limitSpectateurs, setLimitSpectateurs] = useState(100); // Nombre max de spectateurs
  const [chatActif, setChatActif] = useState(true); // Activer/désactiver le chat
  const [audioLobbyActif, setAudioLobbyActif] = useState(true); // Activer/désactiver l'audio lobby
  const [reactionsActives, setReactionsActives] = useState(true); // Activer/désactiver les réactions
  const [tempsParCoup, setTempsParCoup] = useState(30); // Temps par coup en secondes
  const [isTournament, setIsTournament] = useState(false); // Mode tournoi
  const [tournamentGames, setTournamentGames] = useState(2); // Nombre de manches
  const [betAmount, setBetAmount] = useState(100); // Mise
  const [modeSpectateur, setModeSpectateur] = useState('libre'); // 'libre' (tout le monde) ou 'modere' (approbation requise)
  
  // Options prédéfinies pour les limites de spectateurs
  const limitsSpectateurs = [10, 20, 50, 100, 200, 500, 1000, 5000, 10000];
  
  // Options prédéfinies pour le temps de jeu
  const tempsOptions = [
    { valeur: 30, label: '30s' },
    { valeur: 60, label: '1min' },
    { valeur: 90, label: '1min 30s' },
    { valeur: 120, label: '2min' },
    { valeur: 150, label: '2min 30s' },
    { valeur: 180, label: '3min' },
    { valeur: 240, label: '4min' },
    { valeur: 300, label: '5min' },
    { valeur: null, label: t('live_room.unlimited') }
  ];

  const betOptions = [
    100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 
    100000, 250000, 500000, 1000000, 2500000, 5000000, 
    10000000, 25000000, 50000000, 100000000, 250000000, 
    500000000, 1000000000, 2500000000, 5000000000
  ];

  const grantLiveBonusOnServer = async (userId) => {
    if (!userId) return { ok: false, message: 'Utilisateur requis' };
    if (!socket.connected) socket.connect();
    socket.emit('join_user_room', userId);

    return await new Promise((resolve) => {
      try {
        socket.emit('grant_live_room_bonus', { amount: 1 }, (res) => {
          resolve(res || { ok: false, message: 'Réponse invalide' });
        });
      } catch {
        resolve({ ok: false, message: 'Erreur réseau.' });
      }
    });
  };
  
  /**
   * Fonction pour créer la salle live.
   * Valide les entrées et navigue vers la salle d'attente.
   */
  const creerSalleLive = () => {
    dispatch(ensureDailyReset({ nowTs: Date.now() }));
    if (liveRemaining <= 0) {
      if (!showAds) {
        appAlert(t('live_room.limit_reached'), t('live_room.limit_reached_desc'));
        return;
      }
      appAlert(
        t('live_room.limit_reached'),
        t('live_room.limit_reached_watch_ad'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('live_room.watch_ad'),
            onPress: () => {
              prepareRewarded();
              showRewarded({
                amount: 0,
                reason: t('live_room.extra_live_room'),
                metadata: { reward: 'live_extra' },
                onEarned: async () => {
                  dispatch(incrementLiveBonus({ nowTs: Date.now() }));
                  const userId = user?._id || user?.id;
                  const res = await grantLiveBonusOnServer(userId);
                  if (res?.ok) {
                    appAlert(t('common.ok'), t('live_room.extra_room_granted'));
                  } else {
                    appAlert(t('common.error'), res?.message || t('live_room.error_activate_live'));
                  }
                }
              });
            }
          }
        ]
      );
      return;
    }
    // --- Validation des champs obligatoires ---
    if (!nomSalle.trim()) {
      appAlert(t('common.error'), t('live_room.error_room_name_required'));
      return;
    }

    if (sallePrivee && !motDePasse.trim()) {
      appAlert(t('common.error'), t('live_room.error_password_required'));
      return;
    }

    if (nomSalle.length < 3) {
      appAlert(t('common.error'), t('live_room.error_name_too_short'));
      return;
    }
    
    // --- Construction de l'objet de configuration de la salle ---
    const configSalle = {
      id: 'live_' + Date.now(),
      nom: nomSalle,
      description: description || t('live_room.default_description'),
      type: 'live',
      createur: {
        id: user._id || user.id,
        pseudo: user.pseudo,
        avatar: user.avatar,
        niveau: user.level || 1,
        pays: user.country || 'UNKNOWN',
        coins: user.coins || 0
      },
      parametres: {
        privee: sallePrivee,
        motDePasse: sallePrivee ? motDePasse : null,
        limitSpectateurs: limitSpectateurs,
        chatActif: chatActif,
        audioLobbyActif: audioLobbyActif,
        reactionsActives: reactionsActives,
        tempsParCoup: tempsParCoup,
        modeSpectateur: modeSpectateur,
        isTournament: isTournament,
        tournamentGames: tournamentGames,
        betAmount: betAmount
      },
      statut: 'attente', // États possibles : 'attente', 'en_cours', 'termine'
      spectateurs: [],
      messagesChat: [],
      reactionsEnCours: [],
      creeLe: new Date(),
      debutPartie: null
    };
    
    // --- Navigation vers la salle d'attente avec la configuration ---
    console.log('Création de la salle:', configSalle);
    
    // Setup one-time listener for success
    const handleRoomCreated = (createdConfig) => {
        cleanup();
        dispatch(consumeLiveRoom({ nowTs: Date.now() }));
        navigation.navigate('SalleAttenteLive', { configSalle: createdConfig });
    };

    const handleError = (message) => {
        cleanup();
        appAlert(t('common.error'), message);
    };

    const cleanup = () => {
        socket.off('live_room_created', handleRoomCreated);
        socket.off('error', handleError);
    };

    socket.on('live_room_created', handleRoomCreated);
    socket.on('error', handleError);

    // Emit creation event to backend
    socket.emit('create_live_room', { config: configSalle });
  };
  
  return (
    <ImageBackground
      source={require('../../assets/images/Background2-4.png')}
      style={styles.background}
      resizeMode="cover"
    >
        <View style={styles.bgOverlay} pointerEvents="none" />
        <ScrollView style={styles.container} contentContainerStyle={isDesktop && styles.containerDesktop}>
        {/* EN-TÊTE */}
        <View style={styles.header}>
            <View style={styles.headerContent}>
            <View style={styles.liveBadgeLarge}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveBadgeLargeTexte}>{t('live_room.live_badge')}</Text>
            </View>
            <Text style={styles.titre}>{t('live_room.create_title')}</Text>
            <Text style={styles.sousTitre}>
                {t('live_room.create_subtitle')}
            </Text>
            </View>
        </View>
        
        {/* INFORMATIONS DE BASE */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>📝 {t('live_room.section_info')}</Text>

            {/* Nom de la salle */}
            <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('live_room.room_name_label')}</Text>
            <TextInput
                style={styles.input}
                value={nomSalle}
                onChangeText={setNomSalle}
                placeholder={t('live_room.room_name_placeholder')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                maxLength={40}
            />
            <Text style={styles.helperText}>
                {t('live_room.char_count', { count: nomSalle.length, max: 40 })}
            </Text>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('live_room.description_label')}</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('live_room.description_placeholder')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                numberOfLines={3}
                maxLength={150}
            />
            <Text style={styles.helperText}>
                {t('live_room.char_count', { count: description.length, max: 150 })}
            </Text>
            </View>
        </View>
        
        {/* PARAMÈTRES DE VISIBILITÉ */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>🔒 {t('live_room.section_visibility')}</Text>

            <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>{t('live_room.private_room')}</Text>
                <Text style={styles.switchDescription}>
                {t('live_room.private_room_desc')}
                </Text>
            </View>
            <Switch
                value={sallePrivee}
                onValueChange={setSallePrivee}
                trackColor={{ false: '#767577', true: '#f1c40f' }}
                thumbColor={sallePrivee ? '#fff' : '#f4f3f4'}
            />
            </View>
            
            {sallePrivee && (
            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('live_room.password_label')}</Text>
                <TextInput
                style={styles.input}
                value={motDePasse}
                onChangeText={setMotDePasse}
                placeholder={t('live_room.password_placeholder')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                secureTextEntry
                maxLength={20}
                />
            </View>
            )}
        </View>
        
        {/* PARAMÈTRES DES SPECTATEURS */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>👁️ {t('live_room.section_spectators')}</Text>

            {/* Limite de spectateurs */}
            <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('live_room.spectator_limit')}</Text>
            <View style={styles.optionsGrid}>
                {limitsSpectateurs.map(limit => (
                <TouchableOpacity
                    key={limit}
                    style={[
                    styles.optionChip,
                    limitSpectateurs === limit && styles.optionChipActive
                    ]}
                    onPress={() => { playButtonSound(); setLimitSpectateurs(limit); }}
                >
                    <Text style={[
                    styles.optionChipTexte,
                    limitSpectateurs === limit && styles.optionChipTexteActive
                    ]}>
                    {limit >= 1000 ? `${limit / 1000}k` : limit}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>
            </View>
            
            {/* Mode spectateur */}
            <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('live_room.spectator_mode')}</Text>
            <View style={styles.modeContainer}>
                <TouchableOpacity
                style={[
                    styles.modeButton,
                    modeSpectateur === 'libre' && styles.modeButtonActive
                ]}
                onPress={() => { playButtonSound(); setModeSpectateur('libre'); }}
                >
                <Text style={[
                    styles.modeButtonTexte,
                    modeSpectateur === 'libre' && styles.modeButtonTexteActive
                ]}>
                    🌐 {t('live_room.mode_open')}
                </Text>
                <Text style={styles.modeDescription}>
                    {t('live_room.mode_open_desc')}
                </Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={[
                    styles.modeButton,
                    modeSpectateur === 'modere' && styles.modeButtonActive
                ]}
                onPress={() => { playButtonSound(); setModeSpectateur('modere'); }}
                >
                <Text style={[
                    styles.modeButtonTexte,
                    modeSpectateur === 'modere' && styles.modeButtonTexteActive
                ]}>
                    👮 {t('live_room.mode_moderated')}
                </Text>
                <Text style={styles.modeDescription}>
                    {t('live_room.mode_moderated_desc')}
                </Text>
                </TouchableOpacity>
            </View>
            </View>
        </View>
        
        {/* FONCTIONNALITÉS INTERACTIVES */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>💬 {t('live_room.section_interactions')}</Text>

            {/* Chat en direct */}
            <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>💬 {t('live_room.chat_label')}</Text>
                <Text style={styles.switchDescription}>
                {t('live_room.chat_desc')}
                </Text>
            </View>
            <Switch
                value={chatActif}
                onValueChange={setChatActif}
                trackColor={{ false: '#767577', true: '#f1c40f' }}
                thumbColor={chatActif ? '#fff' : '#f4f3f4'}
            />
            </View>

            {/* Audio Lobby */}
            <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>🎤 {t('live_room.audio_lobby_label')}</Text>
                <Text style={styles.switchDescription}>
                {t('live_room.audio_lobby_desc')}
                </Text>
            </View>
            <Switch
                value={audioLobbyActif}
                onValueChange={setAudioLobbyActif}
                trackColor={{ false: '#767577', true: '#f1c40f' }}
                thumbColor={audioLobbyActif ? '#fff' : '#f4f3f4'}
            />
            </View>

            {/* Réactions */}
            <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>😀 {t('live_room.reactions_label')}</Text>
                <Text style={styles.switchDescription}>
                {t('live_room.reactions_desc')}
                </Text>
            </View>
            <Switch
                value={reactionsActives}
                onValueChange={setReactionsActives}
                trackColor={{ false: '#767577', true: '#f1c40f' }}
                thumbColor={reactionsActives ? '#fff' : '#f4f3f4'}
            />
            </View>
        </View>
        
        {/* PARAMÈTRES DE JEU */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>⏱️ {t('live_room.section_game_rules')}</Text>

            <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>🏆 {t('live_room.tournament_mode')}</Text>
                <Text style={styles.switchDescription}>
                {t('live_room.tournament_mode_desc')}
                </Text>
            </View>
            <Switch
                value={isTournament}
                onValueChange={setIsTournament}
                trackColor={{ false: '#767577', true: '#f1c40f' }}
                thumbColor={isTournament ? '#fff' : '#f4f3f4'}
            />
            </View>
            
            {isTournament && (
            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('live_room.number_of_games')}</Text>
                <View style={styles.optionsGrid}>
                {[2, 4, 6, 8, 10].map(nb => (
                    <TouchableOpacity
                    key={nb}
                    style={[
                        styles.optionChip,
                        tournamentGames === nb && styles.optionChipActive
                    ]}
                    onPress={() => { playButtonSound(); setTournamentGames(nb); }}
                    >
                    <Text style={[
                        styles.optionChipTexte,
                        tournamentGames === nb && styles.optionChipTexteActive
                    ]}>
                        {nb}
                    </Text>
                    </TouchableOpacity>
                ))}
                </View>
                <Text style={styles.helperText}>
                {t('live_room.first_to_wins', { count: Math.floor(tournamentGames / 2) + 1 })}
                </Text>
            </View>
            )}

            <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('live_room.bet_coins')}</Text>
            <View style={styles.betContainer}>
                {(() => {
                    // Logic similar to HomeScreen for consistency
                    const availableBets = betOptions.filter(b => b <= (user?.coins || 0));
                    const effectiveBets = availableBets.length > 0 ? availableBets : [100];
                    const currentIndex = effectiveBets.indexOf(betAmount);
                    
                    const canGoPrev = currentIndex > 0;
                    const canGoNext = currentIndex < effectiveBets.length - 1;

                    return (
                        <>
                            <TouchableOpacity 
                                onPress={() => {
                                    playButtonSound();
                                    if (canGoPrev) setBetAmount(effectiveBets[currentIndex - 1]);
                                }}
                                disabled={!canGoPrev}
                                style={[styles.betButton, { opacity: !canGoPrev ? 0.3 : 1 }]}
                            >
                                <Ionicons name="remove-circle-outline" size={getResponsiveSize(40)} color="#fff" />
                            </TouchableOpacity>
                            
                            <View style={styles.betDisplay}>
                                <Text 
                                    style={styles.betTextSmall}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {currentIndex > 0 ? effectiveBets[currentIndex - 1].toLocaleString() : ''}
                                </Text>

                                <Text 
                                    style={styles.betTextLarge}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.5}
                                >
                                    {betAmount.toLocaleString()}
                                </Text>

                                <Text 
                                    style={styles.betTextSmall}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {currentIndex < effectiveBets.length - 1 ? effectiveBets[currentIndex + 1].toLocaleString() : ''}
                                </Text>
                            </View>

                            <TouchableOpacity 
                                onPress={() => {
                                    playButtonSound();
                                    if (canGoNext) setBetAmount(effectiveBets[currentIndex + 1]);
                                }}
                                disabled={!canGoNext}
                                style={[styles.betButton, { opacity: !canGoNext ? 0.3 : 1 }]}
                            >
                                <Ionicons name="add-circle-outline" size={getResponsiveSize(40)} color="#fff" />
                            </TouchableOpacity>
                        </>
                    );
                })()}
            </View>
            </View>
            
            <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('live_room.time_per_move')}</Text>
            <View style={styles.optionsGrid}>
                {tempsOptions.map(option => (
                <TouchableOpacity
                    key={option.valeur}
                    style={[
                    styles.optionChip,
                    tempsParCoup === option.valeur && styles.optionChipActive
                    ]}
                    onPress={() => { playButtonSound(); setTempsParCoup(option.valeur); }}
                >
                    <Text style={[
                    styles.optionChipTexte,
                    tempsParCoup === option.valeur && styles.optionChipTexteActive
                    ]}>
                    {option.label}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>
            </View>
        </View>
        
        {/* BOUTON CRÉER */}
        <View style={styles.footer}>
            <TouchableOpacity
            style={styles.boutonCreer}
            onPress={() => { playButtonSound(); creerSalleLive(); }}
            >
            <Text style={styles.boutonCreerTexte}>{t('live_room.create_live_room_btn')}</Text>
            <View style={styles.liveBadgeSmall}>
                <View style={styles.liveIndicatorSmall} />
            </View>
            </TouchableOpacity>
        </View>
        
        <View style={{ height: getResponsiveSize(40) }} />
        </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  containerDesktop: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    backgroundColor: T.bg1,
    paddingVertical: getResponsiveSize(28),
    paddingHorizontal: getResponsiveSize(20),
    marginBottom: getResponsiveSize(16),
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  headerContent: {
    alignItems: 'center',
  },
  liveBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230,57,70,0.15)',
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(6),
    borderRadius: getResponsiveSize(T.radiusPill),
    marginBottom: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: T.red,
  },
  liveIndicator: {
    width: getResponsiveSize(8),
    height: getResponsiveSize(8),
    borderRadius: getResponsiveSize(4),
    backgroundColor: T.red,
    marginRight: getResponsiveSize(8),
  },
  liveBadgeLargeTexte: {
    color: T.red,
    fontWeight: '800',
    fontSize: getResponsiveSize(12),
    letterSpacing: 1,
  },
  titre: {
    fontSize: getResponsiveSize(24),
    fontWeight: '900',
    color: T.text,
    marginBottom: getResponsiveSize(4),
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sousTitre: {
    fontSize: getResponsiveSize(13),
    color: T.textDim,
    textAlign: 'center',
    maxWidth: '80%',
  },
  sectionCard: {
    backgroundColor: T.bg2,
    marginHorizontal: getResponsiveSize(16),
    marginBottom: getResponsiveSize(16),
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(18),
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  sectionTitre: {
    fontSize: getResponsiveSize(16),
    fontWeight: '800',
    color: T.text,
    marginBottom: getResponsiveSize(14),
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
    paddingBottom: getResponsiveSize(10),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputGroup: {
    marginBottom: getResponsiveSize(14),
  },
  label: {
    fontSize: getResponsiveSize(13),
    fontWeight: '700',
    color: T.gold,
    marginBottom: getResponsiveSize(7),
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.borderSoft,
    borderRadius: getResponsiveSize(T.radiusSm),
    padding: getResponsiveSize(12),
    fontSize: getResponsiveSize(15),
    color: T.text,
  },
  textArea: {
    minHeight: getResponsiveSize(80),
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    marginTop: getResponsiveSize(4),
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(4),
  },
  switchInfo: {
    flex: 1,
    paddingRight: getResponsiveSize(10),
  },
  switchLabel: {
    fontSize: getResponsiveSize(14),
    fontWeight: '700',
    color: T.text,
    marginBottom: getResponsiveSize(2),
  },
  switchDescription: {
    fontSize: getResponsiveSize(12),
    color: T.textMuted,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(8),
  },
  optionChip: {
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.borderSoft,
    paddingVertical: getResponsiveSize(7),
    paddingHorizontal: getResponsiveSize(12),
    borderRadius: getResponsiveSize(T.radiusPill),
    minWidth: getResponsiveSize(56),
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: T.gold,
    borderColor: T.gold,
  },
  optionChipTexte: {
    fontSize: getResponsiveSize(13),
    color: T.textDim,
    fontWeight: '600',
  },
  optionChipTexteActive: {
    color: '#1B1305',
    fontWeight: '800',
  },
  modeContainer: {
    flexDirection: 'row',
    gap: getResponsiveSize(10),
  },
  modeButton: {
    flex: 1,
    padding: getResponsiveSize(13),
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    borderColor: T.borderSoft,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: T.gold,
    borderColor: T.gold,
  },
  modeButtonTexte: {
    fontSize: getResponsiveSize(14),
    fontWeight: '800',
    color: T.text,
    marginBottom: getResponsiveSize(4),
  },
  modeButtonTexteActive: {
    color: '#1B1305',
  },
  modeDescription: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: getResponsiveSize(16),
    marginBottom: getResponsiveSize(20),
  },
  boutonCreer: {
    backgroundColor: T.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(T.radiusMd),
    shadowColor: T.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.5)',
  },
  boutonCreerTexte: {
    color: '#fff',
    fontSize: getResponsiveSize(15),
    fontWeight: '800',
    marginRight: getResponsiveSize(10),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveBadgeSmall: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: getResponsiveSize(4),
    borderRadius: getResponsiveSize(4),
  },
  liveIndicatorSmall: {
    width: getResponsiveSize(6),
    height: getResponsiveSize(6),
    borderRadius: getResponsiveSize(3),
    backgroundColor: '#fff',
  },
  betContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: getResponsiveSize(10),
  },
  betButton: {
    padding: getResponsiveSize(10),
  },
  betDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: getResponsiveSize(280),
    height: getResponsiveSize(50),
    overflow: 'hidden',
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusPill),
    marginHorizontal: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: T.border,
  },
  betTextSmall: {
    color: T.gold,
    fontSize: getResponsiveSize(14),
    opacity: 0.45,
    width: getResponsiveSize(70),
    textAlign: 'center',
  },
  betTextLarge: {
    color: T.gold,
    fontSize: getResponsiveSize(22),
    fontWeight: '900',
    width: getResponsiveSize(120),
    textAlign: 'center',
  },
});

export default ConfigurationSalleLive;
