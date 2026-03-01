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

        // Génère un ID unique ou utilise celui fourni pour éviter les doublons
        // Si metadata.uniqueId est fourni, on l'utilise pour l'idempotence
        const transactionId = metadata?.uniqueId || `tx_${metadata?.gameId || metadata?.tournamentId || 'gen'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Vérifie si cette transaction existe déjà (Idempotence)
        const existing = await TransactionService.getTransactionById(transactionId);
        if (existing) {
            console.warn('Transaction déjà effectuée, ignorée:', transactionId);
            return { success: true, nouveauSolde: soldeActuel, transaction: existing, alreadyProcessed: true };
        }

        const nouveauSolde = soldeActuel - montant;
        
        // Créer la transaction
        const transaction = {
            id: transactionId,
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
     * Réconciliation en cas de désynchronisation
     * @param {string} userId 
     * @param {string} token 
     */
    static async reconcileBalance(userId, token) {
        try {
            // 1. Récupère le solde serveur
            const response = await fetch(`${API_URL}/users/balance`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            const serverBalance = data.coins;
            
            // 2. Récupère le solde local
            const localCoins = await AsyncStorage.getItem(this.STORAGE_KEY_COINS);
            const localBalance = localCoins ? parseInt(localCoins, 10) : 0;

            // 3. Si différence, utilise le serveur comme source de vérité
            if (serverBalance !== localBalance) {
                console.warn('Désynchronisation détectée', { serverBalance, localBalance });
                await AsyncStorage.setItem(this.STORAGE_KEY_COINS, serverBalance.toString());
                return serverBalance;
            }

            return localBalance;
        } catch (error) {
            console.error('Erreur reconciliation:', error);
            return null;
        }
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
        // Idempotence: Génère un ID unique ou utilise celui fourni
        const transactionId = metadata?.uniqueId || `tx_${metadata?.gameId || metadata?.tournamentId || 'gen'}_credit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Vérifie si cette transaction existe déjà
        const existing = await TransactionService.getTransactionById(transactionId);
        if (existing) {
            console.warn('Transaction (crédit) déjà effectuée, ignorée:', transactionId);
            return { success: true, nouveauSolde: soldeActuel, transaction: existing, alreadyProcessed: true };
        }

        const nouveauSolde = soldeActuel + montant;

        const transaction = {
            id: transactionId,
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
     * Rembourse une transaction (ex: match nul ou annulé)
     * @param {number} soldeActuel 
     * @param {number} montant 
     * @param {string} raison 
     * @param {object} metadata 
     * @returns {Promise<object>} { success, nouveauSolde, transactionId }
     */
    static async rembourserTransaction(soldeActuel, montant, raison, metadata) {
        // Idempotence
        const transactionId = metadata?.uniqueId || `tx_${metadata?.gameId || metadata?.tournamentId || 'gen'}_refund_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const existing = await TransactionService.getTransactionById(transactionId);
        if (existing) {
             console.warn('Transaction (remboursement) déjà effectuée, ignorée:', transactionId);
             return { success: true, nouveauSolde: soldeActuel, transaction: existing, alreadyProcessed: true };
        }

        const nouveauSolde = soldeActuel + montant;

        const transaction = {
            id: transactionId,
            type: 'REMBOURSEMENT',
            montant,
            raison,
            metadata,
            soldeAvant: soldeActuel,
            soldeApres: nouveauSolde,
            timestamp: Date.now(),
            statut: 'COMPLETEE',
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
        if (!token) return { ok: false, status: 0 };
        
        try {
            const pending = await TransactionService.getPendingTransactions();
            
            // Filtrer les transactions valides (éviter erreur 500)
            const validTransactions = pending.filter(t => 
                t && t.id && t.type && t.montant !== undefined && 
                t.soldeAvant !== undefined && t.soldeApres !== undefined
            );

            if (validTransactions.length === 0) {
                // Si on a des transactions mais aucune valide, on les marque comme synchronisées pour ne plus bloquer
                if (pending.length > 0) {
                    const ids = pending.map(t => t.id).filter(Boolean);
                    if (ids.length > 0) await TransactionService.markAsSynced(ids);
                }
                return { ok: true, skipped: true };
            }

            const response = await fetch(`${API_URL}/transactions/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ transactions: validTransactions })
            });

            if (response.ok) {
                const data = await response.json();
                // Marquer TOUTES les transactions initiales comme traitées (valides + invalides)
                const syncedIds = pending.map(t => t.id).filter(Boolean);
                await TransactionService.markAsSynced(syncedIds);
                if (data.serverBalance !== undefined) {
                    await AsyncStorage.setItem(this.STORAGE_KEY_COINS, data.serverBalance.toString());
                    return { ok: true, serverBalance: data.serverBalance };
                }
                return { ok: true };
            } else {
                console.error('Erreur sync serveur:', response.status);
                return { ok: false, status: response.status };
            }
        } catch (error) {
            console.error('Erreur synchronisation:', error);
            return { ok: false, status: 0 };
        }
    }
}

export default CoinsService;
