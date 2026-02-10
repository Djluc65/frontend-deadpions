import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground, Image, Alert, Modal, FlatList, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { socket } from '../utils/socket';
import { API_URL } from '../config';
import { playButtonSound } from '../utils/soundManager';
import { getAvatarSource as getBaseAvatarSource } from '../utils/avatarUtils';

/**
 * Écran de la salle d'attente pour les jeux en direct.
 * Affiche les informations de la salle, la liste des spectateurs et permet au créateur de lancer la partie.
 */
const SalleAttenteLive = ({ route, navigation }) => {
  // Récupération de la configuration de la salle passée via la navigation
  const params = route.params || {};
  const [configSalle, setConfigSalle] = useState(params.configSalle || null);
  const roomId = params.roomId || (configSalle ? configSalle.id : null);

  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  
  // --- États locaux ---
  const [spectateurs, setSpectateurs] = useState(configSalle && Array.isArray(configSalle.spectateurs) ? configSalle.spectateurs : []); // Liste des spectateurs présents
  const [isCreator, setIsCreator] = useState(false); // Vérifie si l'utilisateur est le créateur de la salle
  const [opponent, setOpponent] = useState(null); // Joueur adverse (Blanc)
  const [loading, setLoading] = useState(!configSalle);
  
  // Invitation State
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const getAvatarSource = (avatar) => {
    return getBaseAvatarSource(avatar);
  };

  // Vérification des droits du créateur au chargement
  useEffect(() => {
    if (user && configSalle && configSalle.createur) {
        const creatorId = configSalle.createur._id || configSalle.createur.id;
        const userId = user._id || user.id;
        setIsCreator(creatorId.toString() === userId.toString());
    }
  }, [user, configSalle]);

  // Connexion au salon socket et écoute du démarrage
  useEffect(() => {
      if (roomId) {
          // Rejoindre la salle socket pour recevoir les événements (game_start, etc.)
          socket.emit('join_live_room', { gameId: roomId });

          const handleGameStart = (data) => {
              console.log('Game start received in waiting room:', data);
              if (!configSalle && !data.roomConfig) return; 

              navigation.replace('Game', {
                  mode: 'live',
                  gameId: roomId,
                  roomConfig: configSalle || data.roomConfig,
                  players: data.players,
                  timeControl: (configSalle || data.roomConfig).parametres.tempsParCoup,
                  currentTurn: data.currentTurn,
                  tournamentSettings: data.tournamentSettings
              });
          };

          const handleSpectatorUpdate = (list) => {
              console.log('Spectators updated:', list);
              setSpectateurs(list);
          };

          const handlePlayerJoined = (data) => {
              console.log('Player joined:', data);
              if (data.role === 'white') {
                  setOpponent(data.player);
              }
          };

          const handleLiveRoomJoined = (data) => {
              console.log('Live room joined data:', data);
              
              if (!configSalle && data.config) {
                  setConfigSalle(data.config);
                  setLoading(false);
              }

              if (data.players && data.players.white) {
                  setOpponent(data.players.white);
              }
              if (data.spectators) {
                  setSpectateurs(data.spectators);
              }
          };

          const handleLiveRoomClosed = () => {
              Alert.alert('Live terminé', 'Le créateur a fermé la salle.', [
                  { text: 'OK', onPress: () => navigation.navigate('Home') }
              ]);
          };

          const handleOpponentLeftLive = () => {
              setOpponent(null);
              // Optionnel : Toast ou petit message
          };

          const handleError = (message) => {
              Alert.alert('Erreur', message, [
                  { text: 'OK', onPress: () => navigation.goBack() }
              ]);
          };

          socket.on('game_start', handleGameStart);
          socket.on('spectator_list_updated', handleSpectatorUpdate);
          socket.on('player_joined', handlePlayerJoined);
          socket.on('live_room_joined', handleLiveRoomJoined);
          socket.on('live_room_closed', handleLiveRoomClosed);
          socket.on('opponent_left_live', handleOpponentLeftLive);
          socket.on('error', handleError);

          return () => {
              socket.off('game_start', handleGameStart);
              socket.off('spectator_list_updated', handleSpectatorUpdate);
              socket.off('player_joined', handlePlayerJoined);
              socket.off('live_room_joined', handleLiveRoomJoined);
              socket.off('live_room_closed', handleLiveRoomClosed);
              socket.off('opponent_left_live', handleOpponentLeftLive);
              socket.off('error', handleError);
          };
      }
  }, [roomId, navigation, configSalle]);

  const handleStopLive = () => {
      Alert.alert(
          "Arrêter le Live ?",
          "Cela fermera la salle pour tous les participants.",
          [
              { text: "Annuler", style: "cancel" },
              { 
                  text: "Arrêter", 
                  style: "destructive", 
                  onPress: () => {
                      socket.emit('stop_live_room', { gameId: roomId });
                      navigation.navigate('Home');
                  }
              }
          ]
      );
  };

  const handleLeaveLive = () => {
      Alert.alert(
          "Quitter le Live ?",
          "Voulez-vous vraiment quitter la salle ?",
          [
              { text: "Annuler", style: "cancel" },
              { 
                  text: "Quitter", 
                  style: "destructive", 
                  onPress: () => {
                      // socket.emit('quit_waiting_room', { gameId: roomId }); // Assuming this exists or just disconnect handling
                      navigation.navigate('Home');
                  }
              }
          ]
      );
  };

  const handleBackPress = () => {
      if (isCreator) {
          handleStopLive();
      } else {
          handleLeaveLive();
      }
  };


  /**
   * Gère le lancement de la partie par le créateur.
   * Note: Si un joueur rejoint via invitation, l'événement game_start déclenchera aussi la navigation.
   */
  const handleStartGame = () => {
    if (!opponent) {
        Alert.alert('Attente', 'Veuillez attendre qu\'un adversaire rejoigne la partie.');
        return;
    }
    // Emit event to start the game on backend
    socket.emit('start_live_game', {
        gameId: roomId
    });
  };

  /**
   * Permet de partager le lien ou l'ID de la salle.
   */
  const handleShare = async () => {
    try {
        const result = await Share.share({
            message: `Rejoins ma partie sur DeadPions ! 🎲\nClique ici : deadpions://live/${roomId}`,
            url: `deadpions://live/${roomId}`, // iOS support
            title: 'Invitation DeadPions'
        });
        
        if (result.action === Share.sharedAction) {
            if (result.activityType) {
                // shared with activity type of result.activityType
            } else {
                // shared
            }
        } else if (result.action === Share.dismissedAction) {
            // dismissed
        }
    } catch (error) {
        Alert.alert(error.message);
    }
  };

  // --- Invitation Functions ---
  const fetchFriends = async () => {
    if (!token) return;
    setLoadingFriends(true);
    try {
        const res = await fetch(`${API_URL}/friends`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            const friendsList = Array.isArray(data) ? data : [];
            setFriends(friendsList.map(f => ({
                id: f._id,
                pseudo: f.pseudo,
                avatar: f.avatar,
                isOnline: f.isOnline
            })));
        }
    } catch (err) {
        console.error('Error fetching friends:', err);
        Alert.alert('Erreur', 'Impossible de charger la liste d\'amis');
    } finally {
        setLoadingFriends(false);
    }
  };

  const handleOpenInviteModal = () => {
      setInviteModalVisible(true);
      fetchFriends();
  };

  const handleSendInvite = (friendId) => {
      socket.emit('invite_friend', {
          recipientId: friendId,
          betAmount: configSalle.parametres.betAmount,
          timeControl: configSalle.parametres.tempsParCoup,
          gameId: roomId,
          mode: 'live'
      });
      Alert.alert('Succès', 'Invitation envoyée !');
      setInviteModalVisible(false);
  };

  if (loading || !configSalle) {
      return (
          <ImageBackground 
            source={require('../../assets/images/Background2-4.png')} 
            style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}
          >
              <ActivityIndicator size="large" color="#f1c40f" />
              <Text style={{ color: '#fff', marginTop: 20 }}>Chargement de la salle...</Text>
          </ImageBackground>
      );
  }

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => { playButtonSound(); handleBackPress(); }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{configSalle.nom}</Text>
            <View style={styles.liveBadge}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveText}>EN ATTENTE</Text>
            </View>
        </View>
        <TouchableOpacity onPress={() => { playButtonSound(); handleShare(); }} style={styles.shareButton}>
            <Ionicons name="share-social-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Info Salle */}
        <View style={styles.card}>
            <View style={styles.playersContainer}>
                {/* Creator Side */}
                <View style={styles.playerSide}>
                    <Text style={styles.roleLabel}>Hôte (Noir)</Text>
                    <View style={styles.avatarContainer}>
                        {configSalle.createur.avatar ? (
                            <Image source={getAvatarSource(configSalle.createur.avatar)} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={50} color="#374151" />
                        )}
                        {configSalle.createur.pays && (
                            <Text style={styles.flag}>{configSalle.createur.pays}</Text>
                        )}
                    </View>
                    <Text style={styles.pseudo} numberOfLines={1}>{configSalle.createur.pseudo}</Text>
                    <Text style={styles.level}>Niv. {configSalle.createur.niveau}</Text>
                </View>

                {/* VS Badge */}
                <View style={styles.vsContainer}>
                    <Text style={styles.vsText}>VS</Text>
                </View>

                {/* Opponent Side */}
                <View style={styles.playerSide}>
                    <Text style={styles.roleLabel}>Adversaire (Blanc)</Text>
                    {opponent ? (
                        <>
                            <View style={styles.avatarContainer}>
                                {opponent.avatar ? (
                                    <Image source={getAvatarSource(opponent.avatar)} style={styles.avatarImage} />
                                ) : (
                                    <Ionicons name="person-circle-outline" size={50} color="#374151" />
                                )}
                                {opponent.country && (
                                    <Text style={styles.flag}>{opponent.country}</Text>
                                )}
                            </View>
                            <Text style={styles.pseudo} numberOfLines={1}>{opponent.pseudo}</Text>
                            {opponent.niveau !== undefined && (
                                <Text style={styles.level}>Niv. {opponent.niveau}</Text>
                            )}
                        </>
                    ) : (
                        <View style={styles.waitingOpponent}>
                            {isCreator ? (
                                <TouchableOpacity onPress={() => { playButtonSound(); handleOpenInviteModal(); }} style={styles.inviteButton}>
                                    <View style={[styles.avatarImage, styles.avatarPlaceholder, { borderColor: '#10b981', borderStyle: 'solid', borderWidth: 2 }]}>
                                        <Ionicons name="add" size={32} color="#10b981" />
                                    </View>
                                    <Text style={[styles.waitingTextSmall, { color: '#10b981', fontWeight: 'bold', marginTop: 4 }]}>Inviter</Text>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                                        <Ionicons name="help" size={30} color="#9ca3af" />
                                    </View>
                                    <Text style={styles.waitingTextSmall}>En attente...</Text>
                                </>
                            )}
                        </View>
                    )}
                </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.paramsGrid}>
                <View style={styles.paramItem}>
                    <Ionicons name="cash-outline" size={20} color="#f1c40f" />
                    <Text style={[styles.paramText, { color: '#f1c40f' }]}>
                        {configSalle.parametres.betAmount ? `${configSalle.parametres.betAmount.toLocaleString()} 🪙` : 'Gratuit'}
                    </Text>
                </View>
                <View style={styles.paramItem}>
                    <Ionicons name="time-outline" size={20} color="#9ca3af" />
                    <Text style={styles.paramText}>
                        {configSalle.parametres.tempsParCoup === 0 ? 'Illimité' : `${configSalle.parametres.tempsParCoup}s`}
                    </Text>
                </View>
                <View style={styles.paramItem}>
                    <Ionicons name="people-outline" size={20} color="#9ca3af" />
                    <Text style={styles.paramText}>
                        {spectateurs.length}/{configSalle.parametres.limitSpectateurs}
                    </Text>
                </View>
            </View>
            
            <Text style={styles.description}>{configSalle.description}</Text>
        </View>

        {/* Liste Spectateurs */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spectateurs ({spectateurs.length})</Text>
        </View>

        {spectateurs.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>En attente de spectateurs...</Text>
            </View>
        ) : (
            spectateurs.map((spec, index) => (
                <View key={index} style={styles.spectatorRow}>
                    <Text style={styles.specAvatar}>👤</Text>
                    <Text style={styles.specName}>Spectateur {index + 1}</Text>
                </View>
            ))
        )}

        {isCreator && (
            <View style={styles.footerActions}>
                <TouchableOpacity 
                    style={styles.stopButton} 
                    onPress={handleStopLive}
                >
                    <Ionicons name="stop-circle-outline" size={24} color="#ef4444" />
                    <Text style={styles.stopButtonText}>Arrêter le Live</Text>
                </TouchableOpacity>
            </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Actions de pied de page */}
      <View style={styles.footer}>
        {isCreator ? (
            <TouchableOpacity 
                style={styles.mainButton}
                onPress={handleStartGame}
            >
                <Text style={styles.mainButtonText}>LANCER LA PARTIE</Text>
                <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
        ) : (
            <View style={styles.waitingMessage}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.waitingText}>En attente de l'hôte...</Text>
            </View>
        )}
      </View>

      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Inviter un ami</Text>
                    <TouchableOpacity onPress={() => setInviteModalVisible(false)} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {loadingFriends ? (
                    <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 20 }} />
                ) : (
                    <FlatList
                        data={friends}
                        keyExtractor={item => item.id}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>Aucun ami trouvé</Text>
                        }
                        renderItem={({ item }) => (
                            <View style={styles.friendItem}>
                                <View style={styles.friendInfo}>
                                    {item.avatar ? (
                                        <Image source={getAvatarSource(item.avatar)} style={styles.friendAvatar} />
                                    ) : (
                                        <Ionicons name="person-circle-outline" size={40} color="#9ca3af" />
                                    )}
                                    <View>
                                        <Text style={styles.friendPseudo}>{item.pseudo}</Text>
                                        <Text style={[styles.friendStatus, { color: item.isOnline ? '#10b981' : '#9ca3af' }]}>
                                            {item.isOnline ? 'En ligne' : 'Hors ligne'}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    style={styles.inviteAction}
                                    onPress={() => { playButtonSound(); handleSendInvite(item.id); }}
                                >
                                    <Text style={styles.inviteActionText}>Inviter</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(4, 28, 85, 0.9)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  playerSide: {
    flex: 1,
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  vsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    transform: [{ rotate: '15deg' }],
  },
  vsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  waitingOpponent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderColor: '#9ca3af',
  },
  waitingTextSmall: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 5,
    fontStyle: 'italic',
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  flag: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 2,
  },
  userInfo: {
    flex: 1,
  },
  pseudo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  level: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 15,
  },
  paramsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  paramItem: {
    alignItems: 'center',
    gap: 5,
  },
  paramText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 10,
  },
  spectatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  specAvatar: {
    fontSize: 20,
    marginRight: 10,
  },
  specName: {
    color: '#fff',
    fontSize: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(4, 28, 85, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  inviteButton: {
      alignItems: 'center',
      justifyContent: 'center',
  },
  invitePlaceholder: {
      backgroundColor: '#f0fdf4',
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      backgroundColor: '#fff',
      width: '90%',
      maxHeight: '80%',
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 5,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
      paddingBottom: 15,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#111827',
  },
  closeButton: {
      padding: 5,
  },
  friendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
  },
  friendInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  friendAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 15,
      backgroundColor: '#f3f4f6',
  },
  friendPseudo: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: 2,
  },
  friendStatus: {
      fontSize: 12,
  },
  inviteAction: {
      backgroundColor: '#10b981',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
  },
  inviteActionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
  },
  emptyText: {
      textAlign: 'center',
      color: '#6b7280',
      marginTop: 20,
      fontSize: 16,
  },
  waitingText: {
      color: 'white',
      fontSize: 16,
      bottom: 3,
      left: 120
  },
  footerActions: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  stopButtonText: {
    color: '#ef4444',
    marginLeft: 8,
    fontWeight: 'bold',
  }
});

export default SalleAttenteLive;
