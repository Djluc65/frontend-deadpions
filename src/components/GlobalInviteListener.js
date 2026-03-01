import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import socket from '../services/socket';
import { getResponsiveSize } from '../utils/responsive';

// Composant global qui écoute les invitations de partie (socket) partout dans l'application
const GlobalInviteListener = () => {
    const navigation = useNavigation();
    // Récupère l'utilisateur connecté depuis Redux
    const user = useSelector(state => state.auth.user);
    // Stocke l'invitation en cours (null si aucune)
    const [invitation, setInvitation] = useState(null);

    // Connexion globale au socket + inscription dans la room utilisateur
    useEffect(() => {
        if (user && user._id) {
            if (!socket.connected) {
                socket.connect();
            }
            // Rejoint la room privée de l'utilisateur pour recevoir ses événements
            socket.emit('join_user_room', user._id);
            console.log(`GlobalSocket: User ${user._id} joined room`);

            // Re-join on reconnection
            const handleConnect = () => {
                console.log(`GlobalSocket: Reconnected, re-joining user room ${user._id}`);
                socket.emit('join_user_room', user._id);
            };

            socket.on('connect', handleConnect);

            return () => {
                socket.off('connect', handleConnect);
            };
        }
    }, [user]);

    // Gestion des événements liés aux invitations (réception / refus / erreurs)
    useEffect(() => {
        const handleInvitation = (data) => {
            console.log('Invitation received:', data);
            setInvitation(data);
        };

        const handleInvitationError = (message) => {
            // Affiche simplement l'erreur dans la console (non bloquant)
            console.log('Invitation error:', message);
        };

        const handleInvitationDeclined = (data) => {
            // L'autre joueur a refusé l'invitation
            Alert.alert("Refusé", `${data.recipientPseudo || "L'adversaire"} a refusé l'invitation.`);
        };

        socket.on('game_invitation', handleInvitation);
        socket.on('invitation_declined', handleInvitationDeclined);
        socket.on('invitation_error', handleInvitationError);

        // Quand on rejoint une salle "Live" (jeu en direct), on navigue vers l'écran d'attente
        const handleLiveRoomJoined = (data) => {
             console.log('Joined Live Room:', data);
             const configSalle = data.config || {
                 id: data.gameId,
                 createur: data.players.black,
                 parametres: {
                     betAmount: data.betAmount,
                     tempsParCoup: data.timeControl
                 },
                 spectateurs: data.spectators || []
             };
             navigation.navigate('SalleAttenteLive', { configSalle });
        };
        socket.on('live_room_joined', handleLiveRoomJoined);

        return () => {
            socket.off('game_invitation', handleInvitation);
            socket.off('invitation_declined', handleInvitationDeclined);
            socket.off('invitation_error', handleInvitationError);
            socket.off('live_room_joined', handleLiveRoomJoined);
        };
    }, []);

    // Accepter une invitation
    const handleAccept = () => {
        if (!invitation) return;
        
        const isLive = invitation.gameId && invitation.gameId.toString().startsWith('live_');
        const gameMode = isLive ? 'live' : 'online';

        socket.emit('respond_invite', {
            senderId: invitation.senderId,
            accepted: true,
            betAmount: invitation.betAmount,
            timeControl: invitation.timeControl,
            gameId: invitation.gameId
        });
        
        if (!isLive) {
            navigation.navigate('Game', {
                mode: gameMode,
                gameId: invitation.gameId,
                betAmount: invitation.betAmount,
                timeControl: invitation.timeControl
            });
        }

        setInvitation(null);
    };

    // Refuser une invitation
    const handleDecline = () => {
        if (!invitation) return;

        socket.emit('respond_invite', {
            senderId: invitation.senderId,
            accepted: false,
            betAmount: invitation.betAmount,
            timeControl: invitation.timeControl
        });
        setInvitation(null);
    };

    // Écoute globale de l'événement game_start pour rediriger vers l'écran de jeu
    useEffect(() => {
    const handleGameStart = (data) => {
        console.log('🌍 Global game_start received:', data);
        
        const isLive = data.gameId && data.gameId.toString().startsWith('live_');
        const gameMode = isLive ? 'live' : 'online';

        // Check current route
        const state = navigation.getState();
        if (state) {
            const currentRoute = state.routes[state.index];
            
            // Ne pas naviguer si on est déjà dans SocialScreen (gère sa propre navigation)
            if (currentRoute.name === 'Home' && currentRoute.state) {
                const tabRoute = currentRoute.state.routes[currentRoute.state.index];
                if (tabRoute.name === 'Social') {
                    console.log('Skipping Global navigation - in SocialScreen');
                    return;
                }
            }

            // Ne pas naviguer si on est dans SalleAttenteLive (gère sa propre navigation)
            if (currentRoute.name === 'SalleAttenteLive' && isLive) {
                console.log('Skipping Global navigation - in SalleAttenteLive');
                return;
            }

            // Si on est déjà dans GameScreen
            if (currentRoute.name === 'Game') {
                const currentGameId = currentRoute.params?.gameId;
                
                // Si c'est le même gameId, on ne fait rien (GameScreen mettra à jour l'état)
                if (currentGameId === data.gameId) {
                    console.log('Skipping Global navigation - same gameId, GameScreen will handle');
                    return;
                }
                
                // Si c'est un nouveau gameId (ex: invitation acceptée), on force la navigation
                console.log('🚀 Global: FORCING navigation to NEW game:', data.gameId);
                // Continue vers navigation.navigate ci-dessous
            }
        }

        // Navigation vers l'écran de jeu avec toutes les données nécessaires
        navigation.navigate('Game', {
            mode: gameMode,
            gameId: data.gameId,
            players: data.players,
            currentTurn: data.currentTurn,
            betAmount: data.betAmount,
            timeControl: data.timeControl,
            gameType: data.mode,
            tournamentSettings: data.tournamentSettings,
            opponent: data.players.black.id.toString() === (user._id || user.id).toString() ? data.players.white : data.players.black
        });
        
        // Nettoie l'invitation en cours
        setInvitation(null);
    };

    socket.on('game_start', handleGameStart);

    return () => {
        socket.off('game_start', handleGameStart);
    };
    }, [navigation, user]);

    // Si aucune invitation, ne rien afficher
    if (!invitation) return null;

    // Modal affiché quand on reçoit une invitation
    return (
        <Modal
            transparent={true}
            visible={!!invitation}
            animationType="slide"
            onRequestClose={handleDecline}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Invitation de {invitation.senderPseudo}</Text>
                    <Text style={styles.modalText}>
                        Mise: {invitation.betAmount} pièces{'\n'}
                        Temps: {invitation.timeControl ? `${invitation.timeControl / 60} min` : 'Illimité'}
                    </Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonDecline]}
                            onPress={handleDecline}
                        >
                            <Text style={styles.textStyle}>Refuser</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonAccept]}
                            onPress={handleAccept}
                        >
                            <Text style={styles.textStyle}>Accepter</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: getResponsiveSize(20),
        backgroundColor: 'white',
        borderRadius: getResponsiveSize(20),
        padding: getResponsiveSize(35),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: getResponsiveSize(2),
        },
        shadowOpacity: 0.25,
        shadowRadius: getResponsiveSize(4),
        elevation: 5,
        width: '80%',
    },
    modalTitle: {
        fontSize: getResponsiveSize(20),
        fontWeight: 'bold',
        marginBottom: getResponsiveSize(15),
        textAlign: 'center',
    },
    modalText: {
        fontSize: getResponsiveSize(16),
        marginBottom: getResponsiveSize(20),
        textAlign: 'center',
        lineHeight: getResponsiveSize(24),
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: getResponsiveSize(10),
        padding: getResponsiveSize(10),
        elevation: 2,
        minWidth: getResponsiveSize(100),
    },
    buttonAccept: {
        backgroundColor: '#2196F3',
    },
    buttonDecline: {
        backgroundColor: '#ff4444',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default GlobalInviteListener;
