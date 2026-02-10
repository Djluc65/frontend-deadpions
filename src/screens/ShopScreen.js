import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useStripe } from '@stripe/stripe-react-native';
import { API_URL } from '../config';
import CoinsService from '../services/CoinsService';
import { updateUser } from '../redux/slices/authSlice';

const ShopScreen = () => {
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

  const verifyPayment = async (paymentIntentId) => {
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

  const handleBuyCoins = async (packId, coins, price) => {
    if (loading) return;
    setLoading(true);

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
        defaultBillingDetails: {
            name: user?.username || 'Joueur DeadPions',
        }
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
        await verifyPayment(paymentIntentId);
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
                padding: 15,
                borderRadius: 10,
                marginBottom: 15,
                borderWidth: 1,
                borderColor: '#2ecc71'
              }}>
                <Text style={{ color: '#2ecc71', fontWeight: 'bold', textAlign: 'center', marginBottom: 5 }}>
                  ✅ PREMIUM ACTIVÉ (OFFRE DE LANCEMENT)
                </Text>
                <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
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

          {/* Section Coins */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>🪙 Packs de Coins</Text>
            <Text style={styles.sectionSubtitle}>Pour vos skins et personnalisations.</Text>
            
            <View style={styles.coinsGrid}>
              {COIN_PACKS.map((pack, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.coinCard, pack.highlight && styles.highlightCard]}
                  onPress={() => handleBuyCoins(pack.id, pack.coins, pack.price)}
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
    padding: 20,
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  sectionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700', // Gold
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#ddd',
    marginBottom: 15,
  },
  subscriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  subCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bestValueCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)', // Gold tint
    borderColor: '#FFD700',
    transform: [{ scale: 1.05 }],
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bestValueText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 10,
  },
  subPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subPeriod: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  subDetail: {
    fontSize: 12,
    color: '#aaa',
  },
  highlightText: {
    color: '#FFD700',
  },
  saveText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  coinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  coinCard: {
    width: '48%', // 2 columns
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  highlightCard: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  bonusBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF4500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  bonusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  coinAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 5,
  },
  coinLabel: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 10,
  },
  priceButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  priceText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disclaimer: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default ShopScreen;
