import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useCoinsContext } from '../context/CoinsContext';
import { DESKTOP_BREAKPOINT, getResponsiveSize } from '../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appAlert } from '../services/appAlert';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { AD_RULES, computeAdVisibility } from './adRules';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let mobileAds;
let AdEventType;
let BannerAd;
let BannerAdSize;
let InterstitialAd;
let RewardedAd;
let RewardedAdEventType;
let TestIds;
let AdsConsent;

try {
  const gma = require('react-native-google-mobile-ads');
  mobileAds = gma.default;
  AdEventType = gma.AdEventType;
  BannerAd = gma.BannerAd;
  BannerAdSize = gma.BannerAdSize;
  InterstitialAd = gma.InterstitialAd;
  RewardedAd = gma.RewardedAd;
  RewardedAdEventType = gma.RewardedAdEventType;
  TestIds = gma.TestIds;
  AdsConsent = gma.AdsConsent;
} catch {
  mobileAds = null;
}

const AdProvider = {
  appId: 'ca-app-pub-5628913012317818~7677374721',
  units: {
    banner: { id: 'ca-app-pub-5628913012317818/5675925124', type: 'banner', size: '320x50' },
    interstitial: { id: 'ca-app-pub-5628913012317818/6228028852', type: 'interstitial', cooldown: 120 },
    rewarded: { id: 'ca-app-pub-5628913012317818/2671927229', type: 'rewarded', reward: { type: 'coins', amount: 10 } }
  },
  targeting: {
    childDirected: false,
    maxAdContentRating: 'T'
  }
};

function getActiveRoutePath(state) {
  if (!state) return [];
  const routes = state.routes || [];
  const index = typeof state.index === 'number' ? state.index : 0;
  const route = routes[index];
  if (!route) return [];
  const name = route.name;
  const childState = route.state;
  return childState ? [name, ...getActiveRoutePath(childState)] : [name];
}

const AdManagerContext = createContext(null);

import { API_URL } from '../config';

// #region debug-point A:reporter
const AD_LOG_URL = `${API_URL}/ad-debug-events/log`;

const buildAdErrorSnapshot = (err, extra = {}) => ({
  ...extra,
  code: err?.code ?? null,
  domain: err?.domain ?? null,
  message: typeof err?.message === 'string' ? err.message : String(err || ''),
  at: Date.now()
});

const reportAdDebug = async (eventType, location, msg, extraData = {}, context = {}) => {
    try {
      const payload = {
        userId: context.user?.id || context.user?._id || 'anonymous',
        platform: Platform.OS,
        version: '1.0.3',
        environment: __DEV__ ? 'development' : 'production',
        adUnitId: extraData.rewardedAdUnitId || extraData.adUnitId,
        eventType,
        message: msg,
        location,
        data: extraData,
        attStatus: context.attStatus || (context.attAuthorized ? 'authorized' : 'not_authorized'),
        showAds: context.showAds,
        isPremium: context.isPremium,
        isEarlyAccess: context.isEarlyAccess,
        timestamp: Date.now()
      };

    if (__DEV__) {
      console.log(`[AD_DEBUG] ${eventType} @ ${location}: ${msg}`, extraData);
    }

    await fetch(AD_LOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    if (__DEV__) console.warn('[AD_DEBUG] Failed to send log', err);
  }
};
// #endregion

export function useAdManager() {
  const ctx = useContext(AdManagerContext);
  if (!ctx) throw new Error('useAdManager must be used within AdSystem');
  return ctx;
}

export default function AdSystem({ children }) {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const { credit } = useCoinsContext();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [attReady, setAttReady] = useState(Platform.OS !== 'ios');
  const [attAuthorized, setAttAuthorized] = useState(false);

  const logAdEvent = useCallback((eventType, msg, extraData = {}) => {
    reportAdDebug(eventType, 'AdSystem.js', msg, extraData, {
      user,
      attStatus: attReady ? (attAuthorized ? 'authorized' : 'not_authorized') : 'pending',
      showAds: true, // We check showAds before calling this usually
      isPremium: Boolean(user?.isPremium),
      isEarlyAccess: Boolean(user?.isEarlyAccess)
    });
  }, [user, attReady, attAuthorized]);
  const [androidConsentReady, setAndroidConsentReady] = useState(Platform.OS !== 'android');
  const [androidGdprApplies, setAndroidGdprApplies] = useState(false);
  const [androidNpaOnly, setAndroidNpaOnly] = useState(false);

  const adDebugEnabled = useMemo(() => {
    const raw = process.env.EXPO_PUBLIC_AD_DEBUG;
    return raw === '1' || raw === 'true';
  }, []);

  const useTestAdUnits = useMemo(() => {
    const raw = process.env.EXPO_PUBLIC_AD_USE_TEST_IDS;
    const enabled = raw === '1' || raw === 'true';
    return __DEV__ || enabled;
  }, []);

  

  const navState = useNavigationState((state) => state);
  const routePath = useMemo(() => getActiveRoutePath(navState), [navState]);
  const screenKey = routePath[routePath.length - 1] || null;

  const nativeAdsAvailable = Boolean(mobileAds && BannerAd && BannerAdSize && InterstitialAd && RewardedAd);
  const allowAdsOnEmulator = useMemo(() => {
    const raw = process.env.EXPO_PUBLIC_AD_ALLOW_EMULATOR;
    return raw === '1' || raw === 'true';
  }, []);
  const isAndroidEmulator = Platform.OS === 'android' && Constants.isDevice === false;
  const baseVisibility = useMemo(
    () =>
      computeAdVisibility({
        nativeAdsAvailable,
        user,
        screenKey,
        isAndroidEmulator,
        allowAdsOnEmulator
      }),
    [nativeAdsAvailable, user, screenKey, isAndroidEmulator, allowAdsOnEmulator]
  );
  const showAds = baseVisibility.showAds && (Platform.OS !== 'android' || androidConsentReady);
  const showBanner = baseVisibility.showBanner && (Platform.OS !== 'android' || androidConsentReady);
  const bottomOffset = useMemo(() => {
    const isInTab =
      routePath.includes('Home') &&
      (routePath.includes('MaisonTab') || routePath.includes('Social') || routePath.includes('Salle') || routePath.includes('Magasin'));
    if (!isInTab) return getResponsiveSize(20);

    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    if (isDesktop) return getResponsiveSize(20);

    const isTablet = width >= 768;
    const dockInner = isTablet ? 64 : 56;
    const dockBottom = Math.max((insets?.bottom ?? 0) + 8, 20);
    const gapAboveDock = 10;
    return dockBottom + dockInner + gapAboveDock;
  }, [routePath, width, insets?.bottom]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!baseVisibility.showAds) {
      setAndroidConsentReady(true);
      setAndroidGdprApplies(false);
      setAndroidNpaOnly(false);
      return;
    }
    if (!AdsConsent || typeof AdsConsent.gatherConsent !== 'function') {
      setAndroidConsentReady(true);
      setAndroidGdprApplies(true);
      setAndroidNpaOnly(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setAndroidConsentReady(false);
        const consentInfo = await AdsConsent.gatherConsent({
          tagForUnderAgeOfConsent: Boolean(AdProvider?.targeting?.childDirected)
        });
        if (cancelled) return;

        let gdprApplies = false;
        try {
          gdprApplies = await AdsConsent.getGdprApplies();
        } catch {
          gdprApplies = false;
        }
        if (cancelled) return;

        let npaOnly = false;
        if (gdprApplies) {
          try {
            const choices = await AdsConsent.getUserChoices();
            npaOnly = choices?.selectPersonalisedAds === false;
          } catch {
            npaOnly = true;
          }
        }
        if (cancelled) return;

        setAndroidGdprApplies(Boolean(gdprApplies));
        setAndroidNpaOnly(Boolean(npaOnly));
        setAndroidConsentReady(Boolean(consentInfo?.canRequestAds));
      } catch (err) {
        if (cancelled) return;
        setAndroidConsentReady(true);
        setAndroidGdprApplies(true);
        setAndroidNpaOnly(true);
        if (adDebugEnabled) console.warn('[ADS] consent flow failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseVisibility.showAds, adDebugEnabled]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAttReady(true);
      setAttAuthorized(false);
      return;
    }

    const applyPayload = (payload) => {
      const authorized = Boolean(payload?.authorized);
      setAttAuthorized(authorized);
      setAttReady(Boolean(payload?.checked));
    };

    const current = globalThis.__ATT_STATUS__;
    if (current?.checked) {
      applyPayload(current);
    }

    let cancelled = false;
    AsyncStorage.getItem('att_status_payload')
      .then((raw) => {
        if (cancelled) return;
        if (!raw) return;
        try {
          applyPayload(JSON.parse(raw));
        } catch (_) {}
      })
      .catch(() => {});

    if (!(globalThis.__ATT_LISTENERS__ instanceof Set)) {
      globalThis.__ATT_LISTENERS__ = new Set();
    }
    const listener = (payload) => {
      if (cancelled) return;
      applyPayload(payload);
    };
    globalThis.__ATT_LISTENERS__.add(listener);

    return () => {
      cancelled = true;
      try {
        globalThis.__ATT_LISTENERS__?.delete(listener);
      } catch (_) {}
    };
  }, []);

  const requestNonPersonalizedAdsOnly = useMemo(() => {
    const raw = process.env.EXPO_PUBLIC_AD_NPA_ONLY;
    const envPrefersNpa = raw === '1' || raw === 'true';
    return (
      envPrefersNpa ||
      (Platform.OS === 'ios' && attReady && !attAuthorized) ||
      (Platform.OS === 'android' && androidConsentReady && androidGdprApplies && androidNpaOnly)
    );
  }, [attReady, attAuthorized, androidConsentReady, androidGdprApplies, androidNpaOnly]);

  useEffect(() => {
    if (!adDebugEnabled) return;
    const debugKey = JSON.stringify({
      screenKey,
      nativeAdsAvailable,
      showAds,
      showBanner,
      useTestAdUnits,
      requestNonPersonalizedAdsOnly,
      isPremium: Boolean(user?.isPremium),
      isEarlyAccess: Boolean(user?.isEarlyAccess)
    });
    const now = Date.now();
    if (lastDebugSnapshotRef.current.key === debugKey && now - lastDebugSnapshotRef.current.at < 1500) return;
    lastDebugSnapshotRef.current = { key: debugKey, at: now };

    console.warn('[ADS] snapshot', {
      screenKey,
      nativeAdsAvailable,
      showAds,
      showBanner,
      useTestAdUnits,
      requestNonPersonalizedAdsOnly,
      user: user ? { isPremium: Boolean(user?.isPremium), isEarlyAccess: Boolean(user?.isEarlyAccess) } : null
    });
  }, [
    adDebugEnabled,
    screenKey,
    nativeAdsAvailable,
    showAds,
    showBanner,
    useTestAdUnits,
    requestNonPersonalizedAdsOnly,
    user
  ]);

  useEffect(() => {
    if (!adDebugEnabled) return;
    if (nativeAdsAvailable) return;
    console.warn('[ADS] native ads unavailable (google-mobile-ads not linked/loaded in this build)');
  }, [adDebugEnabled, nativeAdsAvailable]);

  useEffect(() => {
    if (!adDebugEnabled) return;
    if (!nativeAdsAvailable) return;
    if (AD_RULES.shouldShowAds(user)) return;
    console.warn('[ADS] ads disabled by rules (user not eligible)', {
      hasUser: Boolean(user),
      isPremium: Boolean(user?.isPremium),
      isEarlyAccess: Boolean(user?.isEarlyAccess)
    });
  }, [adDebugEnabled, nativeAdsAvailable, user]);

  const [actionCount, setActionCount] = useState(0);
  const [lastInterstitialAt, setLastInterstitialAt] = useState(null);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [rewardedLoading, setRewardedLoading] = useState(false);
  const [lastRewardedError, setLastRewardedError] = useState(null);
  const [lastBannerError, setLastBannerError] = useState(null);
  const [lastMobileAdsInitError, setLastMobileAdsInitError] = useState(null);

  const lastScreenKeyRef = useRef(null);
  const interstitialRef = useRef(null);
  const rewardedRef = useRef(null);
  const pendingShowInterstitialRef = useRef(false);
  const pendingShowRewardedRef = useRef(false);
  const rewardedRewardRef = useRef({ amount: null, reason: null, metadata: null, onEarned: null });
  const rewardedUnitIdRef = useRef(null);
  const rewardedUnsubsRef = useRef([]);
  const rewardedPendingTimeoutRef = useRef(null);
  const rewardedPresentRetryCountRef = useRef(0);
  const lastDebugSnapshotRef = useRef({ key: null, at: 0 });
  const mobileAdsInitRef = useRef({ promise: null, done: false });
  const rewardedLoadedRef = useRef(false);

  const interstitialAdUnitId = useMemo(
    () => (useTestAdUnits && TestIds ? TestIds.INTERSTITIAL : AdProvider.units.interstitial.id),
    [useTestAdUnits]
  );
  const rewardedAdUnitId = useMemo(
    () => (useTestAdUnits && TestIds ? TestIds.REWARDED : AdProvider.units.rewarded.id),
    [useTestAdUnits]
  );
  const bannerAdUnitId = useMemo(
    () => (useTestAdUnits && TestIds ? TestIds.BANNER : AdProvider.units.banner.id),
    [useTestAdUnits]
  );

  useEffect(() => {
    rewardedLoadedRef.current = rewardedLoaded;
  }, [rewardedLoaded]);

  const ensureMobileAdsInitialized = useCallback(() => {
    if (!showAds) return Promise.resolve(false);
    if (!mobileAds) return Promise.resolve(false);
    if (Platform.OS === 'ios' && !attReady) return Promise.resolve(false);
    if (mobileAdsInitRef.current.done) return Promise.resolve(true);
    if (mobileAdsInitRef.current.promise) return mobileAdsInitRef.current.promise;

    const initPromise = mobileAds()
      .initialize()
      .then(() => {
        mobileAdsInitRef.current.done = true;
        mobileAdsInitRef.current.promise = null;
        setLastMobileAdsInitError(null);
        logAdEvent('mobile_ads_initialized', 'mobile ads initialized');
        return true;
      })
      .catch((err) => {
        mobileAdsInitRef.current.done = false;
        mobileAdsInitRef.current.promise = null;
        setLastMobileAdsInitError(buildAdErrorSnapshot(err, {
          phase: 'mobile_ads_initialize',
          platform: Platform.OS
        }));
        logAdEvent('mobile_ads_init_failed', 'mobile ads initialize failed', {
          errMessage: typeof err?.message === 'string' ? err.message : String(err || '')
        });
        if (adDebugEnabled) console.warn('[ADS] initialize failed', err);
        return false;
      });

    mobileAdsInitRef.current.promise = initPromise;
    return initPromise;
  }, [showAds, attReady, adDebugEnabled, logAdEvent]);

  useEffect(() => {
    if (!showAds) return;
    if (!mobileAds) return;
    if (Platform.OS === 'ios' && !attReady) return;
    ensureMobileAdsInitialized();
  }, [showAds, attReady, ensureMobileAdsInitialized]);

  useEffect(() => {
    if (!showAds) {
      interstitialRef.current = null;
      setInterstitialLoaded(false);
      pendingShowInterstitialRef.current = false;
      return;
    }
    if (!InterstitialAd) return;
    if (Platform.OS === 'ios' && !attReady) return;

    // Reset interstitial instance when requestNonPersonalizedAdsOnly changes
    interstitialRef.current = InterstitialAd.createForAdRequest(interstitialAdUnitId, { requestNonPersonalizedAdsOnly });

    const interstitial = interstitialRef.current;

    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setInterstitialLoaded(true);
      if (pendingShowInterstitialRef.current) {
        pendingShowInterstitialRef.current = false;
        try {
          interstitial.show();
        } catch {}
      }
    });

    const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setInterstitialLoaded(false);
      try {
        interstitial.load();
      } catch {}
    });

    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, (err) => {
      setInterstitialLoaded(false);
      pendingShowInterstitialRef.current = false;
      if (adDebugEnabled) console.warn('[ADS] interstitial error', err);
    });

    ensureMobileAdsInitialized().then((ok) => {
      if (!ok) return;
      try {
        interstitial.load();
      } catch {}
    });

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, [showAds, interstitialAdUnitId, requestNonPersonalizedAdsOnly, attReady, ensureMobileAdsInitialized, adDebugEnabled]);

  const setupRewarded = useCallback(() => {
    if (!showAds) return null;
    if (!RewardedAd) return null;
    if (Platform.OS === 'ios' && !attReady) return null;

    const hasSameUnit = rewardedRef.current && rewardedUnitIdRef.current === rewardedAdUnitId;
    if (hasSameUnit && rewardedUnsubsRef.current.length) {
      return rewardedRef.current;
    }

    rewardedUnsubsRef.current.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    rewardedUnsubsRef.current = [];

    setRewardedLoaded(false);
    setRewardedLoading(true);
    setLastRewardedError(null);
    pendingShowRewardedRef.current = false;
    rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };

    rewardedUnitIdRef.current = rewardedAdUnitId;
    // #region debug-point D:rewarded-create
    logAdEvent('rewarded_create', 'creating rewarded instance', {
      platform: Platform.OS,
      rewardedAdUnitId,
      requestNonPersonalizedAdsOnly,
      useTestAdUnits,
      showAds,
      attReady
    });
    // #endregion
    rewardedRef.current = RewardedAd.createForAdRequest(rewardedAdUnitId, { requestNonPersonalizedAdsOnly });
    const rewarded = rewardedRef.current;

    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      // #region debug-point A:rewarded-loaded
      logAdEvent('rewarded_loaded', 'rewarded loaded', {
        platform: Platform.OS,
        rewardedAdUnitId,
        pendingShowRewarded: pendingShowRewardedRef.current,
        useTestAdUnits
      });
      // #endregion
      setRewardedLoaded(true);
      setRewardedLoading(false);
      setLastRewardedError(null);
      if (pendingShowRewardedRef.current) {
        pendingShowRewardedRef.current = false;
        if (rewardedPendingTimeoutRef.current) {
          clearTimeout(rewardedPendingTimeoutRef.current);
          rewardedPendingTimeoutRef.current = null;
        }
        try {
          rewarded.show();
        } catch {}
      }
    });

    const unsubOpened = rewarded.addAdEventListener(AdEventType.OPENED, () => {
      logAdEvent('rewarded_opened', 'rewarded opened');
      rewardedPresentRetryCountRef.current = 0;
      if (rewardedPendingTimeoutRef.current) {
        clearTimeout(rewardedPendingTimeoutRef.current);
        rewardedPendingTimeoutRef.current = null;
      }
      pendingShowRewardedRef.current = false;
    });

    const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      logAdEvent('rewarded_reward_earned', 'rewarded reward earned');
      if (rewardedPendingTimeoutRef.current) {
        clearTimeout(rewardedPendingTimeoutRef.current);
        rewardedPendingTimeoutRef.current = null;
      }
      rewardedPresentRetryCountRef.current = 0;
      const pending = rewardedRewardRef.current;
      const defaultReward = AdProvider.units.rewarded.reward;
      const onEarned = typeof pending?.onEarned === 'function' ? pending.onEarned : null;
      const amount = typeof pending?.amount === 'number' && pending.amount > 0 ? pending.amount : defaultReward.amount;
      const reason = typeof pending?.reason === 'string' && pending.reason ? pending.reason : 'Récompense publicité';
      const metadata = (pending?.metadata && typeof pending.metadata === 'object') ? pending.metadata : { source: 'rewarded_ad' };
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };
      if (onEarned) {
        try {
          await onEarned({ amount, reason, metadata });
        } catch {}
        return;
      }
      if (defaultReward.type !== 'coins') return;
      if (typeof amount !== 'number' || amount <= 0) return;
      try {
        await credit(amount, reason, metadata);
      } catch {}
    });

    const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      logAdEvent('rewarded_closed', 'rewarded closed');
      if (rewardedPendingTimeoutRef.current) {
        clearTimeout(rewardedPendingTimeoutRef.current);
        rewardedPendingTimeoutRef.current = null;
      }
      rewardedPresentRetryCountRef.current = 0;
      setRewardedLoaded(false);
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };
      try {
        rewarded.load();
      } catch {}
    });

    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (err) => {
      const hadPendingShow = pendingShowRewardedRef.current;
      const errMessage = typeof err?.message === 'string' ? err.message : String(err || '');
      const errorSnapshot = buildAdErrorSnapshot(err, {
        phase: hadPendingShow ? 'rewarded_show' : 'rewarded_load',
        platform: Platform.OS,
        rewardedAdUnitId,
        useTestAdUnits,
        requestNonPersonalizedAdsOnly
      });
      setLastRewardedError(errorSnapshot);
      // #region debug-point C:rewarded-error
      logAdEvent('rewarded_error', 'rewarded error', {
        platform: Platform.OS,
        rewardedAdUnitId,
        hadPendingShow,
        rewardedLoaded,
        errMessage,
        errCode: err?.code ?? null,
        useTestAdUnits,
        requestNonPersonalizedAdsOnly
      });
      // #endregion
      const isPresentingError =
        errMessage.includes('already presenting another view controller') ||
        errMessage.includes('already presenting') ||
        errMessage.includes('presenting another view controller');
      if (rewardedPendingTimeoutRef.current) {
        clearTimeout(rewardedPendingTimeoutRef.current);
        rewardedPendingTimeoutRef.current = null;
      }
      setRewardedLoaded(false);
      setRewardedLoading(false);
      if (adDebugEnabled) console.warn('[ADS] rewarded error', err);
      if (isPresentingError && (hadPendingShow || rewardedRewardRef.current?.metadata)) {
        const attempt = rewardedPresentRetryCountRef.current || 0;
        if (attempt < 2) {
          rewardedPresentRetryCountRef.current = attempt + 1;
          pendingShowRewardedRef.current = true;
          setTimeout(() => {
            if (!pendingShowRewardedRef.current) return;
            try {
              rewarded.show();
            } catch {}
          }, 650);
          setTimeout(() => {
            if (!pendingShowRewardedRef.current) return;
            try {
              rewarded.load();
            } catch {}
          }, 1200);
          return;
        }
      }
      rewardedPresentRetryCountRef.current = 0;
      pendingShowRewardedRef.current = false;
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };
      if (hadPendingShow) appAlert(t('ads.unavailable_title'), t('ads.unavailable_desc_load'));
    });

    rewardedUnsubsRef.current = [unsubLoaded, unsubOpened, unsubEarned, unsubClosed, unsubError];
    ensureMobileAdsInitialized().then((ok) => {
      if (!ok) return;
      try {
        rewarded.load();
      } catch {}
    });
    return rewarded;
  }, [showAds, rewardedAdUnitId, credit, adDebugEnabled, requestNonPersonalizedAdsOnly, ensureMobileAdsInitialized, logAdEvent, t, useTestAdUnits, attReady]);

  useEffect(() => {
    // Always reset existing subscriptions first when dependencies change
    rewardedUnsubsRef.current.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    rewardedUnsubsRef.current = [];
    rewardedUnitIdRef.current = null;
    rewardedRef.current = null;
    setRewardedLoaded(false);
    setRewardedLoading(false);
    pendingShowRewardedRef.current = false;
    rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };

    if (!showAds) {
      return;
    }
    setupRewarded();
  }, [showAds, setupRewarded, requestNonPersonalizedAdsOnly, attReady]);

  useEffect(() => {
    if (!showAds) {
      setActionCount(0);
      lastScreenKeyRef.current = screenKey;
      return;
    }
    if (!screenKey) return;
    if (lastScreenKeyRef.current === screenKey) return;
    lastScreenKeyRef.current = screenKey;

    if (!AD_RULES.fullAdScreens.includes(screenKey)) return;

    setActionCount((c) => c + 1);
  }, [showAds, screenKey]);

  useEffect(() => {
    if (!showAds) return;
    if (!screenKey) return;
    if (AD_RULES.canShowInterstitial(user, screenKey, lastInterstitialAt, actionCount)) {
      setLastInterstitialAt(Date.now());
      setActionCount(0);
      const interstitial = interstitialRef.current;
      if (!interstitial) return;
      if (interstitialLoaded) {
        try {
          interstitial.show();
        } catch {}
      } else {
        pendingShowInterstitialRef.current = true;
        try {
          interstitial.load();
        } catch {}
      }
    }
  }, [showAds, user, screenKey, lastInterstitialAt, actionCount, interstitialLoaded]);

  const trackAction = useCallback(() => {
    if (!showAds) return;
    setActionCount((c) => c + 1);
  }, [showAds]);

  const tryShowInterstitial = useCallback(() => {
    if (AD_RULES.canShowInterstitial(user, screenKey, lastInterstitialAt, actionCount)) {
      setLastInterstitialAt(Date.now());
      setActionCount(0);
      const interstitial = interstitialRef.current;
      if (!interstitial) return;
      if (interstitialLoaded) {
        try {
          interstitial.show();
        } catch {}
      } else {
        pendingShowInterstitialRef.current = true;
        try {
          interstitial.load();
        } catch {}
      }
    }
  }, [user, screenKey, lastInterstitialAt, actionCount, interstitialLoaded]);

  const prepareRewarded = useCallback(() => {
    if (!showAds) return;
    if (!RewardedAd) return;
    if (Platform.OS === 'ios' && !attReady) return;
    ensureMobileAdsInitialized().then((ok) => {
      if (!ok) return;
      const rewarded = setupRewarded();
      if (!rewarded) return;
      if (rewardedLoadedRef.current) return;
      try {
        rewarded.load();
      } catch {}
    });
  }, [showAds, setupRewarded, ensureMobileAdsInitialized, attReady]);

  const showRewarded = useCallback((options = {}) => {
    const unavailableTimeoutMessage = t('ads.unavailable_desc_timeout', {
      defaultValue: t('ads.unavailable_desc_load')
    });
    // #region debug-point B:show-rewarded-entry
    logAdEvent('rewarded_request_started', 'showRewarded called', {
      platform: Platform.OS,
      showAds,
      attReady,
      rewardedLoaded,
      nativeAdsAvailable,
      useTestAdUnits,
      rewardedAdUnitId,
      hasOptions: Boolean(options && typeof options === 'object'),
      rewardKey: options?.metadata?.reward ?? null
    });
    // #endregion
    if (!showAds) {
      appAlert(t('ads.unavailable_title'), t('ads.unavailable_desc_account'));
      return;
    }
    if (Platform.OS === 'ios' && !attReady) {
      appAlert(t('ads.unavailable_title'), t('ads.unavailable_desc_ios_att'));
      return;
    }
    if (!RewardedAd) {
      appAlert(t('ads.unavailable_title'), t('ads.unavailable_desc_build'));
      return;
    }
    if (options && typeof options === 'object') {
      rewardedRewardRef.current = {
        amount: typeof options.amount === 'number' ? options.amount : null,
        reason: typeof options.reason === 'string' ? options.reason : null,
        metadata: options.metadata && typeof options.metadata === 'object' ? options.metadata : null,
        onEarned: typeof options.onEarned === 'function' ? options.onEarned : null
      };
    } else {
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };
    }
    rewardedPresentRetryCountRef.current = 0;
    pendingShowRewardedRef.current = true;

    if (rewardedPendingTimeoutRef.current) {
      clearTimeout(rewardedPendingTimeoutRef.current);
      rewardedPendingTimeoutRef.current = null;
    }
    rewardedPendingTimeoutRef.current = setTimeout(() => {
      if (!pendingShowRewardedRef.current) return;
      setLastRewardedError({
        code: 'TIMEOUT',
        domain: 'local',
        message: 'Rewarded ad failed to load or present within 20 seconds',
        at: Date.now(),
        phase: 'rewarded_show_timeout',
        platform: Platform.OS,
        rewardedAdUnitId,
        useTestAdUnits,
        requestNonPersonalizedAdsOnly
      });
      logAdEvent('rewarded_timeout', 'rewarded show timeout (20s)');
      pendingShowRewardedRef.current = false;
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };
      appAlert(t('ads.unavailable_title'), unavailableTimeoutMessage);
      if (adDebugEnabled) console.warn('[ADS] rewarded timeout (no ad loaded to show)');
    }, 20000);

    ensureMobileAdsInitialized().then((ok) => {
      if (!ok) {
        if (rewardedPendingTimeoutRef.current) {
          clearTimeout(rewardedPendingTimeoutRef.current);
          rewardedPendingTimeoutRef.current = null;
        }
        if (!pendingShowRewardedRef.current) return;
        pendingShowRewardedRef.current = false;
        rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };
        appAlert(t('ads.unavailable_title'), t('ads.unavailable_desc_prepare'));
        return;
      }

      const rewarded = setupRewarded();
      if (!rewarded) {
        if (rewardedPendingTimeoutRef.current) {
          clearTimeout(rewardedPendingTimeoutRef.current);
          rewardedPendingTimeoutRef.current = null;
        }
        if (!pendingShowRewardedRef.current) return;
        pendingShowRewardedRef.current = false;
        rewardedRewardRef.current = { amount: null, reason: null, metadata: null, onEarned: null };
        appAlert(t('ads.unavailable_title'), t('ads.unavailable_desc_prepare'));
        return;
      }

      if (rewardedLoadedRef.current) {
        let didShow = true;
        try {
          rewarded.show();
        } catch {
          didShow = false;
        }
        if (!didShow) {
          setTimeout(() => {
            if (!pendingShowRewardedRef.current) return;
            try {
              rewarded.show();
            } catch {}
          }, 700);
          setTimeout(() => {
            if (!pendingShowRewardedRef.current) return;
            try {
              rewarded.load();
            } catch {}
          }, 1400);
        }
      } else {
        try {
          rewarded.load();
        } catch {}
      }
    });
  }, [showAds, rewardedAdUnitId, setupRewarded, attReady, t, logAdEvent, ensureMobileAdsInitialized, adDebugEnabled, requestNonPersonalizedAdsOnly, useTestAdUnits]);

  const showPrivacyOptions = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (!AdsConsent || typeof AdsConsent.showPrivacyOptionsForm !== 'function') return;

    try {
      const consentInfo = await AdsConsent.showPrivacyOptionsForm();
      let gdprApplies = false;
      try {
        gdprApplies = await AdsConsent.getGdprApplies();
      } catch {
        gdprApplies = false;
      }

      let npaOnly = false;
      if (gdprApplies) {
        try {
          const choices = await AdsConsent.getUserChoices();
          npaOnly = choices?.selectPersonalisedAds === false;
        } catch {
          npaOnly = true;
        }
      }

      setAndroidConsentReady(Boolean(consentInfo?.canRequestAds));
      setAndroidGdprApplies(Boolean(gdprApplies));
      setAndroidNpaOnly(Boolean(npaOnly));
    } catch (err) {
      if (adDebugEnabled) console.warn('[ADS] privacy options failed', err);
    }
  }, [adDebugEnabled]);

  const getAdDiagnostics = useCallback(() => {
    return {
      showAds,
      isPremium: Boolean(user?.isPremium),
      isEarlyAccess: Boolean(user?.isEarlyAccess),
      attReady,
      attAuthorized,
      adDebugEnabled,
      rewardedAdUnitId,
      rewardedLoaded,
      rewardedLoading,
      interstitialLoaded,
      nativeAdsAvailable,
      useTestAdUnits,
      requestNonPersonalizedAdsOnly,
      platform: Platform.OS,
      isDevice: Constants.isDevice,
      screenKey,
      lastInterstitialAt,
      actionCount,
      lastRewardedError,
      lastBannerError,
      lastMobileAdsInitError
    };
  }, [
    showAds,
    user,
    attReady,
    attAuthorized,
    adDebugEnabled,
    rewardedAdUnitId,
    rewardedLoaded,
    rewardedLoading,
    interstitialLoaded,
    nativeAdsAvailable,
    useTestAdUnits,
    requestNonPersonalizedAdsOnly,
    screenKey,
    lastInterstitialAt,
    actionCount,
    lastRewardedError,
    lastBannerError,
    lastMobileAdsInitError
  ]);

  const value = useMemo(
    () => ({
      showAds,
      trackAction,
      tryShowInterstitial,
      prepareRewarded,
      showRewarded,
      showPrivacyOptions,
      getAdDiagnostics,
      logAdEvent,
      rewardedLoaded,
      rewardedLoading
    }),
    [
      showAds,
      trackAction,
      tryShowInterstitial,
      prepareRewarded,
      showRewarded,
      showPrivacyOptions,
      getAdDiagnostics,
      logAdEvent,
      rewardedLoaded,
      rewardedLoading
    ]
  );

  return (
    <AdManagerContext.Provider value={value}>
      {children}
      {showBanner && (
        <View style={[styles.bannerContainer, { bottom: bottomOffset }]}>
          <BannerAd
            unitId={bannerAdUnitId}
            size={BannerAdSize.BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly }}
            onAdLoaded={() => {
              setLastBannerError(null);
              if (!adDebugEnabled) return;
              console.warn('[ADS] banner loaded', { screenKey, unitId: bannerAdUnitId });
            }}
            onAdFailedToLoad={(err) => {
              setLastBannerError(buildAdErrorSnapshot(err, {
                phase: 'banner_load',
                screenKey,
                adUnitId: bannerAdUnitId,
                useTestAdUnits,
                requestNonPersonalizedAdsOnly
              }));
              if (!adDebugEnabled) return;
              console.warn('[ADS] banner failed', { screenKey, unitId: bannerAdUnitId, err });
            }}
          />
        </View>
      )}
    </AdManagerContext.Provider>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: getResponsiveSize(12),
    right: getResponsiveSize(12),
    height: getResponsiveSize(50),
    alignItems: 'center',
    justifyContent: 'center'
  }
});
