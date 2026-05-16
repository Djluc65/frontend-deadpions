import React, { useState, useEffect, memo, useRef } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { socket } from '../../utils/socket';
import { playButtonSound } from '../../utils/soundManager';
import { BET_OPTIONS, ONLINE_TIME_OPTIONS } from '../../utils/constants';
import { logout } from '../../redux/slices/authSlice';
import { getResponsiveSize } from '../../utils/responsive';
import { appAlert } from '../../services/appAlert';
import { modalTheme } from '../../utils/modalTheme';
import { T } from '../../utils/theme';
import { useAdManager } from '../../ads/AdSystem';
import { consumeLiveRoom, ensureDailyReset, incrementLiveBonus, selectLiveRemaining } from '../../redux/slices/rewardsSlice';

const LiveGameSetup = memo(({ visible, onClose, navigation, user }) => {
    const dispatch = useDispatch();
    const liveRemaining = useSelector((state) => selectLiveRemaining(state));
    const { showAds, prepareRewarded, showRewarded } = useAdManager();
    const isCreatingRef = useRef(false);

    // --- États pour les paramètres de la salle ---
    const [nomSalle, setNomSalle] = useState('');
    const [description, setDescription] = useState('');
    const [sallePrivee, setSallePrivee] = useState(false);
    const [motDePasse, setMotDePasse] = useState('');
    const [limitSpectateurs, setLimitSpectateurs] = useState(100);
    const [chatActif, setChatActif] = useState(true);
    const [audioLobbyActif, setAudioLobbyActif] = useState(true);
    const [reactionsActives, setReactionsActives] = useState(true);
    const [tempsParCoup, setTempsParCoup] = useState(30);
    const [startingSide, setStartingSide] = useState('random');
    const [hostColor, setHostColor] = useState('random');
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
            dispatch(ensureDailyReset({ nowTs: Date.now() }));
            prepareRewarded();
        }
    }, [visible, dispatch, prepareRewarded]);

    useEffect(() => {
        isCreatingRef.current = isCreating;
    }, [isCreating]);

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
        if (!visible) return;
        const userId = user?._id || user?.id;
        if (!userId) return;
        if (!socket.connected) socket.connect();
        socket.emit('join_user_room', userId);

        const handleRoomCreated = (createdConfig) => {
            setIsCreating(false);
            isCreatingRef.current = false;
            dispatch(consumeLiveRoom({ nowTs: Date.now() }));
            onClose();
            navigation.replace('SalleAttenteLive', { configSalle: createdConfig, roomId: createdConfig?.id });
        };

        const handleError = (message) => {
            setIsCreating(false);
            isCreatingRef.current = false;
            if (message === 'User not found') {
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
                appAlert('Erreur', message);
            }
        };

        socket.on('live_room_created', handleRoomCreated);
        socket.on('error', handleError);

        return () => {
            socket.off('live_room_created', handleRoomCreated);
            socket.off('error', handleError);
        };
    }, [visible, user?._id, user?.id, navigation, onClose]);

    const validateStep1 = () => {
        if (!nomSalle.trim()) {
            appAlert('❌ Erreur', 'Veuillez donner un nom à votre salle');
            return false;
        }
        if (nomSalle.length < 3) {
            appAlert('❌ Erreur', 'Le nom doit contenir au moins 3 caractères');
            return false;
        }
        if (sallePrivee && !motDePasse.trim()) {
            appAlert('❌ Erreur', 'Veuillez définir un mot de passe pour la salle privée');
            return false;
        }
        return true;
    };

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

    const createRoomNow = (userId) => {
        if (!userId) return;
        if (isCreatingRef.current) return;
        isCreatingRef.current = true;
        if (!socket.connected) socket.connect();
        socket.emit('join_user_room', userId);

        setIsCreating(true);

        const configSalle = {
            id: 'live_' + Date.now(),
            nom: nomSalle,
            description: description || 'Partie en direct',
            type: 'live',
            createur: {
                id: userId,
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
                betAmount: betAmount,
                startingSide: startingSide,
                hostColor: hostColor
            }
        };

        socket.emit('create_live_room', { config: configSalle });
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

        const userId = user?._id || user?.id;
        if (!userId) {
            appAlert('Erreur', 'Vous devez être connecté.');
            return;
        }

        dispatch(ensureDailyReset({ nowTs: Date.now() }));
        if (liveRemaining <= 0) {
            if (!showAds) {
                appAlert('Limite atteinte', "Vous avez atteint la limite de salles live pour aujourd'hui.");
                return;
            }
            appAlert(
                'Limite atteinte',
                "Vous avez atteint la limite de 5 salles live aujourd'hui. Regarder une pub pour +1 salle ?",
                [
                    { text: 'Non merci', style: 'cancel' },
                    {
                        text: 'Regarder',
                        onPress: () => {
                            prepareRewarded();
                            setTimeout(() => {
                                showRewarded({
                                    amount: 0,
                                    reason: 'Salle live supplémentaire',
                                    metadata: { reward: 'live_extra' },
                                    onEarned: async () => {
                                        dispatch(incrementLiveBonus({ nowTs: Date.now() }));
                                        const res = await grantLiveBonusOnServer(userId);
                                        if (res?.ok) {
                                            createRoomNow(userId);
                                        } else {
                                            appAlert('Erreur', res?.message || "Impossible d'activer l'accès Live.");
                                        }
                                    }
                                });
                            }, 250);
                        }
                    }
                ]
            );
            return;
        }
        createRoomNow(userId);
    };

    const renderBetSelector = () => {
        const availableBets = BET_OPTIONS.filter(b => b <= (user?.coins || 0));
        const effectiveBets = availableBets.length > 0 ? availableBets : [100];
        const currentIndex = effectiveBets.indexOf(betAmount);
        
        const canGoPrev = currentIndex > 0;
        const canGoNext = currentIndex < effectiveBets.length - 1;

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: getResponsiveSize(8) }}>
                <TouchableOpacity 
                    onPress={() => {
                        playButtonSound();
                        if (canGoPrev) setBetAmount(effectiveBets[currentIndex - 1]);
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
                    style={{ padding: getResponsiveSize(8), opacity: !canGoNext ? 0.3 : 1 }}
                >
                    <Ionicons name="add-circle-outline" size={getResponsiveSize(32)} color={T.textDim} />
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
                            placeholderTextColor={T.textMuted}
                            value={nomSalle}
                            onChangeText={setNomSalle}
                            maxLength={30}
                        />

                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Salle Privée</Text>
                            <Switch
                                trackColor={{ false: T.bg3, true: T.blue }}
                                thumbColor={sallePrivee ? T.gold : T.textMuted}
                                onValueChange={setSallePrivee}
                                value={sallePrivee}
                            />
                        </View>

                        {sallePrivee && (
                            <TextInput
                                style={[styles.input, { marginTop: getResponsiveSize(10) }]}
                                placeholder="Mot de passe"
                                placeholderTextColor={T.textMuted}
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
                                    {[2, 4, 6, 8, 10].map(num => (
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

                        <Text style={styles.friendsLabel}>Qui commence ?</Text>
                        <View style={styles.optionsRow}>
                            {[
                                { label: 'Moi', value: 'host' },
                                { label: 'Adversaire', value: 'guest' },
                                { label: 'Aléatoire', value: 'random' }
                            ].map(opt => (
                                <TouchableOpacity 
                                    key={opt.value} 
                                    style={[styles.friendsOptionButton, startingSide === opt.value && styles.friendsOptionButtonActive]}
                                    onPress={() => { playButtonSound(); setStartingSide(opt.value); }}
                                >
                                    <Text style={[styles.friendsOptionText, startingSide === opt.value && styles.friendsOptionTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.friendsLabel}>Ma couleur :</Text>
                        <View style={styles.optionsRow}>
                            {[
                                { label: 'Bleu', value: 'white' },
                                { label: 'Rouge', value: 'black' },
                                { label: 'Aléatoire', value: 'random' }
                            ].map(opt => (
                                <TouchableOpacity 
                                    key={opt.value} 
                                    style={[styles.friendsOptionButton, hostColor === opt.value && styles.friendsOptionButtonActive]}
                                    onPress={() => { playButtonSound(); setHostColor(opt.value); }}
                                >
                                    <Text style={[styles.friendsOptionText, hostColor === opt.value && styles.friendsOptionTextActive]}>
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
                                trackColor={{ false: T.bg3, true: T.blue }}
                                thumbColor={chatActif ? T.gold : T.textMuted}
                                onValueChange={setChatActif}
                                value={chatActif}
                            />
                        </View>

                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Audio Lobby</Text>
                            <Switch
                                trackColor={{ false: T.bg3, true: T.blue }}
                                thumbColor={audioLobbyActif ? T.gold : T.textMuted}
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

                        <Text style={[styles.friendsLabel, { marginTop: getResponsiveSize(14) }]}>
                            Salles live restantes aujourd'hui:
                        </Text>
                        <Text style={{ color: T.gold, fontWeight: '900', fontSize: getResponsiveSize(18), marginBottom: getResponsiveSize(6) }}>
                            {liveRemaining}
                        </Text>
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
                            <ActivityIndicator size="large" color={T.gold} style={{ marginVertical: getResponsiveSize(20) }} />
                            <Text style={styles.betInfo}>Veuillez patienter</Text>
                        </View>
                    ) : (
                        <ScrollView 
                          contentContainerStyle={{ alignItems: 'center', width: '100%', paddingBottom: getResponsiveSize(24) }} 
                          style={{ width: '100%' }}
                        >
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
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextActive]}>
                                        {step === TOTAL_STEPS ? 'CRÉER' : 'SUIVANT'}
                                    </Text>
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
        maxHeight: '82%',
    },
    friendsModalTitle: {
        ...modalTheme.title,
        marginBottom: getResponsiveSize(5),
        textTransform: 'uppercase'
    },
    stepIndicator: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: getResponsiveSize(12),
        marginBottom: getResponsiveSize(10),
        fontWeight: '600',
    },
    stepContainer: {
        width: '100%',
        alignItems: 'center',
    },
    friendsLabel: {
        fontSize: getResponsiveSize(14),
        color: '#fff',
        marginBottom: getResponsiveSize(8),
        marginTop: getResponsiveSize(8),
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginLeft: getResponsiveSize(10)
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: getResponsiveSize(5),
    },
    friendsOptionButton: {
        paddingHorizontal: getResponsiveSize(12),
        paddingVertical: getResponsiveSize(6),
        borderRadius: getResponsiveSize(20),
        borderWidth: getResponsiveSize(1),
        borderColor: '#f1c40f',
        margin: getResponsiveSize(4),
        backgroundColor: 'transparent',
    },
    friendsOptionButtonActive: {
        backgroundColor: '#f1c40f',
    },
    friendsOptionText: {
        color: '#f1c40f',
        fontSize: getResponsiveSize(12),
        fontWeight: 'bold',
    },
    friendsOptionTextActive: {
        color: '#0f2350',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: getResponsiveSize(20),
        marginBottom: getResponsiveSize(20)
    },
    modalButtonsFixed: {
        position: 'absolute',
        left: getResponsiveSize(16),
        right: getResponsiveSize(16),
        bottom: getResponsiveSize(16),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    betInfo: {
        color: '#fff',
        fontSize: getResponsiveSize(14),
        marginBottom: getResponsiveSize(14),
        fontWeight: 'bold'
    },
    betDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: getResponsiveSize(124),
        height: getResponsiveSize(44),
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: getResponsiveSize(22),
        marginHorizontal: getResponsiveSize(8),
        borderWidth: 1,
        borderColor: 'rgba(241, 196, 15, 0.3)'
    },
    betSmallText: {
        color: '#f1c40f',
        fontSize: getResponsiveSize(12),
        opacity: 0.5,
        width: getResponsiveSize(60),
        textAlign: 'center'
    },
    betMainText: {
        color: '#f1c40f',
        fontSize: getResponsiveSize(18),
        fontWeight: 'bold',
        width: getResponsiveSize(100),
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: getResponsiveSize(10)
    },
    input: {
        width: '95%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
        borderColor: '#f1c40f',
        borderRadius: getResponsiveSize(15),
        padding: getResponsiveSize(10),
        color: '#fff',
        fontSize: getResponsiveSize(14),
        marginBottom: getResponsiveSize(5),
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '90%',
        marginVertical: getResponsiveSize(5),
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: getResponsiveSize(8),
        borderRadius: getResponsiveSize(15),
    },
    switchLabel: {
        color: '#fff',
        fontSize: getResponsiveSize(14),
        fontWeight: 'bold',
    }
});

export default LiveGameSetup;
