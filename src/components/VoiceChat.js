import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
    RTCPeerConnection, 
    RTCIceCandidate, 
    RTCSessionDescription, 
    mediaDevices,
    isAvailable as isWebRTCAvailable
} from '../services/webrtc';

const VoiceChat = ({ gameId, userId, socket, isSpectator = false }) => {
    const [isMuted, setIsMuted] = useState(true);
    const [connectedPeers, setConnectedPeers] = useState(0);
    const peerConnections = useRef({}); // { [userId]: RTCPeerConnection }
    const localStream = useRef(null);

    useEffect(() => {
        if (!isWebRTCAvailable || !gameId || !userId) return;

        const initLocalStream = async () => {
            try {
                const stream = await mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });
                localStream.current = stream;
                
                // Mute initially
                stream.getAudioTracks().forEach(track => track.enabled = !isMuted);

                // Join the voice room
                socket.emit('voice_join', { gameId, senderId: userId });
            } catch (err) {
                console.error("Error initializing voice:", err);
                Alert.alert("Erreur", "Impossible d'accéder au microphone.");
            }
        };

        initLocalStream();

        const createPeerConnection = (peerId) => {
            if (peerConnections.current[peerId]) return peerConnections.current[peerId];

            const configuration = { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };
            const pc = new RTCPeerConnection(configuration);
            peerConnections.current[peerId] = pc;

            if (localStream.current) {
                pc.addStream(localStream.current);
            }

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('voice_candidate', {
                        gameId,
                        candidate: event.candidate,
                        senderId: userId,
                        targetId: peerId
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                // Update connected count
                const count = Object.values(peerConnections.current)
                    .filter(p => p.connectionState === 'connected').length;
                setConnectedPeers(count);
                
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    delete peerConnections.current[peerId];
                    // Update count again
                    const newCount = Object.values(peerConnections.current)
                        .filter(p => p.connectionState === 'connected').length;
                    setConnectedPeers(newCount);
                }
            };

            return pc;
        };

        // Listeners
        const handleVoiceJoin = async (data) => {
            if (data.senderId === userId) return;
            // New peer joined, initiate connection
            const pc = createPeerConnection(data.senderId);
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('voice_offer', {
                    gameId,
                    offer,
                    senderId: userId,
                    targetId: data.senderId
                });
            } catch (err) {
                console.error("Error initiating call:", err);
            }
        };

        const handleVoiceOffer = async (data) => {
            if (data.targetId && data.targetId !== userId) return;
            if (data.senderId === userId) return;

            const pc = createPeerConnection(data.senderId);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('voice_answer', {
                    gameId,
                    answer,
                    senderId: userId,
                    targetId: data.senderId
                });
            } catch (err) {
                console.error("Error handling offer:", err);
            }
        };

        const handleVoiceAnswer = async (data) => {
            if (data.targetId && data.targetId !== userId) return;
            
            const pc = peerConnections.current[data.senderId];
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (err) {
                    console.error("Error handling answer:", err);
                }
            }
        };

        const handleVoiceCandidate = async (data) => {
            if (data.targetId && data.targetId !== userId) return;

            const pc = peerConnections.current[data.senderId];
            if (pc && data.candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error("Error adding candidate:", err);
                }
            }
        };

        socket.on('voice_join', handleVoiceJoin);
        socket.on('voice_offer', handleVoiceOffer);
        socket.on('voice_answer', handleVoiceAnswer);
        socket.on('voice_candidate', handleVoiceCandidate);

        return () => {
            if (localStream.current) {
                localStream.current.getTracks().forEach(t => t.stop());
            }
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
            
            socket.off('voice_join', handleVoiceJoin);
            socket.off('voice_offer', handleVoiceOffer);
            socket.off('voice_answer', handleVoiceAnswer);
            socket.off('voice_candidate', handleVoiceCandidate);
        };
    }, [gameId, userId]);

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(track => track.enabled = !newMuted);
        }
    };

    // if (!isWebRTCAvailable) return null; // Force render for UI consistency

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={[
                    styles.button, 
                    isMuted ? styles.muted : styles.unmuted,
                    connectedPeers > 0 && styles.connected,
                    !isWebRTCAvailable && styles.disabled
                ]} 
                onPress={() => {
                    if (!isWebRTCAvailable) {
                        Alert.alert(
                            "Audio non disponible", 
                            "La fonctionnalité audio nécessite un 'Development Build' ou un appareil compatible WebRTC."
                        );
                        return;
                    }
                    toggleMute();
                }}
                // disabled={!isWebRTCAvailable}
            >
                <Ionicons 
                    name={isMuted ? "mic-off" : "mic"} 
                    size={24} 
                    color="white" 
                />
                {connectedPeers > 0 && (
                    <View style={styles.peerBadge}>
                        <Text style={styles.peerCount}>{connectedPeers}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    disabled: {
        backgroundColor: '#9ca3af', // Gray
        opacity: 0.7
    },
    muted: {
        backgroundColor: '#ef4444', // Red
    },
    unmuted: {
        backgroundColor: '#3b82f6', // Blue
    },
    connected: {
        borderWidth: 2,
        borderColor: '#10b981', // Green border when connected to someone
    },
    peerBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#10b981',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff'
    },
    peerCount: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold'
    }
});

export default VoiceChat;