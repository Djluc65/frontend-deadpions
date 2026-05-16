import React, { useState, useEffect, memo } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { getResponsiveSize } from '../../utils/responsive';
import { socket } from '../../utils/socket';
import { playButtonSound } from '../../utils/soundManager';
import { BET_OPTIONS, ONLINE_TIME_OPTIONS } from '../../utils/constants';
import { logout } from '../../redux/slices/authSlice';
import { appAlert } from '../../services/appAlert';
import { modalTheme } from '../../utils/modalTheme';
import { T } from '../../utils/theme';

const OnlineGameSetup = memo(({ visible, onClose, navigation, user }) => {
    const dispatch = useDispatch();
    const [bet, setBet] = useState(500);
    const [time, setTime] = useState(30);
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
            appAlert('Timeout', 'Aucun adversaire trouvé. Vos coins ont été remboursés.');
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
                     appAlert(
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
                     appAlert('Erreur', msg);
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
        playButtonSound();
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
        playButtonSound();
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: getResponsiveSize(10) }}>
                <TouchableOpacity 
                    onPress={() => {
                        playButtonSound();
                        if (canGoPrev) setBet(effectiveBets[currentIndex - 1]);
                    }}
                    disabled={!canGoPrev}
                    style={{ padding: getResponsiveSize(8), opacity: !canGoPrev ? 0.3 : 1 }}
                >
                    <Ionicons name="remove-circle-outline" size={getResponsiveSize(32)} color={T.textDim} />
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
                        playButtonSound();
                        if (canGoNext) setBet(effectiveBets[currentIndex + 1]);
                    }}
                    disabled={!canGoNext}
                    style={{ padding: getResponsiveSize(8), opacity: !canGoNext ? 0.3 : 1 }}
                >
                    <Ionicons name="add-circle-outline" size={getResponsiveSize(32)} color={T.textDim} />
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
                            <ActivityIndicator size="large" color={T.gold} style={{ marginVertical: getResponsiveSize(20) }} />
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
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextActive]}>JOUER</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
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
        position: 'relative',
        overflow: 'hidden',
        maxHeight: '72%',
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
        marginBottom: getResponsiveSize(10),
    },
    friendsOptionButton: {
        paddingHorizontal: getResponsiveSize(12),
        paddingVertical: getResponsiveSize(6),
        borderRadius: getResponsiveSize(T.radiusPill),
        borderWidth: 1,
        borderColor: T.borderSoft,
        margin: getResponsiveSize(4),
        backgroundColor: T.bg3,
    },
    friendsOptionButtonActive: {
        backgroundColor: T.gold,
        borderColor: T.gold,
    },
    friendsOptionText: {
        color: T.textDim,
        fontSize: getResponsiveSize(12),
        fontWeight: 'bold',
    },
    friendsOptionTextActive: {
        color: '#1B1305',
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
        ...modalTheme.buttonActive,
    },
    modalButtonText: {
        ...modalTheme.buttonText,
        textTransform: 'uppercase'
    },
    modalButtonTextActive: modalTheme.buttonTextActive,
    timerText: {
        color: T.gold,
        fontSize: getResponsiveSize(26),
        fontWeight: 'bold',
        marginBottom: getResponsiveSize(8)
    },
    betInfo: {
        color: T.textDim,
        fontSize: getResponsiveSize(14),
        marginBottom: getResponsiveSize(14),
        fontWeight: 'bold'
    },
    cancelButton: {
        ...modalTheme.buttonBase,
        ...modalTheme.buttonDestructive,
        width: '100%',
        marginTop: getResponsiveSize(10)
    },
    cancelButtonText: {
        ...modalTheme.buttonTextBase,
        ...modalTheme.buttonTextOnDark,
        textTransform: 'uppercase'
    },
    betDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: getResponsiveSize(124),
        height: getResponsiveSize(44),
        overflow: 'hidden',
        backgroundColor: T.bg3,
        borderRadius: getResponsiveSize(T.radiusPill),
        marginHorizontal: getResponsiveSize(8),
        borderWidth: 1,
        borderColor: T.border
    },
    betSmallText: {
        color: T.gold,
        fontSize: getResponsiveSize(12),
        opacity: 0.5,
        width: getResponsiveSize(60),
        textAlign: 'center'
    },
    betMainText: {
        color: T.gold,
        fontSize: getResponsiveSize(18),
        fontWeight: 'bold',
        width: getResponsiveSize(100),
        textAlign: 'center',
    }
});

export default OnlineGameSetup;
