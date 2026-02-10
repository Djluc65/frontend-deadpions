import { useCoinsContext } from '../context/CoinsContext';

export const useCoins = () => {
    return useCoinsContext();
};
