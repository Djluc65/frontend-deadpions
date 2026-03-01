import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { API_URL } from '../config';
import CoinsService from '../services/CoinsService';
import TransactionService from '../services/TransactionService';
import { updateUser } from '../redux/slices/authSlice';
import { getResponsiveSize, isTablet } from '../utils/responsive';

const ShopScreen = () => {
  const navigation = useNavigation();
  const { user, token } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

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
    Alert.alert(
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
      Alert.alert('Erreur', error.message || 'Impossible de contacter le serveur de paiement');
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
        await CoinsService.crediterCoins(
            (user?.coins || 0), 
            data.addedCoins || packDetails?.coins || 0,
            `Achat ${packDetails?.label || 'Boutique'}`,
            { uniqueId: paymentIntentId, packId: packDetails?.id }
        );

        Alert.alert('Succès', data.message);
        // Refresh coins locally
        const newBalance = await CoinsService.obtenirSolde(token);
        dispatch(updateUser({ coins: newBalance }));
      } else {
         Alert.alert('Attention', data.message || 'Paiement non validé');
      }
    } catch (error) {
      console.error('Erreur verification:', error);
      Alert.alert('Erreur', 'Impossible de vérifier le paiement');
    }
  };

  const handleBuyCoins = async (packId, coins, price, label) => {
    if (loading) return;
    setLoading(true);

    // DÉTECTION MODE EXPO GO : Les paiements Stripe ne fonctionnent PAS dans Expo Go
    // Il faut utiliser un Development Build ou tester sur simulateur
    if (Constants.appOwnership === 'expo') {
      Alert.alert(
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

                Alert.alert("Simulation Réussie", `Paiement simulé pour ${label}.\n${coins.toLocaleString()} coins ajoutés (localement).\n\nVérifiez votre historique dans le profil !`);
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
        Alert.alert('Erreur', 'Impossible d\'initialiser le paiement');
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
        Alert.alert('Erreur', initError.message);
        setLoading(false);
        return;
      }

      // 3. Present Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert(`Erreur de paiement`, paymentError.message);
      } else {
        // 4. Verify Payment on Backend
        // On passe les détails du pack pour l'historique si le backend ne renvoie pas tout
        await verifyPayment(paymentIntentId, { coins, label });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du paiement.');
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
              <TouchableOpacity style={styles.subCard} onPress={() => handleSubscription('Mensuel (2,99€)')}>
                <Text style={styles.subPrice}>2,99 €</Text>
                <Text style={styles.subPeriod}>/ mois</Text>
                <Text style={styles.subDetail}>Flexible</Text>
              </TouchableOpacity>

              {/* Offre Annuelle */}
              <TouchableOpacity style={[styles.subCard, styles.bestValueCard]} onPress={() => handleSubscription('Annuel (19,99€)')}>
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>MEILLEURE OFFRE</Text>
                </View>
                <Text style={[styles.subPrice, styles.highlightText]}>19,99 €</Text>
                <Text style={[styles.subPeriod, styles.highlightText]}>/ an</Text>
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
                  <View style={[styles.priceButton, loading && { opacity: 0.7 }]}>
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={styles.priceText}>{pack.price}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
    alignItems: 'center',
    justifyContent: 'center',
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
  subPeriod: {
    fontSize: getResponsiveSize(14),
    color: '#ccc',
    marginBottom: getResponsiveSize(5),
  },
  subDetail: {
    fontSize: getResponsiveSize(12),
    color: '#aaa',
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
  disclaimer: {
    color: '#888',
    fontSize: getResponsiveSize(12),
    textAlign: 'center',
    marginTop: getResponsiveSize(20),
    fontStyle: 'italic',
  },
});

export default ShopScreen;
