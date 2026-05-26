import { AD_RULES, computeAdVisibility } from '../src/ads/adRules';

describe('AdSystem rules', () => {
  test('shouldShowAds is false for premium / early access / no user', () => {
    expect(AD_RULES.shouldShowAds(null)).toBe(false);
    expect(AD_RULES.shouldShowAds({ isPremium: true, isEarlyAccess: false })).toBe(false);
    expect(AD_RULES.shouldShowAds({ isPremium: false, isEarlyAccess: true })).toBe(false);
    expect(AD_RULES.shouldShowAds({ isPremium: false, isEarlyAccess: false })).toBe(true);
  });

  test('computeAdVisibility disables ads on Android emulator by default', () => {
    const { showAds, showBanner } = computeAdVisibility({
      nativeAdsAvailable: true,
      user: { isPremium: false, isEarlyAccess: false },
      screenKey: 'MaisonTab',
      isAndroidEmulator: true,
      allowAdsOnEmulator: false
    });
    expect(showAds).toBe(false);
    expect(showBanner).toBe(false);
  });

  test('computeAdVisibility allows ads on emulator when explicitly enabled', () => {
    const { showAds, showBanner } = computeAdVisibility({
      nativeAdsAvailable: true,
      user: { isPremium: false, isEarlyAccess: false },
      screenKey: 'MaisonTab',
      isAndroidEmulator: true,
      allowAdsOnEmulator: true
    });
    expect(showAds).toBe(true);
    expect(showBanner).toBe(true);
  });

  test('computeAdVisibility does not show banner on blacklisted screens (Magasin)', () => {
    const { showAds, showBanner } = computeAdVisibility({
      nativeAdsAvailable: true,
      user: { isPremium: false, isEarlyAccess: false },
      screenKey: 'Magasin',
      isAndroidEmulator: false,
      allowAdsOnEmulator: false
    });
    expect(showAds).toBe(true);
    expect(showBanner).toBe(false);
  });
});
