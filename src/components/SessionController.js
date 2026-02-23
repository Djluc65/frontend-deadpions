import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { socket } from '../utils/socket';
import { API_URL } from '../config';

const SessionController = () => {
    const navigation = useNavigation();
    const { token } = useSelector(state => state.auth);
    const appState = useRef(AppState.currentState);
    // Track the active game ID for this session to prevent rejoining ghost games after restart
    const activeGameId = useRef(null);

    useEffect(() => {
        if (!token) return;

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
        });

        return () => {
            subscription.remove();
            unsubscribeNav();
            socket.off('game_start', handleGameStart);
            socket.off('game_over', handleGameOver);
            socket.off('connect', handleReconnect);
        };
    }, [token, navigation]);

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
