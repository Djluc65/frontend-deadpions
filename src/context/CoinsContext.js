import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../redux/slices/authSlice';
import CoinsService from '../services/CoinsService';
import { socket } from '../utils/socket';
import CoinsFeedback from '../components/CoinsFeedback';

const CoinsContext = createContext(null);

export const CoinsProvider = ({ children }) => {
    const dispatch = useDispatch();
    const { user, token } = useSelector(state => state.auth);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [feedback, setFeedback] = useState({ visible: false, amount: 0 });

    // Initialisation et écouteurs
    useEffect(() => {
        if (token) {
            syncBalance();
            
            // Écouter les mises à jour de solde en temps réel
            socket.on('balance_updated', handleBalanceUpdate);
        }

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && token) {
                syncBalance();
            }
        });

        return () => {
            socket.off('balance_updated', handleBalanceUpdate);
            subscription.remove();
        };
    }, [token]);

    // Persister le solde Redux dans AsyncStorage pour qu'il soit disponible au redémarrage
    // même avant la première requête réseau
    useEffect(() => {
        if (user && typeof user.coins === 'number') {
            const saveCoins = async () => {
                try {
                    await AsyncStorage.setItem('user_coins', user.coins.toString());
                } catch (error) {
                    console.error('Erreur sauvegarde coins local:', error);
                }
            };
            saveCoins();
        }
    }, [user?.coins]);

    const handleBalanceUpdate = (data) => {
        console.log('Balance updated via socket:', data);
        if (data && typeof data.coins === 'number') {
            dispatch(updateUser({ coins: data.coins }));
        }
    };

    const syncBalance = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            // 1. D'abord synchroniser les transactions locales en attente (Push)
            // Cela permet de mettre à jour le serveur avec nos gains/pertes locaux
            await syncTransactions();

            // 2. Ensuite, récupérer la vérité terrain du serveur (Pull)
            // Cela assure que nous avons le solde final (incluant ce qu'on vient de pousser + d'autres changements)
            const balance = await CoinsService.reconcileBalance(user?.id, token);
            if (balance !== null && user && user.coins !== balance) {
                dispatch(updateUser({ coins: balance }));
            }
            
            setLastSync(Date.now());
        } catch (error) {
            console.error('Erreur syncBalance:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Alias pour compatibilité
    const refreshBalance = syncBalance;

    const syncTransactions = async () => {
        if (!token || isSyncing) return;
        try {
            setIsSyncing(true);
            await CoinsService.synchroniser(token);
        } catch (error) {
            console.error('Erreur syncTransactions:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const debit = async (amount, reason, metadata) => {
        const currentBalance = user?.coins || 0;
        try {
            const result = await CoinsService.debiterCoins(currentBalance, amount, reason, metadata);
            // Mise à jour immédiate Redux (Optimiste)
            dispatch(updateUser({ coins: result.nouveauSolde }));
            
            // Feedback visuel
            setFeedback({ visible: true, amount: -amount });
            
            // Si en ligne, on pourrait vouloir notifier le serveur immédiatement
            // Mais CoinsService.debiterCoins gère le stockage local et la sync se fera via le service
            syncTransactions(); 
            
            return result;
        } catch (error) {
            console.error('Erreur debit context:', error);
            throw error;
        }
    };

    const credit = async (amount, reason, metadata) => {
        const currentBalance = user?.coins || 0;
        try {
            const result = await CoinsService.crediterCoins(currentBalance, amount, reason, metadata);
            dispatch(updateUser({ coins: result.nouveauSolde }));
            
            // Feedback visuel
            setFeedback({ visible: true, amount: amount, type: 'CREDIT' });
            
            syncTransactions();
            return result;
        } catch (error) {
            console.error('Erreur credit context:', error);
            throw error;
        }
    };

    const refund = async (amount, reason, metadata) => {
        const currentBalance = user?.coins || 0;
        try {
            const result = await CoinsService.rembourserTransaction(currentBalance, amount, reason, metadata);
            dispatch(updateUser({ coins: result.nouveauSolde }));
            
            // Feedback visuel
            setFeedback({ visible: true, amount: amount, type: 'REMBOURSEMENT' });
            
            syncTransactions();
            return result;
        } catch (error) {
            console.error('Erreur refund context:', error);
            throw error;
        }
    };

    const value = {
        refreshBalance,
        syncBalance, // Nouvelle fonction exportée
        debit,
        credit,
        refund,
        isSyncing,
        isLoading,
        lastSync,
        feedback,
        setFeedback // Pour pouvoir fermer le feedback manuellement
    };

    return (
        <CoinsContext.Provider value={value}>
            {children}
            <CoinsFeedback 
                visible={feedback.visible} 
                amount={feedback.amount}
                type={feedback.type}
                onFinish={() => setFeedback(prev => ({ ...prev, visible: false }))} 
            />
        </CoinsContext.Provider>
    );
};

export const useCoinsContext = () => {
    const context = useContext(CoinsContext);
    if (!context) {
        throw new Error('useCoinsContext must be used within a CoinsProvider');
    }
    return context;
};

export default CoinsContext;
