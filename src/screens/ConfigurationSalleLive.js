import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert, ImageBackground } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { socket } from '../utils/socket';
import { playButtonSound } from '../utils/soundManager';

/**
 * Écran de configuration pour la création d'une salle live.
 * Permet à l'utilisateur de définir les paramètres de la salle (nom, confidentialité, spectateurs, etc.).
 */
const ConfigurationSalleLive = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
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
    { valeur: null, label: 'Illimité' }
  ];

  const betOptions = [
    100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 
    100000, 250000, 500000, 1000000, 2500000, 5000000, 
    10000000, 25000000, 50000000, 100000000, 250000000, 
    500000000, 1000000000, 2500000000, 5000000000
  ];
  
  /**
   * Fonction pour créer la salle live.
   * Valide les entrées et navigue vers la salle d'attente.
   */
  const creerSalleLive = () => {
    // --- Validation des champs obligatoires ---
    if (!nomSalle.trim()) {
      Alert.alert('❌ Erreur', 'Veuillez donner un nom à votre salle');
      return;
    }
    
    if (sallePrivee && !motDePasse.trim()) {
      Alert.alert('❌ Erreur', 'Veuillez définir un mot de passe pour la salle privée');
      return;
    }
    
    if (nomSalle.length < 3) {
      Alert.alert('❌ Erreur', 'Le nom doit contenir au moins 3 caractères');
      return;
    }
    
    // --- Construction de l'objet de configuration de la salle ---
    const configSalle = {
      id: 'live_' + Date.now(),
      nom: nomSalle,
      description: description || 'Partie en direct',
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
        navigation.navigate('SalleAttenteLive', { configSalle: createdConfig });
    };

    const handleError = (message) => {
        cleanup();
        Alert.alert('Erreur', message);
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
        <ScrollView style={styles.container}>
        {/* EN-TÊTE */}
        <View style={styles.header}>
            <View style={styles.headerContent}>
            <View style={styles.liveBadgeLarge}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveBadgeLargeTexte}>LIVE</Text>
            </View>
            <Text style={styles.titre}>Créer une Salle Live</Text>
            <Text style={styles.sousTitre}>
                Créez une partie publique que tout le monde peut regarder
            </Text>
            </View>
        </View>
        
        {/* INFORMATIONS DE BASE */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>📝 Informations</Text>
            
            {/* Nom de la salle */}
            <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom de la salle *</Text>
            <TextInput
                style={styles.input}
                value={nomSalle}
                onChangeText={setNomSalle}
                placeholder="Ex: Tournoi du Champion"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                maxLength={40}
            />
            <Text style={styles.helperText}>
                {nomSalle.length}/40 caractères
            </Text>
            </View>
            
            {/* Description */}
            <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (optionnel)</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez votre salle..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                numberOfLines={3}
                maxLength={150}
            />
            <Text style={styles.helperText}>
                {description.length}/150 caractères
            </Text>
            </View>
        </View>
        
        {/* PARAMÈTRES DE VISIBILITÉ */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>🔒 Visibilité</Text>
            
            <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Salle privée</Text>
                <Text style={styles.switchDescription}>
                Nécessite un mot de passe pour rejoindre
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
                <Text style={styles.label}>Mot de passe *</Text>
                <TextInput
                style={styles.input}
                value={motDePasse}
                onChangeText={setMotDePasse}
                placeholder="Définir un mot de passe"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                secureTextEntry
                maxLength={20}
                />
            </View>
            )}
        </View>
        
        {/* PARAMÈTRES DES SPECTATEURS */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>👁️ Spectateurs</Text>
            
            {/* Limite de spectateurs */}
            <View style={styles.inputGroup}>
            <Text style={styles.label}>Limite de spectateurs</Text>
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
            <Text style={styles.label}>Mode spectateur</Text>
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
                    🌐 Libre
                </Text>
                <Text style={styles.modeDescription}>
                    Tout le monde peut rejoindre
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
                    👮 Modéré
                </Text>
                <Text style={styles.modeDescription}>
                    Vous approuvez les spectateurs
                </Text>
                </TouchableOpacity>
            </View>
            </View>
        </View>
        
        {/* FONCTIONNALITÉS INTERACTIVES */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitre}>💬 Interactions</Text>
            
            {/* Chat en direct */}
            <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>💬 Chat en direct</Text>
                <Text style={styles.switchDescription}>
                Les spectateurs peuvent discuter pendant la partie
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
                <Text style={styles.switchLabel}>🎤 Audio Lobby</Text>
                <Text style={styles.switchDescription}>
                Les spectateurs peuvent activer leur micro
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
                <Text style={styles.switchLabel}>😀 Réactions live</Text>
                <Text style={styles.switchDescription}>
                Emojis et réactions en temps réel
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
            <Text style={styles.sectionTitre}>⏱️ Règles du jeu</Text>
            
            <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>🏆 Mode Tournoi</Text>
                <Text style={styles.switchDescription}>
                Jouer un match en plusieurs manches
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
                <Text style={styles.label}>Nombre de parties</Text>
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
                Le premier à {Math.floor(tournamentGames / 2) + 1} victoires gagne
                </Text>
            </View>
            )}

            <View style={styles.inputGroup}>
            <Text style={styles.label}>Mise (coins)</Text>
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
                                <Ionicons name="remove-circle-outline" size={40} color="#fff" />
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
                                <Ionicons name="add-circle-outline" size={40} color="#fff" />
                            </TouchableOpacity>
                        </>
                    );
                })()}
            </View>
            </View>
            
            <View style={styles.inputGroup}>
            <Text style={styles.label}>Temps par coup</Text>
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
            <Text style={styles.boutonCreerTexte}>CRÉER LA SALLE LIVE</Text>
            <View style={styles.liveBadgeSmall}>
                <View style={styles.liveIndicatorSmall} />
            </View>
            </TouchableOpacity>
        </View>
        
        <View style={{ height: 40 }} />
        </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#041c55',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1c40f',
  },
  headerContent: {
    alignItems: 'center',
  },
  liveBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  liveBadgeLargeTexte: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  titre: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
    textAlign: 'center',
  },
  sousTitre: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    maxWidth: '80%',
  },
  sectionCard: {
    backgroundColor: '#041c55',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  sectionTitre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1c40f',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#f1c40f',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 5,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1c40f',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 13,
    color: '#d1d5db',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#f1c40f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f',
  },
  optionChipTexte: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  optionChipTexteActive: {
    color: '#041c55',
    fontWeight: 'bold',
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1c40f',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#f1c40f',
    borderColor: '#f1c40f',
  },
  modeButtonTexte: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  modeButtonTexteActive: {
    color: '#041c55',
  },
  modeDescription: {
    fontSize: 12,
    color: '#d1d5db',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  boutonCreer: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  boutonCreerTexte: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  liveBadgeSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 4,
    borderRadius: 4,
  },
  liveIndicatorSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  betContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  betButton: {
    padding: 10,
  },
  betDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 50,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.3)',
  },
  betTextSmall: {
    color: '#f1c40f',
    fontSize: 14,
    opacity: 0.5,
    width: 70,
    textAlign: 'center',
  },
  betTextLarge: {
    color: '#f1c40f',
    fontSize: 22,
    fontWeight: 'bold',
    width: 120,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
});

export default ConfigurationSalleLive;
