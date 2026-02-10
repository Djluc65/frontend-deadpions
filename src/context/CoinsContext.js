import React, { createContext, useContext, useEffect, useState } from 'react';
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
    const [feedback, setFeedback] = useState({ visible: false, amount: 0 });

    // Initialisation et écouteurs
    useEffect(() => {
        if (token) {
            refreshBalance();
            
            // Écouter les mises à jour de solde en temps réel
            socket.on('balance_updated', handleBalanceUpdate);
            
            // Tentative de synchronisation des transactions en attente
            syncTransactions();
        }

        return () => {
            socket.off('balance_updated', handleBalanceUpdate);
        };
    }, [token]);

    const handleBalanceUpdate = (data) => {
        console.log('Balance updated via socket:', data);
        if (data && typeof data.coins === 'number') {
            dispatch(updateUser({ coins: data.coins }));
        }
    };

    const refreshBalance = async () => {
        if (!token) return;
        try {
            const balance = await CoinsService.obtenirSolde(token);
            if (user && user.coins !== balance) {
                dispatch(updateUser({ coins: balance }));
            }
        } catch (error) {
            console.error('Erreur refreshBalance:', error);
        }
    };

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
            setFeedback({ visible: true, amount: amount });
            
            syncTransactions();
            return result;
        } catch (error) {
            console.error('Erreur credit context:', error);
            throw error;
        }
    };

    return (
        <CoinsContext.Provider value={{ 
            coins: user?.coins || 0, 
            debit, 
            credit, 
            refresh: refreshBalance,
            sync: syncTransactions
        }}>
            {children}
            <CoinsFeedback 
                visible={feedback.visible} 
                amount={feedback.amount} 
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
