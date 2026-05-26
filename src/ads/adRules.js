export const AD_RULES = {
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

export function computeAdVisibility({
  nativeAdsAvailable,
  user,
  screenKey,
  isAndroidEmulator,
  allowAdsOnEmulator
}) {
  const allowEmulator = Boolean(allowAdsOnEmulator);
  const isEmulator = Boolean(isAndroidEmulator);
  const showAds = Boolean(nativeAdsAvailable) && AD_RULES.shouldShowAds(user) && (!isEmulator || allowEmulator);
  const showBanner = Boolean(nativeAdsAvailable) && AD_RULES.canShowBanner(user, screenKey) && (!isEmulator || allowEmulator);
  return { showAds, showBanner };
}

