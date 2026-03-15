import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useCoinsContext } from '../context/CoinsContext';
import { getResponsiveSize } from '../utils/responsive';

let mobileAds;
let AdEventType;
let BannerAd;
let BannerAdSize;
let InterstitialAd;
let RewardedAd;
let RewardedAdEventType;
let TestIds;

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
} catch {
  mobileAds = null;
}

const AdProvider = {
  appId: 'ca-app-pub-3636440603787547~4892803097',
  units: {
    banner: { id: 'ca-app-pub-3636440603787547/4038886421', type: 'banner', size: '320x50' },
    interstitial: { id: 'ca-app-pub-3636440603787547/6373910304', type: 'interstitial', cooldown: 120 },
    rewarded: { id: 'ca-app-pub-3636440603787547/7878059080', type: 'rewarded', reward: { type: 'coins', amount: 10 } }
  },
  targeting: {
    childDirected: false,
    maxAdContentRating: 'T'
  }
};

const AD_RULES = {
  gracePeriodMs: 0,
  interstitialCooldownSec: 120,
  actionsBeforeInterstitial: 1,
  noAdScreens: ['Waiting', 'Login', 'Register', 'ForgotPassword', 'ResetPassword', 'Info', 'Assistant', 'PremiumPions', 'Magasin'],
  bannerOnlyScreens: ['MaisonTab', 'Social', 'Salle', 'Profile'],
  fullAdScreens: ['ResultatJeuOnline', 'ResultatJeuIA'],
  shouldShowAds: (user) => {
    if (!user) return false;
    if (user.isPremium) return false;
    if (user.isEarlyAccess) return false;
    return true;
  },
  canShowInterstitial: (user, screenKey, lastShownAt, actionCount) => {
    if (!AD_RULES.shouldShowAds(user)) return false;
    if (!screenKey || !AD_RULES.fullAdScreens.includes(screenKey)) return false;
    const secsSinceLast = lastShownAt ? (Date.now() - lastShownAt) / 1000 : Infinity;
    if (secsSinceLast < AD_RULES.interstitialCooldownSec) return false;
    if (actionCount < AD_RULES.actionsBeforeInterstitial) return false;
    return true;
  },
  canShowBanner: (user, screenKey) => {
    if (!AD_RULES.shouldShowAds(user)) return false;
    if (!screenKey) return false;
    if (AD_RULES.noAdScreens.includes(screenKey)) return false;
    if (AD_RULES.bannerOnlyScreens.includes(screenKey)) return true;
    if (AD_RULES.fullAdScreens.includes(screenKey)) return true;
    return false;
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

function getBottomOffsetFromRoutePath(routePath) {
  const isInTab = routePath.includes('Home') && (routePath.includes('MaisonTab') || routePath.includes('Social') || routePath.includes('Salle') || routePath.includes('Magasin'));
  return isInTab ? 80 : 20;
}

const AdManagerContext = createContext(null);

export function useAdManager() {
  const ctx = useContext(AdManagerContext);
  if (!ctx) throw new Error('useAdManager must be used within AdSystem');
  return ctx;
}

export default function AdSystem({ children }) {
  const { user } = useSelector((state) => state.auth);
  const { credit } = useCoinsContext();

  const navState = useNavigationState((state) => state);
  const routePath = useMemo(() => getActiveRoutePath(navState), [navState]);
  const screenKey = routePath[routePath.length - 1] || null;

  const nativeAdsAvailable = Boolean(mobileAds && BannerAd && BannerAdSize && InterstitialAd && RewardedAd);
  const showAds = nativeAdsAvailable && AD_RULES.shouldShowAds(user);
  const showBanner = nativeAdsAvailable && AD_RULES.canShowBanner(user, screenKey);
  const bottomOffset = useMemo(() => getBottomOffsetFromRoutePath(routePath), [routePath]);

  const [actionCount, setActionCount] = useState(0);
  const [lastInterstitialAt, setLastInterstitialAt] = useState(null);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);

  const lastScreenKeyRef = useRef(null);
  const interstitialRef = useRef(null);
  const rewardedRef = useRef(null);
  const pendingShowInterstitialRef = useRef(false);
  const pendingShowRewardedRef = useRef(false);
  const rewardedRewardRef = useRef({ amount: null, reason: null, metadata: null });

  const interstitialAdUnitId = useMemo(
    () => (__DEV__ && TestIds ? TestIds.INTERSTITIAL : AdProvider.units.interstitial.id),
    []
  );
  const rewardedAdUnitId = useMemo(
    () => (__DEV__ && TestIds ? TestIds.REWARDED : AdProvider.units.rewarded.id),
    []
  );
  const bannerAdUnitId = useMemo(() => (__DEV__ && TestIds ? TestIds.BANNER : AdProvider.units.banner.id), []);

  useEffect(() => {
    if (!showAds) return;
    if (!mobileAds) return;
    mobileAds().initialize().catch(() => {});
  }, [showAds]);

  useEffect(() => {
    if (!showAds) return;
    if (!InterstitialAd) return;

    if (!interstitialRef.current) {
      interstitialRef.current = InterstitialAd.createForAdRequest(interstitialAdUnitId);
    }

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
      interstitial.load();
    });

    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      setInterstitialLoaded(false);
      pendingShowInterstitialRef.current = false;
    });

    interstitial.load();

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, [showAds, interstitialAdUnitId]);

  useEffect(() => {
    if (!showAds) return;
    if (!RewardedAd) return;

    if (!rewardedRef.current) {
      rewardedRef.current = RewardedAd.createForAdRequest(rewardedAdUnitId);
    }

    const rewarded = rewardedRef.current;

    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedLoaded(true);
      if (pendingShowRewardedRef.current) {
        pendingShowRewardedRef.current = false;
        try {
          rewarded.show();
        } catch {}
      }
    });

    const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      const pending = rewardedRewardRef.current;
      const defaultReward = AdProvider.units.rewarded.reward;
      const amount = typeof pending?.amount === 'number' && pending.amount > 0 ? pending.amount : defaultReward.amount;
      const reason = typeof pending?.reason === 'string' && pending.reason ? pending.reason : 'Récompense publicité';
      const metadata = (pending?.metadata && typeof pending.metadata === 'object') ? pending.metadata : { source: 'rewarded_ad' };
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null };
      if (defaultReward.type !== 'coins') return;
      if (typeof amount !== 'number' || amount <= 0) return;
      try {
        await credit(amount, reason, metadata);
      } catch {}
    });

    const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null };
      rewarded.load();
    });

    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
      setRewardedLoaded(false);
      pendingShowRewardedRef.current = false;
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null };
    });

    rewarded.load();

    return () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
    };
  }, [showAds, rewardedAdUnitId, credit]);

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
    if (!rewardedRef.current) {
      rewardedRef.current = RewardedAd.createForAdRequest(rewardedAdUnitId);
    }
    const rewarded = rewardedRef.current;
    if (!rewarded) return;
    if (rewardedLoaded) return;
    try {
      rewarded.load();
    } catch {}
  }, [showAds, rewardedAdUnitId, rewardedLoaded]);

  const showRewarded = useCallback((options = {}) => {
    if (!showAds) return;
    if (!RewardedAd) return;
    if (!rewardedRef.current) {
      rewardedRef.current = RewardedAd.createForAdRequest(rewardedAdUnitId);
    }
    const rewarded = rewardedRef.current;
    if (!rewarded) return;
    if (options && typeof options === 'object') {
      rewardedRewardRef.current = {
        amount: typeof options.amount === 'number' ? options.amount : null,
        reason: typeof options.reason === 'string' ? options.reason : null,
        metadata: options.metadata && typeof options.metadata === 'object' ? options.metadata : null
      };
    } else {
      rewardedRewardRef.current = { amount: null, reason: null, metadata: null };
    }
    if (rewardedLoaded) {
      let didShow = true;
      try {
        rewarded.show();
      } catch {
        didShow = false;
      }
      if (!didShow) {
        pendingShowRewardedRef.current = true;
        setTimeout(() => {
          if (!pendingShowRewardedRef.current) return;
          try {
            rewarded.load();
          } catch {}
        }, 250);
      }
    } else {
      pendingShowRewardedRef.current = true;
      try {
        rewarded.load();
      } catch {}
    }
  }, [showAds, rewardedLoaded, rewardedAdUnitId]);

  const value = useMemo(
    () => ({
      showAds,
      trackAction,
      tryShowInterstitial,
      prepareRewarded,
      showRewarded
    }),
    [showAds, trackAction, tryShowInterstitial, prepareRewarded, showRewarded]
  );

  return (
    <AdManagerContext.Provider value={value}>
      {children}
      {showBanner && (
        <View style={[styles.bannerContainer, { bottom: bottomOffset }]}>
          <BannerAd unitId={bannerAdUnitId} size={BannerAdSize.BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: false }} />
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
