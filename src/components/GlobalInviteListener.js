import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import socket from '../services/socket';

const GlobalInviteListener = () => {
    const navigation = useNavigation();
    const user = useSelector(state => state.auth.user);
    const [invitation, setInvitation] = useState(null);

    // Global Socket Connection & Status
    useEffect(() => {
        if (user && user._id) {
            if (!socket.connected) {
                socket.connect();
            }
            // Join user room for status tracking and private events
            socket.emit('join_user_room', user._id);
            console.log(`GlobalSocket: User ${user._id} joined room`);
        }
    }, [user]);

    useEffect(() => {
        const handleInvitation = (data) => {
            console.log('Invitation received:', data);
            setInvitation(data);
        };

        const handleInvitationError = (message) => {
            // Could show a toast or alert here
            console.log('Invitation error:', message);
        };

        const handleInvitationDeclined = (data) => {
            Alert.alert("Refusé", `${data.recipientPseudo || 'L\'adversaire'} a refusé l'invitation.`);
        };

        socket.on('game_invitation', handleInvitation);
        socket.on('invitation_declined', handleInvitationDeclined);
        socket.on('invitation_error', handleInvitationError);

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

    // Global listener for game_start to navigate
    useEffect(() => {
        const handleGameStart = (data) => {
            // Only navigate if we are the ones involved (checked by socket room, but global listener hears all events on this socket)
            // If we accepted an invite, we are in the room.
            console.log('Global game_start received:', data);
            
            const isLive = data.gameId && data.gameId.toString().startsWith('live_');
            const gameMode = isLive ? 'live' : 'online';

            // Check if we are already in Game screen or Waiting Room?
            // If we are in 'SalleAttenteLive', that component handles the transition to Game.
            // If we are in 'GameScreen', it might handle it too (if gameId changes).
            
            // We can check the current route using navigation state, but inside useEffect it's tricky.
            // However, we can use a small delay or rely on the fact that SalleAttenteLive handles it.
            // If we are the creator or in the waiting room, we are already subscribed there.
            
            // To prevent double navigation, we can check if the route is already 'SalleAttenteLive'.
            // But we don't have access to current route easily here without useRoute (which is not available in global component).
            // Instead, we can try to navigate only if NOT already there.
            
            // Use navigation.getState() to check current route
            const state = navigation.getState();
            if (state) {
                const currentRoute = state.routes[state.index];
                if (currentRoute.name === 'SalleAttenteLive' && isLive) {
                    console.log('Skipping Global navigation because we are in SalleAttenteLive');
                    return;
                }
                if (currentRoute.name === 'Game' && currentRoute.params?.gameId === data.gameId) {
                    console.log('Skipping Global navigation because we are already in GameScreen with same ID');
                    return;
                }
            }

            // Check if we are already in Game screen? 
            // The navigation.navigate operation is safe (it pushes or focuses).
            // We pass the data to GameScreen.
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
            
            // Clear invitation if it was open (just in case)
            setInvitation(null);
        };

        socket.on('game_start', handleGameStart);

        return () => {
            socket.off('game_start', handleGameStart);
        };
    }, [navigation]);

    if (!invitation) return null;

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
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        minWidth: 100,
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
