import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground, Image, Modal, FlatList, ActivityIndicator, Share, Platform, useWindowDimensions } from 'react-native';
import { T } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { socket } from '../utils/socket';
import { API_URL } from '../config';
import { playButtonSound } from '../utils/soundManager';
import { getAvatarSource as getBaseAvatarSource } from '../utils/avatarUtils';
import { getResponsiveSize, isTablet } from '../utils/responsive';
import { appAlert } from '../services/appAlert';
import QRCode from 'react-native-qrcode-svg';

/**
 * Écran de la salle d'attente pour les jeux en direct.
 * Affiche les informations de la salle, la liste des spectateurs et permet au créateur de lancer la partie.
 */
const SalleAttenteLive = ({ route, navigation }) => {
  const { t } = useTranslation();
  // Récupération de la configuration de la salle passée via la navigation
  const params = route.params || {};
  const [configSalle, setConfigSalle] = useState(params.configSalle || null);
  const configSalleRef = useRef(params.configSalle || null);
  const creatorIdRef = useRef(
    (params.configSalle?.createur?._id || params.configSalle?.createur?.id || null)
  );
  const roomId = params.roomId || (configSalle ? configSalle.id : null);
  
  // Update ref when state changes
  useEffect(() => {
    configSalleRef.current = configSalle;
    const nextCreatorId = configSalle?.createur?._id || configSalle?.createur?.id || null;
    if (nextCreatorId) creatorIdRef.current = nextCreatorId;
  }, [configSalle]);

  const isLeavingRef = useRef(false);
  const detachRef = useRef(null);
  const didNavigateToGameRef = useRef(false);

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const [isStartingGame, setIsStartingGame] = useState(false);
  
  // --- États locaux ---
  const [spectateurs, setSpectateurs] = useState(configSalle && Array.isArray(configSalle.spectateurs) ? configSalle.spectateurs : []); // Liste des spectateurs présents
  const [isCreator, setIsCreator] = useState(false); // Vérifie si l'utilisateur est le créateur de la salle
  const [opponent, setOpponent] = useState(null); // Joueur adverse (le challenger)
  const [creatorColor, setCreatorColor] = useState('black'); // Couleur de l'hôte (par défaut noir)
  const [loading, setLoading] = useState(!configSalle);
  
  // Invitation State
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [autoInviteDone, setAutoInviteDone] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const lastOpponentLeftAlertAtRef = useRef(0);

  const getAvatarSource = (avatar) => {
    return getBaseAvatarSource(avatar);
  };

  // Vérification des droits du créateur au chargement
  useEffect(() => {
    const userId = user?._id || user?.id;
    const creatorId = creatorIdRef.current || configSalle?.createur?._id || configSalle?.createur?.id;
    if (!userId || !creatorId) return;
    setIsCreator(creatorId.toString() === userId.toString());
  }, [user, configSalle]);

  // Auto-ouvrir la fenêtre d'invitation si demandé et si l'utilisateur est créateur
  useEffect(() => {
    const shouldAutoInvite = route.params && route.params.autoInvite;
    if (!autoInviteDone && shouldAutoInvite && isCreator && configSalle) {
      setAutoInviteDone(true);
      setInviteModalVisible(true);
      fetchFriends();
    }
  }, [route.params, isCreator, configSalle, autoInviteDone]);

  // Connexion au salon socket et écoute du démarrage
  useEffect(() => {
      if (roomId) {
          const userId = user?._id || user?.id;
          if (!socket.connected) socket.connect();
          if (userId) socket.emit('join_user_room', userId);

          // Rejoindre la salle socket pour recevoir les événements (game_start, etc.)
          socket.emit('join_live_room', { gameId: roomId });

          const handleGameStart = (data) => {
              if (isLeavingRef.current) return;
              if (didNavigateToGameRef.current) return;
              setIsStartingGame(false);
              console.log('Game start received in waiting room:', data);
              if (!configSalle && !data.roomConfig) return; 

              didNavigateToGameRef.current = true;
              try { detachRef.current?.(); } catch (_) {}

              navigation.replace('Game', {
                  mode: 'live',
                  gameId: roomId,
                  roomConfig: configSalleRef.current || data.roomConfig,
                  players: data.players,
                  timeControl: (configSalleRef.current || data.roomConfig).parametres.tempsParCoup,
                  currentTurn: data.currentTurn,
                  tournamentSettings: data.tournamentSettings,
                  liveStartedAt: data.liveStartedAt
              });
          };

          const handleSpectatorUpdate = (list) => {
              if (isLeavingRef.current) return;
              console.log('Spectators updated:', list);
              setSpectateurs(list);
          };

          const handlePlayerJoined = (data) => {
              if (isLeavingRef.current) return;
              console.log('Player joined:', data);
              // Si le joueur qui rejoint n'est pas le créateur, c'est l'adversaire
              const creatorId = (configSalleRef.current?.createur?._id || configSalleRef.current?.createur?.id) || (user?._id || user?.id);
              const joinedId = data.player._id || data.player.id;
              
              if (creatorId && joinedId !== creatorId) {
                  setOpponent(data.player);
              }
          };

          const handleLiveRoomJoined = (data) => {
              if (isLeavingRef.current) return;
              console.log('Live room joined data:', data);
              
              let currentConfig = configSalleRef.current;
              if (!currentConfig && data.config) {
                  setConfigSalle(data.config);
                  setLoading(false);
                  currentConfig = data.config;
              } else if (data.config) {
                  // Merge code and other potential updates
                  setConfigSalle(prev => ({ ...prev, ...data.config }));
                  currentConfig = { ...currentConfig, ...data.config };
              }

              if (data.spectators) {
                  setSpectateurs(data.spectators);
              }

              // Déterminer la couleur du créateur et l'adversaire
              if (data.players && currentConfig && currentConfig.createur) {
                  const creatorId = currentConfig.createur._id || currentConfig.createur.id;
                  
                  // Vérifier si le créateur est blanc
                  if (data.players.white && (data.players.white._id || data.players.white.id) === creatorId) {
                      setCreatorColor('white');
                      // L'adversaire est noir (s'il existe et n'est pas le créateur)
                      if (data.players.black && (data.players.black._id || data.players.black.id) !== creatorId) {
                          setOpponent(data.players.black);
                      } else {
                          setOpponent(null);
                      }
                  } 
                  // Sinon vérifier s'il est noir
                  else if (data.players.black && (data.players.black._id || data.players.black.id) === creatorId) {
                      setCreatorColor('black');
                      // L'adversaire est blanc (s'il existe et n'est pas le créateur)
                      if (data.players.white && (data.players.white._id || data.players.white.id) !== creatorId) {
                          setOpponent(data.players.white);
                      } else {
                          setOpponent(null);
                      }
                  }
              }
          };

          const handleLiveRoomClosed = () => {
              if (isLeavingRef.current) return;
              appAlert(t('live_room.live_ended'), t('live_room.creator_closed_room'), [
                  { text: t('common.ok'), onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) }
              ]);
          };

          const handleInvitationDeclined = (data) => {
              if (isLeavingRef.current) return;
              console.log('[InvitationDeclined]', data);
              setOpponent(null);
              setIsStartingGame(false);
              
              const creatorId = (configSalleRef.current?.createur?._id || configSalleRef.current?.createur?.id) || creatorIdRef.current;
              const userId = user?._id || user?.id;
              if (creatorId && userId && creatorId.toString() === userId.toString()) {
                  setIsCreator(true);
              }

              appAlert(
                  t('common.info'),
                  t('live_room.invitation_declined_desc', { pseudo: data.recipientPseudo || t('common.friend') })
              );
          };

          const handleOpponentLeftLive = () => {
              if (isLeavingRef.current) return;
              const now = Date.now();
              if (now - lastOpponentLeftAlertAtRef.current < 1500) return;
              lastOpponentLeftAlertAtRef.current = now;

              const creatorId = (configSalleRef.current?.createur?._id || configSalleRef.current?.createur?.id) || creatorIdRef.current;
              const userId = user?._id || user?.id;
              const isCreatorEffective = Boolean(creatorId && userId && creatorId.toString() === userId.toString());
              
              console.log('[OpponentLeft] isCreatorEffective:', isCreatorEffective, 'userId:', userId, 'creatorId:', creatorId);
              
              didNavigateToGameRef.current = false;
              setIsStartingGame(false);
              setOpponent(null);
              setInviteModalVisible(false);
              setLoadingFriends(false);
              setFriends([]);
              
              if (isCreatorEffective) {
                  setIsCreator(true);
                  appAlert(
                      t('live_room.guest_left'),
                      t('live_room.guest_left_desc'),
                      [
                          { text: t('common.ok') }
                      ]
                  );
              }
          };

          const handleError = (message) => {
              if (isLeavingRef.current) return;
              setIsGeneratingCode(false);
              setIsStartingGame(false);
              appAlert(t('common.error'), message, [
                  { text: t('common.ok'), onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }) }
              ]);
          };

          const handleRoomCodeGenerated = (data) => {
              if (isLeavingRef.current) return;
              console.log('Room code generated:', data);
              setIsGeneratingCode(false);
              setConfigSalle(prev => ({ 
                  ...(prev || configSalleRef.current || {}), 
                  roomCode: data.roomCode
              }));
          };

          socket.on('game_start', handleGameStart);
          socket.on('spectator_list_updated', handleSpectatorUpdate);
          socket.on('player_joined', handlePlayerJoined);
          socket.on('live_room_joined', handleLiveRoomJoined);
          socket.on('live_room_closed', handleLiveRoomClosed);
          socket.on('opponent_left_live', handleOpponentLeftLive);
          socket.on('invitation_declined', handleInvitationDeclined);
          socket.on('room_code_generated', handleRoomCodeGenerated);
          socket.on('error', handleError);

          const detach = () => {
              socket.off('game_start', handleGameStart);
              socket.off('spectator_list_updated', handleSpectatorUpdate);
              socket.off('player_joined', handlePlayerJoined);
              socket.off('live_room_joined', handleLiveRoomJoined);
              socket.off('live_room_closed', handleLiveRoomClosed);
              socket.off('opponent_left_live', handleOpponentLeftLive);
              socket.off('invitation_declined', handleInvitationDeclined);
              socket.off('room_code_generated', handleRoomCodeGenerated);
              socket.off('error', handleError);
          };
          detachRef.current = detach;

          return () => {
              detach();
          };
      }
  }, [roomId, navigation]); // Retiré configSalle pour éviter la boucle infinie

  const handleStopLive = () => {
      appAlert(
          t('live_room.stop_live_title'),
          t('live_room.stop_live_desc'),
          [
              { text: t('common.cancel'), style: "cancel" },
              {
                  text: t('live_room.stop_live_btn'),
                  style: "destructive",
                  onPress: () => {
                      const effectiveRoomId = roomId || configSalleRef.current?.id || route?.params?.roomId || route?.params?.configSalle?.id;
                      const userId = user?._id || user?.id;
                      isLeavingRef.current = true;
                      setInviteModalVisible(false);
                      try { detachRef.current?.(); } catch (_) {}
                      try { socket.emit('stop_live_room', { gameId: effectiveRoomId, userId }); } catch (_) {}
                      try { socket.emit('leave_live_room', { gameId: effectiveRoomId, userId }); } catch (_) {}
                      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                  }
              }
          ]
      );
  };

  const handleLeaveLive = () => {
      appAlert(
          t('live_room.leave_live_title'),
          t('live_room.leave_live_desc'),
          [
              { text: t('common.cancel'), style: "cancel" },
              {
                  text: t('live_room.leave_live_btn'),
                  style: "destructive",
                  onPress: () => {
                      const effectiveRoomId = roomId || configSalleRef.current?.id || route?.params?.roomId || route?.params?.configSalle?.id;
                      const userId = user?._id || user?.id;
                      isLeavingRef.current = true;
                      setInviteModalVisible(false);
                      try { detachRef.current?.(); } catch (_) {}
                      try { socket.emit('leave_live_room', { gameId: effectiveRoomId, userId }); } catch (_) {}
                      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                  }
              }
          ]
      );
  };

  const handleBackPress = () => {
      const userId = user?._id || user?.id;
      const creatorIdFromRef = creatorIdRef.current;
      const creatorIdFromConfig = configSalleRef.current?.createur?._id || configSalleRef.current?.createur?.id;
      const creatorId = creatorIdFromConfig || creatorIdFromRef;
      
      const isCreatorEffective = Boolean(userId && creatorId && userId.toString() === creatorId.toString());
      
      console.log('[BackPress] isCreatorEffective:', isCreatorEffective, 'userId:', userId, 'creatorId:', creatorId);

      // Toujours fermer le modal s'il est ouvert
      const wasModalOpen = inviteModalVisible;
      if (wasModalOpen) setInviteModalVisible(false);

      const showQuitAlert = () => {
          if (isCreatorEffective) {
              appAlert(
                  t('live_room.stop_live_title'),
                  t('live_room.stop_live_desc'),
                  [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                          text: t('live_room.stop_live_btn'),
                          style: 'destructive',
                          onPress: () => {
                              const effectiveRoomId = roomId || configSalleRef.current?.id || route?.params?.roomId || route?.params?.configSalle?.id;
                              isLeavingRef.current = true;
                              try { detachRef.current?.(); } catch (_) {}
                              try { socket.emit('stop_live_room', { gameId: effectiveRoomId, userId }); } catch (_) {}
                              try { socket.emit('leave_live_room', { gameId: effectiveRoomId, userId }); } catch (_) {}
                              navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                          }
                      }
                  ]
              );
          } else {
              appAlert(
                  t('live_room.leave_live_title'),
                  t('live_room.leave_live_desc'),
                  [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                          text: t('live_room.leave_live_btn'),
                          style: 'destructive',
                          onPress: () => {
                              const effectiveRoomId = roomId || configSalleRef.current?.id || route?.params?.roomId || route?.params?.configSalle?.id;
                              isLeavingRef.current = true;
                              try { detachRef.current?.(); } catch (_) {}
                              try { socket.emit('leave_live_room', { gameId: effectiveRoomId, userId }); } catch (_) {}
                              navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                          }
                      }
                  ]
              );
          }
      };

      // ✨ On attend TOUJOURS un peu pour s'assurer que le clavier ou un modal est fermé
      // Cela évite les conflits d'Alert dans React Native
      setTimeout(showQuitAlert, wasModalOpen ? 350 : 50);
  };


  /**
   * Gère le lancement de la partie par le créateur.
   * Note: Si un joueur rejoint via invitation, l'événement game_start déclenchera aussi la navigation.
   */
  const handleStartGame = () => {
    if (!opponent) {
        appAlert(t('live_room.waiting_title'), t('live_room.waiting_for_opponent_desc'));
        return;
    }
    if (isStartingGame) return;
    setIsStartingGame(true);
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
        const inviteUrl = configSalle?.roomCode ? `deadpions://invite/${configSalle.roomCode}` : `deadpions://live/${roomId}`;
        const result = await Share.share({
            message: t('live_room.share_message', { url: inviteUrl }),
            url: inviteUrl, // iOS support
            title: t('live_room.share_title')
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
        appAlert(t('common.error'), error.message);
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
        appAlert(t('common.error'), t('live_room.error_load_friends'));
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
      setInviteModalVisible(false);
      setTimeout(() => {
          appAlert(t('common.success'), t('live_room.invite_sent'));
      }, 350);
  };

  if (loading || !configSalle) {
      return (
          <ImageBackground
            source={require('../../assets/images/Background2-4.png')}
            style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}
          >
              <View style={styles.bgOverlay} pointerEvents="none" />
              <ActivityIndicator size="large" color="#f1c40f" />
              <Text style={{ color: '#fff', marginTop: getResponsiveSize(20) }}>{t('live_room.loading_room')}</Text>
          </ImageBackground>
      );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/Background2-4.png')}
      style={styles.background}
    >
      <View style={styles.bgOverlay} pointerEvents="none" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => { playButtonSound(); handleBackPress(); }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{configSalle.nom}</Text>
            <View style={styles.liveBadge}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveText}>{t('live_room.status_waiting')}</Text>
            </View>
        </View>
        <TouchableOpacity onPress={() => { playButtonSound(); handleShare(); }} style={styles.shareButton}>
            <Ionicons name="share-social-outline" size={getResponsiveSize(24)} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={isDesktop && styles.contentDesktop}>
        {/* Info Salle */}
        <View style={styles.card}>
            <View style={styles.playersContainer}>
                {/* Creator Side */}
                <View style={styles.playerSide}>
                    <Text style={styles.roleLabel}>{t('live_room.host_label', { color: creatorColor === 'white' ? t('live_room.color_white') : t('live_room.color_black') })}</Text>
                    <View style={styles.avatarContainer}>
                        {configSalle.createur.avatar ? (
                            <Image source={getAvatarSource(configSalle.createur.avatar)} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={getResponsiveSize(50)} color="#374151" />
                        )}
                        {configSalle.createur.pays && (
                            <Text style={styles.flag}>{configSalle.createur.pays}</Text>
                        )}
                    </View>
                    <Text style={styles.pseudo} numberOfLines={1}>{configSalle.createur.pseudo}</Text>
                    <Text style={styles.level}>{t('live_room.level_label', { level: configSalle.createur.niveau })}</Text>
                </View>

                {/* VS Badge */}
                <View style={styles.vsContainer}>
                    <Text style={styles.vsText}>{t('common.vs')}</Text>
                </View>

                {/* Opponent Side */}
                <View style={styles.playerSide}>
                    <Text style={styles.roleLabel}>{t('live_room.opponent_label', { color: creatorColor === 'white' ? t('live_room.color_black') : t('live_room.color_white') })}</Text>
                    {opponent ? (
                        <>
                            <View style={styles.avatarContainer}>
                                {opponent.avatar ? (
                                    <Image source={getAvatarSource(opponent.avatar)} style={styles.avatarImage} />
                                ) : (
                                    <Ionicons name="person-circle-outline" size={getResponsiveSize(50)} color="#374151" />
                                )}
                                {opponent.country && (
                                    <Text style={styles.flag}>{opponent.country}</Text>
                                )}
                            </View>
                            <Text style={styles.pseudo} numberOfLines={1}>{opponent.pseudo}</Text>
                            {opponent.niveau !== undefined && (
                                <Text style={styles.level}>{t('live_room.level_label', { level: opponent.niveau })}</Text>
                            )}
                        </>
                    ) : (
                        <View style={styles.waitingOpponent}>
                            {isCreator ? (
                                <TouchableOpacity onPress={() => { playButtonSound(); handleOpenInviteModal(); }} style={styles.inviteButton}>
                                    <View style={[styles.avatarImage, styles.avatarPlaceholder, { borderColor: '#10b981', borderStyle: 'solid', borderWidth: getResponsiveSize(2) }]}>
                                        <Ionicons name="add" size={getResponsiveSize(32)} color="#10b981" />
                                    </View>
                                    <Text style={[styles.waitingTextSmall, { color: '#10b981', fontWeight: 'bold', marginTop: getResponsiveSize(4) }]}>{t('live_room.invite')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                                        <Ionicons name="help" size={getResponsiveSize(30)} color="#9ca3af" />
                                    </View>
                                    <Text style={styles.waitingTextSmall}>{t('live_room.waiting_short')}</Text>
                                </>
                            )}
                        </View>
                    )}
                </View>
            </View>
            
            <View style={styles.divider} />

            {isCreator && (
              <View style={styles.inviteSection}>
                <Text style={styles.inviteSectionTitle}>{t('live_room.invite_via_code_qr')}</Text>
                
                <View style={styles.qrWrapper}>
                    <View style={styles.qrContainer}>
                        {configSalle?.roomCode ? (
                            <QRCode
                                value={`deadpions://invite/${configSalle.roomCode}`}
                                size={getResponsiveSize(150)}
                                backgroundColor="white"
                                color="#0B1322"
                            />
                        ) : (
                            <View style={{ width: getResponsiveSize(150), height: getResponsiveSize(150), backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: getResponsiveSize(14) }} />
                        )}
                    </View>
                    
                    <View style={styles.codeContainer}>
                        <Text style={styles.codeLabel}>{t('live_room.access_code_label')}</Text>
                        <View style={styles.codeRow}>
                            <Text style={styles.codeText}>{configSalle?.roomCode || '------'}</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    playButtonSound();
                                    setIsGeneratingCode(true);
                                    setConfigSalle(prev => (prev ? { ...prev, roomCode: null } : prev));
                                    socket.emit('generate_room_code', { gameId: roomId });
                                }}
                                style={styles.refreshButton}
                                disabled={!roomId || isGeneratingCode}
                            >
                                <Ionicons name="refresh" size={getResponsiveSize(20)} color={T.gold} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                
                <Text style={styles.inviteHint}>
                    {t('live_room.invite_hint')}
                </Text>

                <TouchableOpacity 
                    style={styles.shareButton} 
                    onPress={() => {
                        playButtonSound();
                        handleShare();
                    }}
                >
                    <Ionicons name="share-social-outline" size={getResponsiveSize(20)} color="#1B1305" />
                    <Text style={styles.shareButtonText}>{t('live_room.share_invite_btn')}</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
              </View>
            )}

            <View style={styles.paramsGrid}>
                <View style={styles.paramItem}>
                    <Ionicons name="cash-outline" size={getResponsiveSize(20)} color="#f1c40f" />
                    <Text style={[styles.paramText, { color: '#f1c40f' }]}>
                        {configSalle.parametres.betAmount ? `${configSalle.parametres.betAmount.toLocaleString()} 🪙` : t('matchmaking.bet_free')}
                    </Text>
                </View>
                <View style={styles.paramItem}>
                    <Ionicons name="time-outline" size={getResponsiveSize(20)} color="#9ca3af" />
                    <Text style={styles.paramText}>
                        {configSalle.parametres.tempsParCoup === 0 ? t('live_room.unlimited') : `${configSalle.parametres.tempsParCoup}s`}
                    </Text>
                </View>
                <View style={styles.paramItem}>
                    <Ionicons name="people-outline" size={getResponsiveSize(20)} color="#9ca3af" />
                    <Text style={styles.paramText}>
                        {spectateurs.length}/{configSalle.parametres.limitSpectateurs}
                    </Text>
                </View>
            </View>
            
            <Text style={styles.description}>{configSalle.description}</Text>
        </View>

        {/* Liste Spectateurs */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('live_room.spectators_count', { count: spectateurs.length })}</Text>
        </View>

        {spectateurs.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>{t('live_room.no_spectators')}</Text>
            </View>
        ) : (
            spectateurs.map((_, index) => (
                <View key={index} style={styles.spectatorRow}>
                    <Text style={styles.specAvatar}>👤</Text>
                    <Text style={styles.specName}>{t('live_room.spectator_number', { number: index + 1 })}</Text>
                </View>
            ))
        )}

        {isCreator && (
            <View style={styles.footerActions}>
                <TouchableOpacity 
                    style={styles.stopButton} 
                    onPress={handleStopLive}
                >
                    <Ionicons name="stop-circle-outline" size={getResponsiveSize(24)} color="#ef4444" />
                    <Text style={styles.stopButtonText}>{t('live_room.stop_live_btn')}</Text>
                </TouchableOpacity>
            </View>
        )}
        
        <View style={{ height: getResponsiveSize(100) }} />
      </ScrollView>

      {/* Actions de pied de page */}
      <View style={styles.footer}>
        {isCreator ? (<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            {/* <TouchableOpacity 
              style={[styles.mainButton, { flex: 1, marginRight: 8, backgroundColor: '#10b981' }]}
              onPress={() => {yButtonSound(); handleOpenInviteModal(); }}
            >
              <Text style={styles.mainButtonText}>INVITATION</Text>
              <Ionicons name="person-add" size={24} color="#fff" style={{ marginLeft: 10 }} />
            </TouchableOpacity> */}
            <TouchableOpacity 
              style={[styles.mainButton, { flex: 1, marginLeft: getResponsiveSize(8), opacity: opponent ? 1 : 0.6 }]}
              onPress={handleStartGame}
              disabled={!opponent}
            >
              <Text style={styles.mainButtonText}>{t('live_room.start_game')}</Text>
              <Ionicons name="play" size={getResponsiveSize(24)} color="#fff" style={{ marginLeft: getResponsiveSize(10) }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.waitingMessage}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.waitingText}>{t('live_room.waiting_host')}</Text>
          </View>
        )}
      </View>

      {inviteModalVisible && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setInviteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{t('live_room.invite_friend_title')}</Text>
                      <TouchableOpacity onPress={() => setInviteModalVisible(false)} style={styles.closeButton}>
                          <Ionicons name="close" size={getResponsiveSize(24)} color="#374151" />
                      </TouchableOpacity>
                  </View>

                  {loadingFriends ? (
                      <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: getResponsiveSize(20) }} />
                  ) : (
                      <FlatList
                          data={friends}
                          keyExtractor={item => item.id}
                          contentContainerStyle={
                              Array.isArray(friends) && friends.length > 0
                                  ? styles.friendsListContent
                                  : styles.friendsListEmptyContent
                          }
                          ListEmptyComponent={
                              <View style={styles.emptyFriendsState}>
                                  <View style={styles.emptyFriendsIcon}>
                                      <Ionicons name="people-outline" size={getResponsiveSize(28)} color={T.textMuted} />
                                  </View>
                                  <Text style={styles.emptyFriendsTitle}>{t('live_room.no_friends_online')}</Text>
                                  <Text style={styles.emptyFriendsSubtitle}>
                                      {t('live_room.no_friends_online_desc')}
                                  </Text>
                              </View>
                          }
                          renderItem={({ item }) => (
                              <View style={styles.friendItem}>
                                  <View style={styles.friendInfo}>
                                      {item.avatar ? (
                                          <Image source={getAvatarSource(item.avatar)} style={styles.friendAvatar} />
                                      ) : (
                                          <Ionicons name="person-circle-outline" size={getResponsiveSize(40)} color="#9ca3af" />
                                      )}
                                      <View>
                                          <Text style={styles.friendPseudo}>{item.pseudo}</Text>
                                          <Text style={[styles.friendStatus, { color: item.isOnline ? '#10b981' : '#9ca3af' }]}>
                                              {item.isOnline ? t('social.online') : t('social.offline')}
                                          </Text>
                                      </View>
                                  </View>
                                  <TouchableOpacity
                                      style={styles.inviteAction}
                                      onPress={() => { playButtonSound(); handleSendInvite(item.id); }}
                                  >
                                      <Text style={styles.inviteActionText}>{t('live_room.invite')}</Text>
                                  </TouchableOpacity>
                              </View>
                          )}
                      />
                  )}
              </View>
          </View>
        </Modal>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: getResponsiveSize(50),
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(18),
    backgroundColor: T.bg1,
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: T.text,
    fontSize: getResponsiveSize(18),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230,57,70,0.15)',
    paddingHorizontal: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(2),
    borderRadius: getResponsiveSize(T.radiusSm),
    marginTop: getResponsiveSize(4),
    borderWidth: 1,
    borderColor: T.red,
  },
  liveIndicator: {
    width: getResponsiveSize(6),
    height: getResponsiveSize(6),
    borderRadius: getResponsiveSize(3),
    backgroundColor: T.red,
    marginRight: getResponsiveSize(6),
  },
  liveText: {
    color: T.red,
    fontSize: getResponsiveSize(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  backButton: {
    padding: getResponsiveSize(8),
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  shareButton: {
    padding: getResponsiveSize(8),
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  content: {
    flex: 1,
    padding: getResponsiveSize(16),
  },
  contentDesktop: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(18),
    marginBottom: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: T.borderSoft,
    ...T.shadowCard,
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(14),
  },
  playerSide: {
    flex: 1,
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    marginBottom: getResponsiveSize(8),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vsContainer: {
    width: getResponsiveSize(38),
    height: getResponsiveSize(38),
    borderRadius: getResponsiveSize(19),
    backgroundColor: T.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: getResponsiveSize(10),
    transform: [{ rotate: '15deg' }],
  },
  vsText: {
    color: '#fff',
    fontSize: getResponsiveSize(13),
    fontWeight: '900',
    fontStyle: 'italic',
  },
  waitingOpponent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: T.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderColor: T.borderSoft,
  },
  waitingTextSmall: {
    fontSize: getResponsiveSize(12),
    color: T.textMuted,
    marginTop: getResponsiveSize(5),
    fontStyle: 'italic',
  },
  label: {
    fontSize: getResponsiveSize(12),
    color: T.textMuted,
    marginBottom: getResponsiveSize(5),
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: getResponsiveSize(8),
  },
  avatarImage: {
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(30),
    borderWidth: 2,
    borderColor: T.border,
  },
  flag: {
    position: 'absolute',
    bottom: getResponsiveSize(-2),
    right: getResponsiveSize(-2),
    fontSize: getResponsiveSize(18),
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
    padding: getResponsiveSize(2),
  },
  userInfo: {
    flex: 1,
  },
  pseudo: {
    fontSize: getResponsiveSize(13),
    fontWeight: '700',
    color: T.text,
    marginBottom: getResponsiveSize(4),
    textAlign: 'center',
  },
  level: {
    fontSize: getResponsiveSize(10),
    color: '#1B1305',
    backgroundColor: T.gold,
    paddingHorizontal: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(2),
    borderRadius: getResponsiveSize(T.radiusSm),
    overflow: 'hidden',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: T.borderSoft,
    marginVertical: getResponsiveSize(14),
  },
  paramsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: getResponsiveSize(14),
  },
  paramItem: {
    alignItems: 'center',
    gap: getResponsiveSize(5),
  },
  paramText: {
    fontSize: getResponsiveSize(13),
    fontWeight: '600',
    color: T.textDim,
  },
  description: {
    fontSize: getResponsiveSize(13),
    color: T.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: getResponsiveSize(8),
  },
  sectionHeader: {
    marginBottom: getResponsiveSize(12),
  },
  sectionTitle: {
    color: T.text,
    fontSize: getResponsiveSize(16),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsiveSize(36),
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  emptyStateText: {
    color: T.textMuted,
    marginTop: getResponsiveSize(10),
    fontSize: getResponsiveSize(14),
  },
  spectatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(10),
    backgroundColor: T.bg2,
    borderRadius: getResponsiveSize(T.radiusSm),
    marginBottom: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  specAvatar: {
    fontSize: getResponsiveSize(18),
    marginRight: getResponsiveSize(10),
  },
  specName: {
    color: T.textDim,
    fontSize: getResponsiveSize(14),
  },
  footer: {
    padding: getResponsiveSize(16),
    backgroundColor: T.bg1,
    borderTopWidth: 1,
    borderTopColor: T.borderSoft,
  },
  mainButton: {
    backgroundColor: T.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusMd),
    shadowColor: T.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(15),
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inviteButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitePlaceholder: {
    backgroundColor: T.bg3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: T.bg2,
    width: isTablet ? '50%' : '90%',
    maxHeight: '80%',
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: T.gold,
    ...T.shadowCard,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(18),
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
    paddingBottom: getResponsiveSize(14),
  },
  modalTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: '800',
    color: T.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: getResponsiveSize(5),
    backgroundColor: T.bg3,
    borderRadius: getResponsiveSize(T.radiusSm),
    borderWidth: 1,
    borderColor: T.borderSoft,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: getResponsiveSize(12),
    borderBottomWidth: 1,
    borderBottomColor: T.borderSoft,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: getResponsiveSize(46),
    height: getResponsiveSize(46),
    borderRadius: getResponsiveSize(23),
    marginRight: getResponsiveSize(12),
    backgroundColor: T.bg3,
    borderWidth: 2,
    borderColor: T.border,
  },
  friendPseudo: {
    fontSize: getResponsiveSize(14),
    fontWeight: '700',
    color: T.text,
    marginBottom: getResponsiveSize(2),
  },
  friendStatus: {
    fontSize: getResponsiveSize(12),
  },
  inviteAction: {
    backgroundColor: T.green,
    paddingHorizontal: getResponsiveSize(14),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(T.radiusPill),
  },
  inviteActionText: {
    color: '#fff',
    fontSize: getResponsiveSize(12),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  friendsListContent: {
    paddingBottom: getResponsiveSize(10),
  },
  friendsListEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(24),
  },
  emptyFriendsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(18),
    paddingHorizontal: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: T.gold,
    borderRadius: getResponsiveSize(T.radiusMd),
    backgroundColor: 'rgba(244,180,26,0.06)',
  },
  emptyFriendsIcon: {
    width: getResponsiveSize(52),
    height: getResponsiveSize(52),
    borderRadius: getResponsiveSize(26),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.borderSoft,
    marginBottom: getResponsiveSize(12),
  },
  emptyFriendsTitle: {
    color: T.text,
    fontSize: getResponsiveSize(14),
    fontWeight: '800',
    marginBottom: getResponsiveSize(6),
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  emptyFriendsSubtitle: {
    color: T.textMuted,
    fontSize: getResponsiveSize(13),
    textAlign: 'center',
    lineHeight: getResponsiveSize(18),
    maxWidth: getResponsiveSize(260),
  },
  // Invite Section
  inviteSection: {
    marginTop: getResponsiveSize(10),
    alignItems: 'center',
    width: '100%',
  },
  inviteSectionTitle: {
    fontSize: getResponsiveSize(14),
    fontWeight: '800',
    color: T.gold,
    marginBottom: getResponsiveSize(16),
    letterSpacing: 0.5,
  },
  qrWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveSize(20),
    width: '100%',
    paddingHorizontal: getResponsiveSize(20),
  },
  qrContainer: {
    padding: getResponsiveSize(10),
    backgroundColor: '#fff',
    borderRadius: getResponsiveSize(T.radiusMd),
    ...T.shadowCard,
  },
  codeContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  codeLabel: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    fontWeight: '700',
    marginBottom: getResponsiveSize(4),
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  codeText: {
    fontSize: getResponsiveSize(24),
    fontWeight: '900',
    color: T.text,
    letterSpacing: 2,
  },
  refreshButton: {
    padding: getResponsiveSize(6),
    backgroundColor: 'rgba(244,180,26,0.1)',
    borderRadius: getResponsiveSize(T.radiusSm),
  },
  inviteHint: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    textAlign: 'center',
    marginTop: getResponsiveSize(16),
    marginBottom: getResponsiveSize(10),
    lineHeight: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(30),
  },
  shareButton: {
    backgroundColor: T.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(24),
    borderRadius: getResponsiveSize(T.radiusMd),
    marginTop: getResponsiveSize(10),
    gap: getResponsiveSize(10),
    ...T.shadowBtn,
  },
  shareButtonText: {
    color: '#1B1305',
    fontSize: getResponsiveSize(13),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stopButton: {
    textAlign: 'center',
    color: T.textMuted,
    marginTop: getResponsiveSize(20),
    fontSize: getResponsiveSize(14),
  },
  waitingText: {
    color: T.textDim,
    fontSize: getResponsiveSize(15),
    bottom: getResponsiveSize(3),
    left: getResponsiveSize(120)
  },
  footerActions: {
    marginTop: getResponsiveSize(16),
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(10),
    backgroundColor: 'rgba(230,57,70,0.1)',
    borderRadius: getResponsiveSize(T.radiusPill),
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.3)',
  },
  stopButtonText: {
    color: T.red,
    marginLeft: getResponsiveSize(8),
    fontWeight: '700',
  },

});

export default SalleAttenteLive;
