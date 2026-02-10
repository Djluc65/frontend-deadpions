import React, { useState, useEffect, memo } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { socket } from '../../utils/socket';
import { playButtonSound } from '../../utils/soundManager';
import { BET_OPTIONS, ONLINE_TIME_OPTIONS } from '../../utils/constants';
import { logout } from '../../redux/slices/authSlice';

const LiveGameSetup = memo(({ visible, onClose, navigation, user }) => {
    const dispatch = useDispatch();

    // --- États pour les paramètres de la salle ---
    const [nomSalle, setNomSalle] = useState('');
    const [description, setDescription] = useState('');
    const [sallePrivee, setSallePrivee] = useState(false);
    const [motDePasse, setMotDePasse] = useState('');
    const [limitSpectateurs, setLimitSpectateurs] = useState(100);
    const [chatActif, setChatActif] = useState(true);
    const [audioLobbyActif, setAudioLobbyActif] = useState(true);
    const [reactionsActives, setReactionsActives] = useState(true);
    const [tempsParCoup, setTempsParCoup] = useState(120);
    const [isTournament, setIsTournament] = useState(false);
    const [tournamentGames, setTournamentGames] = useState(2);
    const [betAmount, setBetAmount] = useState(100);
    const [modeSpectateur, setModeSpectateur] = useState('libre');
    
    const [isCreating, setIsCreating] = useState(false);
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 3;

    // Options pour les limites de spectateurs
    const limitsSpectateurs = [10, 20, 50, 100, 200, 500, 1000];

    // Reset step on visible change
    useEffect(() => {
        if (visible) {
            setStep(1);
        }
    }, [visible]);

    // Ensure bet is valid w.r.t user coins
    useEffect(() => {
        if (visible && user?.coins !== undefined) {
            const maxCoins = user.coins;
            if (betAmount > maxCoins) {
                const validBets = BET_OPTIONS.filter(b => b <= maxCoins);
                if (validBets.length > 0) {
                    setBetAmount(validBets[validBets.length - 1]);
                } else {
                    setBetAmount(100);
                }
            }
        }
    }, [visible, user?.coins]);

    // Setup socket listeners
    useEffect(() => {
        if (!user || !user._id) return;

        const handleRoomCreated = (createdConfig) => {
            setIsCreating(false);
            onClose();
            navigation.navigate('SalleAttenteLive', { configSalle: createdConfig });
        };

        const handleError = (message) => {
            setIsCreating(false);
            if (message === 'User not found') {
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
                Alert.alert('Erreur', message);
            }
        };

        socket.on('live_room_created', handleRoomCreated);
        socket.on('error', handleError);

        return () => {
            socket.off('live_room_created', handleRoomCreated);
            socket.off('error', handleError);
        };
    }, [user, navigation, onClose]);

    const validateStep1 = () => {
        if (!nomSalle.trim()) {
            Alert.alert('❌ Erreur', 'Veuillez donner un nom à votre salle');
            return false;
        }
        if (nomSalle.length < 3) {
            Alert.alert('❌ Erreur', 'Le nom doit contenir au moins 3 caractères');
            return false;
        }
        if (sallePrivee && !motDePasse.trim()) {
            Alert.alert('❌ Erreur', 'Veuillez définir un mot de passe pour la salle privée');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        playButtonSound();
        if (step === 1 && !validateStep1()) return;
        setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    };

    const handleBack = () => {
        playButtonSound();
        setStep(prev => Math.max(prev - 1, 1));
    };

    const handleCreateRoom = () => {
        playButtonSound();
        
        // Final validation check (though steps should have caught it)
        if (!validateStep1()) return;

        setIsCreating(true);

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
            }
        };

        socket.emit('create_live_room', { config: configSalle });
    };

    const renderBetSelector = () => {
        const availableBets = BET_OPTIONS.filter(b => b <= (user?.coins || 0));
        const effectiveBets = availableBets.length > 0 ? availableBets : [100];
        const currentIndex = effectiveBets.indexOf(betAmount);
        
        const canGoPrev = currentIndex > 0;
        const canGoNext = currentIndex < effectiveBets.length - 1;

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
                <TouchableOpacity 
                    onPress={() => {
                        playButtonSound();
                        if (canGoPrev) setBetAmount(effectiveBets[currentIndex - 1]);
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
                        {betAmount.toLocaleString()}
                    </Text>

                    <Text style={styles.betSmallText}>
                        {currentIndex < effectiveBets.length - 1 ? effectiveBets[currentIndex + 1].toLocaleString() : ''}
                    </Text>
                </View>

                <TouchableOpacity 
                    onPress={() => {
                        playButtonSound();
                        if (canGoNext) setBetAmount(effectiveBets[currentIndex + 1]);
                    }}
                    disabled={!canGoNext}
                    style={{ padding: 10, opacity: !canGoNext ? 0.3 : 1 }}
                >
                    <Ionicons name="add-circle-outline" size={40} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.friendsLabel}>Nom de la salle</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Tournoi des champions"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={nomSalle}
                            onChangeText={setNomSalle}
                            maxLength={30}
                        />

                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Salle Privée</Text>
                            <Switch
                                trackColor={{ false: "#767577", true: "#f1c40f" }}
                                thumbColor={sallePrivee ? "#fff" : "#f4f3f4"}
                                onValueChange={setSallePrivee}
                                value={sallePrivee}
                            />
                        </View>

                        {sallePrivee && (
                            <TextInput
                                style={[styles.input, { marginTop: 10 }]}
                                placeholder="Mot de passe"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={motDePasse}
                                onChangeText={setMotDePasse}
                                secureTextEntry
                            />
                        )}
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.friendsLabel}>Mode de jeu:</Text>
                        <View style={styles.optionsRow}>
                            <TouchableOpacity 
                                style={[styles.friendsOptionButton, !isTournament && styles.friendsOptionButtonActive]}
                                onPress={() => setIsTournament(false)}
                            >
                                <Text style={[styles.friendsOptionText, !isTournament && styles.friendsOptionTextActive]}>Simple</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.friendsOptionButton, isTournament && styles.friendsOptionButtonActive]}
                                onPress={() => setIsTournament(true)}
                            >
                                <Text style={[styles.friendsOptionText, isTournament && styles.friendsOptionTextActive]}>Tournoi</Text>
                            </TouchableOpacity>
                        </View>

                        {isTournament && (
                            <>
                                <Text style={styles.friendsLabel}>Nombre de manches:</Text>
                                <View style={styles.optionsRow}>
                                    {[2, 3, 5, 10].map(num => (
                                        <TouchableOpacity 
                                            key={num} 
                                            style={[styles.friendsOptionButton, tournamentGames === num && styles.friendsOptionButtonActive]}
                                            onPress={() => setTournamentGames(num)}
                                        >
                                            <Text style={[styles.friendsOptionText, tournamentGames === num && styles.friendsOptionTextActive]}>{num}</Text>
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
                                    style={[styles.friendsOptionButton, tempsParCoup === opt.value && styles.friendsOptionButtonActive]}
                                    onPress={() => setTempsParCoup(opt.value)}
                                >
                                    <Text style={[styles.friendsOptionText, tempsParCoup === opt.value && styles.friendsOptionTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Chat Actif</Text>
                            <Switch
                                trackColor={{ false: "#767577", true: "#f1c40f" }}
                                thumbColor={chatActif ? "#fff" : "#f4f3f4"}
                                onValueChange={setChatActif}
                                value={chatActif}
                            />
                        </View>

                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Audio Lobby</Text>
                            <Switch
                                trackColor={{ false: "#767577", true: "#f1c40f" }}
                                thumbColor={audioLobbyActif ? "#fff" : "#f4f3f4"}
                                onValueChange={setAudioLobbyActif}
                                value={audioLobbyActif}
                            />
                        </View>
                        
                        <Text style={styles.friendsLabel}>Limite Spectateurs:</Text>
                        <View style={styles.optionsRow}>
                            {limitsSpectateurs.slice(0, 4).map(num => (
                                <TouchableOpacity 
                                    key={num} 
                                    style={[styles.friendsOptionButton, limitSpectateurs === num && styles.friendsOptionButtonActive]}
                                    onPress={() => setLimitSpectateurs(num)}
                                >
                                    <Text style={[styles.friendsOptionText, limitSpectateurs === num && styles.friendsOptionTextActive]}>{num}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
                if (!isCreating) {
                    if (step > 1) handleBack();
                    else onClose();
                }
            }}
        >
            <Pressable style={styles.modalOverlay} onPress={() => !isCreating && onClose()}>
                <Pressable style={styles.friendsModalContent} onPress={() => {}}>
                    {isCreating ? (
                        <View style={{ alignItems: 'center', width: '100%' }}>
                            <Text style={styles.friendsModalTitle}>Création de la salle...</Text>
                            <ActivityIndicator size="large" color="#f1c40f" style={{ marginVertical: 20 }} />
                            <Text style={styles.betInfo}>Veuillez patienter</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ alignItems: 'center', width: '100%' }} style={{ width: '100%' }}>
                            <Text style={styles.friendsModalTitle}>Créer une Salle Live</Text>
                            <Text style={styles.stepIndicator}>Étape {step}/{TOTAL_STEPS}</Text>

                            {renderStepContent()}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={styles.modalButtonCancel} 
                                    onPress={step === 1 ? onClose : handleBack}
                                >
                                    <Text style={styles.modalButtonText}>
                                        {step === 1 ? 'Annuler' : 'Retour'}
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.modalButtonConfirm} 
                                    onPress={step === TOTAL_STEPS ? handleCreateRoom : handleNext}
                                >
                                    <Text style={styles.modalButtonText}>
                                        {step === TOTAL_STEPS ? 'CRÉER' : 'SUIVANT'}
                                    </Text>
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
        backgroundColor: '#041c55',
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
        maxHeight: '85%',
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
        fontSize: 24, 
        fontWeight: 'bold',
        color: '#f1c40f',
        marginBottom: 5,
        textAlign: 'center',
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    stepIndicator: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        marginBottom: 15,
        fontWeight: '600',
    },
    stepContainer: {
        width: '100%',
        alignItems: 'center',
    },
    friendsLabel: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 8,
        marginTop: 12,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginLeft: 10
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 5,
    },
    friendsOptionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f1c40f',
        margin: 4,
        backgroundColor: 'transparent',
    },
    friendsOptionButtonActive: {
        backgroundColor: '#f1c40f',
    },
    friendsOptionText: {
        color: '#f1c40f',
        fontSize: 12,
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
        marginBottom: 20
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
    betInfo: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 20,
        fontWeight: 'bold'
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
    },
    input: {
        width: '95%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
        borderColor: '#f1c40f',
        borderRadius: 15,
        padding: 12,
        color: '#fff',
        fontSize: 16,
        marginBottom: 5,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '90%',
        marginVertical: 5,
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 10,
        borderRadius: 15,
    },
    switchLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default LiveGameSetup;
