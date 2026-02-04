import AsyncStorage from '@react-native-async-storage/async-storage';

class TransactionService {
    static STORAGE_KEY_HISTORY = 'transaction_history';

    /**
     * Ajoute une transaction à l'historique
     * @param {object} transaction 
     */
    static async ajouterTransaction(transaction) {
        try {
            const history = await this.getHistory();
            history.unshift(transaction); // Ajouter au début
            // Limiter à 50 transactions locales
            const limitedHistory = history.slice(0, 50);
            await AsyncStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(limitedHistory));
        } catch (error) {
            console.error('Erreur ajouterTransaction:', error);
        }
    }

    /**
     * Récupère l'historique des transactions
     * @returns {Promise<Array>}
     */
    static async getHistory() {
        try {
            const json = await AsyncStorage.getItem(this.STORAGE_KEY_HISTORY);
            return json ? JSON.parse(json) : [];
        } catch (error) {
            console.error('Erreur getHistory:', error);
            return [];
        }
    }

    /**
     * Récupère les transactions en attente de synchro
     */
    static async getPendingTransactions() {
        const history = await this.getHistory();
        return history.filter(t => !t.synchronise);
    }

    /**
     * Marque des transactions comme synchronisées
     * @param {Array<string>} ids 
     */
    static async markAsSynced(ids) {
        const history = await this.getHistory();
        const updated = history.map(t => {
            if (ids.includes(t.id)) {
                return { ...t, synchronise: true, statut: t.statut === 'EN_COURS' ? 'COMPLETEE' : t.statut };
            }
            return t;
        });
        await AsyncStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(updated));
    }
}

export default TransactionService;
