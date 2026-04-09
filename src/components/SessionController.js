import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { socket } from '../utils/socket';
import { API_URL } from '../config';
import { useAdManager } from '../ads/AdSystem';
import { appAlert } from '../services/appAlert';
import { getResponsiveSize } from '../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUser } from '../redux/slices/authSlice';

const SessionController = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { token, user } = useSelector(state => state.auth);
    const { showAds, prepareRewarded, showRewarded } = useAdManager();
    const appState = useRef(AppState.currentState);
    // Track the active game ID for this session to prevent rejoining ghost games after restart
    const activeGameId = useRef(null);
    const loginRewardPromptPendingRef = useRef(false);
    const loginRewardPromptShownRef = useRef(false);
    const lastUserIdRef = useRef(null);

    useEffect(() => {
        const userId = user?._id || user?.id || null;
        if (!token || !userId) {
            loginRewardPromptPendingRef.current = false;
            loginRewardPromptShownRef.current = false;
            lastUserIdRef.current = null;
            return;
        }
        if (lastUserIdRef.current !== userId) {
            loginRewardPromptPendingRef.current = true;
            loginRewardPromptShownRef.current = false;
            lastUserIdRef.current = userId;
            // After login, process any pending deep link invite code
            (async () => {
                try {
                    const code = await AsyncStorage.getItem('pendingInviteCode');
                    if (code && code.length === 6) {
                        await AsyncStorage.removeItem('pendingInviteCode');
                        if (!socket.connected) socket.connect();
                        const onBalanceUpdated = (payload) => {
                            const newBalance = typeof payload === 'number' ? payload : payload?.coins;
                            if (typeof newBalance === 'number') dispatch(updateUser({ coins: newBalance }));
                        };
                        const onSuccess = (data) => {
                            socket.off('join_code_success', onSuccess);
                            socket.off('join_code_error', onError);
                            socket.off('balance_updated', onBalanceUpdated);
                            if (data?.type === 'custom') {
                                navigation.navigate('Game', {
                                    mode: 'online_custom',
                                    gameId: data.gameId,
                                    players: data.players,
                                    currentTurn: data.currentTurn ?? 'black',
                                    betAmount: data.betAmount,
                                    timeControl: data.timeControl,
                                    gameType: data.mode,
                                    tournamentSettings: data.tournamentSettings ?? null,
                                    inviteCode: data.inviteCode ?? null,
                                    isWaiting: false,
                                });
                            } else if (data?.gameId) {
                                navigation.navigate('SalleAttenteLive', {
                                    configSalle: data.config,
                                    roomId: data.gameId,
                                    roomCode: data.roomCode,
                                    role: data.role,
                                    players: data.players,
                                    betAmount: data.betAmount,
                                    timeControl: data.timeControl,
                                });
                            } else {
                                navigation.navigate('Home');
                            }
                        };
                        const onError = (msg) => {
                            socket.off('join_code_success', onSuccess);
                            socket.off('join_code_error', onError);
                            socket.off('balance_updated', onBalanceUpdated);
                            appAlert('Invitation', typeof msg === 'string' ? msg : 'Code invalide ou expiré.');
                        };
                        socket.on('join_code_success', onSuccess);
                        socket.on('join_code_error', onError);
                        socket.on('balance_updated', onBalanceUpdated);
                        socket.emit('join_by_code', { code: code.trim().toUpperCase(), userId });
                    }
                } catch (e) {
                    // ignore
                }
            })();
        }
    }, [token, user?._id, user?.id, dispatch]);

    useEffect(() => {
        if (!token) return;

        const maybeShowLoginRewardPrompt = () => {
            if (!showAds) return;
            if (!loginRewardPromptPendingRef.current) return;
            if (loginRewardPromptShownRef.current) return;
            const navState = navigation.getState();
            const currentRoute = navState?.routes?.[navState.index];
            if (!currentRoute || currentRoute.name !== 'Home') return;

            loginRewardPromptPendingRef.current = false;
            loginRewardPromptShownRef.current = true;

            setTimeout(() => {
                prepareRewarded();
                appAlert(
                    'Bonus de connexion',
                    'Regarder une pub maintenant pour gagner +20 coins ?',
                    [
                        { text: 'Non merci', style: 'cancel', textStyle: { fontSize: getResponsiveSize(14) } },
                        {
                            text: 'Regarder',
                            onPress: () => {
                                prepareRewarded();
                                setTimeout(() => {
                                    showRewarded({ amount: 20, reason: 'Bonus connexion', metadata: { source: 'login_reward' } });
                                }, 250);
                            },
                            textStyle: { fontSize: getResponsiveSize(14) }
                        }
                    ]
                );
            }, 350);
        };


        // 1. Listen for game start to track active session
        const handleGameStart = (data) => {
            console.log('SessionController: Game Started', data.gameId);
            activeGameId.current = data.gameId;
        };

        const handleGameOver = () => {
             // We don't clear immediately to allow Result screen to be shown
             // activeGameId.current = null; 
        };

        socket.on('game_start', handleGameStart);
        socket.on('game_over', handleGameOver);

        // 2. AppState Listener
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                console.log('App has come to the foreground!');
                checkSessionStatus();
            }

            appState.current = nextAppState;
        });

        // 3. Socket Reconnect Listener
        const handleReconnect = () => {
            console.log('Socket reconnected, checking session...');
            checkSessionStatus();
        };

        socket.on('connect', handleReconnect);

        // 4. Navigation Listener to clear session on Home return
        const unsubscribeNav = navigation.addListener('state', (e) => {
            const state = e.data.state;
            if (!state) return;
            
            // Get current route name
            const currentRoute = state.routes[state.index];
            if (currentRoute.name === 'Home' || currentRoute.name === 'Login') {
                // If user manually goes to Home/Login, we consider the session "closed" or "abandoned"
                // This prevents auto-redirecting back to Result screen after leaving it
                if (activeGameId.current) {
                    console.log('SessionController: Cleared active session (User returned to Home/Login)');
                    activeGameId.current = null;
                }
            }

            maybeShowLoginRewardPrompt();
        });

        maybeShowLoginRewardPrompt();

        return () => {
            subscription.remove();
            unsubscribeNav();
            socket.off('game_start', handleGameStart);
            socket.off('game_over', handleGameOver);
            socket.off('connect', handleReconnect);
        };
    }, [token, navigation, showAds, showRewarded]);

    const checkSessionStatus = async () => {
        // If we haven't started a game in this session, we don't want to auto-join
        // This satisfies "Il ne doit jamais revenir dans une partie active après un restart d’app"
        if (!token || !activeGameId.current) {
            console.log('SessionController: No active game in this session. Ignoring.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/users/me/session-status?gameId=${activeGameId.current}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return;

            const status = await response.json();
            console.log('Session Status:', status);

            if (!status.inGame) {
                // Server says no game.
                return;
            }

            // Verify it matches our session game
            if (status.gameId !== activeGameId.current) {
                console.log('SessionController: Mismatch game ID. Ignoring ghost game.');
                return;
            }

            // Decide Navigation
            if (status.matchStatus === 'active') {
                const navState = navigation.getState();
                if (navState) {
                    const currentRoute = navState.routes[navState.index];
                    if (currentRoute.name === 'Game') {
                        const currentGameId = currentRoute.params?.gameId;
                        if (currentGameId === status.gameId) {
                            console.log('SessionController: already on Game for active session, skipping navigation');
                            return;
                        }
                    }
                }
                const isLive = typeof status.gameId === 'string' && status.gameId.startsWith('live_');
                const baseParams = {
                    gameId: status.gameId,
                    betAmount: status.gameData?.betAmount,
                    opponent: status.gameData?.opponent,
                    gameType: status.gameData?.mode
                };
                // Always provide an explicit mode to avoid falling back to 'local'
                if (isLive) {
                    navigation.navigate('Game', { mode: 'live', ...baseParams });
                } else {
                    navigation.navigate('Game', { mode: 'online', ...baseParams });
                }
            } else if (status.matchStatus === 'completed') {
                // Navigate to Result
                const isVictory = status.result === 'win';
                const gains = isVictory ? Math.floor(status.gameData.betAmount * 2 * 0.9) : 0;
                
                navigation.navigate('ResultatJeuOnline', {
                    victoire: isVictory,
                    gains: gains,
                    montantPari: status.gameData.betAmount,
                    adversaire: status.gameData.opponent,
                    // Add other params if available or defaults
                    raisonVictoire: isVictory ? 'Victoire' : undefined,
                    raisonDefaite: !isVictory ? 'Défaite' : undefined,
                });
            }

        } catch (error) {
            console.error('Session Check Error:', error);
        }
    };

    return null; // Logic only component
};

export default SessionController;
