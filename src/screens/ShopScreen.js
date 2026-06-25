import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, ImageBackground, ScrollView, ActivityIndicator, Platform, useWindowDimensions, NativeModules } from 'react-native';
import { T } from '../utils/theme';
import { AppTouchableOpacity as TouchableOpacity } from '../components/common/AppTouchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useStripe } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { API_URL, WEBSITE_URL } from '../config';
import CoinsService from '../services/CoinsService';
import TransactionService from '../services/TransactionService';
import { updateUser, updateUserCoins } from '../redux/slices/authSlice';
import { getResponsiveSize, isTablet, DESKTOP_BREAKPOINT } from '../utils/responsive';
import { useAdManager } from '../ads/AdSystem';
import { appAlert } from '../services/appAlert';
import Constants from 'expo-constants';

import * as IAP from 'react-native-iap';

const isNativeIapModuleLinked = () => {
  if (Platform.OS === 'ios') {
    return !!(NativeModules.RNIapIos || NativeModules.RNIapIosSk2);
  }
  if (Platform.OS === 'android') {
    return !!(NativeModules.RNIapModule || NativeModules.RNIapAmazonModule);
  }
  return false;
};

const isIapUnavailableError = (err) => {
  const token = String(err?.code || err?.message || err || '');
  return token.includes('E_IAP_NOT_AVAILABLE');
};

const IAP_SKUS = Platform.select({
  ios: {
    pack_beginner:        'com.deadpions.app.pack_beginner',
    pack_popular:         'com.deadpions.app.pack_popular',
    pack_bestseller:      'com.deadpions.app.pack_bestseller',
    pack_pro:             'com.deadpions.app.pack_pro',
    pack_expert:          'com.deadpions.app.pack_expert',
    pack_whale:           'com.deadpions.app.pack_whale',
    pack_premium_unlock:  'com.deadpions.app.premium_unlock_v2',
    subscription_monthly: 'com.deadpions.app.premium_monthly_nonrenewing',
    subscription_yearly:  'com.deadpions.app.premium_yearly_nonrenewing',
  },
  android: {
    pack_beginner:        'deadpions_pack_beginner',
    pack_popular:         'deadpions_pack_popular',
    pack_bestseller:      'deadpions_pack_bestseller',
    pack_pro:             'deadpions_pack_pro',
    pack_expert:          'deadpions_pack_expert',
    pack_whale:           'deadpions_pack_whale',
    pack_premium_unlock:  'deadpions_premium_unlock',
    subscription_monthly: 'deadpions_premium_monthly',
    subscription_yearly:  'deadpions_premium_yearly',
  },
});

const ShopScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user, token } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isProbablyEmulator = isAndroid && (
    Constants.isDevice === false ||
    /emulator|simulator|sdk|genymotion/i.test(`${Constants.deviceName || ''} ${Constants.modelName || ''}`)
  );
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const sectionMaxWidth = isDesktop ? 960 : isTablet ? 700 : '100%';
  
  // Stripe (Désactivé sur iOS pour conformité Apple)
  const stripe = !isIOS ? useStripe() : { initPaymentSheet: () => {}, presentPaymentSheet: () => {} };
  const { initPaymentSheet, presentPaymentSheet } = stripe;

  const { showAds, showRewarded } = useAdManager();
  const [loading, setLoading] = useState(false);
  const nativeIapLinked = isNativeIapModuleLinked();
  const [iapEnabled, setIapEnabled] = useState(nativeIapLinked && !isProbablyEmulator);
  const [iapUnavailable, setIapUnavailable] = useState(!nativeIapLinked);
  const iapReadyRef = useRef(false);
  const iapInitPromiseRef = useRef(null);
  const iapCatalogReadyRef = useRef(false);
  const iapCatalogPromiseRef = useRef(null);
  const subscriptionOfferTokenBySkuRef = useRef({});
  const purchaseTimeoutRef = useRef(null);
  const purchaseInFlightRef = useRef(false);
  const purchaseSkuRef = useRef(null);
  
  const iosCoinsUseWebShop = false;
  const pendingProfileRefreshRef = useRef(false);

  const clearPurchaseTimeout = useCallback(() => {
    if (!purchaseTimeoutRef.current) return;
    clearTimeout(purchaseTimeoutRef.current);
    purchaseTimeoutRef.current = null;
  }, []);

  const startPurchaseTimeout = useCallback((sku) => {
    clearPurchaseTimeout();
    purchaseSkuRef.current = sku || null;
    purchaseTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      purchaseInFlightRef.current = false;
      appAlert(
        t('shop.iap_info_title'),
        t('shop.iap_no_window_message') + (sku ? `\n\n${t('shop.iap_product_label')}: ${sku}` : '')
      );
    }, 60000);
  }, [clearPurchaseTimeout]);

  const markIapUnavailable = useCallback((err) => {
    console.warn('IAP unavailable:', err);
    iapReadyRef.current = false;
    iapCatalogReadyRef.current = false;
    setIapEnabled(false);
    setIapUnavailable(true);
  }, []);

  const ensureIapReady = useCallback(async () => {
    if (!nativeIapLinked || !iapEnabled) return false;
    if (iapReadyRef.current) return true;
    if (iapInitPromiseRef.current) return await iapInitPromiseRef.current;
    try {
      iapInitPromiseRef.current = (async () => {
        const ok = await IAP.initConnection();
        const ready = ok === true || ok == null;
        iapReadyRef.current = ready;
        if (!ready) {
          markIapUnavailable(new Error('IAP initConnection returned false'));
        }
        return ready;
      })();
      return await iapInitPromiseRef.current;
    } catch (err) {
      markIapUnavailable(err);
      return false;
    } finally {
      iapInitPromiseRef.current = null;
    }
  }, [iapEnabled, markIapUnavailable, nativeIapLinked]);

  const ensureIapCatalog = useCallback(async () => {
    if (iapCatalogReadyRef.current) return true;
    if (iapCatalogPromiseRef.current) return await iapCatalogPromiseRef.current;

    const ready = await ensureIapReady();
    if (!ready) return false;

    const productSkus = [
      IAP_SKUS.pack_beginner,
      IAP_SKUS.pack_popular,
      IAP_SKUS.pack_bestseller,
      IAP_SKUS.pack_pro,
      IAP_SKUS.pack_expert,
      IAP_SKUS.pack_whale,
      IAP_SKUS.pack_premium_unlock,
    ].filter(Boolean);

    const subscriptionSkus = [
      IAP_SKUS.subscription_monthly,
      IAP_SKUS.subscription_yearly,
    ].filter(Boolean);

    try {
      iapCatalogPromiseRef.current = (async () => {
        await IAP.getProducts({ skus: productSkus });
        if (subscriptionSkus.length) {
          const subscriptions = await IAP.getSubscriptions({ skus: subscriptionSkus });
          if (isAndroid) {
            const offerTokenBySku = {};
            for (const sub of subscriptions || []) {
              const sku = sub?.productId;
              const details = sub?.subscriptionOfferDetails;
              const offerToken = Array.isArray(details) && details.length ? details[0]?.offerToken : null;
              if (sku && offerToken) {
                offerTokenBySku[sku] = offerToken;
              }
            }
            subscriptionOfferTokenBySkuRef.current = offerTokenBySku;
          }
        }
        iapCatalogReadyRef.current = true;
        return true;
      })();
      return await iapCatalogPromiseRef.current;
    } catch (err) {
      console.warn('IAP Catalog Error:', err);
      return false;
    } finally {
      iapCatalogPromiseRef.current = null;
    }
  }, [ensureIapReady, isAndroid]);

  // Initialisation IAP — listeners uniquement après connexion native réussie
  useEffect(() => {
    let purchaseUpdateSubscription = null;
    let purchaseErrorSubscription = null;
    let mounted = true;

    const setupIAP = async () => {
      if (!nativeIapLinked || !iapEnabled) return;

      try {
        const ready = await ensureIapReady();
        if (!ready || !mounted) return;

        await ensureIapCatalog();
        if (!mounted) return;

        purchaseUpdateSubscription = IAP.purchaseUpdatedListener(async (purchase) => {
          clearPurchaseTimeout();
          purchaseInFlightRef.current = false;

          if (Platform.OS === 'ios') {
            const receipt = purchase.transactionReceipt;
            if (receipt) {
              try {
                await verifyApplePurchase(receipt, purchase.productId);
                const nonConsumables = new Set([IAP_SKUS.pack_premium_unlock, IAP_SKUS.subscription_monthly, IAP_SKUS.subscription_yearly].filter(Boolean));
                const isConsumable = !nonConsumables.has(purchase.productId);
                await IAP.finishTransaction({ purchase, isConsumable });
              } catch (ackErr) {
                console.warn('IAP Ack Error:', ackErr);
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          }

          if (Platform.OS === 'android') {
            if (purchase.purchaseToken) {
              try {
                await verifyAndroidPurchase(purchase);
                const nonConsumables = new Set([IAP_SKUS.pack_premium_unlock, IAP_SKUS.subscription_monthly, IAP_SKUS.subscription_yearly].filter(Boolean));
                const isConsumable = !nonConsumables.has(purchase.productId);
                await IAP.finishTransaction({ purchase, isConsumable });
              } catch (ackErr) {
                console.warn('IAP Ack Error:', ackErr);
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          }
        });

        purchaseErrorSubscription = IAP.purchaseErrorListener((error) => {
          clearPurchaseTimeout();
          purchaseInFlightRef.current = false;
          if (error.code !== 'E_USER_CANCELLED') {
            appAlert(t('common.error'), t('shop.purchase_failed_message', { message: error.message }));
          }
          setLoading(false);
        });
      } catch (err) {
        if (mounted && (isIapUnavailableError(err) || !isNativeIapModuleLinked())) {
          markIapUnavailable(err);
        } else {
          console.warn('IAP Setup Error:', err);
        }
      }
    };

    setupIAP();

    return () => {
      mounted = false;
      clearPurchaseTimeout();
      purchaseInFlightRef.current = false;
      try {
        purchaseUpdateSubscription?.remove();
        purchaseErrorSubscription?.remove();
      } catch (err) {
        console.warn('IAP listener cleanup:', err);
      }
      if (iapReadyRef.current) {
        iapReadyRef.current = false;
        iapCatalogReadyRef.current = false;
        IAP.endConnection().catch((err) => {
          console.warn('IAP endConnection:', err);
        });
      }
    };
  }, [clearPurchaseTimeout, ensureIapCatalog, ensureIapReady, iapEnabled, markIapUnavailable, nativeIapLinked, t]);

  const verifyApplePurchase = async (receipt, productId) => {
    try {
      const response = await fetch(`${API_URL}/payment/verify-apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ receipt, productId }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (response.ok && data.success) {
        appAlert(t('common.success'), data?.message || t('shop.purchase_validated'));
        await refreshUserProfile();
      } else {
        throw new Error((data && data.message) || t('shop.apple_validation_failed'));
      }
    } catch (err) {
      console.error('Verify Apple Purchase Error:', err);
      appAlert(t('common.error'), t('shop.cannot_validate_server'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyAndroidPurchase = async (purchase) => {
    try {
      const response = await fetch(`${API_URL}/payment/verify-android`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          packageName: 'com.deadpions.app', // ton bundle ID Android
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (response.ok && data.success) {
        appAlert(t('common.success'), data?.message || t('shop.purchase_validated'));
        await refreshUserProfile();
      } else {
        throw new Error((data && data.message) || t('shop.google_validation_failed'));
      }
    } catch (err) {
      console.error('Verify Android Purchase Error:', err);
      appAlert(t('common.error'), t('shop.cannot_validate_server'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
        'subscriptionPlan',
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
        appAlert(t('shop.iap_info_title'), t('shop.visit_website_for_coins', { url: WEBSITE_URL }));
      }
    } catch {
      appAlert(t('shop.iap_info_title'), t('shop.visit_website_for_coins', { url: WEBSITE_URL }));
    }
  };

  const COIN_PACKS = [
    { id: 'pack_beginner', coins: 50000, price: '1,99 €', labelKey: 'pack_beginner' },
    { id: 'pack_popular', coins: 100000, price: '2,99 €', labelKey: 'pack_popular', bonus: '+20%' },
    { id: 'pack_bestseller', coins: 500000, price: '5,99 €', labelKey: 'pack_bestseller', bonus: 'HOT' },
    { id: 'pack_pro', coins: 1000000, price: '10,99 €', labelKey: 'pack_pro' },
    { id: 'pack_expert', coins: 2500000, price: '20,99 €', labelKey: 'pack_expert' },
    { id: 'pack_whale', coins: 5000000, price: '29,99 €', labelKey: 'pack_whale', highlight: true },
  ];

  const handleBuyPremium = async () => {
      await handleBuyCoins('pack_premium_unlock', 0, '4,99 €', 'Pions Premium Unlock');
  };

  const handleRestorePurchases = async () => {
    if (loading) return;
    if (!user || !token) {
      appAlert(t('shop.login_required'), t('shop.login_to_restore'), [
        { text: t('shop.later'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    setLoading(true);
    try {
      const ready = await ensureIapReady();
      if (!ready) {
        setLoading(false);
        return;
      }

      if (Platform.OS === 'ios') {
        await IAP.restorePurchases();
        appAlert(t('common.success'), t('shop.restore_success'));
      } else if (Platform.OS === 'android') {
        await IAP.restorePurchases();
        appAlert(t('common.success'), t('shop.restore_success'));
      }

      await refreshUserProfile();
    } catch (err) {
      console.error('Restore Purchases Error:', err);
      appAlert(t('common.error'), t('shop.restore_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubscription = async (plan) => {
    if (isIOS || isAndroid) {
        if (loading) return;
        if (!user || !token) {
          appAlert(t('shop.login_required'), t('shop.login_to_buy'), [
            { text: t('shop.later'), style: 'cancel' },
            { text: t('auth.login'), onPress: () => navigation.navigate('Login') }
          ]);
          return;
        }
        if (purchaseInFlightRef.current) {
          appAlert(t('shop.iap_info_title'), t('shop.purchase_in_progress'));
          return;
        }
        if (!iapEnabled) {
          appAlert(t('common.error'), "Les achats integres ne sont pas disponibles sur l'emulateur Android. Teste sur un appareil Android avec Play Store.");
          return;
        }
        setLoading(true);
        purchaseInFlightRef.current = true;
        try {
            const sku = plan === 'Mensuel' ? IAP_SKUS.subscription_monthly : IAP_SKUS.subscription_yearly;
            if (!sku) throw new Error(t('shop.product_not_configured'));
            const ready = await ensureIapReady();
            if (!ready) {
              setLoading(false);
              purchaseInFlightRef.current = false;
              return;
            }
            await ensureIapCatalog();
            startPurchaseTimeout(sku);

            if (isIOS) {
              await IAP.requestSubscription({
                sku,
                andDangerouslyFinishTransactionAutomaticallyIOS: false
              });
            } else {
              const offerToken = subscriptionOfferTokenBySkuRef.current?.[sku];
              if (!offerToken) {
                throw new Error(t('shop.iap_init_error'));
              }
              await IAP.requestSubscription({
                subscriptionOffers: [{ sku, offerToken }]
              });
            }
        } catch (err) {
            console.error('IAP Subscription Error:', err);
            clearPurchaseTimeout();
            setLoading(false);
            purchaseInFlightRef.current = false;
            if (err?.code !== 'E_USER_CANCELLED') {
              appAlert(t('common.error'), err?.message ? t('shop.purchase_failed_message', { message: err.message }) : t('shop.purchase_failed'));
            }
        }
        return;
    }
    appAlert(
      t('shop.subscription_title'),
      t('shop.subscription_coming_soon', { plan }),
      [{ text: t('common.ok') }]
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
        throw new Error(t('shop.server_invalid_response'));
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('shop.payment_init_error'));
      }

      const { clientSecret, paymentIntentId, pack } = await response.json();
      return { clientSecret, paymentIntentId, pack };
    } catch (error) {
      console.error("fetchPaymentSheetParams error:", error);
      appAlert(t('common.error'), error.message || t('shop.payment_server_unreachable'));
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
         throw new Error(t('shop.server_cannot_verify_payment'));
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

        appAlert(t('common.success'), data.message);
        dispatch(updateUserCoins(result?.nouveauSolde ?? (user?.coins || 0) + creditedCoins));
        const newBalance = await CoinsService.obtenirSolde(token);
          dispatch(updateUserCoins(newBalance));
        await refreshUserProfile();
      } else {
         appAlert(t('shop.payment_warning'), data.message || t('shop.payment_not_validated'));
      }
    } catch (error) {
      console.error('Erreur verification:', error);
      appAlert(t('common.error'), t('shop.cannot_verify_payment'));
    }
  };

  const handleBuyCoins = async (packId, coins, price, label) => {
    if (loading) return;
    if (!user || !token) {
      appAlert(t('shop.login_required'), t('shop.login_to_buy'), [
        { text: t('shop.later'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    const isIOS = Platform.OS === 'ios';
    const isAndroid = Platform.OS === 'android';

    if (isIOS) {
      if (purchaseInFlightRef.current) {
        appAlert(t('shop.iap_info_title'), t('shop.purchase_in_progress'));
        return;
      }
      setLoading(true);
      purchaseInFlightRef.current = true;
      try {
        const sku = IAP_SKUS[packId];
        if (!sku) throw new Error(t('shop.product_not_configured_apple'));
        const ready = await ensureIapReady();
        if (!ready) {
          setLoading(false);
          purchaseInFlightRef.current = false;
          return;
        }
        await ensureIapCatalog();
        startPurchaseTimeout(sku);
        await IAP.requestPurchase({
          sku,
          andDangerouslyFinishTransactionAutomaticallyIOS: false
        });
      } catch (err) {
        console.error('IAP Purchase Error:', err);
        clearPurchaseTimeout();
        setLoading(false);
        purchaseInFlightRef.current = false;
        if (err?.code !== 'E_USER_CANCELLED') {
          appAlert(t('common.error'), err?.message ? t('shop.purchase_failed_message', { message: err.message }) : t('shop.purchase_failed'));
        }
      }
      return;
    }

    if (isAndroid) {
      if (purchaseInFlightRef.current) return;
      if (!iapEnabled) {
        appAlert(t('common.error'), "Les achats integres ne sont pas disponibles sur l'emulateur Android. Teste sur un appareil Android avec Play Store.");
        return;
      }
      setLoading(true);
      purchaseInFlightRef.current = true;
      try {
        const sku = IAP_SKUS[packId];
        if (!sku) throw new Error(t('shop.product_not_configured_android'));
        
        const ready = await ensureIapReady();
        if (!ready) {
          setLoading(false);
          purchaseInFlightRef.current = false;
          return;
        }

        await ensureIapCatalog();
        startPurchaseTimeout(sku);

        await IAP.requestPurchase({ skus: [sku] });
        // Le listener purchaseUpdatedListener prend le relais
      } catch (err) {
        console.error('IAP Purchase Error:', err);
        clearPurchaseTimeout();
        if (err.code !== 'E_USER_CANCELLED') {
          appAlert(t('common.error'), err.message || t('shop.purchase_failed'));
        }
        setLoading(false);
        purchaseInFlightRef.current = false;
      }
      return;
    }

    if (Platform.OS === 'web') {
      // Flow Stripe pour le Web
      setLoading(true);
      try {
        const { clientSecret, paymentIntentId, pack } = await fetchPaymentSheetParams(packId);
        if (!clientSecret) {
          appAlert(t('common.error'), t('shop.stripe_init_error'));
          setLoading(false);
          return;
        }
        // Sur le Web, on redirige vers une page de checkout ou on utilise Stripe Checkout
        // Pour cet exemple, on peut utiliser Stripe.js ou rediriger vers une URL de paiement
        appAlert(t('shop.web_payment_title'), t('shop.redirecting_to_payment'), [
          { text: t('common.cancel'), style: 'cancel', onPress: () => setLoading(false) },
          { text: t('shop.continue'), onPress: () => openWebShop({ packId, paymentIntentId }) }
        ]);
      } catch (err) {
        console.error('Web Payment Error:', err);
        appAlert(t('common.error'), t('shop.web_payment_unavailable'));
        setLoading(false);
      }
      return;
    }

    appAlert(t('shop.iap_info_title'), t('shop.iap_platforms_only'));
    return;

    try {
      // 1. Fetch Payment Intent from Backend
      const { clientSecret, paymentIntentId, pack } = await fetchPaymentSheetParams(packId);

      if (!clientSecret) {
        appAlert(t('common.error'), t('shop.stripe_init_error'));
        setLoading(false);
        return;
      }

      // 2. Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'DeadPions',
        returnURL: Linking.createURL('stripe-redirect', { scheme: 'deadpions' }),
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
            name: user?.username || t('shop.default_player_name'),
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
        appAlert(t('common.error'), initError.message || t('shop.payment_generic_error'));
        setLoading(false);
        return;
      }

      // 3. Present Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        appAlert(t('shop.payment_error_title'), paymentError.message);
      } else {
        // 4. Verify Payment on Backend
        // On passe les détails du pack pour l'historique si le backend ne renvoie pas tout
        await verifyPayment(paymentIntentId, { coins, label });
      }
    } catch (error) {
      console.error(error);
      appAlert(t('common.error'), t('shop.payment_generic_error'));
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
      <View style={styles.bgOverlay} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.headerTitle}>{t('shop.title')}</Text>

          {iapUnavailable && (isIOS || isAndroid) ? (
            <View style={[styles.iapBanner, { maxWidth: sectionMaxWidth }]}>
              <Text style={styles.iapBannerText}>
                {isProbablyEmulator
                  ? "Les achats intégrés ne sont pas disponibles sur l'émulateur Android. Teste sur un appareil avec le Play Store."
                  : t('shop.iap_init_error')}
              </Text>
            </View>
          ) : null}

          {isIOS && (
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.restoreButtonText}>{t('shop.restore_purchases')}</Text>
              )}
            </TouchableOpacity>
          )}
          
          {/* Section Premium */}
          <View style={[styles.sectionContainer, { maxWidth: sectionMaxWidth }]}>
            <Text style={styles.sectionTitle}>💎 {t('shop.premium_section_title')}</Text>
            <Text style={styles.sectionSubtitle}>{t('shop.premium_section_subtitle')}</Text>
            
            {user?.isEarlyAccess && (
              <View style={{
                backgroundColor: 'rgba(46,194,126,0.1)',
                padding: getResponsiveSize(14),
                borderRadius: getResponsiveSize(T.radiusMd),
                marginBottom: getResponsiveSize(14),
                borderWidth: 1,
                borderColor: T.green,
              }}>
                <Text style={{ color: T.green, fontWeight: '800', textAlign: 'center', marginBottom: getResponsiveSize(4), fontSize: getResponsiveSize(13), textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  ✅ {t('shop.early_access_active')}
                </Text>
                <Text style={{ color: T.textDim, textAlign: 'center', fontSize: getResponsiveSize(12) }}>
                  {t('shop.early_access_until', { date: new Date(user.earlyAccessEndDate).toLocaleDateString() })}
                </Text>
              </View>
            )}

            <View style={styles.subscriptionContainer}>
              {/* Offre Mensuelle */}
              <TouchableOpacity
                style={styles.subCard}
                onPress={() => handleSubscription('Mensuel')}
              >
                <Text style={styles.subName}>{t('shop.monthly')}</Text>
                <Text style={styles.subPrice}>2,99 €</Text>
                <Text style={styles.subPeriod}>{t('shop.per_month')}</Text>
                <Text style={styles.subPerk}>{t('shop.monthly_coins_perk')}</Text>
                <Text style={styles.subPerk}>{t('shop.premium_perks_summary')}</Text>
                <Text style={styles.subDetail}>{isIOS ? t('shop.subscribe_with_apple') : t('shop.coming_soon')}</Text>
              </TouchableOpacity>

              {/* Offre Annuelle */}
              <TouchableOpacity
                style={[styles.subCard, styles.bestValueCard]}
                onPress={() => handleSubscription('Annuel')}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>{t('shop.best_value')}</Text>
                </View>
                <Text style={[styles.subName, styles.highlightText]}>{t('shop.annual')}</Text>
                <Text style={[styles.subPrice, styles.highlightText]}>19,99 €</Text>
                <Text style={[styles.subPeriod, styles.highlightText]}>{t('shop.per_year')}</Text>
                <Text style={[styles.subPerk, styles.highlightText]}>{t('shop.annual_coins_perk')}</Text>
                <Text style={[styles.subPerk, styles.highlightText]}>{t('shop.annual_credit_perk')}</Text>
                <Text style={[styles.subDetail, styles.highlightText]}>{isIOS ? t('shop.subscribe_with_apple') : t('shop.coming_soon')}</Text>
                <Text style={[styles.subDetail, styles.highlightText]}>{t('shop.annual_per_month')}</Text>
                <Text style={[styles.saveText]}>-45%</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section Pions Premium */}
          <View style={[styles.sectionContainer, { maxWidth: sectionMaxWidth }]}>
            <Text style={styles.sectionTitle}>🏆 {t('shop.pions_section_title')}</Text>
            <Text style={styles.sectionSubtitle}>{t('shop.pions_section_subtitle')}</Text>

            <TouchableOpacity
              style={{
                backgroundColor: T.red,
                padding: getResponsiveSize(14),
                borderRadius: getResponsiveSize(T.radiusMd),
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(230,57,70,0.5)',
                marginBottom: getResponsiveSize(10),
                ...T.shadowBtn,
              }}
              onPress={() => navigation.navigate('PremiumPions')}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: getResponsiveSize(14), textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {t('shop.see_collection')}
              </Text>
            </TouchableOpacity>

            {!user?.isPremium && !user?.isEarlyAccess && (
              <TouchableOpacity
                style={{
                  backgroundColor: T.gold,
                  padding: getResponsiveSize(14),
                  borderRadius: getResponsiveSize(T.radiusMd),
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: T.goldDeep,
                  ...T.shadowBtn,
                }}
                onPress={handleBuyPremium}
                disabled={loading}
              >
                {loading ? (
                    <ActivityIndicator color="#1B1305" />
                ) : (
                    <Text style={{ color: '#1B1305', fontWeight: '800', fontSize: getResponsiveSize(14), textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {t('shop.unlock_all_price')}
                    </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Section Coins */}
          <View style={[styles.sectionContainer, { maxWidth: sectionMaxWidth }]}>
            <Text style={styles.sectionTitle}>🪙 {t('shop.coins_section_title')}</Text>
            <Text style={styles.sectionSubtitle}>{t('shop.coins_section_subtitle')}</Text>
            
            <View style={styles.coinsGrid}>
              {COIN_PACKS.map((pack, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.coinCard, pack.highlight && styles.highlightCard]}
                  onPress={() => handleBuyCoins(pack.id, pack.coins, pack.price, t(`shop.${pack.labelKey}`))}
                  disabled={loading}
                >
                  {pack.bonus && (
                    <View style={styles.bonusBadge}>
                      <Text style={styles.bonusText}>{pack.bonus}</Text>
                    </View>
                  )}
                  <Text style={styles.coinAmount}>{pack.coins.toLocaleString()}</Text>
                  <Text style={styles.coinLabel}>{t('shop.coins')}</Text>
                  <View style={[styles.priceButton, loading && { opacity: 0.7 }, iosCoinsUseWebShop && { backgroundColor: '#888' }]}>
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                          <Text style={styles.priceText}>{pack.price}</Text>
                          {isIOS && (
                            <Text style={styles.priceSubText}>{t('shop.apple_pay')}</Text>
                          )}
                        </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {!user?.isPremium && !user?.isEarlyAccess && (
            <View style={[styles.sectionContainer, { maxWidth: sectionMaxWidth }]}>
              <Text style={styles.sectionTitle}>🎁 {t('shop.free_coins_section_title')}</Text>
              <Text style={styles.sectionSubtitle}>{t('shop.free_coins_section_subtitle')}</Text>

              <TouchableOpacity
                style={[styles.rewardedButton, !showAds && { opacity: 0.6 }]}
                onPress={showRewarded}
                disabled={loading || !showAds}
              >
                <Text style={styles.rewardedButtonText}>{t('shop.watch_ad_button')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.disclaimer}>
            {t('shop.disclaimer')}
          </Text>

        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,15,0.55)',
  },
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
    paddingBottom: getResponsiveSize(isTablet ? 120 : 100),
  },
  headerTitle: {
    fontSize: getResponsiveSize(isTablet ? 28 : 32),
    fontWeight: '900',
    color: T.text,
    textAlign: 'center',
    marginBottom: getResponsiveSize(10),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iapBanner: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.12)',
    borderRadius: getResponsiveSize(T.radiusMd),
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.45)',
    padding: getResponsiveSize(14),
    marginBottom: getResponsiveSize(16),
  },
  iapBannerText: {
    color: T.text,
    fontSize: getResponsiveSize(13),
    lineHeight: getResponsiveSize(19),
    textAlign: 'center',
  },
  restoreButton: {
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    width: '80%',
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignSelf: 'center',
    marginBottom: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: T.cyanBorder,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: T.textDim,
    fontWeight: '700',
    fontSize: getResponsiveSize(14),
  },
  sectionContainer: {
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    maxWidth: isTablet ? 700 : '100%',
    width: '100%',
    alignSelf: 'center',
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(16),
    marginBottom: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: T.cyanBorder,
    ...T.shadowCard,
  },
  sectionTitle: {
    fontSize: getResponsiveSize(20),
    fontWeight: '800',
    color: T.cyan,
    marginBottom: getResponsiveSize(4),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: getResponsiveSize(13),
    color: T.textDim,
    marginBottom: getResponsiveSize(14),
  },
  subscriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveSize(isTablet ? 14 : 10),
  },
  subCard: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(14),
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderWidth: 1.5,
    borderColor: T.magenta,
    shadowColor: T.magenta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 14,
  },
  bestValueCard: {
    backgroundColor: T.magentaSoft2,
    borderColor: T.magenta,
    transform: [{ scale: 1.05 }],
  },
  bestValueBadge: {
    position: 'absolute',
    top: getResponsiveSize(-12),
    backgroundColor: T.magenta,
    paddingHorizontal: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(T.radiusSm),
  },
  bestValueText: {
    color: '#05060B',
    fontWeight: '800',
    fontSize: getResponsiveSize(10),
    letterSpacing: 0.3,
  },
  subPrice: {
    fontSize: getResponsiveSize(20),
    fontWeight: '800',
    color: T.text,
  },
  subName: {
    fontSize: getResponsiveSize(14),
    fontWeight: '700',
    color: T.text,
    marginBottom: getResponsiveSize(6),
  },
  subPeriod: {
    fontSize: getResponsiveSize(13),
    color: T.textDim,
    marginBottom: getResponsiveSize(5),
  },
  subPerk: {
    fontSize: getResponsiveSize(11),
    color: T.textDim,
    marginTop: getResponsiveSize(6),
  },
  subDetail: {
    fontSize: getResponsiveSize(11),
    color: T.textMuted,
    marginTop: getResponsiveSize(8),
  },
  highlightText: {
    color: T.magenta,
  },
  saveText: {
    color: T.green,
    fontWeight: '700',
    marginTop: getResponsiveSize(5),
    fontSize: getResponsiveSize(12),
  },
  coinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  coinCard: {
    width: isTablet ? '31%' : '48%',
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderRadius: getResponsiveSize(T.radiusMd),
    padding: getResponsiveSize(12),
    marginBottom: getResponsiveSize(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#05060B',
    shadowColor: '#363636ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 14,
  },
  highlightCard: {
    borderColor: '#05060B',
    backgroundColor: T.cyanSoft2,
  },
  bonusBadge: {
    position: 'absolute',
    top: getResponsiveSize(6),
    right: getResponsiveSize(6),
    backgroundColor: T.red,
    paddingHorizontal: getResponsiveSize(6),
    paddingVertical: getResponsiveSize(2),
    borderRadius: getResponsiveSize(T.radiusSm),
  },
  bonusText: {
    color: T.text,
    fontSize: getResponsiveSize(10),
    fontWeight: '800',
  },
  coinAmount: {
    fontSize: getResponsiveSize(18),
    fontWeight: '800',
    color: T.gold,
    marginTop: getResponsiveSize(5),
  },
  coinLabel: {
    fontSize: getResponsiveSize(12),
    color: T.textMuted,
    marginBottom: getResponsiveSize(10),
  },
  priceButton: {
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(6),
    borderRadius: getResponsiveSize(T.radiusPill),
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.gold,
    ...T.shadowBtn,
  },
  priceText: {
    color: T.gold,
    fontWeight: '800',
    fontSize: getResponsiveSize(14),
  },
  priceSubText: {
    color: T.textDim,
    fontSize: getResponsiveSize(11),
    marginTop: getResponsiveSize(2),
  },
  rewardedButton: {
    backgroundColor: T.cyan,
    padding: getResponsiveSize(14),
    borderRadius: getResponsiveSize(T.radiusMd),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.cyan,
    ...T.shadowBtn,
  },
  rewardedButtonText: {
    color: '#05060B',
    fontWeight: '800',
    fontSize: getResponsiveSize(14),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  disclaimer: {
    color: T.textMuted,
    fontSize: getResponsiveSize(12),
    textAlign: 'center',
    marginTop: getResponsiveSize(20),
    fontStyle: 'italic',
  },
});

export default ShopScreen;
