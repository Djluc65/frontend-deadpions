import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../redux/slices/authSlice';
import CoinsService from '../services/CoinsService';

export const useCoins = () => {
    const dispatch = useDispatch();
    const { user, token } = useSelector(state => state.auth);
    const coins = user?.coins || 0;

    const debit = async (amount, reason, metadata) => {
        try {
            const result = await CoinsService.debiterCoins(coins, amount, reason, metadata);
            // Mettre à jour Redux (UI)
            dispatch(updateUser({ coins: result.nouveauSolde }));
            return result;
        } catch (error) {
            console.error('Erreur debit:', error);
            throw error;
        }
    };

    const credit = async (amount, reason, metadata) => {
        try {
            const result = await CoinsService.crediterCoins(coins, amount, reason, metadata);
            dispatch(updateUser({ coins: result.nouveauSolde }));
            return result;
        } catch (error) {
            console.error('Erreur credit:', error);
            throw error;
        }
    };
    
    const refresh = async () => {
        if (token) {
            const balance = await CoinsService.obtenirSolde(token);
            if (balance !== coins) {
                dispatch(updateUser({ coins: balance }));
            }
            // Tenter une synchro des transactions en arrière-plan
            CoinsService.synchroniser(token).catch(err => console.log('Synchro background error:', err));
        }
    };

    return { coins, debit, credit, refresh };
};
