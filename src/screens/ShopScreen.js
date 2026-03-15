import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, ImageBackground, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { API_URL, WEBSITE_URL } from '../config';
import CoinsService from '../services/CoinsService';
import TransactionService from '../services/TransactionService';
import { updateUser } from '../redux/slices/authSlice';
import { getResponsiveSize, isTablet } from '../utils/responsive';
import { useAdManager } from '../ads/AdSystem';
import { appAlert } from '../services/appAlert';

const ShopScreen = () => {
  const navigation = useNavigation();
  const { user, token } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { showAds, showRewarded } = useAdManager();
  const [loading, setLoading] = useState(false);
  const isIOS = Platform.OS === 'ios';
  const iosCoinsUseWebShop = false;
  const pendingProfileRefreshRef = useRef(false);

  const refreshUserProfile = useCallback(async () => {
    if (!token) return false;
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return false;

      const data = await response.json();
      if (!response.ok) return false;

      const userData = (data && typeof data === 'object' && 'user' in data ? data.user : data) || null;
      if (!userData || typeof userData !== 'object') return false;

      const allowedKeys = [
        '_id',
        'email',
        'pseudo',
        'coins',
        'avatar',
        'country',
        'stats',
        'isPremium',
        'isEarlyAccess',
        'earlyAccessEndDate',
        'subscriptionEndDate',
        'dailyCreatedRooms',
        'pawnSkin',
        'pays'
      ];

      const patch = {};
      for (const key of allowedKeys) {
        if (key in userData) patch[key] = userData[key];
      }

      if (Object.keys(patch).length === 0) return false;
      if (
        typeof patch.coins === 'number' &&
        typeof user?.coins === 'number' &&
        patch.coins < user.coins
      ) {
        const pending = await TransactionService.getPendingTransactions();
        const hasPendingCredit = Array.isArray(pending) && pending.some(t => t?.type === 'CREDIT');
        if (hasPendingCredit) delete patch.coins;
      }
      dispatch(updateUser(patch));
      return true;
    } catch {
      return false;
    }
  }, [dispatch, token, user?.coins]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (!pendingProfileRefreshRef.current) return;
      pendingProfileRefreshRef.current = false;
      refreshUserProfile();
    });

    return () => subscription.remove();
  }, [refreshUserProfile]);

  const openWebShop = async (params = {}) => {
    pendingProfileRefreshRef.current = true;
    const mergedParams = { userId: user?._id, ...params };
    const query = Object.entries(mergedParams)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    const shopUrl = `${WEBSITE_URL}/shop${query ? `?${query}` : ''}`;

    try {
      const supported = await Linking.canOpenURL(shopUrl);
      if (supported) {
        await Linking.openURL(shopUrl);
      } else {
        appAlert('Info', `Rendez-vous sur ${WEBSITE_URL} pour acheter des coins.`);
      }
    } catch {
      appAlert('Info', `Rendez-vous sur ${WEBSITE_URL} pour acheter des coins.`);
    }
  };

  const COIN_PACKS = [
    { id: 'pack_beginner', coins: 50000, price: '1,99 €', label: 'Débutant' },
    { id: 'pack_popular', coins: 100000, price: '2,99 €', label: 'Populaire', bonus: '+20%' },
    { id: 'pack_bestseller', coins: 500000, price: '5,99 €', label: 'Best Seller', bonus: 'HOT' },
    { id: 'pack_pro', coins: 1000000, price: '10,99 €', label: 'Pro' },
    { id: 'pack_expert', coins: 2500000, price: '20,99 €', label: 'Expert' },
    { id: 'pack_whale', coins: 5000000, price: '29,99 €', label: 'Whale', highlight: true },
  ];

  const handleBuyPremium = async () => {
      await handleBuyCoins('pack_premium_unlock', 0, '4,99 €', 'Pions Premium Unlock');
  };

  const handleSubscription = (plan) => {
    if (isIOS) {
        openWebShop({ product: 'subscription', plan, source: 'ios_app' });
        return;
    }
    appAlert(
      "Abonnement DeadPions+",
      `Vous avez choisi l'offre ${plan}. Cette fonctionnalité sera bientôt disponible avec les paiements réels (Stripe/Apple/Google).`,
      [{ text: "OK" }]
    );
  };

  const fetchPaymentSheetParams = async (packId) => {
    try {
      const response = await fetch(`${API_URL}/payment/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packId }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Erreur serveur: Réponse invalide (HTML reçue)");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'initialisation du paiement');
      }

      const { clientSecret, paymentIntentId, pack } = await response.json();
      return { clientSecret, paymentIntentId, pack };
    } catch (error) {
      console.error("fetchPaymentSheetParams error:", error);
      appAlert('Erreur', error.message || 'Impossible de contacter le serveur de paiement');
      return { clientSecret: null };
    }
  };

  const verifyPayment = async (paymentIntentId, packDetails) => {
    try {
      const response = await fetch(`${API_URL}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentIntentId }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Erreur serveur: Impossible de vérifier le paiement");
      }

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Enregistrer la transaction localement
        // On utilise paymentIntentId comme ID unique pour éviter les doublons lors de la synchro
        const creditedCoins = data.addedCoins || packDetails?.coins || 0;
        const result = await CoinsService.crediterCoins(
            (user?.coins || 0), 
            creditedCoins,
            `Achat ${packDetails?.label || 'Boutique'}`,
            { uniqueId: paymentIntentId, packId: packDetails?.id }
        );

        appAlert('Succès', data.message);
        dispatch(updateUser({ coins: result?.nouveauSolde ?? (user?.coins || 0) + creditedCoins }));
        const newBalance = await CoinsService.obtenirSolde(token);
        dispatch(updateUser({ coins: newBalance }));
        await refreshUserProfile();
      } else {
         appAlert('Attention', data.message || 'Paiement non validé');
      }
    } catch (error) {
      console.error('Erreur verification:', error);
      appAlert('Erreur', 'Impossible de vérifier le paiement');
    }
  };

  const handleBuyCoins = async (packId, coins, price, label) => {
    if (loading) return;

    if (isIOS && iosCoinsUseWebShop) {
      await openWebShop({ packId, source: 'ios_app' });
      return;
    }

    setLoading(true);

    // DÉTECTION MODE EXPO GO : Les paiements Stripe ne fonctionnent PAS dans Expo Go
    // Il faut utiliser un Development Build ou tester sur simulateur
    if (Constants.appOwnership === 'expo') {
      appAlert(
        "Mode Expo Go Détecté",
        "Les paiements Stripe natifs ne fonctionnent pas dans l'application Expo Go standard.\n\nVoulez-vous simuler un paiement réussi pour tester le flux ?",
        [
          { text: "Annuler", style: "cancel", onPress: () => setLoading(false) },
          { 
            text: "Simuler Succès", 
            onPress: async () => {
              // Simulation pour tester l'interface
              try {
                await CoinsService.crediterCoins(
                    (user?.coins || 0), 
                    coins,
                    `Simulation ${label}`,
                    { uniqueId: 'sim_' + Date.now() }
                );
                
                // On met à jour le state local juste pour l'affichage (ne persiste pas au backend)
                dispatch(updateUser({ coins: (user?.coins || 0) + coins }));

                appAlert("Simulation Réussie", `Paiement simulé pour ${label}.\n${coins.toLocaleString()} coins ajoutés (localement).\n\nVérifiez votre historique dans le profil !`);
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
      return;
    }

    try {
      // 1. Fetch Payment Intent from Backend
      const { clientSecret, paymentIntentId, pack } = await fetchPaymentSheetParams(packId);

      if (!clientSecret) {
        appAlert('Erreur', 'Impossible d\'initialiser le paiement');
        setLoading(false);
        return;
      }

      // 2. Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'DeadPions',
        returnURL: Linking.createURL('stripe-redirect'), // URL de redirection pour la production
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
            name: user?.username || 'Joueur DeadPions',
        },
        applePay: {
            merchantCountryCode: 'FR',
        },
        googlePay: {
            merchantCountryCode: 'FR',
            testEnv: false, // Production Environment
            currencyCode: 'EUR',
        },
      });

      if (initError) {
        appAlert('Erreur', initError.message);
        setLoading(false);
        return;
      }

      // 3. Present Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        appAlert(`Erreur de paiement`, paymentError.message);
      } else {
        // 4. Verify Payment on Backend
        // On passe les détails du pack pour l'historique si le backend ne renvoie pas tout
        await verifyPayment(paymentIntentId, { coins, label });
      }
    } catch (error) {
      console.error(error);
      appAlert('Erreur', 'Une erreur est survenue lors du paiement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/Background2-4.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          <Text style={styles.headerTitle}>Boutique</Text>
          
          {/* Section Premium */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>💎 DeadPions+ Premium</Text>
            <Text style={styles.sectionSubtitle}>Salles illimitées, Coach IA, Stats avancées & Zéro pub !</Text>
            
            {user?.isEarlyAccess && (
              <View style={{
                backgroundColor: 'rgba(46, 204, 113, 0.2)',
                padding: getResponsiveSize(15),
                borderRadius: getResponsiveSize(10),
                marginBottom: getResponsiveSize(15),
                borderWidth: getResponsiveSize(1),
                borderColor: '#2ecc71'
              }}>
                <Text style={{ color: '#2ecc71', fontWeight: 'bold', textAlign: 'center', marginBottom: getResponsiveSize(5), fontSize: getResponsiveSize(14) }}>
                  ✅ PREMIUM ACTIVÉ (OFFRE DE LANCEMENT)
                </Text>
                <Text style={{ color: 'white', textAlign: 'center', fontSize: getResponsiveSize(12) }}>
                  Profitez de tous les avantages gratuitement jusqu'au {new Date(user.earlyAccessEndDate).toLocaleDateString()}.
                </Text>
              </View>
            )}

            <View style={styles.subscriptionContainer}>
              {/* Offre Mensuelle */}
              <TouchableOpacity 
                style={styles.subCard} 
                onPress={() => handleSubscription('Mensuel')}
              >
                <Text style={styles.subName}>Mensuel</Text>
                <Text style={styles.subPrice}>2,99 €</Text>
                <Text style={styles.subPeriod}>/ mois</Text>
                <Text style={styles.subPerk}>+50 000 coins / mois</Text>
                <Text style={styles.subPerk}>Salles illimitées • Coach IA • Stats avancées • Zéro pub</Text>
                <Text style={styles.subDetail}>{isIOS ? 'Paiement sur le Web' : 'Bientôt disponible'}</Text>
              </TouchableOpacity>

              {/* Offre Annuelle */}
              <TouchableOpacity 
                style={[styles.subCard, styles.bestValueCard]} 
                onPress={() => handleSubscription('Annuel')}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>MEILLEURE OFFRE</Text>
                </View>
                <Text style={[styles.subName, styles.highlightText]}>Annuel</Text>
                <Text style={[styles.subPrice, styles.highlightText]}>19,99 €</Text>
                <Text style={[styles.subPeriod, styles.highlightText]}>/ an</Text>
                <Text style={[styles.subPerk, styles.highlightText]}>+60 000 coins / mois</Text>
                <Text style={[styles.subPerk, styles.highlightText]}>Crédit mensuel pendant 1 an</Text>
                <Text style={[styles.subDetail, styles.highlightText]}>{isIOS ? 'Paiement sur le Web' : 'Bientôt disponible'}</Text>
                <Text style={[styles.subDetail, styles.highlightText]}>~1,66 € / mois</Text>
                <Text style={[styles.saveText]}>-45%</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section Pions Premium */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>🏆 Collection Pions Premium</Text>
            <Text style={styles.sectionSubtitle}>Débloquez des pions uniques en 3D stylisés.</Text>
            
            <TouchableOpacity 
              style={{
                backgroundColor: '#CC0000',
                padding: getResponsiveSize(15),
                borderRadius: getResponsiveSize(10),
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#FF3333',
                marginBottom: getResponsiveSize(10)
              }}
              onPress={() => navigation.navigate('PremiumPions')}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: getResponsiveSize(16), textTransform: 'uppercase' }}>
                VOIR LA COLLECTION
              </Text>
            </TouchableOpacity>

            {!user?.isPremium && !user?.isEarlyAccess && (
              <TouchableOpacity 
                style={{
                  backgroundColor: '#FFD700',
                  padding: getResponsiveSize(15),
                  borderRadius: getResponsiveSize(10),
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#FFAA00'
                }}
                onPress={handleBuyPremium}
                disabled={loading}
              >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <Text style={{ color: 'black', fontWeight: 'bold', fontSize: getResponsiveSize(16), textTransform: 'uppercase' }}>
                      DÉBLOQUER TOUT — 4,99 €
                    </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Section Coins */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>🪙 Packs de Coins</Text>
            <Text style={styles.sectionSubtitle}>Pour vos skins et personnalisations.</Text>
            
            <View style={styles.coinsGrid}>
              {COIN_PACKS.map((pack, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.coinCard, pack.highlight && styles.highlightCard]}
                  onPress={() => handleBuyCoins(pack.id, pack.coins, pack.price, pack.label)}
                  disabled={loading}
                >
                  {pack.bonus && (
                    <View style={styles.bonusBadge}>
                      <Text style={styles.bonusText}>{pack.bonus}</Text>
                    </View>
                  )}
                  <Text style={styles.coinAmount}>{pack.coins.toLocaleString()}</Text>
                  <Text style={styles.coinLabel}>Coins</Text>
                  <View style={[styles.priceButton, loading && { opacity: 0.7 }, iosCoinsUseWebShop && { backgroundColor: '#888' }]}>
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                          <Text style={styles.priceText}>{pack.price}</Text>
                          {isIOS && (
                            <Text style={styles.priceSubText}>
                              {iosCoinsUseWebShop ? 'Sur le Web' : 'Apple Pay'}
                            </Text>
                          )}
                        </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {!user?.isPremium && !user?.isEarlyAccess && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>🎁 Coins gratuits</Text>
              <Text style={styles.sectionSubtitle}>Regardez une publicité récompensée pour gagner 10 coins.</Text>

              <TouchableOpacity
                style={[styles.rewardedButton, !showAds && { opacity: 0.6 }]}
                onPress={showRewarded}
                disabled={loading || !showAds}
              >
                <Text style={styles.rewardedButtonText}>REGARDER LA PUB — +10 COINS</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.disclaimer}>
            DeadPions n'est pas un jeu d'argent. Les Coins ne sont pas convertibles en monnaie réelle.
          </Text>

        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(100),
  },
  headerTitle: {
    fontSize: getResponsiveSize(32),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: getResponsiveSize(20),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: getResponsiveSize(-1), height: getResponsiveSize(1) },
    textShadowRadius: getResponsiveSize(10),
  },
  sectionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: getResponsiveSize(15),
    padding: getResponsiveSize(15),
    marginBottom: getResponsiveSize(20),
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: getResponsiveSize(22),
    fontWeight: 'bold',
    color: '#FFD700', // Gold
    marginBottom: getResponsiveSize(5),
  },
  sectionSubtitle: {
    fontSize: getResponsiveSize(14),
    color: '#ddd',
    marginBottom: getResponsiveSize(15),
  },
  subscriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveSize(10),
  },
  subCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(15),
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bestValueCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)', // Gold tint
    borderColor: '#FFD700',
    transform: [{ scale: 1.05 }],
  },
  bestValueBadge: {
    position: 'absolute',
    top: getResponsiveSize(-12),
    backgroundColor: '#FFD700',
    paddingHorizontal: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(10),
  },
  bestValueText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(10),
  },
  subPrice: {
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
    color: 'white',
  },
  subName: {
    fontSize: getResponsiveSize(14),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: getResponsiveSize(6),
  },
  subPeriod: {
    fontSize: getResponsiveSize(14),
    color: '#ccc',
    marginBottom: getResponsiveSize(5),
  },
  subPerk: {
    fontSize: getResponsiveSize(12),
    color: '#ddd',
    marginTop: getResponsiveSize(6),
  },
  subDetail: {
    fontSize: getResponsiveSize(12),
    color: '#aaa',
    marginTop: getResponsiveSize(8),
  },
  highlightText: {
    color: '#FFD700',
  },
  saveText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: getResponsiveSize(5),
    fontSize: getResponsiveSize(12),
  },
  coinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  coinCard: {
    width: isTablet ? '31%' : '48%', // 3 columns on tablet, 2 on phone
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(15),
    marginBottom: getResponsiveSize(15),
    alignItems: 'center',
    borderWidth: getResponsiveSize(1),
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  highlightCard: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  bonusBadge: {
    position: 'absolute',
    top: getResponsiveSize(5),
    right: getResponsiveSize(5),
    backgroundColor: '#FF4500',
    paddingHorizontal: getResponsiveSize(6),
    paddingVertical: getResponsiveSize(2),
    borderRadius: getResponsiveSize(5),
  },
  bonusText: {
    color: 'white',
    fontSize: getResponsiveSize(10),
    fontWeight: 'bold',
  },
  coinAmount: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: getResponsiveSize(5),
  },
  coinLabel: {
    fontSize: getResponsiveSize(12),
    color: '#ccc',
    marginBottom: getResponsiveSize(10),
  },
  priceButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(20),
    width: '100%',
    alignItems: 'center',
  },
  priceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(14),
  },
  priceSubText: {
    color: 'white',
    fontSize: getResponsiveSize(11),
    opacity: 0.85,
    marginTop: getResponsiveSize(2),
  },
  rewardedButton: {
    backgroundColor: '#f59e0b',
    padding: getResponsiveSize(15),
    borderRadius: getResponsiveSize(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fbbf24'
  },
  rewardedButtonText: {
    color: '#111827',
    fontWeight: 'bold',
    fontSize: getResponsiveSize(15),
    textTransform: 'uppercase'
  },
  disclaimer: {
    color: '#888',
    fontSize: getResponsiveSize(12),
    textAlign: 'center',
    marginTop: getResponsiveSize(20),
    fontStyle: 'italic',
  },
});

export default ShopScreen;
