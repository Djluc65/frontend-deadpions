import React, { useState, useEffect, memo } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { socket } from '../../utils/socket';
import { BET_OPTIONS, ONLINE_TIME_OPTIONS } from '../../utils/constants';
import { logout } from '../../redux/slices/authSlice';

const OnlineGameSetup = memo(({ visible, onClose, navigation, user }) => {
    const dispatch = useDispatch();
    const [bet, setBet] = useState(500);
    const [time, setTime] = useState(120);
    const [mode, setMode] = useState('simple');
    const [seriesLength, setSeriesLength] = useState(2);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTimer, setSearchTimer] = useState(120);

    // Ensure bet is valid w.r.t user coins
    useEffect(() => {
        if (visible && user?.coins !== undefined) {
            const maxCoins = user.coins;
            if (bet > maxCoins) {
                const validBets = BET_OPTIONS.filter(b => b <= maxCoins);
                if (validBets.length > 0) {
                    setBet(validBets[validBets.length - 1]);
                } else {
                    setBet(100);
                }
            }
        }
    }, [visible, user?.coins]);

    useEffect(() => {
        let interval = null;
        if (isSearching && searchTimer > 0) {
            interval = setInterval(() => {
                setSearchTimer((prev) => prev - 1);
            }, 1000);
        } else if (searchTimer === 0 && isSearching) {
            handleCancelSearch();
            Alert.alert('Timeout', 'Aucun adversaire trouvé. Vos coins ont été remboursés.');
        }
        return () => clearInterval(interval);
    }, [isSearching, searchTimer]);

    useEffect(() => {
        if (!user || !user._id) return;

        const handleGameStart = (data) => {
            if (isSearching) {
                setIsSearching(false);
                onClose();
                navigation.navigate('Game', { 
                    mode: 'online',
                    gameId: data.gameId,
                    players: data.players,
                    currentTurn: data.currentTurn,
                    betAmount: data.betAmount,
                    timeControl: data.timeControl,
                    opponent: data.players.black.id.toString() === (user._id || user.id).toString() ? data.players.white : data.players.black,
                    gameType: data.mode,
                    tournamentSettings: data.tournamentSettings
                });
            }
        };

        const handleSearchCancelled = () => {
             setIsSearching(false);
        };

        const handleError = (msg) => {
             if (isSearching) {
                 setIsSearching(false);
                 if (msg === 'User not found') {
                     Alert.alert(
                         'Session Expirée', 
                         'Votre compte est introuvable. Veuillez vous reconnecter.',
                         [
                             { 
                                 text: 'OK', 
                                 onPress: () => {
                                     dispatch(logout());
                                     navigation.replace('Login');
                                 } 
                             }
                         ]
                     );
                 } else {
                     Alert.alert('Erreur', msg);
                 }
             }
        };

        socket.on('game_start', handleGameStart);
        socket.on('search_cancelled', handleSearchCancelled);
        socket.on('error', handleError);

        return () => {
            socket.off('game_start', handleGameStart);
            socket.off('search_cancelled', handleSearchCancelled);
            socket.off('error', handleError);
        };
    }, [user, isSearching, navigation, onClose, dispatch]);

    const handleStartSearch = () => {
        setIsSearching(true);
        setSearchTimer(120);
        socket.emit('find_game', {
            betAmount: bet,
            timeControl: time,
            id: user._id || user.id,
            pseudo: user.pseudo,
            mode: mode,
            seriesLength: mode === 'tournament' ? seriesLength : 1
        });
    };

    const handleCancelSearch = () => {
        setIsSearching(false);
        socket.emit('cancel_search', {
            betAmount: bet,
            timeControl: time,
            id: user._id || user.id,
            mode: mode,
            seriesLength: mode === 'tournament' ? seriesLength : 1
        });
    };

    const renderBetSelector = () => {
        const availableBets = BET_OPTIONS.filter(b => b <= (user?.coins || 0));
        const effectiveBets = availableBets.length > 0 ? availableBets : [100];
        const currentIndex = effectiveBets.indexOf(bet);
        
        const canGoPrev = currentIndex > 0;
        const canGoNext = currentIndex < effectiveBets.length - 1;

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
                <TouchableOpacity 
                    onPress={() => {
                        if (canGoPrev) setBet(effectiveBets[currentIndex - 1]);
                    }}
                    disabled={!canGoPrev}
                    style={{ padding: 10, opacity: !canGoPrev ? 0.3 : 1 }}
                >
                    <Ionicons name="remove-circle-outline" size={40} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.betDisplay}>
                    <Text style={styles.betSmallText}>
                        {currentIndex > 0 ? effectiveBets[currentIndex - 1].toLocaleString() : ''}
                    </Text>

                    <Text style={styles.betMainText}>
                        {bet.toLocaleString()}
                    </Text>

                    <Text style={styles.betSmallText}>
                        {currentIndex < effectiveBets.length - 1 ? effectiveBets[currentIndex + 1].toLocaleString() : ''}
                    </Text>
                </View>

                <TouchableOpacity 
                    onPress={() => {
                        if (canGoNext) setBet(effectiveBets[currentIndex + 1]);
                    }}
                    disabled={!canGoNext}
                    style={{ padding: 10, opacity: !canGoNext ? 0.3 : 1 }}
                >
                    <Ionicons name="add-circle-outline" size={40} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
                if (!isSearching) onClose();
            }}
        >
            <Pressable style={styles.modalOverlay} onPress={() => !isSearching && onClose()}>
                <Pressable style={styles.friendsModalContent} onPress={() => {}}>
                    {isSearching ? (
                        <View style={{ alignItems: 'center', width: '100%' }}>
                            <Text style={styles.friendsModalTitle}>Recherche...</Text>
                            <ActivityIndicator size="large" color="#f1c40f" style={{ marginVertical: 20 }} />
                            <Text style={styles.timerText}>{searchTimer}s</Text>
                            <Text style={styles.betInfo}>Mise : {bet.toLocaleString()} 💰</Text>
                            
                            <TouchableOpacity 
                                style={styles.cancelButton} 
                                onPress={handleCancelSearch}
                            >
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                            <Text style={styles.friendsModalTitle}>Jeu en ligne</Text>

                            <Text style={styles.friendsLabel}>Mode de jeu:</Text>
                            <View style={styles.optionsRow}>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, mode === 'simple' && styles.friendsOptionButtonActive]}
                                    onPress={() => setMode('simple')}
                                >
                                    <Text style={[styles.friendsOptionText, mode === 'simple' && styles.friendsOptionTextActive]}>Simple</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.friendsOptionButton, mode === 'tournament' && styles.friendsOptionButtonActive]}
                                    onPress={() => setMode('tournament')}
                                >
                                    <Text style={[styles.friendsOptionText, mode === 'tournament' && styles.friendsOptionTextActive]}>Tournoi</Text>
                                </TouchableOpacity>
                            </View>

                            {mode === 'tournament' && (
                                <>
                                    <Text style={styles.friendsLabel}>Nombre de parties:</Text>
                                    <View style={styles.optionsRow}>
                                        {[2, 4, 6, 8, 10].map(num => (
                                            <TouchableOpacity 
                                                key={num} 
                                                style={[styles.friendsOptionButton, seriesLength === num && styles.friendsOptionButtonActive]}
                                                onPress={() => setSeriesLength(num)}
                                            >
                                                <Text style={[styles.friendsOptionText, seriesLength === num && styles.friendsOptionTextActive]}>{num}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            <Text style={styles.friendsLabel}>Mise (coins):</Text>
                            {renderBetSelector()}

                            <Text style={styles.friendsLabel}>Temps par tour:</Text>
                            <View style={styles.optionsRow}>
                                {ONLINE_TIME_OPTIONS.map(opt => (
                                    <TouchableOpacity 
                                        key={opt.label} 
                                        style={[styles.friendsOptionButton, time === opt.value && styles.friendsOptionButtonActive]}
                                        onPress={() => setTime(opt.value)}
                                    >
                                        <Text style={[styles.friendsOptionText, time === opt.value && styles.friendsOptionTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalButtonCancel} onPress={onClose}>
                                    <Text style={styles.modalButtonText}>Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleStartSearch}>
                                    <Text style={styles.modalButtonText}>JOUER</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                    <View style={styles.innerShadow} pointerEvents="none" />
                </Pressable>
            </Pressable>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendsModalContent: {
        width: '90%',
        backgroundColor: '#0f2350',
        borderRadius: 25,
        padding: 25,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#f1c40f',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.51,
        shadowRadius: 13.16,
        elevation: 20,
        position: 'relative',
        overflow: 'hidden',
        maxHeight: '80%',
    },
    innerShadow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 23,
    },
    friendsModalTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f1c40f',
        marginBottom: 25,
        textAlign: 'center',
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    friendsLabel: {
        fontSize: 18,
        color: '#fff',
        marginBottom: 10,
        marginTop: 10,
        fontWeight: 'bold',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 10,
    },
    friendsOptionButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f1c40f',
        margin: 5,
        backgroundColor: 'transparent',
    },
    friendsOptionButtonActive: {
        backgroundColor: '#f1c40f',
    },
    friendsOptionText: {
        color: '#f1c40f',
        fontSize: 14,
        fontWeight: 'bold',
    },
    friendsOptionTextActive: {
        color: '#0f2350',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    modalButtonCancel: {
        flex: 1,
        backgroundColor: '#e74c3c',
        padding: 15,
        borderRadius: 15,
        marginRight: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#c0392b',
    },
    modalButtonConfirm: {
        flex: 1,
        backgroundColor: '#2ecc71',
        padding: 15,
        borderRadius: 15,
        marginLeft: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27ae60',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        textTransform: 'uppercase',
    },
    timerText: {
        color: '#f1c40f',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10
    },
    betInfo: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 20,
        fontWeight: 'bold'
    },
    cancelButton: {
        backgroundColor: '#e74c3c',
        width: '100%',
        paddingVertical: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#c0392b',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        textTransform: 'uppercase'
    },
    betDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 140,
        height: 50,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 25,
        marginHorizontal: 10,
        borderWidth: 1,
        borderColor: 'rgba(241, 196, 15, 0.3)'
    },
    betSmallText: {
        color: '#f1c40f',
        fontSize: 14,
        opacity: 0.5,
        width: 70,
        textAlign: 'center'
    },
    betMainText: {
        color: '#f1c40f',
        fontSize: 22,
        fontWeight: 'bold',
        width: 120,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 10
    }
});

export default OnlineGameSetup;
