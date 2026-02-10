import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import TransactionService from './TransactionService';

class CoinsService {
    // Clés pour AsyncStorage
    static STORAGE_KEY_COINS = 'user_coins';
    static STORAGE_KEY_PENDING_TX = 'pending_transactions';

    /**
     * Récupère le solde actuel (depuis le serveur ou local)
     * @param {string} token - Token d'authentification
     * @returns {Promise<number>} - Solde actuel
     */
    static async obtenirSolde(token) {
        try {
            // Priorité au serveur
            if (token) {
                const response = await fetch(`${API_URL}/users/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    await AsyncStorage.setItem(this.STORAGE_KEY_COINS, data.coins.toString());
                    return data.coins;
                }
            }
            
            // Fallback local
            const localCoins = await AsyncStorage.getItem(this.STORAGE_KEY_COINS);
            return localCoins ? parseInt(localCoins, 10) : 0;
        } catch (error) {
            console.error('Erreur obtenirSolde:', error);
            const localCoins = await AsyncStorage.getItem(this.STORAGE_KEY_COINS);
            return localCoins ? parseInt(localCoins, 10) : 0;
        }
    }

    /**
     * Vérifie si le solde est suffisant pour un montant donné
     * @param {number} soldeActuel 
     * @param {number} montantRequis 
     * @returns {object} { suffisant: boolean, manquant: number }
     */
    static verifierSolde(soldeActuel, montantRequis) {
        if (soldeActuel >= montantRequis) {
            return { suffisant: true, manquant: 0 };
        }
        return { suffisant: false, manquant: montantRequis - soldeActuel };
    }

    /**
     * Débite des coins (Optimiste + Sauvegarde transaction)
     * @param {number} soldeActuel 
     * @param {number} montant 
     * @param {string} raison 
     * @param {object} metadata 
     * @returns {Promise<object>} { success, nouveauSolde, transactionId }
     */
    static async debiterCoins(soldeActuel, montant, raison, metadata) {
        const check = this.verifierSolde(soldeActuel, montant);
        if (!check.suffisant) {
            throw new Error(`Solde insuffisant. Manque ${check.manquant} coins.`);
        }

        const nouveauSolde = soldeActuel - montant;
        
        // Créer la transaction
        const transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'DEBIT',
            montant,
            raison,
            metadata,
            soldeAvant: soldeActuel,
            soldeApres: nouveauSolde,
            timestamp: Date.now(),
            statut: 'EN_COURS',
            synchronise: false
        };

        // Sauvegarder localement
        await TransactionService.ajouterTransaction(transaction);
        await AsyncStorage.setItem(this.STORAGE_KEY_COINS, nouveauSolde.toString());

        return { success: true, nouveauSolde, transaction };
    }

    /**
     * Crédite des coins
     * @param {number} soldeActuel 
     * @param {number} montant 
     * @param {string} raison 
     * @param {object} metadata 
     * @returns {Promise<object>} { success, nouveauSolde, transactionId }
     */
    static async crediterCoins(soldeActuel, montant, raison, metadata) {
        const nouveauSolde = soldeActuel + montant;

        const transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'CREDIT',
            montant,
            raison,
            metadata,
            soldeAvant: soldeActuel,
            soldeApres: nouveauSolde,
            timestamp: Date.now(),
            statut: 'COMPLETEE', // Les crédits sont généralement finaux (gains)
            synchronise: false
        };

        await TransactionService.ajouterTransaction(transaction);
        await AsyncStorage.setItem(this.STORAGE_KEY_COINS, nouveauSolde.toString());

        return { success: true, nouveauSolde, transaction };
    }

    /**
     * Calcule les gains nets après commission
     * @param {number} montantPari 
     * @param {number} pourcentageGains (ex: 0.9 pour 90%)
     * @returns {object} { gainsNet, commission, total }
     */
    static calculerGains(montantPari, pourcentageGains = 0.9) {
        const potTotal = montantPari * 2;
        const gainsNet = Math.floor(potTotal * pourcentageGains);
        const commission = potTotal - gainsNet;
        return { gainsNet, commission, potTotal };
    }

    /**
     * Synchronise les transactions locales avec le serveur
     * @param {string} token 
     */
    static async synchroniser(token) {
        if (!token) return;
        
        try {
            // Récupérer les transactions non synchronisées
            const pending = await TransactionService.getPendingTransactions();
            if (pending.length === 0) return;

            // Envoyer au serveur
            const response = await fetch(`${API_URL}/transactions/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ transactions: pending })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Marquer comme synchronisées celles qui ont réussi (ou toutes si le batch est accepté)
                // Ici on suppose que le serveur renvoie les IDs traités ou qu'on traite le lot
                // Simplification: si 200 OK, on marque tout le lot envoyé comme sync
                const syncedIds = pending.map(t => t.id);
                await TransactionService.markAsSynced(syncedIds);
                
                // Mettre à jour le solde local avec la vérité serveur si renvoyée
                if (data.serverBalance !== undefined) {
                    await AsyncStorage.setItem(this.STORAGE_KEY_COINS, data.serverBalance.toString());
                    return data.serverBalance;
                }
            } else {
                console.error('Erreur sync serveur:', response.status);
            }
        } catch (error) {
            console.error('Erreur synchronisation:', error);
        }
    }
}

export default CoinsService;
